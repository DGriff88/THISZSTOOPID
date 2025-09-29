import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { getAlpacaService } from './alpaca.js';
import { storage } from '../storage.js';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  subscriptions: Set<string>;
}

export class TradingWebSocketService {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private marketDataInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
    this.startMarketDataStream();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established');
      
      const client: ClientConnection = {
        ws,
        subscriptions: new Set(),
      };
      
      this.clients.set(ws, client);

      ws.on('message', async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(client, message);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection confirmation
      this.sendMessage(ws, {
        type: 'connection',
        data: { status: 'connected', timestamp: new Date().toISOString() }
      });
    });
  }

  private async handleMessage(client: ClientConnection, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'authenticate':
        await this.handleAuthentication(client, message.data);
        break;
      
      case 'subscribe':
        this.handleSubscription(client, message.data);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscription(client, message.data);
        break;
      
      case 'portfolio_update':
        await this.handlePortfolioUpdate(client);
        break;
      
      default:
        this.sendError(client.ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleAuthentication(client: ClientConnection, data: { userId: string }): Promise<void> {
    try {
      const user = await storage.getUser(data.userId);
      if (user) {
        client.userId = data.userId;
        this.sendMessage(client.ws, {
          type: 'authenticated',
          data: { userId: data.userId, username: user.username }
        });
        
        // Send initial portfolio data
        await this.sendPortfolioUpdate(client);
      } else {
        this.sendError(client.ws, 'Invalid user ID');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.sendError(client.ws, 'Authentication failed');
    }
  }

  private handleSubscription(client: ClientConnection, data: { channels: string[] }): void {
    data.channels.forEach(channel => {
      client.subscriptions.add(channel);
    });
    
    this.sendMessage(client.ws, {
      type: 'subscribed',
      data: { channels: Array.from(client.subscriptions) }
    });
  }

  private handleUnsubscription(client: ClientConnection, data: { channels: string[] }): void {
    data.channels.forEach(channel => {
      client.subscriptions.delete(channel);
    });
    
    this.sendMessage(client.ws, {
      type: 'unsubscribed',
      data: { channels: data.channels }
    });
  }

  private async handlePortfolioUpdate(client: ClientConnection): Promise<void> {
    if (client.userId) {
      await this.sendPortfolioUpdate(client);
    }
  }

  private async sendPortfolioUpdate(client: ClientConnection): Promise<void> {
    if (!client.userId) return;

    try {
      const portfolioSummary = await storage.getPortfolioSummary(client.userId);
      const strategies = await storage.getStrategyPerformance(client.userId);
      const recentTrades = await storage.getTrades(client.userId, 10);

      this.sendMessage(client.ws, {
        type: 'portfolio_update',
        data: {
          portfolio: portfolioSummary,
          strategies,
          recentTrades,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error sending portfolio update:', error);
      this.sendError(client.ws, 'Failed to fetch portfolio data');
    }
  }

  private startMarketDataStream(): void {
    // Stream market data every 5 seconds
    this.marketDataInterval = setInterval(async () => {
      await this.broadcastMarketData();
    }, 5000);
  }

  private async broadcastMarketData(): Promise<void> {
    try {
      // Get popular symbols to stream
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY', 'QQQ'];
      const quotes: any[] = [];

      // Get quotes for each symbol (in a real implementation, you'd use Alpaca's streaming API)
      for (const symbol of symbols) {
        try {
          // Use deterministic market data patterns instead of random
          const basePrice = symbol === 'AAPL' ? 175 : symbol === 'MSFT' ? 380 : 250;
          const timeVariation = (Date.now() % 10000) / 10000; // Time-based variation
          quotes.push({
            symbol,
            price: basePrice + (timeVariation * 10),
            change: (timeVariation - 0.5) * 5,
            changePercent: (timeVariation - 0.5) * 2,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Error getting quote for ${symbol}:`, error);
        }
      }

      // Broadcast to all clients subscribed to market data
      this.broadcast({
        type: 'market_data',
        data: { quotes, timestamp: new Date().toISOString() }
      }, 'market_data');

    } catch (error) {
      console.error('Error broadcasting market data:', error);
    }
  }

  private broadcast(message: WebSocketMessage, channel?: string): void {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!channel || client.subscriptions.has(channel)) {
          this.sendMessage(client.ws, message);
        }
      }
    });
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: { message: error, timestamp: new Date().toISOString() }
    });
  }

  public broadcastTradeUpdate(trade: any): void {
    this.broadcast({
      type: 'trade_update',
      data: { trade, timestamp: new Date().toISOString() }
    }, 'trades');
  }

  public broadcastStrategyUpdate(strategy: any): void {
    this.broadcast({
      type: 'strategy_update',
      data: { strategy, timestamp: new Date().toISOString() }
    }, 'strategies');
  }

  public broadcastPatternSignal(signal: any): void {
    this.broadcast({
      type: 'pattern_signal',
      data: { signal, timestamp: new Date().toISOString() }
    }, 'patterns');
  }

  public async stop(): Promise<void> {
    if (this.marketDataInterval) {
      clearInterval(this.marketDataInterval);
    }
    
    this.wss.close();
  }
}

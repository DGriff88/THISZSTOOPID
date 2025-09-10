import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeAlpacaService, getAlpacaService } from "./services/alpaca";
import { TradingWebSocketService } from "./services/websocket";
import { insertStrategySchema, insertTradeSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize Alpaca service
  const alpacaApiKey = process.env.ALPACA_API_KEY || process.env.VITE_ALPACA_API_KEY || "";
  const alpacaApiSecret = process.env.ALPACA_API_SECRET || process.env.VITE_ALPACA_API_SECRET || "";
  
  if (alpacaApiKey && alpacaApiSecret) {
    initializeAlpacaService({
      apiKey: alpacaApiKey,
      apiSecret: alpacaApiSecret,
      paper: true, // Default to paper trading
    });
  }

  // Initialize WebSocket service
  const wsService = new TradingWebSocketService(httpServer);

  // Authentication middleware (simplified for demo)
  const requireAuth = (req: any, res: any, next: any) => {
    req.userId = 'demo-user-1'; // Simplified auth for demo
    next();
  };

  // Portfolio endpoints
  app.get("/api/portfolio/summary", requireAuth, async (req: any, res) => {
    try {
      const summary = await storage.getPortfolioSummary(req.userId);
      res.json(summary);
    } catch (error) {
      console.error("Error getting portfolio summary:", error);
      res.status(500).json({ error: "Failed to get portfolio summary" });
    }
  });

  app.get("/api/portfolio/history", requireAuth, async (req: any, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const history = await storage.getPortfolioHistory(req.userId, days);
      res.json(history);
    } catch (error) {
      console.error("Error getting portfolio history:", error);
      res.status(500).json({ error: "Failed to get portfolio history" });
    }
  });

  // Strategy endpoints
  app.get("/api/strategies", requireAuth, async (req: any, res) => {
    try {
      const strategies = await storage.getStrategies(req.userId);
      res.json(strategies);
    } catch (error) {
      console.error("Error getting strategies:", error);
      res.status(500).json({ error: "Failed to get strategies" });
    }
  });

  app.post("/api/strategies", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertStrategySchema.parse({
        ...req.body,
        userId: req.userId,
      });
      
      const strategy = await storage.createStrategy(validatedData);
      res.json(strategy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid strategy data", details: error.errors });
      } else {
        console.error("Error creating strategy:", error);
        res.status(500).json({ error: "Failed to create strategy" });
      }
    }
  });

  app.put("/api/strategies/:id", requireAuth, async (req: any, res) => {
    try {
      const strategy = await storage.updateStrategy(req.params.id, req.body);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      
      wsService.broadcastStrategyUpdate(strategy);
      res.json(strategy);
    } catch (error) {
      console.error("Error updating strategy:", error);
      res.status(500).json({ error: "Failed to update strategy" });
    }
  });

  app.delete("/api/strategies/:id", requireAuth, async (req: any, res) => {
    try {
      const deleted = await storage.deleteStrategy(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting strategy:", error);
      res.status(500).json({ error: "Failed to delete strategy" });
    }
  });

  app.get("/api/strategies/performance", requireAuth, async (req: any, res) => {
    try {
      const performance = await storage.getStrategyPerformance(req.userId);
      res.json(performance);
    } catch (error) {
      console.error("Error getting strategy performance:", error);
      res.status(500).json({ error: "Failed to get strategy performance" });
    }
  });

  // Trade endpoints
  app.get("/api/trades", requireAuth, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const trades = await storage.getTrades(req.userId, limit);
      res.json(trades);
    } catch (error) {
      console.error("Error getting trades:", error);
      res.status(500).json({ error: "Failed to get trades" });
    }
  });

  app.post("/api/trades", requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertTradeSchema.parse({
        ...req.body,
        userId: req.userId,
      });
      
      const trade = await storage.createTrade(validatedData);
      wsService.broadcastTradeUpdate(trade);
      res.json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid trade data", details: error.errors });
      } else {
        console.error("Error creating trade:", error);
        res.status(500).json({ error: "Failed to create trade" });
      }
    }
  });

  // Market data endpoints
  app.get("/api/market/quote/:symbol", async (req, res) => {
    try {
      if (!alpacaApiKey || !alpacaApiSecret) {
        return res.status(500).json({ error: "Alpaca API credentials not configured" });
      }

      const alpaca = getAlpacaService();
      const quote = await alpaca.getQuote(req.params.symbol);
      res.json(quote);
    } catch (error) {
      console.error("Error getting quote:", error);
      res.status(500).json({ error: "Failed to get quote" });
    }
  });

  app.get("/api/market/status", async (req, res) => {
    try {
      if (!alpacaApiKey || !alpacaApiSecret) {
        return res.json({ isOpen: false, error: "API credentials not configured" });
      }

      const alpaca = getAlpacaService();
      const isOpen = await alpaca.isMarketOpen();
      res.json({ isOpen });
    } catch (error) {
      console.error("Error getting market status:", error);
      res.json({ isOpen: false, error: "Failed to get market status" });
    }
  });

  // Alpaca integration endpoints
  app.get("/api/alpaca/account", requireAuth, async (req: any, res) => {
    try {
      if (!alpacaApiKey || !alpacaApiSecret) {
        return res.status(500).json({ error: "Alpaca API credentials not configured" });
      }

      const alpaca = getAlpacaService();
      const account = await alpaca.getAccount();
      res.json(account);
    } catch (error) {
      console.error("Error getting Alpaca account:", error);
      res.status(500).json({ error: "Failed to get account info" });
    }
  });

  app.get("/api/alpaca/positions", requireAuth, async (req: any, res) => {
    try {
      if (!alpacaApiKey || !alpacaApiSecret) {
        return res.status(500).json({ error: "Alpaca API credentials not configured" });
      }

      const alpaca = getAlpacaService();
      const positions = await alpaca.getPositions();
      res.json(positions);
    } catch (error) {
      console.error("Error getting Alpaca positions:", error);
      res.status(500).json({ error: "Failed to get positions" });
    }
  });

  app.post("/api/alpaca/orders", requireAuth, async (req: any, res) => {
    try {
      if (!alpacaApiKey || !alpacaApiSecret) {
        return res.status(500).json({ error: "Alpaca API credentials not configured" });
      }

      const alpaca = getAlpacaService();
      const order = await alpaca.createOrder(req.body);
      
      // Create trade record
      await storage.createTrade({
        userId: req.userId,
        symbol: req.body.symbol,
        side: req.body.side,
        quantity: req.body.qty,
        price: req.body.limit_price || '0',
        executedAt: new Date(),
        alpacaOrderId: order.id,
        status: 'pending',
        isPaperTrade: true,
      });
      
      res.json(order);
    } catch (error) {
      console.error("Error creating Alpaca order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // Emergency stop endpoint
  app.post("/api/emergency-stop", requireAuth, async (req: any, res) => {
    try {
      // Disable all active strategies
      const activeStrategies = await storage.getActiveStrategies(req.userId);
      for (const strategy of activeStrategies) {
        await storage.updateStrategy(strategy.id, { isActive: false });
      }

      // Cancel all open orders if Alpaca is configured
      if (alpacaApiKey && alpacaApiSecret) {
        try {
          const alpaca = getAlpacaService();
          const openOrders = await alpaca.getOrders('open');
          for (const order of openOrders) {
            await alpaca.cancelOrder(order.id);
          }
        } catch (error) {
          console.error("Error canceling orders during emergency stop:", error);
        }
      }

      res.json({ success: true, message: "Emergency stop executed" });
    } catch (error) {
      console.error("Error executing emergency stop:", error);
      res.status(500).json({ error: "Failed to execute emergency stop" });
    }
  });

  return httpServer;
}

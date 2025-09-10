import { 
  type User, 
  type InsertUser, 
  type Strategy, 
  type InsertStrategy,
  type Trade,
  type InsertTrade,
  type PortfolioSnapshot,
  type InsertPortfolioSnapshot,
  type MarketData,
  type InsertMarketData,
  type PortfolioSummary,
  type StrategyPerformance,
  type RealTimeQuote
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Strategy methods
  getStrategies(userId: string): Promise<Strategy[]>;
  getStrategy(id: string): Promise<Strategy | undefined>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy | undefined>;
  deleteStrategy(id: string): Promise<boolean>;
  getActiveStrategies(userId: string): Promise<Strategy[]>;

  // Trade methods
  getTrades(userId: string, limit?: number): Promise<Trade[]>;
  getTradesByStrategy(strategyId: string): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | undefined>;

  // Portfolio methods
  createPortfolioSnapshot(snapshot: InsertPortfolioSnapshot): Promise<PortfolioSnapshot>;
  getLatestPortfolioSnapshot(userId: string): Promise<PortfolioSnapshot | undefined>;
  getPortfolioHistory(userId: string, days: number): Promise<PortfolioSnapshot[]>;

  // Market data methods
  saveMarketData(data: InsertMarketData): Promise<MarketData>;
  getLatestMarketData(symbol: string): Promise<MarketData | undefined>;

  // Analytics methods
  getPortfolioSummary(userId: string): Promise<PortfolioSummary>;
  getStrategyPerformance(userId: string): Promise<StrategyPerformance[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private strategies: Map<string, Strategy>;
  private trades: Map<string, Trade>;
  private portfolioSnapshots: Map<string, PortfolioSnapshot>;
  private marketData: Map<string, MarketData>;

  constructor() {
    this.users = new Map();
    this.strategies = new Map();
    this.trades = new Map();
    this.portfolioSnapshots = new Map();
    this.marketData = new Map();

    // Initialize with a demo user
    this.initializeDemoData();
  }

  private async initializeDemoData() {
    const demoUser: User = {
      id: 'demo-user-1',
      username: 'demo',
      password: 'demo123',
      alpacaApiKey: process.env.ALPACA_API_KEY || '',
      alpacaApiSecret: process.env.ALPACA_API_SECRET || '',
      paperTrading: true,
    };
    this.users.set(demoUser.id, demoUser);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      alpacaApiKey: insertUser.alpacaApiKey || null,
      alpacaApiSecret: insertUser.alpacaApiSecret || null,
      paperTrading: insertUser.paperTrading ?? true
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Strategy methods
  async getStrategies(userId: string): Promise<Strategy[]> {
    return Array.from(this.strategies.values()).filter(strategy => strategy.userId === userId);
  }

  async getStrategy(id: string): Promise<Strategy | undefined> {
    return this.strategies.get(id);
  }

  async createStrategy(insertStrategy: InsertStrategy): Promise<Strategy> {
    const id = randomUUID();
    const now = new Date();
    const strategy: Strategy = { 
      ...insertStrategy, 
      id, 
      createdAt: now, 
      updatedAt: now,
      description: insertStrategy.description || null,
      stopLoss: insertStrategy.stopLoss?.toString() || null,
      takeProfit: insertStrategy.takeProfit?.toString() || null,
      positionSize: insertStrategy.positionSize.toString(),
      isActive: insertStrategy.isActive ?? false,
      isPaperTrading: insertStrategy.isPaperTrading ?? true
    };
    this.strategies.set(id, strategy);
    return strategy;
  }

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy | undefined> {
    const strategy = this.strategies.get(id);
    if (!strategy) return undefined;
    
    const updatedStrategy = { ...strategy, ...updates, updatedAt: new Date() };
    this.strategies.set(id, updatedStrategy);
    return updatedStrategy;
  }

  async deleteStrategy(id: string): Promise<boolean> {
    return this.strategies.delete(id);
  }

  async getActiveStrategies(userId: string): Promise<Strategy[]> {
    return Array.from(this.strategies.values()).filter(
      strategy => strategy.userId === userId && strategy.isActive
    );
  }

  // Trade methods
  async getTrades(userId: string, limit: number = 50): Promise<Trade[]> {
    const userTrades = Array.from(this.trades.values())
      .filter(trade => trade.userId === userId)
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
    
    return userTrades.slice(0, limit);
  }

  async getTradesByStrategy(strategyId: string): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(trade => trade.strategyId === strategyId);
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = randomUUID();
    const trade: Trade = { 
      ...insertTrade, 
      id, 
      createdAt: new Date(),
      status: insertTrade.status || 'pending',
      strategyId: insertTrade.strategyId || null,
      pnl: insertTrade.pnl || null,
      isPaperTrade: insertTrade.isPaperTrade ?? true,
      alpacaOrderId: insertTrade.alpacaOrderId || null
    };
    this.trades.set(id, trade);
    return trade;
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (!trade) return undefined;
    
    const updatedTrade = { ...trade, ...updates };
    this.trades.set(id, updatedTrade);
    return updatedTrade;
  }

  // Portfolio methods
  async createPortfolioSnapshot(insertSnapshot: InsertPortfolioSnapshot): Promise<PortfolioSnapshot> {
    const id = randomUUID();
    const snapshot: PortfolioSnapshot = { 
      ...insertSnapshot, 
      id, 
      timestamp: new Date(),
      dayPnL: insertSnapshot.dayPnL || null,
      totalPnL: insertSnapshot.totalPnL || null,
      positions: insertSnapshot.positions || null
    };
    this.portfolioSnapshots.set(id, snapshot);
    return snapshot;
  }

  async getLatestPortfolioSnapshot(userId: string): Promise<PortfolioSnapshot | undefined> {
    const userSnapshots = Array.from(this.portfolioSnapshots.values())
      .filter(snapshot => snapshot.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return userSnapshots[0];
  }

  async getPortfolioHistory(userId: string, days: number): Promise<PortfolioSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return Array.from(this.portfolioSnapshots.values())
      .filter(snapshot => 
        snapshot.userId === userId && 
        snapshot.timestamp > cutoffDate
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Market data methods
  async saveMarketData(insertData: InsertMarketData): Promise<MarketData> {
    const id = randomUUID();
    const data: MarketData = { 
      ...insertData, 
      id,
      volume: insertData.volume || null
    };
    this.marketData.set(`${data.symbol}-${data.timestamp.getTime()}`, data);
    return data;
  }

  async getLatestMarketData(symbol: string): Promise<MarketData | undefined> {
    const symbolData = Array.from(this.marketData.values())
      .filter(data => data.symbol === symbol)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return symbolData[0];
  }

  // Analytics methods
  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const latestSnapshot = await this.getLatestPortfolioSnapshot(userId);
    const userTrades = await this.getTrades(userId);
    const userStrategies = await this.getStrategies(userId);
    
    const activeStrategies = userStrategies.filter(s => s.isActive).length;
    const winningTrades = userTrades.filter(t => t.pnl && parseFloat(t.pnl) > 0).length;
    const winRate = userTrades.length > 0 ? (winningTrades / userTrades.length) * 100 : 0;
    
    return {
      totalValue: latestSnapshot ? parseFloat(latestSnapshot.totalValue) : 100000,
      dayPnL: latestSnapshot ? parseFloat(latestSnapshot.dayPnL || '0') : 0,
      totalPnL: latestSnapshot ? parseFloat(latestSnapshot.totalPnL || '0') : 0,
      cashValue: latestSnapshot ? parseFloat(latestSnapshot.cashValue) : 100000,
      activeStrategies,
      winRate,
      positions: [],
    };
  }

  async getStrategyPerformance(userId: string): Promise<StrategyPerformance[]> {
    const strategies = await this.getStrategies(userId);
    
    return Promise.all(strategies.map(async (strategy) => {
      const trades = await this.getTradesByStrategy(strategy.id);
      const totalPnL = trades.reduce((sum, trade) => 
        sum + (trade.pnl ? parseFloat(trade.pnl) : 0), 0
      );
      const winningTrades = trades.filter(t => t.pnl && parseFloat(t.pnl) > 0).length;
      const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
      
      return {
        strategyId: strategy.id,
        name: strategy.name,
        totalPnL,
        winRate,
        totalTrades: trades.length,
        isActive: strategy.isActive,
        isPaperTrading: strategy.isPaperTrading,
      };
    }));
  }
}

export const storage = new MemStorage();

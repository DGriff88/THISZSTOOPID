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
  type RealTimeQuote,
  type OHLCVCandles,
  type InsertOHLCVCandles,
  type PatternSignal,
  type InsertPatternSignal,
  type PatternAnalysisResponse,
  type ActivePatternSignal,
  type PatternConfig,
  type InsertPatternConfig,
  type PatternOutcome,
  type InsertPatternOutcome,
  type PatternBacktestRequest,
  type PatternBacktestResult,
  type PatternPerformanceMetrics,
  type OptionTrade,
  type InsertOptionTrade,
  type DailySession,
  type InsertDailySession,
  type WeeklyPaycheck,
  type InsertWeeklyPaycheck,
  type RuleViolation,
  type InsertRuleViolation,
  type StrategicAnalysis,
  type InsertStrategicAnalysis,
  type PortfolioHolding,
  type InsertPortfolioHolding,
  type EconomicEvent,
  type InsertEconomicEvent,
  type AlgorithmicStrategy,
  type InsertAlgorithmicStrategy,
  type StrategyStockPick,
  type InsertStrategyStockPick,
  type JournalEntry,
  type InsertJournalEntry
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

  // OHLCV Candles methods
  saveOHLCVCandles(candles: InsertOHLCVCandles[]): Promise<OHLCVCandles[]>;
  getOHLCVCandles(symbol: string, timeframe: string, limit?: number): Promise<OHLCVCandles[]>;
  getOHLCVCandlesInRange(symbol: string, timeframe: string, startTime: Date, endTime: Date): Promise<OHLCVCandles[]>;

  // Pattern Signal methods
  createPatternSignal(signal: InsertPatternSignal): Promise<PatternSignal>;
  getPatternSignals(strategyId: string, isActive?: boolean): Promise<PatternSignal[]>;
  getPatternSignalsBySymbol(symbol: string, patternType?: string): Promise<PatternSignal[]>;
  updatePatternSignal(id: string, updates: Partial<PatternSignal>): Promise<PatternSignal | undefined>;
  getActivePatternSignals(): Promise<ActivePatternSignal[]>;
  getPatternAnalysis(strategyId?: string): Promise<PatternAnalysisResponse>;
  getPatternSignalById(signalId: string): Promise<PatternSignal | undefined>;
  getPatternSignalsByUser(userId: string): Promise<PatternSignal[]>;

  // Pattern Configuration methods
  createPatternConfig(config: InsertPatternConfig): Promise<PatternConfig>;
  getPatternConfigs(strategyId: string): Promise<PatternConfig[]>;
  getPatternConfig(strategyId: string, patternType: string): Promise<PatternConfig | undefined>;
  updatePatternConfig(id: string, updates: Partial<PatternConfig>): Promise<PatternConfig | undefined>;
  deletePatternConfig(id: string): Promise<boolean>;

  // Pattern Outcome methods
  createPatternOutcome(outcome: InsertPatternOutcome): Promise<PatternOutcome>;
  getPatternOutcomes(patternSignalId: string): Promise<PatternOutcome[]>;
  getPatternOutcomesByStrategy(strategyId: string): Promise<PatternOutcome[]>;
  updatePatternOutcome(id: string, updates: Partial<PatternOutcome>): Promise<PatternOutcome | undefined>;

  // Enhanced Analytics methods
  getPatternPerformanceByType(patternType: string, strategyId?: string): Promise<PatternPerformanceMetrics>;
  backtestPatterns(request: PatternBacktestRequest): Promise<PatternBacktestResult>;
  
  // Additional utility methods used in routes
  getPatternConfigsByUser(userId: string): Promise<PatternConfig[]>;
  createMultiplePatternSignals(signals: InsertPatternSignal[]): Promise<PatternSignal[]>;
  getPatternSignalsInTimeRange(startDate: Date, endDate: Date, strategyId?: string, patternTypes?: string[]): Promise<PatternSignal[]>;

  // PIRATETRADER methods
  // Option trades
  createOptionTrade(trade: InsertOptionTrade): Promise<OptionTrade>;
  getOptionTrades(userId: string, limit?: number): Promise<OptionTrade[]>;
  getActiveOptionTrades(userId: string, symbol?: string): Promise<OptionTrade[]>;
  updateOptionTrade(id: string, updates: Partial<OptionTrade>): Promise<OptionTrade | undefined>;
  
  // Daily sessions for compliance tracking
  createDailySession(session: InsertDailySession): Promise<DailySession>;
  getDailySession(userId: string, date: string): Promise<DailySession | undefined>;
  updateDailySession(id: string, updates: Partial<DailySession>): Promise<DailySession | undefined>;
  
  // Weekly paycheck tracking
  createWeeklyPaycheck(paycheck: InsertWeeklyPaycheck): Promise<WeeklyPaycheck>;
  getWeeklyPaycheck(userId: string, weekStart: Date): Promise<WeeklyPaycheck | undefined>;
  updateWeeklyPaycheck(id: string, updates: Partial<WeeklyPaycheck>): Promise<WeeklyPaycheck | undefined>;
  
  // Rule violations
  createRuleViolation(violation: InsertRuleViolation): Promise<RuleViolation>;
  getRuleViolations(userId: string, limit?: number): Promise<RuleViolation[]>;
  getActiveViolations(userId: string): Promise<RuleViolation[]>;
  acknowledgeViolation(id: string): Promise<RuleViolation | undefined>;

  // Strategic Portfolio Analysis
  createStrategicAnalysis(userId: string, analysis: InsertStrategicAnalysis): Promise<StrategicAnalysis>;
  getLatestStrategicAnalysis(userId: string): Promise<StrategicAnalysis | null>;
  getStrategicAnalysisHistory(userId: string): Promise<StrategicAnalysis[]>;
  createPortfolioHolding(holding: InsertPortfolioHolding): Promise<PortfolioHolding>;
  getPortfolioHoldings(userId: string): Promise<PortfolioHolding[]>;
  createEconomicEvent(event: InsertEconomicEvent): Promise<EconomicEvent>;
  getUpcomingEconomicEvents(): Promise<EconomicEvent[]>;

  // Algorithmic Trading Strategies
  createAlgorithmicStrategy(strategy: InsertAlgorithmicStrategy): Promise<AlgorithmicStrategy>;
  getAlgorithmicStrategies(userId: string): Promise<AlgorithmicStrategy[]>;
  getAlgorithmicStrategy(id: string): Promise<AlgorithmicStrategy | null>;
  updateAlgorithmicStrategy(id: string, updates: Partial<InsertAlgorithmicStrategy>): Promise<AlgorithmicStrategy>;
  deleteAlgorithmicStrategy(id: string): Promise<void>;
  
  // Strategy Stock Picks
  createStrategyStockPick(pick: InsertStrategyStockPick): Promise<StrategyStockPick>;
  getStrategyStockPicks(strategyId: string): Promise<StrategyStockPick[]>;
  getActiveStockPicks(userId: string): Promise<StrategyStockPick[]>;
  updateStockPickStatus(id: string, status: string): Promise<void>;

  // Trading Journal Entry methods - PROFESSIONAL PERSISTENT TRACKING
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getJournalEntries(userId: string, limit?: number): Promise<JournalEntry[]>;
  getJournalEntry(id: string): Promise<JournalEntry | undefined>;
  updateJournalEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry | undefined>;
  getJournalEntriesByStrategy(strategy: string): Promise<JournalEntry[]>;
  getJournalEntriesBySymbol(symbol: string): Promise<JournalEntry[]>;
  getOpenJournalEntries(userId: string): Promise<JournalEntry[]>;
  getJournalPerformanceMetrics(userId: string): Promise<{
    totalTrades: number;
    winRate: number;
    avgPnl: number;
    totalPnl: number;
    bestTrade: number;
    worstTrade: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private strategies: Map<string, Strategy>;
  private trades: Map<string, Trade>;
  private portfolioSnapshots: Map<string, PortfolioSnapshot>;
  private marketData: Map<string, MarketData>;
  private ohlcvCandles: Map<string, OHLCVCandles>;
  private patternSignals: Map<string, PatternSignal>;
  private patternConfigs: Map<string, PatternConfig>;
  private patternOutcomes: Map<string, PatternOutcome>;
  // PIRATETRADER storage
  private optionTrades: Map<string, OptionTrade>;
  private dailySessions: Map<string, DailySession>;
  private weeklyPaychecks: Map<string, WeeklyPaycheck>;
  private ruleViolations: Map<string, RuleViolation>;
  // Strategic Analysis storage
  private strategicAnalyses: Map<string, StrategicAnalysis>;
  private portfolioHoldings: Map<string, PortfolioHolding>;
  private economicEvents: Map<string, EconomicEvent>;
  // Algorithmic Strategies storage
  private algorithmicStrategies: Map<string, AlgorithmicStrategy>;
  private strategyStockPicks: Map<string, StrategyStockPick>;
  // Trading Journal storage - PROFESSIONAL PERSISTENT TRACKING
  private journalEntries: Map<string, JournalEntry>;

  constructor() {
    this.users = new Map();
    this.strategies = new Map();
    this.trades = new Map();
    this.portfolioSnapshots = new Map();
    this.marketData = new Map();
    this.ohlcvCandles = new Map();
    this.patternSignals = new Map();
    this.patternConfigs = new Map();
    this.patternOutcomes = new Map();
    // PIRATETRADER storage
    this.optionTrades = new Map();
    this.dailySessions = new Map();
    this.weeklyPaychecks = new Map();
    this.ruleViolations = new Map();
    // Strategic Analysis storage
    this.strategicAnalyses = new Map();
    this.portfolioHoldings = new Map();
    this.economicEvents = new Map();
    // Algorithmic Strategies storage
    this.algorithmicStrategies = new Map();
    this.strategyStockPicks = new Map();
    // Trading Journal storage
    this.journalEntries = new Map();

    // Initialize with a demo user
    this.initializeDemoData();
    
    // Load existing journal entries from disk on startup
    this.loadJournalFromFile();
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
      alpacaOrderId: insertTrade.alpacaOrderId || null,
      patternSignalId: insertTrade.patternSignalId || null
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

  // OHLCV Candles methods
  async saveOHLCVCandles(insertCandles: InsertOHLCVCandles[]): Promise<OHLCVCandles[]> {
    const candles: OHLCVCandles[] = [];
    
    for (const insertCandle of insertCandles) {
      const id = randomUUID();
      const candle: OHLCVCandles = {
        ...insertCandle,
        id,
        open: insertCandle.open.toString(),
        high: insertCandle.high.toString(),
        low: insertCandle.low.toString(),
        close: insertCandle.close.toString(),
      };
      
      // Use symbol-timeframe-timestamp as key for uniqueness
      const key = `${candle.symbol}-${candle.timeframe}-${candle.timestamp.getTime()}`;
      this.ohlcvCandles.set(key, candle);
      candles.push(candle);
    }
    
    return candles;
  }

  async getOHLCVCandles(symbol: string, timeframe: string, limit: number = 100): Promise<OHLCVCandles[]> {
    const symbolCandles = Array.from(this.ohlcvCandles.values())
      .filter(candle => candle.symbol === symbol && candle.timeframe === timeframe)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    
    return symbolCandles.reverse(); // Return in chronological order
  }

  async getOHLCVCandlesInRange(
    symbol: string, 
    timeframe: string, 
    startTime: Date, 
    endTime: Date
  ): Promise<OHLCVCandles[]> {
    return Array.from(this.ohlcvCandles.values())
      .filter(candle => 
        candle.symbol === symbol && 
        candle.timeframe === timeframe &&
        candle.timestamp >= startTime &&
        candle.timestamp <= endTime
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Pattern Signal methods
  async createPatternSignal(insertSignal: InsertPatternSignal): Promise<PatternSignal> {
    const id = randomUUID();
    const signal: PatternSignal = {
      ...insertSignal,
      id,
      confidence: insertSignal.confidence.toString(),
      priceLevel: insertSignal.priceLevel.toString(),
      metadata: insertSignal.metadata || null,
      createdAt: new Date(),
      isActive: insertSignal.isActive ?? true
    };
    
    this.patternSignals.set(id, signal);
    return signal;
  }

  async getPatternSignals(strategyId: string, isActive?: boolean): Promise<PatternSignal[]> {
    return Array.from(this.patternSignals.values())
      .filter(signal => 
        signal.strategyId === strategyId &&
        (isActive === undefined || signal.isActive === isActive)
      )
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  async getPatternSignalById(signalId: string): Promise<PatternSignal | undefined> {
    return this.patternSignals.get(signalId);
  }

  async getPatternSignalsByUser(userId: string): Promise<PatternSignal[]> {
    const userStrategies = await this.getStrategies(userId);
    const strategyIds = new Set(userStrategies.map(s => s.id));
    
    return Array.from(this.patternSignals.values())
      .filter(signal => strategyIds.has(signal.strategyId))
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  async getPatternSignalsBySymbol(symbol: string, patternType?: string): Promise<PatternSignal[]> {
    return Array.from(this.patternSignals.values())
      .filter(signal => 
        signal.symbol === symbol &&
        (patternType === undefined || signal.patternType === patternType) &&
        signal.isActive
      )
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  async updatePatternSignal(id: string, updates: Partial<PatternSignal>): Promise<PatternSignal | undefined> {
    const signal = this.patternSignals.get(id);
    if (!signal) return undefined;
    
    const updatedSignal = { ...signal, ...updates };
    this.patternSignals.set(id, updatedSignal);
    return updatedSignal;
  }

  async getActivePatternSignals(): Promise<ActivePatternSignal[]> {
    const activeSignals = Array.from(this.patternSignals.values())
      .filter(signal => signal.isActive)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

    // Convert to ActivePatternSignal format with additional data
    return Promise.all(activeSignals.map(async (signal) => {
      const strategy = await this.getStrategy(signal.strategyId);
      const latestPrice = await this.getLatestMarketData(signal.symbol);
      
      return {
        id: signal.id,
        symbol: signal.symbol,
        patternType: signal.patternType,
        confidence: parseFloat(signal.confidence),
        detectedAt: signal.detectedAt,
        priceLevel: parseFloat(signal.priceLevel),
        currentPrice: latestPrice ? parseFloat(latestPrice.price) : parseFloat(signal.priceLevel),
        priceChange: latestPrice ? 
          ((parseFloat(latestPrice.price) - parseFloat(signal.priceLevel)) / parseFloat(signal.priceLevel)) * 100 : 0,
        metadata: signal.metadata || {},
        strategyName: strategy?.name || 'Unknown',
        isActive: signal.isActive,
      };
    }));
  }

  async getPatternAnalysis(strategyId?: string): Promise<PatternAnalysisResponse> {
    let relevantSignals = Array.from(this.patternSignals.values());
    
    if (strategyId) {
      relevantSignals = relevantSignals.filter(signal => signal.strategyId === strategyId);
    }

    const activeSignals = relevantSignals.filter(signal => signal.isActive);
    const patternTypeCounts = new Map<string, { count: number; totalConfidence: number }>();
    
    // Aggregate pattern type statistics
    for (const signal of relevantSignals) {
      const existing = patternTypeCounts.get(signal.patternType) || { count: 0, totalConfidence: 0 };
      patternTypeCounts.set(signal.patternType, {
        count: existing.count + 1,
        totalConfidence: existing.totalConfidence + parseFloat(signal.confidence)
      });
    }

    const patternTypes = Array.from(patternTypeCounts.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      averageConfidence: stats.totalConfidence / stats.count
    }));

    const activePatternSignals = await this.getActivePatternSignals();

    // Get outcomes for performance metrics
    const performanceMetrics = await Promise.all(
      patternTypes.map(async ({ type }) => this.getPatternPerformanceByType(type, strategyId))
    );

    return {
      summary: {
        totalPatterns: relevantSignals.length,
        activePatterns: activeSignals.length,
        patternTypes,
        topPerformingPatterns: performanceMetrics
          .sort((a: PatternPerformanceMetrics, b: PatternPerformanceMetrics) => b.successRate - a.successRate)
          .slice(0, 5)
          .map((p: PatternPerformanceMetrics) => ({
            type: p.patternType,
            successRate: p.successRate,
            avgProfitLoss: p.averageProfitLoss
          }))
      },
      activeSignals: activePatternSignals,
      performanceMetrics,
      recentPatterns: relevantSignals
        .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
        .slice(0, 10)
        .map(signal => {
          const outcomes = Array.from(this.patternOutcomes.values())
            .filter(o => o.patternSignalId === signal.id);
          const outcome = outcomes.length > 0 ? outcomes[0].outcome : 'pending';
          
          return {
            symbol: signal.symbol,
            patternType: signal.patternType,
            detectedAt: signal.detectedAt,
            confidence: parseFloat(signal.confidence),
            outcome: outcome as any
          };
        })
    };
  }

  // Pattern Configuration methods
  async createPatternConfig(insertConfig: InsertPatternConfig): Promise<PatternConfig> {
    const id = randomUUID();
    const now = new Date();
    const config: PatternConfig = {
      ...insertConfig,
      id,
      isActive: insertConfig.isActive ?? true,
      createdAt: now,
      updatedAt: now
    };
    this.patternConfigs.set(id, config);
    return config;
  }

  async getPatternConfigs(strategyId: string): Promise<PatternConfig[]> {
    return Array.from(this.patternConfigs.values())
      .filter(config => config.strategyId === strategyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPatternConfig(strategyId: string, patternType: string): Promise<PatternConfig | undefined> {
    return Array.from(this.patternConfigs.values())
      .find(config => config.strategyId === strategyId && config.patternType === patternType);
  }

  async updatePatternConfig(id: string, updates: Partial<PatternConfig>): Promise<PatternConfig | undefined> {
    const config = this.patternConfigs.get(id);
    if (!config) return undefined;
    
    const updatedConfig = { ...config, ...updates, updatedAt: new Date() };
    this.patternConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  async deletePatternConfig(id: string): Promise<boolean> {
    return this.patternConfigs.delete(id);
  }

  // Optimized search method for pattern configs by user
  async getPatternConfigsByUser(userId: string): Promise<PatternConfig[]> {
    const userStrategies = await this.getStrategies(userId);
    const strategyIds = new Set(userStrategies.map(s => s.id));
    
    return Array.from(this.patternConfigs.values())
      .filter(config => strategyIds.has(config.strategyId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Pattern Outcome methods
  async createPatternOutcome(insertOutcome: InsertPatternOutcome): Promise<PatternOutcome> {
    const id = randomUUID();
    const outcome: PatternOutcome = {
      ...insertOutcome,
      id,
      recordedAt: new Date(),
      metadata: insertOutcome.metadata || {}
    };
    this.patternOutcomes.set(id, outcome);
    return outcome;
  }

  async getPatternOutcomes(patternSignalId: string): Promise<PatternOutcome[]> {
    return Array.from(this.patternOutcomes.values())
      .filter(outcome => outcome.patternSignalId === patternSignalId)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  async getPatternOutcomesByStrategy(strategyId: string): Promise<PatternOutcome[]> {
    const strategySignals = await this.getPatternSignals(strategyId);
    const signalIds = new Set(strategySignals.map(s => s.id));
    
    return Array.from(this.patternOutcomes.values())
      .filter(outcome => signalIds.has(outcome.patternSignalId))
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  async updatePatternOutcome(id: string, updates: Partial<PatternOutcome>): Promise<PatternOutcome | undefined> {
    const outcome = this.patternOutcomes.get(id);
    if (!outcome) return undefined;
    
    const updatedOutcome = { ...outcome, ...updates };
    this.patternOutcomes.set(id, updatedOutcome);
    return updatedOutcome;
  }

  // Batch operations for better performance
  async createMultiplePatternSignals(signals: InsertPatternSignal[]): Promise<PatternSignal[]> {
    const createdSignals: PatternSignal[] = [];
    for (const signal of signals) {
      const created = await this.createPatternSignal(signal);
      createdSignals.push(created);
    }
    return createdSignals;
  }

  async getPatternSignalsInTimeRange(
    startDate: Date, 
    endDate: Date, 
    strategyId?: string, 
    patternTypes?: string[]
  ): Promise<PatternSignal[]> {
    return Array.from(this.patternSignals.values())
      .filter(signal => {
        const inTimeRange = signal.detectedAt >= startDate && signal.detectedAt <= endDate;
        const matchesStrategy = !strategyId || signal.strategyId === strategyId;
        const matchesPattern = !patternTypes || patternTypes.includes(signal.patternType);
        return inTimeRange && matchesStrategy && matchesPattern;
      })
      .sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime());
  }

  // Performance analytics caching for heavy computations
  private performanceCache = new Map<string, { data: any; timestamp: Date; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private getCachedResult<T>(key: string): T | null {
    const cached = this.performanceCache.get(key);
    if (cached && (Date.now() - cached.timestamp.getTime()) < cached.ttl) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedResult<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.performanceCache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });
  }

  // Enhanced Analytics methods
  async getPatternPerformanceByType(patternType: string, strategyId?: string): Promise<PatternPerformanceMetrics> {
    // Use caching for performance metrics
    const cacheKey = `performance:${patternType}:${strategyId || 'all'}`;
    const cached = this.getCachedResult<PatternPerformanceMetrics>(cacheKey);
    if (cached) {
      return cached;
    }
    let relevantSignals = Array.from(this.patternSignals.values())
      .filter(signal => signal.patternType === patternType);
    
    if (strategyId) {
      relevantSignals = relevantSignals.filter(signal => signal.strategyId === strategyId);
    }

    const signalIds = new Set(relevantSignals.map(s => s.id));
    const outcomes = Array.from(this.patternOutcomes.values())
      .filter(outcome => signalIds.has(outcome.patternSignalId));

    const successfulOutcomes = outcomes.filter(o => o.outcome === 'success');
    const totalProfitLoss = outcomes.reduce((sum, o) => sum + o.profitLoss, 0);
    const averageHoldTime = outcomes.length > 0 
      ? outcomes.reduce((sum, o) => sum + o.holdTime, 0) / outcomes.length / 60 // convert to hours
      : 0;

    // Calculate symbol performance
    const symbolPnL = new Map<string, number>();
    for (const outcome of outcomes) {
      const signal = relevantSignals.find(s => s.id === outcome.patternSignalId);
      if (signal) {
        const current = symbolPnL.get(signal.symbol) || 0;
        symbolPnL.set(signal.symbol, current + outcome.profitLoss);
      }
    }

    const sortedSymbols = Array.from(symbolPnL.entries())
      .sort((a, b) => b[1] - a[1]);

    const result: PatternPerformanceMetrics = {
      patternType,
      totalSignals: relevantSignals.length,
      successfulSignals: successfulOutcomes.length,
      successRate: outcomes.length > 0 ? (successfulOutcomes.length / outcomes.length) * 100 : 0,
      averageHoldTime,
      totalProfitLoss,
      averageProfitLoss: outcomes.length > 0 ? totalProfitLoss / outcomes.length : 0,
      bestPerformingSymbol: sortedSymbols.length > 0 ? sortedSymbols[0][0] : '',
      worstPerformingSymbol: sortedSymbols.length > 0 ? sortedSymbols[sortedSymbols.length - 1][0] : ''
    };

    // Cache the result
    this.setCachedResult(cacheKey, result);
    return result;
  }

  async backtestPatterns(request: PatternBacktestRequest): Promise<PatternBacktestResult> {
    // This would be a comprehensive backtesting implementation
    // For now, returning a basic structure with sample data
    
    const relevantSignals = Array.from(this.patternSignals.values())
      .filter(signal => 
        signal.strategyId === request.strategyId &&
        request.symbols.includes(signal.symbol) &&
        signal.detectedAt >= request.startDate &&
        signal.detectedAt <= request.endDate &&
        (!request.patternTypes || request.patternTypes.includes(signal.patternType))
      );

    const signalIds = new Set(relevantSignals.map(s => s.id));
    const outcomes = Array.from(this.patternOutcomes.values())
      .filter(outcome => signalIds.has(outcome.patternSignalId));

    const profitableSignals = outcomes.filter(o => o.outcome === 'success').length;
    const totalPnL = outcomes.reduce((sum, o) => sum + o.profitLoss, 0);
    const averageHoldTime = outcomes.length > 0 
      ? outcomes.reduce((sum, o) => sum + o.holdTime, 0) / outcomes.length
      : 0;

    // Calculate max drawdown (simplified)
    let maxDrawdown = 0;
    let runningPnL = 0;
    let peak = 0;
    for (const outcome of outcomes.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())) {
      runningPnL += outcome.profitLoss;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = (peak - runningPnL) / peak * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Simplified Sharpe ratio calculation
    const returns = outcomes.map(o => o.profitLoss);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 1 
      ? returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / (returns.length - 1)
      : 0;
    const sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;

    return {
      totalSignals: relevantSignals.length,
      profitableSignals,
      totalPnL,
      winRate: outcomes.length > 0 ? (profitableSignals / outcomes.length) * 100 : 0,
      averageHoldTime,
      maxDrawdown,
      sharpeRatio,
      signals: outcomes.map(outcome => {
        const signal = relevantSignals.find(s => s.id === outcome.patternSignalId)!;
        return {
          symbol: signal.symbol,
          patternType: signal.patternType,
          detectedAt: signal.detectedAt,
          outcome: outcome.outcome,
          pnl: outcome.profitLoss,
          holdTime: outcome.holdTime
        };
      })
    };
  }

  // PIRATETRADER implementation methods
  async createOptionTrade(insertTrade: InsertOptionTrade): Promise<OptionTrade> {
    const id = randomUUID();
    const trade: OptionTrade = {
      id,
      ...insertTrade,
      openedAt: insertTrade.openedAt || new Date(),
      isActive: insertTrade.isActive ?? true,
      hasStrayLegs: insertTrade.hasStrayLegs ?? false,
      legsClosed: insertTrade.legsClosed ?? false,
      closedAt: insertTrade.closedAt || null,
      realizedPnl: insertTrade.realizedPnl || null
    };
    this.optionTrades.set(id, trade);
    return trade;
  }

  async getOptionTrades(userId: string, limit?: number): Promise<OptionTrade[]> {
    const userTrades = Array.from(this.optionTrades.values())
      .filter(trade => trade.userId === userId)
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
    
    return limit ? userTrades.slice(0, limit) : userTrades;
  }

  async getActiveOptionTrades(userId: string, symbol?: string): Promise<OptionTrade[]> {
    let activeTrades = Array.from(this.optionTrades.values())
      .filter(trade => trade.userId === userId && trade.isActive);
    
    if (symbol) {
      activeTrades = activeTrades.filter(trade => trade.symbol === symbol);
    }
    
    return activeTrades;
  }

  async updateOptionTrade(id: string, updates: Partial<OptionTrade>): Promise<OptionTrade | undefined> {
    const trade = this.optionTrades.get(id);
    if (!trade) return undefined;
    
    const updatedTrade = { ...trade, ...updates };
    this.optionTrades.set(id, updatedTrade);
    return updatedTrade;
  }

  async createDailySession(insertSession: InsertDailySession): Promise<DailySession> {
    const id = randomUUID();
    const session: DailySession = {
      id,
      ...insertSession,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.dailySessions.set(id, session);
    return session;
  }

  async getDailySession(userId: string, date: string): Promise<DailySession | undefined> {
    return Array.from(this.dailySessions.values())
      .find(session => 
        session.userId === userId && 
        session.sessionDate.toISOString().split('T')[0] === date
      );
  }

  async updateDailySession(id: string, updates: Partial<DailySession>): Promise<DailySession | undefined> {
    const session = this.dailySessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates, updatedAt: new Date() };
    this.dailySessions.set(id, updatedSession);
    return updatedSession;
  }

  async createWeeklyPaycheck(insertPaycheck: InsertWeeklyPaycheck): Promise<WeeklyPaycheck> {
    const id = randomUUID();
    const paycheck: WeeklyPaycheck = {
      id,
      ...insertPaycheck,
      createdAt: new Date()
    };
    this.weeklyPaychecks.set(id, paycheck);
    return paycheck;
  }

  async getWeeklyPaycheck(userId: string, weekStart: Date): Promise<WeeklyPaycheck | undefined> {
    return Array.from(this.weeklyPaychecks.values())
      .find(paycheck => 
        paycheck.userId === userId && 
        paycheck.weekStarting.toISOString().split('T')[0] === weekStart.toISOString().split('T')[0]
      );
  }

  async updateWeeklyPaycheck(id: string, updates: Partial<WeeklyPaycheck>): Promise<WeeklyPaycheck | undefined> {
    const paycheck = this.weeklyPaychecks.get(id);
    if (!paycheck) return undefined;
    
    const updatedPaycheck = { ...paycheck, ...updates };
    this.weeklyPaychecks.set(id, updatedPaycheck);
    return updatedPaycheck;
  }

  async createRuleViolation(insertViolation: InsertRuleViolation): Promise<RuleViolation> {
    const id = randomUUID();
    const violation: RuleViolation = {
      id,
      ...insertViolation,
      detectedAt: new Date()
    };
    this.ruleViolations.set(id, violation);
    return violation;
  }

  async getRuleViolations(userId: string, limit?: number): Promise<RuleViolation[]> {
    const userViolations = Array.from(this.ruleViolations.values())
      .filter(violation => violation.userId === userId)
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    
    return limit ? userViolations.slice(0, limit) : userViolations;
  }

  async getActiveViolations(userId: string): Promise<RuleViolation[]> {
    return Array.from(this.ruleViolations.values())
      .filter(violation => 
        violation.userId === userId && 
        !violation.userAcknowledged && 
        !violation.autoResolved
      );
  }

  async acknowledgeViolation(id: string): Promise<RuleViolation | undefined> {
    const violation = this.ruleViolations.get(id);
    if (!violation) return undefined;
    
    const updatedViolation = { ...violation, userAcknowledged: true };
    this.ruleViolations.set(id, updatedViolation);
    return updatedViolation;
  }

  // Strategic Analysis methods
  async createStrategicAnalysis(userId: string, insertAnalysis: InsertStrategicAnalysis): Promise<StrategicAnalysis> {
    const id = randomUUID();
    const analysis: StrategicAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date(),
      fedPolicyExpectation: insertAnalysis.fedPolicyExpectation || null,
      volatilityExpectation: insertAnalysis.volatilityExpectation || null,
      aiAnalysis: insertAnalysis.aiAnalysis || null,
      keyEvents: insertAnalysis.keyEvents || null,
      recommendations: insertAnalysis.recommendations || null,
      portfolioRisk: insertAnalysis.portfolioRisk || null,
      correlation: insertAnalysis.correlation?.toString() || null,
      confidence: insertAnalysis.confidence || null
    };
    this.strategicAnalyses.set(id, analysis);
    return analysis;
  }

  async getLatestStrategicAnalysis(userId: string): Promise<StrategicAnalysis | undefined> {
    const userAnalyses = Array.from(this.strategicAnalyses.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime());
    
    return userAnalyses[0];
  }

  async getStrategicAnalyses(userId: string, limit: number = 10): Promise<StrategicAnalysis[]> {
    return Array.from(this.strategicAnalyses.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime())
      .slice(0, limit);
  }

  async getPortfolioHoldings(userId: string): Promise<PortfolioHolding[]> {
    return Array.from(this.portfolioHoldings.values())
      .filter(holding => holding.userId === userId && holding.isActive);
  }

  async upsertPortfolioHolding(insertHolding: InsertPortfolioHolding): Promise<PortfolioHolding> {
    // Check if holding already exists for this user and symbol
    const existingHolding = Array.from(this.portfolioHoldings.values())
      .find(h => h.userId === insertHolding.userId && h.symbol === insertHolding.symbol);

    if (existingHolding) {
      // Update existing holding
      const updatedHolding: PortfolioHolding = {
        ...existingHolding,
        ...insertHolding,
        lastUpdated: new Date()
      };
      this.portfolioHoldings.set(existingHolding.id, updatedHolding);
      return updatedHolding;
    } else {
      // Create new holding
      const id = randomUUID();
      const holding: PortfolioHolding = {
        ...insertHolding,
        id,
        currentPrice: insertHolding.currentPrice?.toString() || null,
        marketValue: insertHolding.marketValue?.toString() || null,
        unrealizedPnl: insertHolding.unrealizedPnl?.toString() || null,
        averageCost: insertHolding.averageCost.toString(),
        beta: insertHolding.beta?.toString() || null,
        sector: insertHolding.sector || null,
        marketCap: insertHolding.marketCap || null,
        riskRating: insertHolding.riskRating || null,
        catalysts: insertHolding.catalysts || null,
        technicalLevel: insertHolding.technicalLevel || null,
        isActive: insertHolding.isActive ?? true,
        lastUpdated: new Date(),
        createdAt: new Date()
      };
      this.portfolioHoldings.set(id, holding);
      return holding;
    }
  }

  async updatePortfolioHolding(id: string, updates: Partial<PortfolioHolding>): Promise<PortfolioHolding | undefined> {
    const holding = this.portfolioHoldings.get(id);
    if (!holding) return undefined;
    
    const updatedHolding = { ...holding, ...updates, lastUpdated: new Date() };
    this.portfolioHoldings.set(id, updatedHolding);
    return updatedHolding;
  }

  async createEconomicEvent(insertEvent: InsertEconomicEvent): Promise<EconomicEvent> {
    const id = randomUUID();
    const event: EconomicEvent = {
      ...insertEvent,
      id,
      impact: insertEvent.impact || null,
      details: insertEvent.details || null,
      actualValue: insertEvent.actualValue || null,
      expectedValue: insertEvent.expectedValue || null,
      previousValue: insertEvent.previousValue || null,
      marketImpact: insertEvent.marketImpact || null,
      sectorImpact: insertEvent.sectorImpact || null,
      isResolved: insertEvent.isResolved ?? false,
      createdAt: new Date()
    };
    this.economicEvents.set(id, event);
    return event;
  }

  async getUpcomingEconomicEvents(daysAhead: number = 7): Promise<EconomicEvent[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    return Array.from(this.economicEvents.values())
      .filter(event => event.eventDate <= cutoffDate && event.eventDate >= new Date())
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }

  async getEconomicEventsByCategory(category: string): Promise<EconomicEvent[]> {
    return Array.from(this.economicEvents.values())
      .filter(event => event.category === category)
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }

  // Algorithmic Trading Strategies Implementation
  async createAlgorithmicStrategy(insertStrategy: InsertAlgorithmicStrategy): Promise<AlgorithmicStrategy> {
    const id = randomUUID();
    const strategy: AlgorithmicStrategy = {
      ...insertStrategy,
      id,
      dailyLossLimit: insertStrategy.dailyLossLimit.toString(),
      maxRiskPerTrade: insertStrategy.maxRiskPerTrade.toString(),
      riskRewardMin: insertStrategy.riskRewardMin.toString(),
      dailyTarget: insertStrategy.dailyTarget.toString(),
      weeklyBaseline: insertStrategy.weeklyBaseline.toString(),
      weeklyStretch: insertStrategy.weeklyStretch.toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.algorithmicStrategies.set(id, strategy);
    return strategy;
  }

  async getAlgorithmicStrategies(userId: string): Promise<AlgorithmicStrategy[]> {
    return Array.from(this.algorithmicStrategies.values())
      .filter(strategy => strategy.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAlgorithmicStrategy(id: string): Promise<AlgorithmicStrategy | null> {
    return this.algorithmicStrategies.get(id) || null;
  }

  async updateAlgorithmicStrategy(id: string, updates: Partial<InsertAlgorithmicStrategy>): Promise<AlgorithmicStrategy> {
    const strategy = this.algorithmicStrategies.get(id);
    if (!strategy) {
      throw new Error(`Algorithmic strategy with id ${id} not found`);
    }

    const updatedStrategy: AlgorithmicStrategy = {
      ...strategy,
      ...updates,
      dailyLossLimit: updates.dailyLossLimit?.toString() || strategy.dailyLossLimit,
      maxRiskPerTrade: updates.maxRiskPerTrade?.toString() || strategy.maxRiskPerTrade,
      riskRewardMin: updates.riskRewardMin?.toString() || strategy.riskRewardMin,
      dailyTarget: updates.dailyTarget?.toString() || strategy.dailyTarget,
      weeklyBaseline: updates.weeklyBaseline?.toString() || strategy.weeklyBaseline,
      weeklyStretch: updates.weeklyStretch?.toString() || strategy.weeklyStretch,
      updatedAt: new Date()
    };
    this.algorithmicStrategies.set(id, updatedStrategy);
    return updatedStrategy;
  }

  async deleteAlgorithmicStrategy(id: string): Promise<void> {
    // Also delete associated stock picks
    const picks = Array.from(this.strategyStockPicks.values())
      .filter(pick => pick.strategyId === id);
    picks.forEach(pick => this.strategyStockPicks.delete(pick.id));
    
    this.algorithmicStrategies.delete(id);
  }

  // Strategy Stock Picks Implementation
  async createStrategyStockPick(insertPick: InsertStrategyStockPick): Promise<StrategyStockPick> {
    const id = randomUUID();
    const pick: StrategyStockPick = {
      ...insertPick,
      id,
      scannerScore: insertPick.scannerScore?.toString() || null,
      rvol: insertPick.rvol?.toString() || null,
      price: insertPick.price.toString(),
      rsi: insertPick.rsi?.toString() || null,
      createdAt: new Date()
    };
    this.strategyStockPicks.set(id, pick);
    return pick;
  }

  async getStrategyStockPicks(strategyId: string): Promise<StrategyStockPick[]> {
    return Array.from(this.strategyStockPicks.values())
      .filter(pick => pick.strategyId === strategyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getActiveStockPicks(userId: string): Promise<StrategyStockPick[]> {
    const userStrategies = await this.getAlgorithmicStrategies(userId);
    const strategyIds = userStrategies.map(s => s.id);
    
    return Array.from(this.strategyStockPicks.values())
      .filter(pick => strategyIds.includes(pick.strategyId) && pick.status === 'active')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateStockPickStatus(id: string, status: string): Promise<void> {
    const pick = this.strategyStockPicks.get(id);
    if (pick) {
      pick.status = status;
      this.strategyStockPicks.set(id, pick);
    }
  }

  async getStrategicAnalysisHistory(userId: string): Promise<StrategicAnalysis[]> {
    return Array.from(this.strategicAnalyses.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime());
  }

  async createPortfolioHolding(insertHolding: InsertPortfolioHolding): Promise<PortfolioHolding> {
    const id = randomUUID();
    const holding: PortfolioHolding = {
      ...insertHolding,
      id,
      currentPrice: insertHolding.currentPrice || null,
      marketValue: insertHolding.marketValue || null,
      unrealizedPnl: insertHolding.unrealizedPnl || null,
      sector: insertHolding.sector || null,
      marketCap: insertHolding.marketCap || null,
      beta: insertHolding.beta || null,
      riskRating: insertHolding.riskRating || null,
      catalysts: insertHolding.catalysts || null,
      technicalLevel: insertHolding.technicalLevel || null,
      isActive: insertHolding.isActive ?? true,
      lastUpdated: new Date(),
      createdAt: new Date()
    };
    
    this.portfolioHoldings.set(id, holding);
    return holding;
  }

  // Trading Journal Entry methods - ACTUAL FILE-BASED PERSISTENCE
  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const id = randomUUID();
    const now = new Date();
    
    const entry: JournalEntry = {
      ...insertEntry,
      id,
      timestamp: insertEntry.timestamp || now,
      createdAt: now,
      updatedAt: now,
      spreadType: insertEntry.spreadType || null,
      exitPrice: insertEntry.exitPrice || null,
      stopLoss: insertEntry.stopLoss || null,
      takeProfit: insertEntry.takeProfit || null,
      riskRewardRatio: insertEntry.riskRewardRatio || null,
      realizedPnl: insertEntry.realizedPnl || null,
      unrealizedPnl: insertEntry.unrealizedPnl || null,
      whatWentWrong: insertEntry.whatWentWrong || null,
      whatWentRight: insertEntry.whatWentRight || null,
      lessonsLearned: insertEntry.lessonsLearned || null,
      catalyst: insertEntry.catalyst || null,
      volumeAnalysis: insertEntry.volumeAnalysis || null,
      executionNotes: insertEntry.executionNotes || null,
      tags: insertEntry.tags || []
    };
    
    // Store in memory AND persist to file
    this.journalEntries.set(id, entry);
    await this.persistJournalToFile();
    
    console.log(`💾 JOURNAL ENTRY PERSISTED TO DISK: ${entry.symbol} ${entry.tradeType} ${entry.strategy}`);
    return entry;
  }

  async getJournalEntries(userId: string, limit?: number): Promise<JournalEntry[]> {
    const userEntries = Array.from(this.journalEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? userEntries.slice(0, limit) : userEntries;
  }

  async getJournalEntry(id: string): Promise<JournalEntry | undefined> {
    return this.journalEntries.get(id);
  }

  async updateJournalEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry | undefined> {
    const entry = this.journalEntries.get(id);
    if (!entry) return undefined;
    
    const updatedEntry = { 
      ...entry, 
      ...updates, 
      updatedAt: new Date() 
    };
    
    // Update in memory AND persist to file
    this.journalEntries.set(id, updatedEntry);
    await this.persistJournalToFile();
    
    console.log(`💾 JOURNAL ENTRY UPDATED ON DISK: ${entry.symbol} ${entry.tradeType}`);
    return updatedEntry;
  }

  async getJournalEntriesByStrategy(strategy: string): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values())
      .filter(entry => entry.strategy === strategy)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getJournalEntriesBySymbol(symbol: string): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values())
      .filter(entry => entry.symbol === symbol)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getOpenJournalEntries(userId: string): Promise<JournalEntry[]> {
    return Array.from(this.journalEntries.values())
      .filter(entry => entry.userId === userId && entry.isOpen)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getJournalPerformanceMetrics(userId: string): Promise<{
    totalTrades: number;
    winRate: number;
    avgPnl: number;
    totalPnl: number;
    bestTrade: number;
    worstTrade: number;
  }> {
    const closedEntries = Array.from(this.journalEntries.values())
      .filter(entry => entry.userId === userId && !entry.isOpen && entry.realizedPnl);
    
    if (closedEntries.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgPnl: 0,
        totalPnl: 0,
        bestTrade: 0,
        worstTrade: 0
      };
    }
    
    const pnls = closedEntries.map(entry => parseFloat(entry.realizedPnl!));
    const wins = pnls.filter(pnl => pnl > 0);
    const totalPnl = pnls.reduce((sum, pnl) => sum + pnl, 0);
    
    return {
      totalTrades: closedEntries.length,
      winRate: (wins.length / closedEntries.length) * 100,
      avgPnl: totalPnl / closedEntries.length,
      totalPnl,
      bestTrade: Math.max(...pnls),
      worstTrade: Math.min(...pnls)
    };
  }

  // FILE PERSISTENCE METHODS - ACTUAL DISK STORAGE
  private readonly journalDataFile = './data/journal_entries.json';

  private async persistJournalToFile(): Promise<void> {
    try {
      const { mkdir, writeFile } = await import('fs/promises');
      
      // Ensure data directory exists
      await mkdir('./data', { recursive: true });
      
      // Convert Map to array for JSON serialization
      const journalData = Array.from(this.journalEntries.entries()).map(([id, entry]) => ({
        id,
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString()
      }));
      
      await writeFile(this.journalDataFile, JSON.stringify(journalData, null, 2), 'utf8');
      console.log(`💾 ${journalData.length} journal entries persisted to disk`);
    } catch (error) {
      console.error('❌ Failed to persist journal to file:', error);
    }
  }

  private async loadJournalFromFile(): Promise<void> {
    try {
      const { readFile } = await import('fs/promises');
      const data = await readFile(this.journalDataFile, 'utf8');
      const journalData = JSON.parse(data);
      
      // Restore Map from array data
      this.journalEntries.clear();
      for (const item of journalData) {
        const entry: JournalEntry = {
          ...item,
          timestamp: new Date(item.timestamp),
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        };
        this.journalEntries.set(entry.id, entry);
      }
      
      console.log(`📂 ${journalData.length} journal entries loaded from disk`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log('📂 No existing journal file found, starting fresh');
      } else {
        console.error('❌ Failed to load journal from file:', error);
      }
    }
  }
}

export const storage = new MemStorage();

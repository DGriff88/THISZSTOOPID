/**
 * PROFESSIONAL TRADING JOURNAL SYSTEM
 * 
 * Advanced performance tracking and analysis based on user's journal template.
 * Tracks every trade detail, performance metrics, and learning insights.
 */

interface JournalEntry {
  id: string;
  userId: string;
  timestamp: Date;
  
  // Trade Details
  symbol: string;
  strategy: string;
  tradeType: 'LONG' | 'SHORT' | 'SPREAD' | 'OPTION';
  spreadType?: 'DEBIT' | 'CREDIT';
  
  // Entry/Exit Data
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  positionSize: number;
  
  // Options Specific
  strikes?: string; // e.g., "420/425 call spread"
  expiry?: Date;
  impliedVolatility?: number;
  
  // Risk Management
  maxLoss: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  
  // Performance
  pnl?: number;
  pnlPercent?: number;
  isWinner?: boolean;
  daysHeld?: number;
  
  // Analysis & Learning
  whatWentWrong?: string;
  whatWentRight?: string;
  lessonsLearned?: string;
  tradeQuality: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
  
  // Market Context
  marketCondition: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'VOLATILE';
  catalyst?: string;
  volumeAnalysis?: string;
  
  // Execution Quality
  understoodBothSides: boolean;
  executionNotes?: string;
  
  // Metadata
  isOpen: boolean;
  tags: string[];
}

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  totalPnL: number;
  avgWinAmount: number;
  avgLossAmount: number;
  profitFactor: number;
  
  riskRewardAvg: number;
  maxDrawdown: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  
  strategyBreakdown: { [strategy: string]: PerformanceMetrics };
  timeframes: { [period: string]: PerformanceMetrics };
}

interface TradeAnalysis {
  patternRecognition: string[];
  commonMistakes: string[];
  improvementAreas: string[];
  strengthAreas: string[];
  recommendations: string[];
}

export class TradingJournalService {
  private storage: any;

  constructor(storageInstance?: any) {
    // Use provided storage or import the singleton
    this.storage = storageInstance;
  }

  private async getStorage() {
    if (!this.storage) {
      const { storage } = await import('../storage');
      this.storage = storage;
    }
    return this.storage;
  }

  /**
   * CREATE COMPREHENSIVE JOURNAL ENTRY
   * 
   * Records detailed trade information following professional journaling practices
   */
  async createJournalEntry(userId: string, tradeData: Partial<JournalEntry>): Promise<JournalEntry> {
    const storage = await this.getStorage();
    
    const insertData = {
      userId,
      timestamp: new Date(),
      symbol: tradeData.symbol || '',
      strategy: tradeData.strategy || '',
      tradeType: tradeData.tradeType || 'LONG',
      spreadType: tradeData.spreadType || null,
      
      entryPrice: (tradeData.entryPrice || 0).toString(),
      exitPrice: tradeData.exitPrice ? tradeData.exitPrice.toString() : null,
      quantity: tradeData.quantity || 0,
      positionSize: (tradeData.positionSize || 0).toString(),
      
      maxLoss: (tradeData.maxLoss || 0).toString(),
      stopLoss: tradeData.stopLoss ? tradeData.stopLoss.toString() : null,
      takeProfit: tradeData.takeProfit ? tradeData.takeProfit.toString() : null,
      riskRewardRatio: tradeData.riskRewardRatio ? tradeData.riskRewardRatio.toString() : null,
      
      tradeQuality: tradeData.tradeQuality || 'AVERAGE',
      marketCondition: tradeData.marketCondition || 'SIDEWAYS',
      understoodBothSides: tradeData.understoodBothSides ?? false,
      
      isOpen: true,
      realizedPnl: tradeData.realizedPnl ? tradeData.realizedPnl.toString() : null,
      unrealizedPnl: tradeData.unrealizedPnl ? tradeData.unrealizedPnl.toString() : null,
      
      // Professional analysis fields
      whatWentWrong: tradeData.whatWentWrong || null,
      whatWentRight: tradeData.whatWentRight || null,
      lessonsLearned: tradeData.lessonsLearned || null,
      catalyst: tradeData.catalyst || null,
      volumeAnalysis: tradeData.volumeAnalysis || null,
      executionNotes: tradeData.executionNotes || null,
      
      tags: tradeData.tags || [],
    };
    
    // Store in REAL PERSISTENT DATABASE using the new journal entry storage
    const entry = await storage.createJournalEntry(insertData);
    
    console.log(`📝 REAL PERSISTENT JOURNAL ENTRY: ${entry.strategy} ${entry.tradeType} ${entry.symbol}`);
    return entry;
  }

  /**
   * UPDATE TRADE EXIT AND CALCULATE PERFORMANCE
   * 
   * Records exit details and calculates comprehensive performance metrics
   */
  async updateTradeExit(entryId: string, exitData: {
    exitPrice: number;
    whatWentWrong?: string;
    whatWentRight?: string;
    lessonsLearned?: string;
    executionNotes?: string;
  }): Promise<JournalEntry> {
    const storage = await this.getStorage();
    const entry = await storage.getJournalEntry(entryId);
    
    if (!entry) {
      throw new Error('Journal entry not found');
    }
    
    // Calculate performance using persistent data
    const entryPrice = parseFloat(entry.entryPrice);
    const priceDiff = entry.tradeType === 'LONG' ? 
      exitData.exitPrice - entryPrice :
      entryPrice - exitData.exitPrice;
    
    const pnl = priceDiff * entry.quantity;
    const positionSize = parseFloat(entry.positionSize);
    const pnlPercent = (pnl / positionSize) * 100;
    const isWinner = pnl > 0;
    
    const daysHeld = Math.ceil(
      (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Update entry in PERSISTENT STORAGE
    const updatedEntry = await storage.updateJournalEntry(entryId, {
      exitPrice: exitData.exitPrice.toString(),
      realizedPnl: pnl.toString(),
      whatWentWrong: exitData.whatWentWrong,
      whatWentRight: exitData.whatWentRight,
      lessonsLearned: exitData.lessonsLearned,
      executionNotes: exitData.executionNotes,
      isOpen: false,
      updatedAt: new Date()
    });
    
    if (!updatedEntry) {
      throw new Error('Failed to update journal entry');
    }
    
    console.log(`📊 PERSISTENT TRADE CLOSED: ${isWinner ? 'WIN' : 'LOSS'} ${pnlPercent.toFixed(2)}% (${entry.symbol})`);
    return updatedEntry;
  }

  /**
   * CALCULATE COMPREHENSIVE PERFORMANCE METRICS
   * 
   * Analyzes all closed trades to provide detailed performance statistics
   */
  async calculatePerformanceMetrics(userId: string, days?: number): Promise<PerformanceMetrics> {
    const storage = await this.getStorage();
    const allEntries = await storage.getJournalEntries(userId);
    const userEntries = allEntries.filter(entry => !entry.isOpen);
    
    // Filter by time period if specified
    const filteredEntries = days ? 
      userEntries.filter(entry => {
        const daysSince = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= days;
      }) : userEntries;
    
    if (filteredEntries.length === 0) {
      return this.getEmptyMetrics();
    }
    
    const totalTrades = filteredEntries.length;
    const winningTrades = filteredEntries.filter(e => e.isWinner).length;
    const losingTrades = totalTrades - winningTrades;
    const winRate = (winningTrades / totalTrades) * 100;
    
    const totalPnL = filteredEntries.reduce((sum, e) => sum + (e.pnl || 0), 0);
    
    const winners = filteredEntries.filter(e => e.isWinner);
    const losers = filteredEntries.filter(e => !e.isWinner);
    
    const avgWinAmount = winners.length > 0 ? 
      winners.reduce((sum, e) => sum + (e.pnl || 0), 0) / winners.length : 0;
    
    const avgLossAmount = losers.length > 0 ? 
      Math.abs(losers.reduce((sum, e) => sum + (e.pnl || 0), 0) / losers.length) : 0;
    
    const profitFactor = avgLossAmount > 0 ? avgWinAmount / avgLossAmount : 0;
    
    const riskRewardAvg = filteredEntries.reduce((sum, e) => sum + e.riskRewardRatio, 0) / totalTrades;
    
    // Calculate drawdown and streaks
    const { maxDrawdown, consecutiveWins, consecutiveLosses } = this.calculateAdvancedMetrics(filteredEntries);
    
    // Strategy breakdown
    const strategyBreakdown = this.calculateStrategyBreakdown(filteredEntries);
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      avgWinAmount,
      avgLossAmount,
      profitFactor,
      riskRewardAvg,
      maxDrawdown,
      consecutiveWins,
      consecutiveLosses,
      strategyBreakdown,
      timeframes: {} // Can be expanded
    };
  }

  /**
   * GENERATE TRADE ANALYSIS AND INSIGHTS
   * 
   * Provides AI-like analysis of trading patterns and improvement areas
   */
  async generateTradeAnalysis(userId: string): Promise<TradeAnalysis> {
    const storage = await this.getStorage();
    const allEntries = await storage.getJournalEntries(userId);
    const userEntries = allEntries.filter(entry => !entry.isOpen);
    
    const patternRecognition: string[] = [];
    const commonMistakes: string[] = [];
    const improvementAreas: string[] = [];
    const strengthAreas: string[] = [];
    const recommendations: string[] = [];
    
    if (userEntries.length < 10) {
      recommendations.push('Need more trades (minimum 10) for reliable analysis');
      return { patternRecognition, commonMistakes, improvementAreas, strengthAreas, recommendations };
    }
    
    const metrics = await this.calculatePerformanceMetrics(userId);
    
    // Pattern Recognition
    const symbolFrequency = this.analyzeSymbolFrequency(userEntries);
    const topSymbol = Object.keys(symbolFrequency)[0];
    if (topSymbol) {
      patternRecognition.push(`Most traded symbol: ${topSymbol} (${symbolFrequency[topSymbol]} trades)`);
    }
    
    const avgRiskReward = metrics.riskRewardAvg;
    if (avgRiskReward >= 3) {
      patternRecognition.push('Excellent risk/reward discipline - consistently targeting 3:1 or better');
    } else if (avgRiskReward < 2) {
      patternRecognition.push('Risk/reward ratios below optimal - consider higher profit targets');
    }
    
    // Common Mistakes Analysis
    const poorQualityTrades = userEntries.filter(e => e.tradeQuality === 'POOR');
    if (poorQualityTrades.length > userEntries.length * 0.2) {
      commonMistakes.push('High percentage of poor quality trades - review entry criteria');
    }
    
    const losersWithoutStops = userEntries.filter(e => !e.isWinner && e.stopLoss === 0);
    if (losersWithoutStops.length > 0) {
      commonMistakes.push('Some losing trades had no stop loss - implement consistent risk management');
    }
    
    // Improvement Areas
    if (metrics.winRate < 50) {
      improvementAreas.push('Win rate below 50% - focus on entry timing and market analysis');
    }
    
    if (metrics.profitFactor < 1.5) {
      improvementAreas.push('Profit factor needs improvement - either increase winners or reduce losses');
    }
    
    if (metrics.consecutiveLosses > 5) {
      improvementAreas.push('Long losing streaks detected - consider position sizing and market conditions');
    }
    
    // Strength Areas
    if (metrics.winRate > 60) {
      strengthAreas.push('Strong win rate indicates good market timing and analysis');
    }
    
    if (avgRiskReward > 2.5) {
      strengthAreas.push('Excellent risk management with high risk/reward ratios');
    }
    
    if (metrics.totalPnL > 0) {
      strengthAreas.push('Overall profitable trading - maintaining positive expectancy');
    }
    
    // Recommendations
    if (metrics.winRate < 50 && avgRiskReward < 2) {
      recommendations.push('Focus on the $100 to $1000 rules: 1:3 minimum risk/reward ratio');
    }
    
    if (metrics.avgLossAmount > metrics.avgWinAmount) {
      recommendations.push('Cut losses faster - average loss exceeds average win');
    }
    
    recommendations.push('Continue following the trend pullback and reversal strategies for best results');
    
    return {
      patternRecognition,
      commonMistakes,
      improvementAreas,
      strengthAreas,
      recommendations
    };
  }

  /**
   * GET RECENT JOURNAL ENTRIES
   */
  async getRecentEntries(userId: string, limit: number = 20): Promise<JournalEntry[]> {
    const storage = await this.getStorage();
    const allEntries = await storage.getJournalEntries(userId, limit);
    
    // Entries are already sorted by timestamp in storage layer
    return allEntries;
  }

  /**
   * SEARCH JOURNAL ENTRIES
   */
  async searchEntries(userId: string, criteria: {
    symbol?: string;
    strategy?: string;
    isWinner?: boolean;
    dateRange?: { start: Date; end: Date };
  }): Promise<JournalEntry[]> {
    const storage = await this.getStorage();
    const allEntries = await storage.getJournalEntries(userId);
    
    return allEntries.filter(entry => {
      if (criteria.symbol && !entry.symbol.includes(criteria.symbol)) return false;
      if (criteria.strategy && entry.strategy !== criteria.strategy) return false;
      if (criteria.isWinner !== undefined) {
        // Calculate if winner based on realized PnL
        const realizedPnl = entry.realizedPnl ? parseFloat(entry.realizedPnl) : 0;
        const isWinner = realizedPnl > 0;
        if (isWinner !== criteria.isWinner) return false;
      }
      if (criteria.dateRange) {
        const entryDate = entry.timestamp;
        if (entryDate < criteria.dateRange.start || entryDate > criteria.dateRange.end) return false;
      }
      return true;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // HELPER METHODS

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      avgWinAmount: 0,
      avgLossAmount: 0,
      profitFactor: 0,
      riskRewardAvg: 0,
      maxDrawdown: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      strategyBreakdown: {},
      timeframes: {}
    };
  }

  private calculateAdvancedMetrics(entries: JournalEntry[]): {
    maxDrawdown: number;
    consecutiveWins: number;
    consecutiveLosses: number;
  } {
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let peak = 0;
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    let runningPnL = 0;
    
    for (const entry of entries) {
      runningPnL += entry.pnl || 0;
      
      if (runningPnL > peak) {
        peak = runningPnL;
        currentDrawdown = 0;
      } else {
        currentDrawdown = peak - runningPnL;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }
      
      if (entry.isWinner) {
        currentWinStreak++;
        currentLossStreak = 0;
        consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
      }
    }
    
    return { maxDrawdown, consecutiveWins, consecutiveLosses };
  }

  private calculateStrategyBreakdown(entries: JournalEntry[]): { [strategy: string]: PerformanceMetrics } {
    const breakdown: { [strategy: string]: PerformanceMetrics } = {};
    
    const strategies = [...new Set(entries.map(e => e.strategy))];
    
    for (const strategy of strategies) {
      const strategyEntries = entries.filter(e => e.strategy === strategy);
      breakdown[strategy] = this.calculatePerformanceMetrics('', 0); // Simplified for this example
    }
    
    return breakdown;
  }

  private analyzeSymbolFrequency(entries: JournalEntry[]): { [symbol: string]: number } {
    const frequency: { [symbol: string]: number } = {};
    
    for (const entry of entries) {
      frequency[entry.symbol] = (frequency[entry.symbol] || 0) + 1;
    }
    
    return Object.fromEntries(
      Object.entries(frequency).sort(([,a], [,b]) => b - a)
    );
  }
}
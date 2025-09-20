import { type IStorage } from "../storage";
import { type AlgorithmicStrategy, type InsertStrategyStockPick } from "@shared/schema";

// Mock market data for demonstration
interface MockMarketData {
  symbol: string;
  price: number;
  volume: number;
  rvol: number;
  rsi: number;
  macdSignal: 'bullish' | 'bearish' | 'neutral';
  bollingerPosition: 'upper' | 'lower' | 'middle';
  emaAlignment: boolean;
  breakoutSignal: boolean;
  catalysts: string[];
}

export default class TradingStrategiesEngine {
  constructor(
    private storage: IStorage
  ) {}

  // Generate stock picks based on strategy configuration
  async generateStockPicks(strategy: AlgorithmicStrategy): Promise<InsertStrategyStockPick[]> {
    const picks: InsertStrategyStockPick[] = [];
    
    // Mock stock universe for scanning
    const stockUniverse = this.getMockStockUniverse();
    console.log(`Stock universe has ${stockUniverse.length} stocks`);
    
    // Apply scanner filters
    const filteredStocks = this.applyScanner(stockUniverse, strategy);
    console.log(`After scanner filters: ${filteredStocks.length} stocks remain`);
    
    // Apply entry rules to generate picks
    for (const stock of filteredStocks) {
      const entrySignals = this.evaluateEntryRules(stock, strategy);
      console.log(`Stock ${stock.symbol}: ${entrySignals.length} entry signals`);
      
      if (entrySignals.length > 0) {
        for (const signal of entrySignals) {
          const pick: InsertStrategyStockPick = {
            strategyId: strategy.id,
            symbol: stock.symbol,
            reason: this.generatePickReason(stock, signal, strategy),
            entrySignal: signal,
            scannerScore: this.calculateScannerScore(stock, strategy),
            rvol: stock.rvol,
            price: stock.price,
            rsi: stock.rsi,
            bollingerPosition: stock.bollingerPosition,
            macdCurl: stock.macdSignal === 'bullish',
            breakoutRetest: stock.breakoutSignal,
            status: 'active',
            expiresAt: this.calculateExpirationDate()
          };
          picks.push(pick);
          console.log(`Added pick for ${stock.symbol} with signal ${signal}`);
        }
      }
    }
    
    console.log(`Generated ${picks.length} total picks before limiting`);
    return picks.slice(0, 10); // Limit to top 10 picks
  }

  // Apply scanner configuration to filter stocks
  private applyScanner(stocks: MockMarketData[], strategy: AlgorithmicStrategy): MockMarketData[] {
    const filters = strategy.scannerFilters as any;
    console.log('Scanner filters:', filters);
    console.log('Catalyst sources:', strategy.catalystSources);
    
    return stocks.filter(stock => {
      console.log(`Evaluating ${stock.symbol}:`);
      
      // Apply RVOL filter
      if (filters.rvolMin && stock.rvol < filters.rvolMin) {
        console.log(`  - RVOL filter failed: ${stock.rvol} < ${filters.rvolMin}`);
        return false;
      }
      
      // Apply price filter
      if (filters.priceMin && stock.price < filters.priceMin) {
        console.log(`  - Price filter failed: ${stock.price} < ${filters.priceMin}`);
        return false;
      }
      
      // Apply spread filter (assuming spread is 1% of price for demo)
      const spread = stock.price * 0.01;
      if (filters.spreadMax && spread > filters.spreadMax) {
        console.log(`  - Spread filter failed: ${spread} > ${filters.spreadMax}`);
        return false;
      }
      
      // Check avoid criteria
      if (filters.avoid?.includes('illiquid') && stock.volume < 100000) {
        console.log(`  - Illiquid filter failed: ${stock.volume} < 100000`);
        return false;
      }
      if (filters.avoid?.includes('newsOnlySpikes') && stock.rvol > 5) {
        console.log(`  - News spike filter failed: ${stock.rvol} > 5`);
        return false;
      }
      
      // Check catalyst sources
      const catalystSources = strategy.catalystSources;
      const hasValidCatalyst = catalystSources.some(source => 
        stock.catalysts.includes(source)
      );
      
      if (!hasValidCatalyst) {
        console.log(`  - Catalyst filter failed: no matching catalysts from ${stock.catalysts.join(', ')}`);
        return false;
      }
      
      console.log(`  - ${stock.symbol} passed all scanner filters`);
      return true;
    });
  }

  // Evaluate entry rules for a stock
  private evaluateEntryRules(stock: MockMarketData, strategy: AlgorithmicStrategy): string[] {
    const signals: string[] = [];
    const entryRules = strategy.entryRules as any;
    console.log(`Evaluating entry rules for ${stock.symbol}:`, entryRules);
    
    // EMA Trend Signal
    if (entryRules.emaTrend) {
      const alignment = entryRules.emaTrend.alignment;
      const signals_types = entryRules.emaTrend.signal;
      
      if (stock.emaAlignment && signals_types?.includes('engulfing')) {
        console.log(`  - ${stock.symbol} triggered emaTrend signal`);
        signals.push('emaTrend');
      }
    }
    
    // Oversold Bounce Signal
    if (entryRules.oversoldBounce) {
      const dailyRSI5 = entryRules.oversoldBounce.dailyRSI5;
      const bollingerTap = entryRules.oversoldBounce.bollingerTap;
      const macdCurl = entryRules.oversoldBounce.macdCurl;
      
      if (dailyRSI5 && stock.rsi < 30 && 
          bollingerTap && stock.bollingerPosition === 'lower' &&
          macdCurl && stock.macdSignal === 'bullish') {
        console.log(`  - ${stock.symbol} triggered oversoldBounce signal`);
        signals.push('oversoldBounce');
      }
    }
    
    // Momentum Pop Signal
    if (entryRules.momentumPop) {
      const rvol = entryRules.momentumPop.rvol;
      const breakoutRetest = entryRules.momentumPop.breakoutRetest;
      
      if (rvol && stock.rvol >= 2 && 
          breakoutRetest && stock.breakoutSignal) {
        console.log(`  - ${stock.symbol} triggered momentumPop signal`);
        signals.push('momentumPop');
      }
    }
    
    console.log(`  - ${stock.symbol} generated ${signals.length} signals: ${signals.join(', ')}`);
    return signals;
  }

  // Calculate scanner score (0-100)
  private calculateScannerScore(stock: MockMarketData, strategy: AlgorithmicStrategy): number {
    let score = 50; // Base score
    
    // RVOL contribution
    if (stock.rvol >= 3) score += 20;
    else if (stock.rvol >= 2) score += 10;
    
    // RSI contribution
    if (stock.rsi < 30) score += 15; // Oversold
    else if (stock.rsi > 70) score -= 10; // Overbought
    
    // MACD contribution
    if (stock.macdSignal === 'bullish') score += 15;
    else if (stock.macdSignal === 'bearish') score -= 15;
    
    // EMA alignment contribution
    if (stock.emaAlignment) score += 10;
    
    // Breakout signal contribution
    if (stock.breakoutSignal) score += 10;
    
    // Catalyst contribution
    score += stock.catalysts.length * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  // Generate human-readable reason for the pick
  private generatePickReason(stock: MockMarketData, signal: string, strategy: AlgorithmicStrategy): string {
    const reasons: string[] = [];
    
    if (signal === 'emaTrend') {
      reasons.push('Strong EMA trend alignment with bullish engulfing pattern');
    }
    
    if (signal === 'oversoldBounce') {
      reasons.push(`Oversold bounce setup: RSI ${stock.rsi.toFixed(1)}, touching lower Bollinger, MACD curl`);
    }
    
    if (signal === 'momentumPop') {
      reasons.push(`Momentum breakout: ${stock.rvol}x relative volume, breakout retest confirmed`);
    }
    
    if (stock.catalysts.length > 0) {
      reasons.push(`Catalysts: ${stock.catalysts.join(', ')}`);
    }
    
    if (stock.rvol >= 2) {
      reasons.push(`High relative volume: ${stock.rvol}x normal`);
    }
    
    return reasons.join('. ') || 'Technical setup meets strategy criteria';
  }

  // Calculate expiration date for picks
  private calculateExpirationDate(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 1); // Expire in 1 day
    return expiration;
  }

  // Create default ALGOTRADER BRAINBOX strategy
  async createDefaultStrategy(userId: string): Promise<AlgorithmicStrategy> {
    const defaultStrategy = {
      userId,
      strategyName: "PirateTrader_Weekly",
      description: "ALGOTRADER BRAINBOX - Weekly scanner for high-probability setups with catalyst confirmation",
      catalystSources: ["SEC", "FCC", "DOJ", "PressReleases", "UOA", "PremarketRVOL"],
      scannerFilters: {
        rvolMin: 1.5,  // Lowered from 2.0 to include more stocks
        priceMin: 5,
        spreadMax: 10.0,  // Increased from 0.05 to 10.0 for demo (10 dollar spread)
        avoid: ["newsOnlySpikes", "illiquid"]
      },
      dailyLossLimit: 240,
      walkRuleLosses: 3,
      capitalHalfRoll: true,
      maxRiskPerTrade: 40,
      stopToBreakeven: true,
      riskRewardMin: 1.0,
      entryRules: {
        emaTrend: {
          alignment: ["9", "21", "50"],
          signal: ["engulfing", "hammer", "5mBreak15m"]
        },
        oversoldBounce: {
          dailyRSI5: "<30",
          bollingerTap: true,
          macdCurl: true
        },
        momentumPop: {
          rvol: ">=2",
          breakoutRetest: true,
          tightStop: true
        }
      },
      complianceRules: {
        ruleOne: "OneSpreadPerTicker",
        noStrayLegs: true,
        dailyLog: true
      },
      dailyTarget: 100,
      weeklyBaseline: 300,
      weeklyStretch: 750,
      isActive: true,
      isPaperTraading: true
    };

    return await this.storage.createAlgorithmicStrategy(defaultStrategy);
  }

  // Get mock stock universe for demonstration
  private getMockStockUniverse(): MockMarketData[] {
    return [
      {
        symbol: "AAPL",
        price: 185.50,
        volume: 2500000,
        rvol: 2.3,
        rsi: 28.5,
        macdSignal: 'bullish',
        bollingerPosition: 'lower',
        emaAlignment: true,
        breakoutSignal: false,
        catalysts: ["SEC", "PressReleases"]
      },
      {
        symbol: "TSLA",
        price: 245.20,
        volume: 3200000,
        rvol: 3.1,
        rsi: 72.3,
        macdSignal: 'bearish',
        bollingerPosition: 'upper',
        emaAlignment: false,
        breakoutSignal: true,
        catalysts: ["DOJ", "UOA"]
      },
      {
        symbol: "NVDA",
        price: 520.75,
        volume: 1800000,
        rvol: 2.8,
        rsi: 45.2,
        macdSignal: 'bullish',
        bollingerPosition: 'middle',
        emaAlignment: true,
        breakoutSignal: true,
        catalysts: ["SEC", "PremarketRVOL"]
      },
      {
        symbol: "AMZN",
        price: 145.30,
        volume: 1200000,
        rvol: 1.9,
        rsi: 35.7,
        macdSignal: 'neutral',
        bollingerPosition: 'lower',
        emaAlignment: false,
        breakoutSignal: false,
        catalysts: ["FCC"]
      },
      {
        symbol: "GOOGL",
        price: 142.80,
        volume: 900000,
        rvol: 2.4,
        rsi: 25.1,
        macdSignal: 'bullish',
        bollingerPosition: 'lower',
        emaAlignment: true,
        breakoutSignal: false,
        catalysts: ["DOJ", "PressReleases"]
      },
      {
        symbol: "META",
        price: 485.60,
        volume: 1500000,
        rvol: 2.6,
        rsi: 38.9,
        macdSignal: 'bullish',
        bollingerPosition: 'middle',
        emaAlignment: true,
        breakoutSignal: true,
        catalysts: ["SEC", "UOA"]
      },
      {
        symbol: "MSFT",
        price: 415.25,
        volume: 1100000,
        rvol: 1.8,
        rsi: 42.3,
        macdSignal: 'neutral',
        bollingerPosition: 'middle',
        emaAlignment: false,
        breakoutSignal: false,
        catalysts: ["PressReleases"]
      },
      {
        symbol: "PLTR",
        price: 28.40,
        volume: 5000000,
        rvol: 4.2,
        rsi: 29.8,
        macdSignal: 'bullish',
        bollingerPosition: 'lower',
        emaAlignment: true,
        breakoutSignal: true,
        catalysts: ["DOJ", "SEC", "PremarketRVOL"]
      }
    ];
  }
}
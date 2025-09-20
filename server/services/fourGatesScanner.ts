import { IStorage } from '../storage.ts';
import { SchwabService } from './schwab.ts';

interface FourGatesSetup {
  symbol: string;
  setupType: 'ema_momentum' | 'yesterday_setup';
  catalyst: string;
  catalystAge: number; // hours
  rvol: number;
  floatSize: 'small' | 'medium' | 'large';
  price: number;
  volume: number;
  marketCap: number;
  gapPercent?: number;
  emaAlignment: boolean;
  momentumScore: number;
  aiRecommendation?: {
    strength: 'strong' | 'moderate' | 'weak';
    confidence: number;
    reasoning: string;
    riskFactors: string[];
    priceTargets: {
      conservative: number;
      aggressive: number;
    };
  };
}

interface ScanCriteria {
  minRvol: number;
  maxCatalystAge: number; // hours
  minPrice: number;
  maxPrice: number;
  maxFloat: number; // shares in millions
  requireGap?: boolean;
  minGapPercent?: number;
}

export class FourGatesScanner {
  private storage: IStorage;
  private schwabService: SchwabService | null;

  constructor(storage: IStorage, schwabService: SchwabService | null = null) {
    this.storage = storage;
    this.schwabService = schwabService;
  }

  /**
   * Scan for Four Gates setups using PIRATETRADER criteria
   */
  async scanForSetups(criteria: ScanCriteria = this.getDefaultCriteria()): Promise<FourGatesSetup[]> {
    try {
      // In a production environment, this would scan live market data
      // For demo purposes, we'll return mock setups that meet PIRATETRADER criteria
      const mockSetups = await this.getMockSetups();
      
      // Filter setups based on criteria
      const filteredSetups = mockSetups.filter(setup => 
        setup.rvol >= criteria.minRvol &&
        setup.catalystAge <= criteria.maxCatalystAge &&
        setup.price >= criteria.minPrice &&
        setup.price <= criteria.maxPrice &&
        this.getFloatInMillions(setup.floatSize) <= criteria.maxFloat &&
        (!criteria.requireGap || (setup.gapPercent && setup.gapPercent >= (criteria.minGapPercent || 0)))
      );

      // Add AI analysis to each setup
      const setupsWithAI = await Promise.all(
        filteredSetups.map(setup => this.addAIAnalysis(setup))
      );

      return setupsWithAI;
    } catch (error) {
      console.error('Error scanning for Four Gates setups:', error);
      return [];
    }
  }

  /**
   * Get specific setup analysis for a symbol
   */
  async analyzeSymbol(symbol: string): Promise<FourGatesSetup | null> {
    try {
      // In production, this would fetch real market data
      const mockData = await this.getMockSetupForSymbol(symbol);
      if (!mockData) return null;

      return await this.addAIAnalysis(mockData);
    } catch (error) {
      console.error(`Error analyzing symbol ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Check if a setup meets EMA momentum criteria
   */
  private checkEMAMomentum(setup: FourGatesSetup): boolean {
    // EMA alignment: 8 > 21 > 50 (bullish trend)
    // Volume above average
    // Clean price action without major resistance
    return setup.emaAlignment && 
           setup.rvol >= 1.5 && 
           setup.momentumScore >= 7;
  }

  /**
   * Check if setup qualifies as "Yesterday Setup"
   */
  private checkYesterdaySetup(setup: FourGatesSetup): boolean {
    // Looking for stocks that gapped up on news
    // Fresh catalyst within last 24 hours
    // Strong volume confirmation
    return setup.catalystAge <= 24 &&
           setup.rvol >= 2.0 &&
           (setup.gapPercent || 0) >= 3;
  }

  /**
   * Add AI analysis to a setup
   */
  private async addAIAnalysis(setup: FourGatesSetup): Promise<FourGatesSetup> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return setup; // Return without AI analysis if no API key
      }

      const { OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const prompt = `
Analyze this Four Gates trading setup for PIRATETRADER methodology:

Symbol: ${setup.symbol}
Setup Type: ${setup.setupType}
Catalyst: ${setup.catalyst}
Catalyst Age: ${setup.catalystAge} hours
RVOL: ${setup.rvol}
Price: $${setup.price}
Float: ${setup.floatSize}
Gap: ${setup.gapPercent || 0}%
EMA Alignment: ${setup.emaAlignment}
Momentum Score: ${setup.momentumScore}/10

PIRATETRADER Rules:
- Only defined-risk spreads (no naked options)
- Max risk $40-80 per trade
- Target 2:1 or better risk/reward
- Trading windows: 6:30-7:30 PT and 12:00-13:00 PT
- Fresh catalysts preferred (under 48 hours)
- Small to medium float preferred

Provide:
1. Strength assessment (strong/moderate/weak)
2. Confidence score (0-100)
3. Brief reasoning (2-3 sentences)
4. Key risk factors
5. Conservative and aggressive price targets for option spreads

Respond in JSON format.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (aiResponse) {
        try {
          const aiAnalysis = JSON.parse(aiResponse);
          setup.aiRecommendation = {
            strength: aiAnalysis.strength || 'moderate',
            confidence: aiAnalysis.confidence || 50,
            reasoning: aiAnalysis.reasoning || 'AI analysis unavailable',
            riskFactors: aiAnalysis.riskFactors || [],
            priceTargets: {
              conservative: aiAnalysis.priceTargets?.conservative || setup.price * 1.05,
              aggressive: aiAnalysis.priceTargets?.aggressive || setup.price * 1.15
            }
          };
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
        }
      }

      return setup;
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      return setup;
    }
  }

  /**
   * Get default scanning criteria for PIRATETRADER
   */
  private getDefaultCriteria(): ScanCriteria {
    return {
      minRvol: 1.5,
      maxCatalystAge: 48, // 48 hours
      minPrice: 5,
      maxPrice: 100,
      maxFloat: 100, // 100M shares
      requireGap: false,
      minGapPercent: 2
    };
  }

  /**
   * Convert float size to millions of shares
   */
  private getFloatInMillions(floatSize: string): number {
    switch (floatSize) {
      case 'small': return 20;
      case 'medium': return 50;
      case 'large': return 200;
      default: return 50;
    }
  }

  /**
   * Generate mock setups for demo purposes
   */
  private async getMockSetups(): Promise<FourGatesSetup[]> {
    return [
      {
        symbol: 'NVDA',
        setupType: 'ema_momentum',
        catalyst: 'AI partnership announcement',
        catalystAge: 6,
        rvol: 2.3,
        floatSize: 'large',
        price: 485.50,
        volume: 45000000,
        marketCap: 1200000000000,
        gapPercent: 4.2,
        emaAlignment: true,
        momentumScore: 8.5
      },
      {
        symbol: 'TSLA',
        setupType: 'yesterday_setup',
        catalyst: 'Delivery numbers beat estimates',
        catalystAge: 18,
        rvol: 1.8,
        floatSize: 'large',
        price: 248.30,
        volume: 82000000,
        marketCap: 780000000000,
        gapPercent: 6.1,
        emaAlignment: true,
        momentumScore: 7.2
      },
      {
        symbol: 'AAPL',
        setupType: 'ema_momentum',
        catalyst: 'iPhone sales surge in China',
        catalystAge: 12,
        rvol: 1.6,
        floatSize: 'large',
        price: 178.90,
        volume: 55000000,
        marketCap: 2800000000000,
        gapPercent: 2.8,
        emaAlignment: true,
        momentumScore: 7.8
      },
      {
        symbol: 'AMD',
        setupType: 'ema_momentum',
        catalyst: 'Data center chip demand',
        catalystAge: 30,
        rvol: 2.1,
        floatSize: 'large',
        price: 142.75,
        volume: 38000000,
        marketCap: 230000000000,
        gapPercent: 3.5,
        emaAlignment: true,
        momentumScore: 8.0
      },
      {
        symbol: 'SMCI',
        setupType: 'yesterday_setup',
        catalyst: 'Server demand from AI companies',
        catalystAge: 8,
        rvol: 3.2,
        floatSize: 'small',
        price: 850.25,
        volume: 15000000,
        marketCap: 48000000000,
        gapPercent: 8.7,
        emaAlignment: true,
        momentumScore: 9.1
      }
    ];
  }

  /**
   * Get mock setup for specific symbol
   */
  private async getMockSetupForSymbol(symbol: string): Promise<FourGatesSetup | null> {
    const setups = await this.getMockSetups();
    return setups.find(setup => setup.symbol === symbol) || null;
  }

  /**
   * Validate if setup meets PIRATETRADER risk criteria
   */
  validateForPirateTrader(setup: FourGatesSetup): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check catalyst freshness
    if (setup.catalystAge > 48) {
      issues.push('Catalyst is older than 48 hours');
      recommendations.push('Look for fresher catalysts for better momentum');
    }

    // Check relative volume
    if (setup.rvol < 1.5) {
      issues.push('Relative volume below 1.5x');
      recommendations.push('Wait for higher volume confirmation');
    }

    // Check float size for volatility
    if (setup.floatSize === 'large') {
      recommendations.push('Large float may limit upside - consider smaller position size');
    }

    // Check price range for options liquidity
    if (setup.price < 20) {
      issues.push('Price may be too low for good options liquidity');
    }

    if (setup.price > 500) {
      issues.push('High price may limit spread opportunities');
    }

    // Check momentum score
    if (setup.momentumScore < 7) {
      issues.push('Momentum score below 7 - weak setup');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }
}
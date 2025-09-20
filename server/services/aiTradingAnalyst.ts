import OpenAI from "openai";

// TypeScript interfaces for better type safety
interface MarketSentiment {
  symbol: string;
  currentPrice: number;
  dayChange: number;
  sentiment: string;
  confidence: number;
  insights: string[];
  recommendation: string;
  riskLevel: string;
  timestamp: string;
}

interface TradeRecommendation {
  symbol: string;
  action: string;
  positionSize: number;
  entryPrice: number;
  stopLoss?: number;
  targetPrice?: number;
  reasoning: string;
  riskRating: string;
  timeframe: string;
  confidence: number;
  timestamp: string;
}

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * AI Trading Analyst - Provides intelligent market analysis and trading recommendations
 */
class AITradingAnalyst {
  constructor(schwabService) {
    this.schwabService = schwabService;
  }

  /**
   * Analyze market sentiment for a specific symbol
   */
  async analyzeMarketSentiment(symbol, timeframe = "1D") {
    try {
      // Get real market data from Schwab
      const quote = await this.schwabService.getQuote(symbol);
      const priceHistory = await this.schwabService.getPriceHistory(symbol, timeframe);
      
      // Calculate basic technical indicators
      const prices = priceHistory.candles.map(candle => candle.close);
      const currentPrice = quote.mark;
      const previousClose = quote.closePrice;
      const dayChange = ((currentPrice - previousClose) / previousClose * 100).toFixed(2);
      const volume = quote.totalVolume;
      const avgVolume = quote.regularMarketLastSize; // approximate
      
      // AI sentiment analysis
      const response = await client.chat.completions.create({
        model: "gpt-5",
        messages: [{
          role: "system",
          content: "You are an expert trading analyst. Provide concise, actionable market sentiment analysis based on the data provided. Focus on sentiment (bullish/bearish/neutral) and key factors driving the movement."
        }, {
          role: "user",
          content: `Analyze the market sentiment for ${symbol}:
          - Current Price: $${currentPrice}
          - Day Change: ${dayChange}%
          - Volume: ${volume} (vs avg: ${avgVolume})
          - 52-week High: $${quote.fiftyTwoWeekHigh}
          - 52-week Low: $${quote.fiftyTwoWeekLow}
          
          Provide sentiment (bullish/bearish/neutral) and 2-3 key insights for trading decisions.`
        }],
        response_format: { type: "json_object" }
      });

      // Safely parse AI response  
      let analysis;
      try {
        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("Empty AI response");
        analysis = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse AI sentiment:", parseError);
        analysis = {
          sentiment: "neutral",
          confidence: 0.5,
          insights: ["Analysis unavailable due to parsing error"],
          recommendation: "hold",
          riskLevel: "medium"
        };
      }
      
      return {
        symbol,
        currentPrice,
        dayChange: parseFloat(dayChange),
        sentiment: analysis.sentiment || "neutral",
        confidence: analysis.confidence || 0.5,
        insights: analysis.insights || [],
        recommendation: analysis.recommendation || "hold",
        riskLevel: analysis.riskLevel || "medium",
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error analyzing sentiment for ${symbol}:`, error.message);
      return { error: error.message, symbol };
    }
  }

  /**
   * Get AI-powered trade recommendations
   */
  async getTradeRecommendation(symbol, portfolioValue, riskTolerance = "medium") {
    try {
      const sentiment = await this.analyzeMarketSentiment(symbol);
      if (sentiment.error) return sentiment;

      // Anonymize buying power - create budget tier instead of exact amounts
      let buyingPowerContext;
      try {
        const account = await this.schwabService.getAccount();
        const rawBuyingPower = account.securitiesAccount.currentBalances.buyingPower;
        
        // Create anonymized budget tiers for AI analysis
        if (rawBuyingPower > 1000000) {
          buyingPowerContext = "Budget tier: >$1M";
        } else if (rawBuyingPower > 250000) {
          buyingPowerContext = "Budget tier: $250k-$1M";
        } else if (rawBuyingPower > 50000) {
          buyingPowerContext = "Budget tier: $50k-$250k";
        } else if (rawBuyingPower > 10000) {
          buyingPowerContext = "Budget tier: $10k-$50k";
        } else {
          buyingPowerContext = "Budget tier: <$10k";
        }
      } catch (error) {
        console.error("Failed to get account info:", error);
        buyingPowerContext = "Budget tier: unknown";
      }

      const response = await client.chat.completions.create({
        model: "gpt-5",
        messages: [{
          role: "system",
          content: "You are a professional trading advisor. Provide specific trade recommendations with position sizing, entry/exit points, and risk management based on the analysis provided."
        }, {
          role: "user",
          content: `Based on this analysis for ${symbol}, provide a trade recommendation:
          
          Market Analysis:
          - Sentiment: ${sentiment.sentiment}
          - Confidence: ${sentiment.confidence}
          - Current Price: $${sentiment.currentPrice}
          - Day Change: ${sentiment.dayChange}%
          - Risk Level: ${sentiment.riskLevel}
          
          Portfolio Info:
          - ${buyingPowerContext}
          - Risk Tolerance: ${riskTolerance}
          
          Provide specific trade recommendation with position size, stop loss, and target price.`
        }],
        response_format: { type: "json_object" }
      });

      // Safely parse AI response with error handling
      let recommendation;
      try {
        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("Empty AI response");
        recommendation = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse AI recommendation:", parseError);
        recommendation = {
          action: "hold",
          reasoning: "Unable to generate recommendation due to parsing error",
          riskRating: "high"
        };
      }
      
      return {
        symbol,
        action: recommendation.action || "hold", // buy, sell, hold
        positionSize: recommendation.positionSize || 0,
        entryPrice: recommendation.entryPrice || sentiment.currentPrice,
        stopLoss: recommendation.stopLoss,
        targetPrice: recommendation.targetPrice,
        reasoning: recommendation.reasoning || "Analysis inconclusive",
        riskRating: recommendation.riskRating || "medium",
        timeframe: recommendation.timeframe || "short-term",
        confidence: sentiment.confidence,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error getting trade recommendation for ${symbol}:`, error.message);
      return { error: error.message, symbol };
    }
  }

  /**
   * Analyze multiple symbols for portfolio optimization
   */
  async analyzePortfolio(symbols, portfolioValue) {
    try {
      console.log(`Analyzing portfolio with ${symbols.length} symbols...`);
      
      const analyses = await Promise.all(
        symbols.map(symbol => this.analyzeMarketSentiment(symbol))
      );

      const recommendations = await Promise.all(
        symbols.map(symbol => this.getTradeRecommendation(symbol, portfolioValue))
      );

      // AI portfolio optimization
      const response = await client.chat.completions.create({
        model: "gpt-5",
        messages: [{
          role: "system",
          content: "You are a portfolio manager. Analyze the provided stock data and provide portfolio optimization advice, including diversification, risk balance, and allocation suggestions."
        }, {
          role: "user",
          content: `Optimize this portfolio with total value $${portfolioValue}:
          
          Stock Analysis: ${JSON.stringify(analyses.filter(a => !a.error), null, 2)}
          
          Trade Recommendations: ${JSON.stringify(recommendations.filter(r => !r.error), null, 2)}
          
          Provide portfolio optimization advice including risk distribution and allocation percentages.`
        }],
        response_format: { type: "json_object" }
      });

      // Safely parse AI response
      let optimization;
      try {
        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("Empty AI response");
        optimization = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse AI portfolio optimization:", parseError);
        optimization = {
          overallSentiment: "neutral",
          riskLevel: "medium",
          suggestions: ["Portfolio analysis unavailable due to parsing error"],
          allocations: {},
          diversificationScore: 0.5
        };
      }
      
      return {
        portfolioValue,
        analyses: analyses.filter(a => !a.error),
        recommendations: recommendations.filter(r => !r.error),
        optimization: {
          overallSentiment: optimization.overallSentiment || "neutral",
          riskLevel: optimization.riskLevel || "medium",
          suggestions: optimization.suggestions || [],
          allocations: optimization.allocations || {},
          diversificationScore: optimization.diversificationScore || 0.5
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error analyzing portfolio:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Real-time market condition analysis
   */
  async getMarketConditions() {
    try {
      // Analyze major market indicators
      const majorSymbols = ['SPY', 'QQQ', 'IWM', 'VIX']; // SPY, NASDAQ, Russell, Volatility
      const marketData = await Promise.all(
        majorSymbols.map(async symbol => {
          try {
            const quote = await this.schwabService.getQuote(symbol);
            return {
              symbol,
              price: quote.mark,
              change: ((quote.mark - quote.closePrice) / quote.closePrice * 100).toFixed(2)
            };
          } catch (error) {
            return { symbol, error: error.message };
          }
        })
      );

      const response = await client.chat.completions.create({
        model: "gpt-5",
        messages: [{
          role: "system",
          content: "You are a market analyst. Analyze current market conditions and provide trading environment assessment."
        }, {
          role: "user",
          content: `Analyze current market conditions:
          ${marketData.map(d => `${d.symbol}: ${d.price} (${d.change}%)`).join('\n')}
          
          Provide overall market assessment and trading strategy recommendations.`
        }],
        response_format: { type: "json_object" }
      });

      // Safely parse AI response
      let conditions;
      try {
        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("Empty AI response");
        conditions = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse AI market conditions:", parseError);
        conditions = {
          trend: "sideways",
          volatility: "medium", 
          sentiment: "neutral",
          tradingStrategy: "cautious",
          risks: ["Market analysis unavailable due to parsing error"]
        };
      }
      
      return {
        marketData: marketData.filter(d => !d.error),
        conditions: {
          trend: conditions.trend || "sideways",
          volatility: conditions.volatility || "medium",
          sentiment: conditions.sentiment || "neutral",
          tradingStrategy: conditions.tradingStrategy || "cautious",
          keyLevels: conditions.keyLevels || {},
          risks: conditions.risks || []
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting market conditions:', error.message);
      return { error: error.message };
    }
  }
}

export default AITradingAnalyst;
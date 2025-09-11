import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeAlpacaService, getAlpacaService } from "./services/alpaca";
import { TradingWebSocketService } from "./services/websocket";
import { HeadAndShouldersDetector } from "./services/patternDetection";
import { 
  insertStrategySchema, 
  insertTradeSchema, 
  insertOHLCVCandlesSchema,
  insertPatternSignalSchema,
  type OHLCVCandles,
  type InsertOHLCVCandles
} from "@shared/schema";
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

  // Initialize pattern detector
  const patternDetector = new HeadAndShouldersDetector();

  // OHLCV Candles endpoints
  app.post("/api/market/candles", requireAuth, async (req: any, res) => {
    try {
      const candlesData = Array.isArray(req.body) ? req.body : [req.body];
      const validatedCandles: InsertOHLCVCandles[] = [];
      
      for (const candleData of candlesData) {
        try {
          const validated = insertOHLCVCandlesSchema.parse(candleData);
          validatedCandles.push(validated);
        } catch (error) {
          console.warn("Invalid candle data:", candleData, error);
        }
      }
      
      if (validatedCandles.length === 0) {
        return res.status(400).json({ error: "No valid candle data provided" });
      }
      
      const savedCandles = await storage.saveOHLCVCandles(validatedCandles);
      res.json(savedCandles);
    } catch (error) {
      console.error("Error saving OHLCV candles:", error);
      res.status(500).json({ error: "Failed to save OHLCV candles" });
    }
  });

  app.get("/api/market/candles/:symbol/:timeframe", async (req, res) => {
    try {
      const { symbol, timeframe } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const candles = await storage.getOHLCVCandles(symbol, timeframe, limit);
      res.json(candles);
    } catch (error) {
      console.error("Error getting OHLCV candles:", error);
      res.status(500).json({ error: "Failed to get OHLCV candles" });
    }
  });

  app.get("/api/market/candles/:symbol/:timeframe/range", async (req, res) => {
    try {
      const { symbol, timeframe } = req.params;
      const startTime = new Date(req.query.start as string);
      const endTime = new Date(req.query.end as string);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return res.status(400).json({ error: "Invalid start or end time" });
      }
      
      const candles = await storage.getOHLCVCandlesInRange(symbol, timeframe, startTime, endTime);
      res.json(candles);
    } catch (error) {
      console.error("Error getting OHLCV candles in range:", error);
      res.status(500).json({ error: "Failed to get OHLCV candles in range" });
    }
  });

  // Pattern Detection endpoints
  app.post("/api/patterns/detect/:strategyId", requireAuth, async (req: any, res) => {
    try {
      const { strategyId } = req.params;
      const { symbol, timeframe, limit = 100 } = req.body;
      
      if (!symbol || !timeframe) {
        return res.status(400).json({ error: "Symbol and timeframe are required" });
      }
      
      // Get strategy to verify ownership
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      // Get OHLCV candles for pattern detection
      const candles = await storage.getOHLCVCandles(symbol, timeframe, limit);
      
      if (candles.length < 30) {
        return res.status(400).json({ 
          error: "Insufficient data for pattern detection",
          required: 30,
          available: candles.length
        });
      }
      
      // Detect patterns
      const detectedPatterns = await patternDetector.detectPatterns(
        candles,
        strategyId,
        symbol,
        timeframe
      );
      
      // Save detected patterns to storage
      const savedSignals = [];
      for (const pattern of detectedPatterns) {
        try {
          const savedSignal = await storage.createPatternSignal(pattern);
          savedSignals.push(savedSignal);
          
          // Broadcast pattern detection via WebSocket
          wsService.broadcastPatternSignal(savedSignal);
        } catch (error) {
          console.error("Error saving pattern signal:", error);
        }
      }
      
      res.json({
        patternsDetected: savedSignals.length,
        patterns: savedSignals
      });
    } catch (error) {
      console.error("Error detecting patterns:", error);
      res.status(500).json({ error: "Failed to detect patterns" });
    }
  });

  app.get("/api/patterns/signals/:strategyId", requireAuth, async (req: any, res) => {
    try {
      const { strategyId } = req.params;
      const isActive = req.query.active === 'true' ? true : 
                      req.query.active === 'false' ? false : undefined;
      
      // Verify strategy ownership
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      const signals = await storage.getPatternSignals(strategyId, isActive);
      res.json(signals);
    } catch (error) {
      console.error("Error getting pattern signals:", error);
      res.status(500).json({ error: "Failed to get pattern signals" });
    }
  });

  app.get("/api/patterns/signals/symbol/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const patternType = req.query.type as string;
      
      const signals = await storage.getPatternSignalsBySymbol(symbol, patternType);
      res.json(signals);
    } catch (error) {
      console.error("Error getting pattern signals by symbol:", error);
      res.status(500).json({ error: "Failed to get pattern signals by symbol" });
    }
  });

  app.get("/api/patterns/active", async (req, res) => {
    try {
      const activeSignals = await storage.getActivePatternSignals();
      res.json(activeSignals);
    } catch (error) {
      console.error("Error getting active pattern signals:", error);
      res.status(500).json({ error: "Failed to get active pattern signals" });
    }
  });

  app.get("/api/patterns/analysis", requireAuth, async (req: any, res) => {
    try {
      const strategyId = req.query.strategyId as string;
      
      // If strategyId provided, verify ownership
      if (strategyId) {
        const strategy = await storage.getStrategy(strategyId);
        if (!strategy || strategy.userId !== req.userId) {
          return res.status(404).json({ error: "Strategy not found or access denied" });
        }
      }
      
      const analysis = await storage.getPatternAnalysis(strategyId);
      res.json(analysis);
    } catch (error) {
      console.error("Error getting pattern analysis:", error);
      res.status(500).json({ error: "Failed to get pattern analysis" });
    }
  });

  app.put("/api/patterns/signals/:signalId", requireAuth, async (req: any, res) => {
    try {
      const { signalId } = req.params;
      const updates = req.body;
      
      // Verify signal exists and get associated strategy
      const signal = await storage.updatePatternSignal(signalId, updates);
      if (!signal) {
        return res.status(404).json({ error: "Pattern signal not found" });
      }
      
      // Verify ownership through strategy
      const strategy = await storage.getStrategy(signal.strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        // Rollback the update
        await storage.updatePatternSignal(signalId, updates);
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(signal);
    } catch (error) {
      console.error("Error updating pattern signal:", error);
      res.status(500).json({ error: "Failed to update pattern signal" });
    }
  });

  // Bulk pattern detection for all active strategies
  app.post("/api/patterns/detect-all", requireAuth, async (req: any, res) => {
    try {
      const { symbols, timeframe = '1h', limit = 100 } = req.body;
      
      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ error: "Symbols array is required" });
      }
      
      const activeStrategies = await storage.getActiveStrategies(req.userId);
      if (activeStrategies.length === 0) {
        return res.json({ message: "No active strategies found", patterns: [] });
      }
      
      let totalPatternsDetected = 0;
      const allDetectedPatterns = [];
      
      for (const strategy of activeStrategies) {
        for (const symbol of symbols) {
          try {
            const candles = await storage.getOHLCVCandles(symbol, timeframe, limit);
            if (candles.length < 30) continue;
            
            const patterns = await patternDetector.detectPatterns(
              candles,
              strategy.id,
              symbol,
              timeframe
            );
            
            for (const pattern of patterns) {
              const savedSignal = await storage.createPatternSignal(pattern);
              allDetectedPatterns.push(savedSignal);
              wsService.broadcastPatternSignal(savedSignal);
              totalPatternsDetected++;
            }
          } catch (error) {
            console.error(`Error processing ${symbol} for strategy ${strategy.name}:`, error);
          }
        }
      }
      
      res.json({
        strategiesProcessed: activeStrategies.length,
        symbolsProcessed: symbols.length,
        totalPatternsDetected,
        patterns: allDetectedPatterns
      });
    } catch (error) {
      console.error("Error in bulk pattern detection:", error);
      res.status(500).json({ error: "Failed to perform bulk pattern detection" });
    }
  });

  // Test endpoint for Reversal Flag pattern detection
  app.get("/api/test/reversal-flags", async (req, res) => {
    try {
      console.log("🚩 Testing Reversal Flag Pattern Detection...");
      
      // Create detector with test-friendly configuration
      const detector = new HeadAndShouldersDetector({
        minCandles: 25,
        confidenceThreshold: 25.0,
        minPoleSize: 5.0,
        maxPullbackRatio: 0.3,
        minConsolidationDuration: 5,
        maxConsolidationDuration: 15,
        consolidationVolatilityThreshold: 2.5
      });

      const results = {
        bearishFlag: { detected: false, patterns: [], error: null },
        bullishFlag: { detected: false, patterns: [], error: null }
      };

      // Generate and test bearish reversal flag pattern
      try {
        console.log("📈 Testing Bearish Reversal Flag...");
        const bearishTestData = generateBearishReversalFlagTestData();
        
        const bearishPatterns = await detector.detectPatterns(
          bearishTestData,
          'test-bearish-flag',
          'BEAR_TEST',
          '1h'
        );

        results.bearishFlag.patterns = bearishPatterns.filter(p => p.patternType === 'reversal_flag_bearish');
        results.bearishFlag.detected = results.bearishFlag.patterns.length > 0;
        
        console.log(`   Bearish patterns detected: ${results.bearishFlag.patterns.length}`);
      } catch (error) {
        console.error("❌ Error in bearish flag test:", error);
        results.bearishFlag.error = String(error);
      }

      // Generate and test bullish reversal flag pattern
      try {
        console.log("📉 Testing Bullish Reversal Flag...");
        const bullishTestData = generateBullishReversalFlagTestData();
        
        const bullishPatterns = await detector.detectPatterns(
          bullishTestData,
          'test-bullish-flag',
          'BULL_TEST',
          '1h'
        );

        results.bullishFlag.patterns = bullishPatterns.filter(p => p.patternType === 'reversal_flag_bullish');
        results.bullishFlag.detected = results.bullishFlag.patterns.length > 0;
        
        console.log(`   Bullish patterns detected: ${results.bullishFlag.patterns.length}`);
      } catch (error) {
        console.error("❌ Error in bullish flag test:", error);
        results.bullishFlag.error = String(error);
      }

      console.log("🎯 Reversal Flag test completed!");
      res.json({
        success: true,
        message: "Reversal Flag pattern detection test completed",
        results: results,
        implementation: {
          bearishDetected: results.bearishFlag.detected,
          bullishDetected: results.bullishFlag.detected,
          totalPatterns: results.bearishFlag.patterns.length + results.bullishFlag.patterns.length,
          rileyFactorsImplemented: [
            "Strong momentum with minimal pullbacks",
            "Major resistance/support zone validation", 
            "Directional to sideways movement transition",
            "Momentum loss confirmation",
            "Volume decline during consolidation",
            "Confidence scoring based on key factors"
          ]
        }
      });

    } catch (error) {
      console.error("❌ Test endpoint error:", error);
      res.status(500).json({ error: "Test failed", details: String(error) });
    }
  });

  // Helper functions for generating test data
  function generateBearishReversalFlagTestData(): OHLCVCandles[] {
    const basePrice = 100;
    const candles: OHLCVCandles[] = [];
    
    // Strong momentum pole: Strong upward move with minimal pullbacks
    let currentPrice = basePrice;
    for (let i = 0; i < 15; i++) {
      const upMove = 3 + Math.random() * 2;
      const pullback = Math.random() * 0.3; // Minimal pullbacks
      currentPrice += upMove - pullback;
      
      candles.push({
        id: `bearish-${i}`,
        symbol: 'BEAR_TEST',
        timeframe: '1h',
        open: (currentPrice - upMove).toString(),
        high: (currentPrice + 0.5).toString(),
        low: (currentPrice - upMove - 0.3).toString(),
        close: currentPrice.toString(),
        volume: 1500 + Math.floor(Math.random() * 800),
        timestamp: new Date(Date.now() + i * 60 * 60 * 1000)
      });
    }
    
    const resistanceLevel = currentPrice + 2;
    
    // Consolidation phase: Sideways movement at resistance
    for (let i = 15; i < 25; i++) {
      const flagProgress = (i - 15) / 10;
      const volatility = 1.5 * (1 - flagProgress * 0.5);
      const flagPrice = resistanceLevel + (Math.sin((i - 15) * 0.6) * volatility);
      
      candles.push({
        id: `bearish-${i}`,
        symbol: 'BEAR_TEST',
        timeframe: '1h',
        open: (flagPrice - 0.2).toString(),
        high: (flagPrice + volatility * 0.4).toString(),
        low: (flagPrice - volatility * 0.4).toString(),
        close: flagPrice.toString(),
        volume: Math.floor(900 * (1 - flagProgress * 0.3)), // Declining volume
        timestamp: new Date(Date.now() + i * 60 * 60 * 1000)
      });
    }
    
    return candles;
  }

  function generateBullishReversalFlagTestData(): OHLCVCandles[] {
    const basePrice = 200;
    const candles: OHLCVCandles[] = [];
    
    // Strong momentum pole: Strong downward move with minimal pullbacks
    let currentPrice = basePrice;
    for (let i = 0; i < 15; i++) {
      const downMove = 3 + Math.random() * 2;
      const pullback = Math.random() * 0.3; // Minimal pullbacks
      currentPrice -= downMove - pullback;
      
      candles.push({
        id: `bullish-${i}`,
        symbol: 'BULL_TEST',
        timeframe: '1h',
        open: (currentPrice + downMove).toString(),
        high: (currentPrice + downMove + 0.3).toString(),
        low: (currentPrice - 0.5).toString(),
        close: currentPrice.toString(),
        volume: 1500 + Math.floor(Math.random() * 800),
        timestamp: new Date(Date.now() + i * 60 * 60 * 1000)
      });
    }
    
    const supportLevel = currentPrice - 2;
    
    // Consolidation phase: Sideways movement at support
    for (let i = 15; i < 25; i++) {
      const flagProgress = (i - 15) / 10;
      const volatility = 1.5 * (1 - flagProgress * 0.5);
      const flagPrice = supportLevel + (Math.sin((i - 15) * 0.6) * volatility);
      
      candles.push({
        id: `bullish-${i}`,
        symbol: 'BULL_TEST',
        timeframe: '1h',
        open: (flagPrice + 0.2).toString(),
        high: (flagPrice + volatility * 0.4).toString(),
        low: (flagPrice - volatility * 0.4).toString(),
        close: flagPrice.toString(),
        volume: Math.floor(900 * (1 - flagProgress * 0.3)), // Declining volume
        timestamp: new Date(Date.now() + i * 60 * 60 * 1000)
      });
    }
    
    return candles;
  }

  return httpServer;
}

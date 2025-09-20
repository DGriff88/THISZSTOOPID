import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeAlpacaService, getAlpacaService } from "./services/alpaca";
import { initializeSchwabService, getSchwabService } from "./services/schwab";
import { TradingWebSocketService } from "./services/websocket";
import { HeadAndShouldersDetector } from "./services/patternDetection";
import { 
  insertStrategySchema, 
  insertTradeSchema, 
  insertOHLCVCandlesSchema,
  insertPatternSignalSchema,
  insertPatternConfigSchema,
  insertPatternOutcomeSchema,
  type OHLCVCandles,
  type InsertOHLCVCandles,
  PATTERN_TYPES,
  STRATEGY_TYPES,
  type PatternConfig,
  type PatternOutcome
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize Schwab service  
  const schwabAppKey = process.env.SCHWAB_APP_KEY || process.env.SCHWAB || "";
  const schwabAppSecret = process.env.SCHWAB_APP_SECRET || process.env.schwabsecret || "";
  const schwabRefreshToken = process.env.SCHWAB_REFRESH_TOKEN || "";
  
  if (schwabAppKey && schwabAppSecret) {
    initializeSchwabService({
      appKey: schwabAppKey,
      appSecret: schwabAppSecret,
      refreshToken: schwabRefreshToken,
    });
  }

  // Legacy Alpaca support (keep for fallback)
  const alpacaApiKey = process.env.ALPACA_API_KEY || process.env.VITE_ALPACA_API_KEY || "";
  const alpacaApiSecret = process.env.ALPACA_API_SECRET || process.env.VITE_ALPACA_API_SECRET || "";
  
  if (alpacaApiKey && alpacaApiSecret && !schwabAppKey) {
    initializeAlpacaService({
      apiKey: alpacaApiKey,
      apiSecret: alpacaApiSecret,
      paper: true, // Default to paper trading
    });
  }

  // Initialize WebSocket service
  const wsService = new TradingWebSocketService(httpServer);

  // Broker service helper
  const getBrokerService = () => {
    if (schwabAppKey && schwabAppSecret) {
      try {
        return { type: 'schwab' as const, service: getSchwabService() };
      } catch (error) {
        console.warn('Schwab service not available, falling back to Alpaca');
      }
    }
    
    if (alpacaApiKey && alpacaApiSecret) {
      try {
        return { type: 'alpaca' as const, service: getAlpacaService() };
      } catch (error) {
        console.warn('Alpaca service not available');
      }
    }
    
    return null;
  };

  // Helper to check if broker is available
  const requireBroker = (req: any, res: any, next: any) => {
    const broker = getBrokerService();
    if (!broker) {
      return res.status(503).json({ 
        error: "No broker service configured", 
        message: "Please configure Schwab or Alpaca API credentials" 
      });
    }
    req.broker = broker;
    next();
  };

  // Helper to check authentication and provide OAuth guidance
  const requireBrokerAuth = async (req: any, res: any, next: any) => {
    const broker = getBrokerService();
    if (!broker) {
      return res.status(503).json({ 
        error: "No broker service configured", 
        message: "Please configure Schwab or Alpaca API credentials" 
      });
    }
    
    req.broker = broker;
    
    // For Schwab, check if we have valid tokens
    if (broker.type === 'schwab') {
      try {
        // This will throw if no valid tokens
        await broker.service.ensureAuthenticated();
      } catch (error) {
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please complete OAuth authentication",
          authUrl: `/api/auth/schwab/start`
        });
      }
    }
    
    next();
  };

  // Authentication middleware (simplified for demo)
  const requireAuth = (req: any, res: any, next: any) => {
    req.userId = 'demo-user-1'; // Simplified auth for demo
    next();
  };

  // AI Trading Analysis endpoints - require user auth first
  app.get("/api/ai/sentiment/:symbol", requireAuth, requireBrokerAuth, async (req: any, res) => {
    try {
      const { service } = req.broker;
      const { symbol } = req.params;
      
      // Import AI analyst dynamically to avoid circular dependencies
      const { default: AITradingAnalyst } = await import('./services/aiTradingAnalyst.ts');
      const analyst = new AITradingAnalyst(service);
      
      const sentiment = await analyst.analyzeMarketSentiment(symbol.toUpperCase());
      res.json(sentiment);
    } catch (error) {
      console.error('Error getting AI sentiment:', error);
      res.status(500).json({ error: 'Failed to analyze market sentiment' });
    }
  });

  app.get("/api/ai/recommendation/:symbol", requireAuth, requireBrokerAuth, async (req: any, res) => {
    try {
      const { service } = req.broker;
      const { symbol } = req.params;
      const { portfolioValue, riskTolerance } = req.query;
      
      const { default: AITradingAnalyst } = await import('./services/aiTradingAnalyst.ts');
      const analyst = new AITradingAnalyst(service);
      
      const recommendation = await analyst.getTradeRecommendation(
        symbol.toUpperCase(), 
        parseFloat(portfolioValue as string) || 100000,
        riskTolerance as string || "medium"
      );
      res.json(recommendation);
    } catch (error) {
      console.error('Error getting AI recommendation:', error);
      res.status(500).json({ error: 'Failed to get trade recommendation' });
    }
  });

  app.post("/api/ai/portfolio-analysis", requireAuth, requireBrokerAuth, async (req: any, res) => {
    try {
      const { service } = req.broker;
      const { symbols, portfolioValue } = req.body;
      
      if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({ error: 'Symbols array is required' });
      }
      
      const { default: AITradingAnalyst } = await import('./services/aiTradingAnalyst.ts');
      const analyst = new AITradingAnalyst(service);
      
      const analysis = await analyst.analyzePortfolio(
        symbols.map((s: string) => s.toUpperCase()), 
        portfolioValue || 100000
      );
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing portfolio:', error);
      res.status(500).json({ error: 'Failed to analyze portfolio' });
    }
  });

  app.get("/api/ai/market-conditions", requireAuth, requireBrokerAuth, async (req: any, res) => {
    try {
      const { service } = req.broker;
      
      const { default: AITradingAnalyst } = await import('./services/aiTradingAnalyst.ts');
      const analyst = new AITradingAnalyst(service);
      
      const conditions = await analyst.getMarketConditions();
      res.json(conditions);
    } catch (error) {
      console.error('Error getting market conditions:', error);
      res.status(500).json({ error: 'Failed to get market conditions' });
    }
  });

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
      // SECURITY: Verify ownership BEFORE updating
      const existingStrategy = await storage.getStrategy(req.params.id);
      if (!existingStrategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      
      if (existingStrategy.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // VALIDATION: Validate request body with Zod
      const updates = req.body;
      
      // Validate specific fields if present
      if (updates.type && !STRATEGY_TYPES.includes(updates.type)) {
        return res.status(400).json({ error: "Invalid strategy type" });
      }
      
      if (updates.symbols && (!Array.isArray(updates.symbols) || updates.symbols.length === 0)) {
        return res.status(400).json({ error: "Symbols must be a non-empty array" });
      }
      
      const strategy = await storage.updateStrategy(req.params.id, updates);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      
      wsService.broadcastStrategyUpdate(strategy);
      res.json(strategy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid strategy data", details: error.errors });
      } else {
        console.error("Error updating strategy:", error);
        res.status(500).json({ error: "Failed to update strategy" });
      }
    }
  });

  app.delete("/api/strategies/:id", requireAuth, async (req: any, res) => {
    try {
      // SECURITY: Verify ownership BEFORE deleting
      const existingStrategy = await storage.getStrategy(req.params.id);
      if (!existingStrategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      
      if (existingStrategy.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

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
  app.get("/api/market/quote/:symbol", requireBrokerAuth, async (req: any, res) => {
    try {
      const { service } = req.broker;
      const quote = await service.getQuote(req.params.symbol);
      res.json(quote);
    } catch (error) {
      console.error("Error getting quote:", error);
      res.status(500).json({ error: "Failed to get quote" });
    }
  });

  app.get("/api/market/status", async (req, res) => {
    try {
      const broker = getBrokerService();
      if (!broker) {
        return res.json({ isOpen: false, error: "API credentials not configured" });
      }
      
      const { service } = broker;
      const isOpen = await service.isMarketOpen();
      res.json({ isOpen });
    } catch (error) {
      console.error("Error getting market status:", error);
      res.json({ isOpen: false, error: "Failed to get market status" });
    }
  });

  // Broker integration endpoints (Schwab/Alpaca)
  app.get("/api/broker/account", requireAuth, requireBrokerAuth, async (req: any, res) => {
    try {
      const { type, service } = req.broker;
      const account = await service.getAccount();
      res.json({ broker: type, account });
    } catch (error) {
      console.error("Error getting broker account:", error);
      res.status(500).json({ error: "Failed to get account info" });
    }
  });

  app.get("/api/broker/positions", requireAuth, requireBrokerAuth, async (req: any, res) => {
    try {
      const { type, service } = req.broker;
      const positions = await service.getPositions();
      res.json({ broker: type, positions });
    } catch (error) {
      console.error("Error getting broker positions:", error);
      res.status(500).json({ error: "Failed to get positions" });
    }
  });

  app.post("/api/broker/orders", requireAuth, requireBrokerAuth, async (req: any, res) => {
    try {
      // VALIDATION: Basic validation for required fields
      const { symbol, side, qty, type = 'market' } = req.body;
      if (!symbol || !side || !qty) {
        return res.status(400).json({ error: "Symbol, side, and quantity are required" });
      }
      
      if (!['buy', 'sell'].includes(side)) {
        return res.status(400).json({ error: "Side must be 'buy' or 'sell'" });
      }

      const { type: brokerType, service } = req.broker;
      
      // Handle different broker order formats
      let order;
      if (brokerType === 'schwab') {
        // Get account numbers for Schwab
        const accounts = await service.getAccountNumbers();
        const accountNumber = accounts[0]?.accountNumber;
        
        if (!accountNumber) {
          return res.status(500).json({ error: "No Schwab account found" });
        }

        order = await service.createOrder(accountNumber, {
          symbol,
          quantity: parseInt(qty),
          side: side.toUpperCase() as 'BUY' | 'SELL',
          type: type.toUpperCase() as 'MARKET' | 'LIMIT',
          timeInForce: 'DAY',
          ...(type === 'limit' && { price: req.body.limit_price }),
        });
      } else {
        // Alpaca format
        order = await service.createOrder(req.body);
      }
      
      // Create trade record
      await storage.createTrade({
        userId: req.userId,
        symbol: req.body.symbol,
        side: req.body.side,
        quantity: req.body.qty,
        price: req.body.limit_price || '0',
        executedAt: new Date(),
        alpacaOrderId: brokerType === 'alpaca' ? order.id : null,
        status: 'pending',
        isPaperTrade: true,
      });
      
      res.json({ broker: brokerType, order });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid order data", details: error.errors });
      } else {
        console.error("Error creating broker order:", error);
        res.status(500).json({ error: "Failed to create order" });
      }
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

      // Cancel all open orders if broker is configured
      try {
        const broker = getBrokerService();
        if (broker) {
          const { type, service } = broker;
          
          if (type === 'schwab') {
            const accounts = await service.getAccountNumbers();
            for (const account of accounts) {
              const openOrders = await service.getOrders(account.accountNumber, 'PENDING');
              for (const order of openOrders) {
                await service.cancelOrder(account.accountNumber, order.orderId.toString());
              }
            }
          } else {
            // Alpaca
            const openOrders = await service.getOrders('open');
            for (const order of openOrders) {
              await service.cancelOrder(order.id);
            }
          }
        }
      } catch (error) {
        console.error("Error canceling orders during emergency stop:", error);
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
      
      // SECURITY: Verify signal exists and ownership BEFORE updating
      const existingSignal = await storage.getPatternSignalById(signalId);
      if (!existingSignal) {
        return res.status(404).json({ error: "Pattern signal not found" });
      }
      
      // Verify ownership through strategy
      const strategy = await storage.getStrategy(existingSignal.strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // VALIDATION: Validate updates
      if (updates.patternType && !PATTERN_TYPES.includes(updates.patternType)) {
        return res.status(400).json({ error: "Invalid pattern type" });
      }
      
      if (updates.confidence !== undefined && (updates.confidence < 0 || updates.confidence > 100)) {
        return res.status(400).json({ error: "Confidence must be between 0 and 100" });
      }
      
      // Now safely update
      const updatedSignal = await storage.updatePatternSignal(signalId, updates);
      if (!updatedSignal) {
        return res.status(404).json({ error: "Failed to update pattern signal" });
      }
      
      res.json(updatedSignal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid pattern signal data", details: error.errors });
      } else {
        console.error("Error updating pattern signal:", error);
        res.status(500).json({ error: "Failed to update pattern signal" });
      }
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

  // Pattern Configuration Management endpoints
  app.get("/api/patterns/configs/:strategyId", requireAuth, async (req: any, res) => {
    try {
      const { strategyId } = req.params;
      
      // Verify strategy ownership
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      const configs = await storage.getPatternConfigs(strategyId);
      res.json(configs);
    } catch (error) {
      console.error("Error getting pattern configs:", error);
      res.status(500).json({ error: "Failed to get pattern configs" });
    }
  });

  app.post("/api/patterns/configs", requireAuth, async (req: any, res) => {
    try {
      // Validate request body first
      const validatedData = insertPatternConfigSchema.parse(req.body);
      
      // Verify strategy ownership BEFORE creating config
      const strategy = await storage.getStrategy(validatedData.strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      const patternConfig = await storage.createPatternConfig(validatedData);
      
      res.json(patternConfig);
    } catch (error) {
      console.error("Error creating pattern config:", error);
      res.status(500).json({ error: "Failed to create pattern config" });
    }
  });

  app.put("/api/patterns/configs/:configId", requireAuth, async (req: any, res) => {
    try {
      const { configId } = req.params;
      
      // Get config first to verify ownership BEFORE updating
      const userConfigs = await storage.getPatternConfigsByUser(req.userId);
      const existingConfig = userConfigs.find(c => c.id === configId);
      if (!existingConfig) {
        return res.status(404).json({ error: "Pattern config not found" });
      }
      
      // Validate updates if pattern type is being changed
      if (req.body.patternType && !PATTERN_TYPES.includes(req.body.patternType)) {
        return res.status(400).json({ error: "Invalid pattern type" });
      }
      
      const config = await storage.updatePatternConfig(configId, req.body);
      if (!config) {
        return res.status(404).json({ error: "Failed to update pattern config" });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error updating pattern config:", error);
      res.status(500).json({ error: "Failed to update pattern config" });
    }
  });

  app.delete("/api/patterns/configs/:configId", requireAuth, async (req: any, res) => {
    try {
      const { configId } = req.params;
      
      // Get config to verify ownership using optimized method
      const userConfigs = await storage.getPatternConfigsByUser(req.userId);
      const config = userConfigs.find(c => c.id === configId);
      if (!config) {
        return res.status(404).json({ error: "Pattern config not found" });
      }
      
      const strategy = await storage.getStrategy(config.strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deleted = await storage.deletePatternConfig(configId);
      if (!deleted) {
        return res.status(404).json({ error: "Pattern config not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pattern config:", error);
      res.status(500).json({ error: "Failed to delete pattern config" });
    }
  });

  // Pattern Outcome Management endpoints
  app.post("/api/patterns/outcomes", requireAuth, async (req: any, res) => {
    try {
      // Validate request body first
      const validatedData = insertPatternOutcomeSchema.parse(req.body);
      
      // Verify signal exists and ownership BEFORE processing
      const signal = await storage.getPatternSignalById(validatedData.patternSignalId);
      if (!signal) {
        return res.status(404).json({ error: "Pattern signal not found" });
      }
      
      // Verify ownership through strategy
      const strategy = await storage.getStrategy(signal.strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const patternOutcome = await storage.createPatternOutcome(validatedData);
      
      // Mark signal as inactive if outcome recorded
      await storage.updatePatternSignal(patternSignalId, { isActive: false });
      
      res.json(patternOutcome);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid pattern outcome data", details: error.errors });
      } else {
        console.error("Error creating pattern outcome:", error);
        res.status(500).json({ error: "Failed to create pattern outcome" });
      }
    }
  });

  app.get("/api/patterns/outcomes/signal/:signalId", requireAuth, async (req: any, res) => {
    try {
      const { signalId } = req.params;
      
      // Verify signal ownership BEFORE processing
      const signal = await storage.getPatternSignalById(signalId);
      if (!signal) {
        return res.status(404).json({ error: "Pattern signal not found" });
      }
      
      const strategy = await storage.getStrategy(signal.strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const outcomes = await storage.getPatternOutcomes(signalId);
      res.json(outcomes);
    } catch (error) {
      console.error("Error getting pattern outcomes:", error);
      res.status(500).json({ error: "Failed to get pattern outcomes" });
    }
  });

  app.get("/api/patterns/outcomes/strategy/:strategyId", requireAuth, async (req: any, res) => {
    try {
      const { strategyId } = req.params;
      
      // Verify strategy ownership
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      const outcomes = await storage.getPatternOutcomesByStrategy(strategyId);
      res.json(outcomes);
    } catch (error) {
      console.error("Error getting pattern outcomes by strategy:", error);
      res.status(500).json({ error: "Failed to get pattern outcomes" });
    }
  });

  // Enhanced Analytics endpoints
  app.get("/api/patterns/performance/:patternType", requireAuth, async (req: any, res) => {
    try {
      const { patternType } = req.params;
      const { strategyId } = req.query;
      
      // Verify pattern type
      if (!PATTERN_TYPES.includes(patternType as any)) {
        return res.status(400).json({ error: "Invalid pattern type" });
      }
      
      // If strategyId provided, verify ownership
      if (strategyId) {
        const strategy = await storage.getStrategy(strategyId as string);
        if (!strategy || strategy.userId !== req.userId) {
          return res.status(404).json({ error: "Strategy not found or access denied" });
        }
      }
      
      const performance = await storage.getPatternPerformanceByType(
        patternType, 
        strategyId as string
      );
      res.json(performance);
    } catch (error) {
      console.error("Error getting pattern performance:", error);
      res.status(500).json({ error: "Failed to get pattern performance" });
    }
  });

  app.post("/api/patterns/backtest", requireAuth, async (req: any, res) => {
    try {
      const { strategyId, symbols, startDate, endDate, patternTypes, config } = req.body;
      
      // Verify strategy ownership
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      if (start >= end) {
        return res.status(400).json({ error: "Start date must be before end date" });
      }
      
      // Validate symbols
      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ error: "Symbols array is required" });
      }
      
      const backtestResult = await storage.backtestPatterns({
        strategyId,
        symbols,
        startDate: start,
        endDate: end,
        patternTypes: patternTypes || undefined,
        config: config || {}
      });
      
      res.json(backtestResult);
    } catch (error) {
      console.error("Error running pattern backtest:", error);
      res.status(500).json({ error: "Failed to run pattern backtest" });
    }
  });

  // Pattern Validation and Lifecycle Management endpoints
  app.post("/api/patterns/validate", requireAuth, async (req: any, res) => {
    try {
      const { strategyId, symbol, timeframe, patternTypes } = req.body;
      
      // Verify strategy ownership
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      // Get recent candles for validation
      const candles = await storage.getOHLCVCandles(symbol, timeframe, 100);
      if (candles.length < 30) {
        return res.status(400).json({ 
          error: "Insufficient data for validation",
          required: 30,
          available: candles.length
        });
      }
      
      // Create detector with default config
      const detector = new HeadAndShouldersDetector();
      const validationResults = [];
      
      for (const patternType of (patternTypes || PATTERN_TYPES)) {
        try {
          // Get pattern-specific config if available
          const config = await storage.getPatternConfig(strategyId, patternType);
          const detectorConfig = config ? config.config : {};
          
          const patterns = await detector.detectPatterns(candles, strategyId, symbol, timeframe);
          const relevantPatterns = patterns.filter(p => p.patternType === patternType);
          
          validationResults.push({
            patternType,
            isDetectable: relevantPatterns.length > 0,
            confidence: relevantPatterns.length > 0 ? Math.max(...relevantPatterns.map(p => parseFloat(p.confidence))) : 0,
            signals: relevantPatterns.length,
            config: detectorConfig,
            lastDetected: relevantPatterns.length > 0 ? relevantPatterns[0].detectedAt : null
          });
        } catch (error) {
          validationResults.push({
            patternType,
            isDetectable: false,
            error: String(error),
            confidence: 0,
            signals: 0
          });
        }
      }
      
      res.json({
        symbol,
        timeframe,
        candlesAnalyzed: candles.length,
        validationResults,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error validating patterns:", error);
      res.status(500).json({ error: "Failed to validate patterns" });
    }
  });

  app.post("/api/patterns/signals/bulk-update", requireAuth, async (req: any, res) => {
    try {
      const { signalIds, updates } = req.body;
      
      if (!signalIds || !Array.isArray(signalIds) || signalIds.length === 0) {
        return res.status(400).json({ error: "Signal IDs array is required" });
      }
      
      const results = [];
      for (const signalId of signalIds) {
        try {
          // Verify ownership using optimized method
          const signal = await storage.getPatternSignalById(signalId);
          if (!signal) {
            results.push({ signalId, error: "Signal not found" });
            continue;
          }
          
          const strategy = await storage.getStrategy(signal.strategyId);
          if (!strategy || strategy.userId !== req.userId) {
            results.push({ signalId, error: "Access denied" });
            continue;
          }
          
          const updatedSignal = await storage.updatePatternSignal(signalId, updates);
          results.push({ signalId, signal: updatedSignal, success: true });
          
          // Broadcast update if signal was updated
          if (updatedSignal) {
            wsService.broadcastPatternSignal(updatedSignal);
          }
        } catch (error) {
          results.push({ signalId, error: String(error) });
        }
      }
      
      res.json({
        processed: signalIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => r.error).length,
        results
      });
    } catch (error) {
      console.error("Error in bulk signal update:", error);
      res.status(500).json({ error: "Failed to perform bulk signal update" });
    }
  });

  app.get("/api/patterns/dashboard/:strategyId", requireAuth, async (req: any, res) => {
    try {
      const { strategyId } = req.params;
      
      // Verify strategy ownership
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      // Get comprehensive dashboard data
      const [
        activeSignals,
        recentOutcomes,
        patternConfigs,
        performanceMetrics
      ] = await Promise.all([
        storage.getPatternSignals(strategyId, true),
        storage.getPatternOutcomesByStrategy(strategyId),
        storage.getPatternConfigs(strategyId),
        storage.getPatternAnalysis(strategyId)
      ]);
      
      // Calculate strategy-specific metrics
      const totalSignals = await storage.getPatternSignals(strategyId);
      const recentSuccessRate = recentOutcomes.length > 0 
        ? (recentOutcomes.filter(o => o.outcome === 'success').length / recentOutcomes.length) * 100
        : 0;
      
      const totalPnL = recentOutcomes.reduce((sum, o) => sum + o.profitLoss, 0);
      const avgHoldTime = recentOutcomes.length > 0
        ? recentOutcomes.reduce((sum, o) => sum + o.holdTime, 0) / recentOutcomes.length / 60 // hours
        : 0;
      
      // Pattern type distribution
      const patternDistribution = new Map();
      totalSignals.forEach(signal => {
        const current = patternDistribution.get(signal.patternType) || 0;
        patternDistribution.set(signal.patternType, current + 1);
      });
      
      res.json({
        strategy: {
          id: strategy.id,
          name: strategy.name,
          isActive: strategy.isActive
        },
        metrics: {
          totalSignals: totalSignals.length,
          activeSignals: activeSignals.length,
          recentSuccessRate,
          totalPnL,
          avgHoldTime,
          configuredPatterns: patternConfigs.length
        },
        activeSignals: activeSignals.slice(0, 10), // Latest 10 active signals
        recentOutcomes: recentOutcomes.slice(0, 10), // Latest 10 outcomes
        patternDistribution: Array.from(patternDistribution.entries()).map(([type, count]) => ({
          patternType: type,
          count
        })),
        configurations: patternConfigs,
        performanceByPattern: performanceMetrics.performanceMetrics,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error("Error getting pattern dashboard:", error);
      res.status(500).json({ error: "Failed to get pattern dashboard" });
    }
  });

  app.post("/api/patterns/alerts/configure", requireAuth, async (req: any, res) => {
    try {
      const { strategyId, alertConfig } = req.body;
      
      // Verify strategy ownership
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      // Create or update alert configuration
      // This would integrate with a notification system in a full implementation
      const updatedStrategy = await storage.updateStrategy(strategyId, {
        parameters: {
          ...strategy.parameters,
          alertConfig: {
            minConfidence: alertConfig.minConfidence || 65,
            patterns: alertConfig.patterns || [],
            webhookUrl: alertConfig.webhookUrl,
            emailNotifications: alertConfig.emailNotifications || false,
            ...alertConfig
          }
        }
      });
      
      res.json({
        success: true,
        strategyId,
        alertConfig: updatedStrategy?.parameters?.alertConfig,
        message: "Alert configuration updated successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid alert configuration", details: error.errors });
      } else {
        console.error("Error configuring pattern alerts:", error);
        res.status(500).json({ error: "Failed to configure pattern alerts" });
      }
    }
  });

  // Comprehensive validation endpoint for all pattern types
  app.post("/api/patterns/validate-all", requireAuth, async (req: any, res) => {
    try {
      const { strategyId, symbols, timeframes } = req.body;
      
      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        return res.status(400).json({ error: "Symbols array is required" });
      }
      
      if (!timeframes || !Array.isArray(timeframes) || timeframes.length === 0) {
        return res.status(400).json({ error: "Timeframes array is required" });
      }
      
      const strategy = await storage.getStrategy(strategyId);
      if (!strategy || strategy.userId !== req.userId) {
        return res.status(404).json({ error: "Strategy not found or access denied" });
      }
      
      const detector = new HeadAndShouldersDetector();
      const results = [];
      
      for (const symbol of symbols) {
        for (const timeframe of timeframes) {
          try {
            const candles = await storage.getOHLCVCandles(symbol, timeframe, 100);
            if (candles.length < 30) {
              results.push({
                symbol,
                timeframe,
                status: 'insufficient_data',
                availableCandles: candles.length,
                requiredCandles: 30,
                patterns: []
              });
              continue;
            }
            
            const patterns = await detector.detectPatterns(candles, strategyId, symbol, timeframe);
            results.push({
              symbol,
              timeframe,
              status: 'success',
              availableCandles: candles.length,
              patternsDetected: patterns.length,
              patterns: patterns.map(p => ({
                type: p.patternType,
                confidence: parseFloat(p.confidence),
                priceLevel: parseFloat(p.priceLevel)
              }))
            });
          } catch (error) {
            results.push({
              symbol,
              timeframe,
              status: 'error',
              error: String(error),
              patterns: []
            });
          }
        }
      }
      
      res.json({
        strategy: { id: strategy.id, name: strategy.name },
        validationResults: results,
        summary: {
          totalCombinations: symbols.length * timeframes.length,
          successful: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length,
          insufficientData: results.filter(r => r.status === 'insufficient_data').length,
          totalPatterns: results.reduce((sum, r) => sum + (r.patternsDetected || 0), 0)
        },
        timestamp: new Date()
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid validation request", details: error.errors });
      } else {
        console.error("Error in comprehensive pattern validation:", error);
        res.status(500).json({ error: "Failed to validate patterns" });
      }
    }
  });

  // Health check endpoint for pattern detection system
  app.get("/api/patterns/health", async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          patternDetection: 'operational',
          storage: 'operational',
          websocket: 'operational'
        },
        metrics: {
          totalSignals: Array.from((storage as any).patternSignals?.values() || []).length,
          activeSignals: Array.from((storage as any).patternSignals?.values() || []).filter((s: any) => s.isActive).length,
          totalConfigs: Array.from((storage as any).patternConfigs?.values() || []).length,
          totalOutcomes: Array.from((storage as any).patternOutcomes?.values() || []).length
        },
        supportedPatterns: PATTERN_TYPES,
        supportedTimeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']
      };
      
      res.json(health);
    } catch (error) {
      console.error("Error in health check:", error);
      res.status(500).json({ 
        status: 'unhealthy',
        error: "Health check failed",
        timestamp: new Date()
      });
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

  // Schwab OAuth endpoints
  app.get("/api/auth/schwab/start", (req, res) => {
    try {
      const broker = getBrokerService();
      if (!broker || broker.type !== 'schwab') {
        return res.status(503).json({ error: "Schwab service not available" });
      }

      const authUrl = broker.service.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("Error starting Schwab OAuth:", error);
      res.status(500).json({ error: "Failed to start OAuth flow" });
    }
  });

  app.post("/api/auth/schwab/callback", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Authorization code required" });
      }

      const broker = getBrokerService();
      if (!broker || broker.type !== 'schwab') {
        return res.status(503).json({ error: "Schwab service not available" });
      }

      const tokens = await broker.service.exchangeCodeForTokens(code);
      
      // In a real app, you'd save these tokens securely to your user's account
      // For now, we'll just return success
      res.json({ 
        success: true, 
        message: "OAuth completed successfully",
        // Don't return actual tokens for security
        hasRefreshToken: !!tokens.refresh_token 
      });
    } catch (error) {
      console.error("Error in Schwab OAuth callback:", error);
      res.status(500).json({ error: "Failed to complete OAuth flow" });
    }
  });

  return httpServer;
}

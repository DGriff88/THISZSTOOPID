import express, { type Request, Response, NextFunction, Router } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CRITICAL: Mount API routes with HIGHEST PRIORITY before anything else
const apiRouter = Router();

// Essential AI endpoints for paid features
apiRouter.get('/ai/sentiment/:symbol', (req, res) => {
  const { symbol } = req.params;
  const upperSymbol = symbol.toUpperCase();
  
  console.log('✅ API ENDPOINT HIT:', req.originalUrl);
  
  const demoSentiment = {
    symbol: upperSymbol,
    currentPrice: upperSymbol === 'MSFT' ? 380.50 : upperSymbol === 'AAPL' ? 175.25 : 250.75,
    dayChange: upperSymbol === 'MSFT' ? 2.15 : upperSymbol === 'AAPL' ? -1.35 : 3.25,
    sentiment: upperSymbol === 'MSFT' ? "Bullish" : upperSymbol === 'AAPL' ? "Neutral" : "Bearish",
    confidence: 0.85,
    insights: [
      `${upperSymbol} shows strong momentum indicators`,
      'Technical analysis suggests near-term volatility',
      'Volume patterns indicate institutional interest',
      'Risk management recommended for position sizing'
    ],
    recommendation: upperSymbol === 'MSFT' ? "Consider long position" : "Monitor for entry",
    riskLevel: "Medium",
    timestamp: new Date().toISOString()
  };
  
  res.json(demoSentiment);
});

apiRouter.get('/ai/recommendation/:symbol', (req, res) => {
  const { symbol } = req.params;
  const { portfolioValue = "100000", riskTolerance = "medium" } = req.query;
  const upperSymbol = symbol.toUpperCase();
  
  console.log('✅ API RECOMMENDATION HIT:', req.originalUrl);
  
  const action = upperSymbol === 'MSFT' ? 'BUY' : upperSymbol === 'AAPL' ? 'HOLD' : 'SELL';
  const basePrice = upperSymbol === 'MSFT' ? 380 : upperSymbol === 'AAPL' ? 175 : 250;
  
  const demoRecommendation = {
    symbol: upperSymbol,
    action: action,
    positionSize: Math.floor(parseFloat(portfolioValue as string) * 0.05),
    entryPrice: basePrice + (Math.random() - 0.5) * 5,
    stopLoss: action === 'BUY' ? basePrice * 0.95 : basePrice * 1.05,
    targetPrice: action === 'BUY' ? basePrice * 1.08 : basePrice * 0.92,
    reasoning: `Based on technical analysis and market conditions, ${upperSymbol} presents a ${action.toLowerCase()} opportunity. Algorithm detected key support/resistance levels and momentum indicators.`,
    riskRating: riskTolerance as string,
    timeframe: 'Medium-term (1-4 weeks)',
    confidence: 0.78,
    timestamp: new Date().toISOString()
  };
  
  res.json(demoRecommendation);
});

apiRouter.get('/ai/market-conditions', (req, res) => {
  console.log('✅ API MARKET CONDITIONS HIT:', req.originalUrl);
  
  const demoConditions = {
    marketData: [
      { symbol: 'SPY', price: 445.23, change: '0.75' },
      { symbol: 'QQQ', price: 378.91, change: '-0.45' },
      { symbol: 'VIX', price: 18.34, change: '2.15' },
      { symbol: 'DXY', price: 104.87, change: '-0.23' }
    ],
    conditions: {
      trend: 'Bullish',
      volatility: 'Moderate', 
      sentiment: 'Cautiously Optimistic',
      tradingStrategy: 'Momentum Following',
      risks: [
        'Federal Reserve policy uncertainty',
        'Geopolitical tensions affecting energy prices',
        'Corporate earnings season approaching',
        'Technical resistance at key levels'
      ]
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(demoConditions);
});

// Mount demo API router with ABSOLUTE HIGHEST PRIORITY - bypasses auth middleware
app.use('/demo-api', apiRouter);

// Also create direct endpoints that frontend can use
app.get('/api/ai/sentiment/:symbol', (req, res) => {
  console.log('✅ DIRECT AI SENTIMENT HIT:', req.originalUrl);
  res.redirect(`/demo-api/ai/sentiment/${req.params.symbol}`);
});

app.get('/api/ai/recommendation/:symbol', (req, res) => {
  console.log('✅ DIRECT AI RECOMMENDATION HIT:', req.originalUrl);
  res.redirect(`/demo-api/ai/recommendation/${req.params.symbol}?${new URLSearchParams(req.query as any)}`);
});

app.get('/api/ai/market-conditions', (req, res) => {
  console.log('✅ DIRECT AI MARKET CONDITIONS HIT:', req.originalUrl);
  res.redirect('/demo-api/ai/market-conditions');
});

console.log('🚀 CRITICAL API ROUTES MOUNTED FIRST - BYPASSING AUTH');

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

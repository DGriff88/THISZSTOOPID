import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, integer, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for validation and consistency
export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as const;
export const STRATEGY_TYPES = [
  'moving_average',
  'rsi', 
  'bollinger_bands',
  'macd',
  'head_shoulders_bearish',
  'head_shoulders_bullish',
  'reversal_flag_bearish',
  'reversal_flag_bullish', 
  'three_line_strike_bearish',
  'three_line_strike_bullish',
  'trap_bearish',
  'trap_bullish',
  'reversal_candlestick',
  'common_trading_patterns',
  'custom'
] as const;
export const PATTERN_TYPES = [
  'head_shoulders_bearish',
  'head_shoulders_bullish',
  'reversal_flag_bearish',
  'reversal_flag_bullish',
  'three_line_strike_bearish', 
  'three_line_strike_bullish',
  'trap_bearish',
  'trap_bullish',
  'double_top',
  'double_bottom',
  'triangle_ascending',
  'triangle_descending',
  'triangle_symmetrical',
  'wedge_rising',
  'wedge_falling',
  'cup_and_handle',
  'inverse_cup_and_handle',
  'bull_flag',
  'bear_flag',
  'bull_pennant',
  'bear_pennant'
] as const;
export const TRADE_SIDES = ['buy', 'sell'] as const;
export const TRADE_STATUSES = ['pending', 'filled', 'cancelled', 'rejected'] as const;

// Zod enums
export const timeframeEnum = z.enum(TIMEFRAMES);
export const strategyTypeEnum = z.enum(STRATEGY_TYPES);
export const patternTypeEnum = z.enum(PATTERN_TYPES);
export const tradeSideEnum = z.enum(TRADE_SIDES);
export const tradeStatusEnum = z.enum(TRADE_STATUSES);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  alpacaApiKey: text("alpaca_api_key"),
  alpacaApiSecret: text("alpaca_api_secret"),
  paperTrading: boolean("paper_trading").notNull().default(true),
});

export const strategies = pgTable("strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // Must match STRATEGY_TYPES enum
  description: text("description"),
  symbols: text("symbols").array().notNull(), // ['AAPL', 'MSFT', 'GOOGL'] - must be non-empty
  parameters: jsonb("parameters").notNull(), // Strategy-specific parameters
  positionSize: decimal("position_size", { precision: 12, scale: 2 }).notNull(),
  stopLoss: decimal("stop_loss", { precision: 5, scale: 2 }), // Percentage
  takeProfit: decimal("take_profit", { precision: 5, scale: 2 }), // Percentage
  isActive: boolean("is_active").notNull().default(false),
  isPaperTrading: boolean("is_paper_trading").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Performance indexes
  userIdIdx: index("strategies_user_id_idx").on(table.userId),
  userIdActiveIdx: index("strategies_user_id_active_idx").on(table.userId, table.isActive),
  typeIdx: index("strategies_type_idx").on(table.type),
}));

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  strategyId: varchar("strategy_id").references(() => strategies.id),
  patternSignalId: varchar("pattern_signal_id").references(() => patternSignals.id), // Links trade to pattern signal
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // Must match TRADE_SIDES enum
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 4 }).notNull(),
  executedAt: timestamp("executed_at").notNull(),
  pnl: decimal("pnl", { precision: 12, scale: 2 }),
  isPaperTrade: boolean("is_paper_trade").notNull().default(true),
  alpacaOrderId: text("alpaca_order_id"),
  status: text("status").notNull().default('pending'), // Must match TRADE_STATUSES enum
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Performance indexes
  userIdIdx: index("trades_user_id_idx").on(table.userId),
  strategyIdIdx: index("trades_strategy_id_idx").on(table.strategyId),
  patternSignalIdIdx: index("trades_pattern_signal_id_idx").on(table.patternSignalId),
  symbolExecutedAtIdx: index("trades_symbol_executed_at_idx").on(table.symbol, table.executedAt),
}));

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).notNull(),
  cashValue: decimal("cash_value", { precision: 12, scale: 2 }).notNull(),
  dayPnL: decimal("day_pnl", { precision: 12, scale: 2 }),
  totalPnL: decimal("total_pnl", { precision: 12, scale: 2 }),
  positions: jsonb("positions"), // Position details
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  price: decimal("price", { precision: 12, scale: 4 }).notNull(),
  volume: integer("volume"),
  timestamp: timestamp("timestamp").notNull(),
});

export const ohlcvCandles = pgTable("ohlcv_candles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(), // '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'
  open: decimal("open", { precision: 12, scale: 4 }).notNull(),
  high: decimal("high", { precision: 12, scale: 4 }).notNull(),
  low: decimal("low", { precision: 12, scale: 4 }).notNull(),
  close: decimal("close", { precision: 12, scale: 4 }).notNull(),
  volume: integer("volume").notNull(),
  timestamp: timestamp("timestamp").notNull(),
}, (table) => ({
  // Efficient queries for candlestick data
  symbolTimeframeTimestampIdx: index("ohlcv_symbol_timeframe_timestamp_idx").on(table.symbol, table.timeframe, table.timestamp),
  // Unique constraint to prevent duplicate candles
  symbolTimeframeTimestampUnique: unique("ohlcv_symbol_timeframe_timestamp_unique").on(table.symbol, table.timeframe, table.timestamp),
}));

export const patternSignals = pgTable("pattern_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  strategyId: varchar("strategy_id").notNull().references(() => strategies.id),
  symbol: text("symbol").notNull(),
  patternType: text("pattern_type").notNull(), // Must match PATTERN_TYPES enum
  timeframe: text("timeframe").notNull(), // '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(), // 0.00 to 100.00
  detectedAt: timestamp("detected_at").notNull(),
  priceLevel: decimal("price_level", { precision: 12, scale: 4 }).notNull(),
  metadata: jsonb("metadata"), // Pattern-specific data like neckline levels, flag boundaries, etc.
  isActive: boolean("is_active").notNull().default(true), // Whether signal is still valid
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Query performance indexes
  strategyIdIdx: index("pattern_signals_strategy_id_idx").on(table.strategyId),
  symbolPatternActiveIdx: index("pattern_signals_symbol_pattern_active_idx").on(table.symbol, table.patternType, table.isActive),
  symbolDetectedAtIdx: index("pattern_signals_symbol_detected_at_idx").on(table.symbol, table.detectedAt),
  // Prevent duplicate pattern detections
  uniquePatternDetection: unique("pattern_signals_unique_detection").on(table.strategyId, table.symbol, table.patternType, table.timeframe, table.detectedAt),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  alpacaApiKey: true,
  alpacaApiSecret: true,
  paperTrading: true,
});

export const insertStrategySchema = createInsertSchema(strategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: strategyTypeEnum,
  symbols: z.array(z.string()).min(1, "At least one symbol is required").refine(
    (symbols) => symbols.every(s => s.length > 0), 
    "All symbols must be non-empty strings"
  ),
  parameters: z.record(z.any()),
  positionSize: z.string().refine((val) => {
    const num = parseFloat(val);
    return num > 0;
  }, "Position size must be greater than 0"),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
}).extend({
  side: tradeSideEnum,
  status: tradeStatusEnum,
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  price: z.string().refine((val) => {
    const num = parseFloat(val);
    return num > 0;
  }, "Price must be greater than 0"),
});

export const insertPortfolioSnapshotSchema = createInsertSchema(portfolioSnapshots).omit({
  id: true,
  timestamp: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
});

export const insertPatternSignalSchema = createInsertSchema(patternSignals).omit({
  id: true,
  createdAt: true,
}).extend({
  patternType: patternTypeEnum,
  timeframe: timeframeEnum,
  confidence: z.string().refine((val) => {
    const num = parseFloat(val);
    return num >= 0 && num <= 100;
  }, "Confidence must be between 0 and 100"),
  priceLevel: z.string().refine((val) => {
    const num = parseFloat(val);
    return num > 0;
  }, "Price level must be greater than 0"),
});

export const insertOHLCVCandlesSchema = createInsertSchema(ohlcvCandles).omit({
  id: true,
}).extend({
  timeframe: timeframeEnum,
  open: z.string().refine((val) => {
    const num = parseFloat(val);
    return num > 0;
  }, "Open price must be greater than 0"),
  high: z.string().refine((val) => {
    const num = parseFloat(val);
    return num > 0;
  }, "High price must be greater than 0"),
  low: z.string().refine((val) => {
    const num = parseFloat(val);
    return num > 0;
  }, "Low price must be greater than 0"),
  close: z.string().refine((val) => {
    const num = parseFloat(val);
    return num > 0;
  }, "Close price must be greater than 0"),
  volume: z.number().int().nonnegative("Volume must be a non-negative integer"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = typeof strategies.$inferSelect;

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export type InsertPortfolioSnapshot = z.infer<typeof insertPortfolioSnapshotSchema>;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;

export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = typeof marketData.$inferSelect;

export type InsertPatternSignal = z.infer<typeof insertPatternSignalSchema>;
export type PatternSignal = typeof patternSignals.$inferSelect;

export type InsertOHLCVCandles = z.infer<typeof insertOHLCVCandlesSchema>;
export type OHLCVCandles = typeof ohlcvCandles.$inferSelect;

// API Response types
export interface PortfolioSummary {
  totalValue: number;
  dayPnL: number;
  totalPnL: number;
  cashValue: number;
  activeStrategies: number;
  winRate: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    marketValue: number;
    unrealizedPnL: number;
  }>;
}

export interface StrategyPerformance {
  strategyId: string;
  name: string;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  isActive: boolean;
  isPaperTrading: boolean;
}

export interface RealTimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

export interface PatternDetectionSummary {
  totalPatterns: number;
  activePatterns: number;
  patternTypes: Array<{
    type: string;
    count: number;
    averageConfidence: number;
  }>;
  topPerformingPatterns: Array<{
    type: string;
    successRate: number;
    avgProfitLoss: number;
  }>;
}

export interface ActivePatternSignal {
  id: string;
  symbol: string;
  patternType: string;
  confidence: number;
  detectedAt: Date;
  priceLevel: number;
  currentPrice: number;
  priceChange: number;
  metadata: Record<string, any>;
  strategyName: string;
  isActive: boolean;
}

export interface PatternPerformanceMetrics {
  patternType: string;
  totalSignals: number;
  successfulSignals: number;
  successRate: number;
  averageHoldTime: number; // in hours
  totalProfitLoss: number;
  averageProfitLoss: number;
  bestPerformingSymbol: string;
  worstPerformingSymbol: string;
}

export interface PatternAnalysisResponse {
  summary: PatternDetectionSummary;
  activeSignals: ActivePatternSignal[];
  performanceMetrics: PatternPerformanceMetrics[];
  recentPatterns: Array<{
    symbol: string;
    patternType: string;
    detectedAt: Date;
    confidence: number;
    outcome?: 'pending' | 'success' | 'failure';
  }>;
}

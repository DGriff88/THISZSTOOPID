import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, integer, index, unique, real } from "drizzle-orm/pg-core";
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
  'strategic_portfolio_analysis',
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
  'bear_pennant',
  // Reversal Candlestick Patterns
  'hammer_bullish',
  'hammer_bearish',
  'inverted_hammer_bullish',
  'inverted_hammer_bearish',
  'doji_reversal',
  'dragonfly_doji_bullish',
  'gravestone_doji_bearish',
  'bullish_engulfing',
  'bearish_engulfing',
  'shooting_star_bearish',
  'hanging_man_bearish',
  'morning_star_bullish',
  'evening_star_bearish',
  'dark_cloud_cover_bearish',
  'piercing_pattern_bullish'
] as const;
export const TRADE_SIDES = ['buy', 'sell'] as const;
export const TRADE_STATUSES = ['pending', 'filled', 'cancelled', 'rejected'] as const;

// PIRATETRADER rule constants
export const OPTION_TYPES = ['call_debit_spread', 'put_debit_spread', 'call_credit_spread', 'put_credit_spread'] as const;
export const TRADING_SESSIONS = ['first_hour', 'last_hour', 'midday'] as const;
export const SETUP_TYPES = ['ema_pullback', 'momentum_pop', 'yesterday_setup', 'quick_scalp'] as const;
export const RULE_VIOLATIONS = [
  'stray_leg_detected',
  'walk_rule_exceeded', 
  'daily_loss_limit',
  'risk_per_trade',
  'naked_options',
  'outside_trading_window',
  'insufficient_oi',
  'wide_bid_ask',
  'stale_catalyst'
] as const;

// Zod enums
export const timeframeEnum = z.enum(TIMEFRAMES);
export const strategyTypeEnum = z.enum(STRATEGY_TYPES);
export const patternTypeEnum = z.enum(PATTERN_TYPES);
export const tradeSideEnum = z.enum(TRADE_SIDES);
export const tradeStatusEnum = z.enum(TRADE_STATUSES);
export const optionTypeEnum = z.enum(OPTION_TYPES);
export const tradingSessionEnum = z.enum(TRADING_SESSIONS);
export const setupTypeEnum = z.enum(SETUP_TYPES);
export const ruleViolationEnum = z.enum(RULE_VIOLATIONS);

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

// PIRATETRADER compliance tracking tables
export const optionTrades = pgTable("option_trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tradeId: varchar("trade_id").references(() => trades.id),
  symbol: text("symbol").notNull(),
  optionType: text("option_type").notNull(), // call_debit_spread, put_debit_spread, etc.
  setupType: text("setup_type").notNull(), // ema_pullback, momentum_pop, yesterday_setup, quick_scalp
  tradingSession: text("trading_session").notNull(), // first_hour, last_hour, midday
  
  // Spread details
  longStrike: decimal("long_strike", { precision: 8, scale: 2 }).notNull(),
  shortStrike: decimal("short_strike", { precision: 8, scale: 2 }).notNull(),
  expiration: timestamp("expiration").notNull(),
  debit: decimal("debit", { precision: 8, scale: 2 }).notNull(), // Amount paid for spread
  maxRisk: decimal("max_risk", { precision: 8, scale: 2 }).notNull(), // $40-80 per PIRATETRADER rules
  maxProfit: decimal("max_profit", { precision: 8, scale: 2 }),
  
  // RULE ONE compliance
  hasStrayLegs: boolean("has_stray_legs").notNull().default(false),
  legsClosed: boolean("legs_closed").notNull().default(false),
  
  // AI analysis
  aiRecommendation: jsonb("ai_recommendation"), // AI analysis that led to this trade
  catalystAge: integer("catalyst_age"), // Hours since catalyst (must be ≤4h)
  rvol: decimal("rvol", { precision: 5, scale: 2 }), // Must be ≥1.5
  
  openedAt: timestamp("opened_at").notNull(),
  closedAt: timestamp("closed_at"),
  realizedPnl: decimal("realized_pnl", { precision: 8, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => ({
  userIdIdx: index("option_trades_user_id_idx").on(table.userId),
  symbolIdx: index("option_trades_symbol_idx").on(table.symbol),
  openedAtIdx: index("option_trades_opened_at_idx").on(table.openedAt),
  activeTradesIdx: index("option_trades_active_idx").on(table.userId, table.isActive),
}));

export const dailySessions = pgTable("daily_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionDate: timestamp("session_date").notNull(),
  
  // Walk rule tracking
  dailyPnl: decimal("daily_pnl", { precision: 8, scale: 2 }).notNull().default('0'),
  tradeCount: integer("trade_count").notNull().default(0),
  redTrades: integer("red_trades").notNull().default(0), // Track consecutive losses
  walkRuleTriggered: boolean("walk_rule_triggered").notNull().default(false),
  walkRuleReason: text("walk_rule_reason"), // '+$200 profit' or '3 consecutive losses'
  
  // Trading window compliance
  firstHourTrades: integer("first_hour_trades").notNull().default(0),
  lastHourTrades: integer("last_hour_trades").notNull().default(0),
  middayTrades: integer("midday_trades").notNull().default(0),
  
  // Risk compliance
  maxRiskPerTrade: decimal("max_risk_per_trade", { precision: 8, scale: 2 }),
  totalRiskToday: decimal("total_risk_today", { precision: 8, scale: 2 }).notNull().default('0'),
  dailyLossLimit: decimal("daily_loss_limit", { precision: 8, scale: 2 }).notNull().default('-240'), // -$240 max
  
  // GTC order tracking
  gtcOrdersActive: integer("gtc_orders_active").notNull().default(0),
  gtcOrdersCancelled: boolean("gtc_orders_cancelled").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdDateIdx: index("daily_sessions_user_date_idx").on(table.userId, table.sessionDate),
  sessionDateIdx: index("daily_sessions_date_idx").on(table.sessionDate),
  userIdDateUnique: unique("daily_sessions_user_date_unique").on(table.userId, table.sessionDate),
}));

export const weeklyPaychecks = pgTable("weekly_paychecks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekStarting: timestamp("week_starting").notNull(), // Monday of the week
  
  // Paycheck goals
  baselineGoal: decimal("baseline_goal", { precision: 8, scale: 2 }).notNull().default('300'), // $300-500 baseline
  stretchGoal: decimal("stretch_goal", { precision: 8, scale: 2 }).notNull().default('750'), // $750-1000 stretch
  actualPnl: decimal("actual_pnl", { precision: 8, scale: 2 }).notNull().default('0'),
  
  // Weekly trade summary
  totalTrades: integer("total_trades").notNull().default(0),
  winningTrades: integer("winning_trades").notNull().default(0),
  losingTrades: integer("losing_trades").notNull().default(0),
  paycheckMet: boolean("paycheck_met").notNull().default(false),
  
  // Weekly compliance
  avgRiskPerTrade: decimal("avg_risk_per_trade", { precision: 8, scale: 2 }),
  maxWeeklyDrawdown: decimal("max_weekly_drawdown", { precision: 8, scale: 2 }),
  
  isComplete: boolean("is_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdWeekIdx: index("weekly_paychecks_user_week_idx").on(table.userId, table.weekStarting),
  weekStartingIdx: index("weekly_paychecks_week_idx").on(table.weekStarting),
  userIdWeekUnique: unique("weekly_paychecks_user_week_unique").on(table.userId, table.weekStarting),
}));

export const ruleViolations = pgTable("rule_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionId: varchar("session_id").references(() => dailySessions.id),
  optionTradeId: varchar("option_trade_id").references(() => optionTrades.id),
  
  violationType: text("violation_type").notNull(), // RULE_VIOLATIONS enum
  severity: text("severity").notNull().default('warning'), // warning, error, critical
  description: text("description").notNull(),
  ruleReference: text("rule_reference"), // Reference to specific rule (e.g., "RULE ONE", "Walk Rule")
  
  // Violation details
  detectedValue: text("detected_value"), // What triggered the violation
  allowedValue: text("allowed_value"), // What the rule allows
  autoResolved: boolean("auto_resolved").notNull().default(false),
  userAcknowledged: boolean("user_acknowledged").notNull().default(false),
  
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("rule_violations_user_id_idx").on(table.userId),
  sessionIdIdx: index("rule_violations_session_id_idx").on(table.sessionId),
  violationTypeIdx: index("rule_violations_type_idx").on(table.violationType),
  detectedAtIdx: index("rule_violations_detected_at_idx").on(table.detectedAt),
}));

// Strategic Portfolio Analysis tables
export const strategicAnalyses = pgTable("strategic_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  analysisDate: timestamp("analysis_date").notNull(),
  
  // Market outlook
  marketOutlook: text("market_outlook").notNull(), // 'bullish', 'bearish', 'neutral'
  riskLevel: text("risk_level").notNull(), // 'low', 'medium', 'high'
  fedPolicyExpectation: text("fed_policy_expectation"), // 'dovish', 'hawkish', 'neutral'
  volatilityExpectation: text("volatility_expectation"), // 'low', 'medium', 'high'
  
  // AI analysis
  aiAnalysis: text("ai_analysis"), // AI-generated market commentary
  keyEvents: jsonb("key_events"), // Array of upcoming macro events
  recommendations: jsonb("recommendations"), // Array of strategy recommendations
  
  // Risk assessment
  portfolioRisk: text("portfolio_risk"), // Overall portfolio risk level
  correlation: decimal("correlation", { precision: 5, scale: 2 }), // Portfolio correlation score
  confidence: real("confidence"), // 0-1 confidence in analysis
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdDateIdx: index("strategic_analyses_user_date_idx").on(table.userId, table.analysisDate),
  analysisDateIdx: index("strategic_analyses_date_idx").on(table.analysisDate),
}));

export const portfolioHoldings = pgTable("portfolio_holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: text("symbol").notNull(),
  
  // Position details
  shares: integer("shares").notNull(),
  averageCost: decimal("average_cost", { precision: 12, scale: 4 }).notNull(),
  currentPrice: decimal("current_price", { precision: 12, scale: 4 }),
  marketValue: decimal("market_value", { precision: 12, scale: 2 }),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 12, scale: 2 }),
  
  // Risk categorization
  sector: text("sector"),
  marketCap: text("market_cap"), // 'small', 'mid', 'large', 'mega'
  beta: decimal("beta", { precision: 5, scale: 2 }),
  riskRating: text("risk_rating"), // 'conservative', 'moderate', 'aggressive'
  
  // Strategic analysis
  catalysts: jsonb("catalysts"), // Upcoming earnings, events
  technicalLevel: text("technical_level"), // 'support', 'resistance', 'neutral'
  
  isActive: boolean("is_active").notNull().default(true),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdSymbolIdx: index("portfolio_holdings_user_symbol_idx").on(table.userId, table.symbol),
  userIdActiveIdx: index("portfolio_holdings_user_active_idx").on(table.userId, table.isActive),
}));

export const economicEvents = pgTable("economic_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventName: text("event_name").notNull(),
  eventDate: timestamp("event_date").notNull(),
  
  // Event classification
  importance: text("importance").notNull(), // 'low', 'medium', 'high'
  category: text("category").notNull(), // 'fomc', 'earnings', 'economic_data', 'political'
  impact: text("impact"), // 'bullish', 'bearish', 'neutral'
  
  // Event data
  details: text("details"),
  actualValue: text("actual_value"),
  expectedValue: text("expected_value"),
  previousValue: text("previous_value"),
  
  // Market impact assessment
  marketImpact: text("market_impact"), // Expected market reaction
  sectorImpact: jsonb("sector_impact"), // Sector-specific impacts
  
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  eventDateIdx: index("economic_events_date_idx").on(table.eventDate),
  categoryImportanceIdx: index("economic_events_category_importance_idx").on(table.category, table.importance),
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

export const insertPatternConfigSchema = z.object({
  strategyId: z.string().min(1, "Strategy ID is required"),
  patternType: patternTypeEnum,
  config: z.record(z.any()).default({}),
  isActive: z.boolean().default(true),
});

export const insertPatternOutcomeSchema = z.object({
  patternSignalId: z.string().min(1, "Pattern signal ID is required"),
  outcome: z.enum(['success', 'failure', 'timeout']),
  profitLoss: z.number(),
  holdTime: z.number().int().positive("Hold time must be a positive integer"),
  exitReason: z.string().min(1, "Exit reason is required"),
  exitPrice: z.number().positive("Exit price must be positive"),
  metadata: z.record(z.any()).optional().default({}),
});

// PIRATETRADER insert schemas
export const insertOptionTradeSchema = createInsertSchema(optionTrades).omit({
  id: true,
}).extend({
  optionType: optionTypeEnum,
  setupType: setupTypeEnum,
  tradingSession: tradingSessionEnum,
  debit: z.string().refine((val) => {
    const num = parseFloat(val);
    return num > 0;
  }, "Debit must be greater than 0"),
  maxRisk: z.string().refine((val) => {
    const num = parseFloat(val);
    return num >= 40 && num <= 80;
  }, "Max risk must be between $40 and $80 per PIRATETRADER rules"),
});

export const insertDailySessionSchema = createInsertSchema(dailySessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWeeklyPaycheckSchema = createInsertSchema(weeklyPaychecks).omit({
  id: true,
  createdAt: true,
});

export const insertRuleViolationSchema = createInsertSchema(ruleViolations).omit({
  id: true,
  detectedAt: true,
}).extend({
  violationType: ruleViolationEnum,
  severity: z.enum(['warning', 'error', 'critical']).default('warning'),
});

// Strategic Analysis insert schemas
export const insertStrategicAnalysisSchema = createInsertSchema(strategicAnalyses, {
  analysisDate: z.date(),
  keyEvents: z.array(z.any()).optional(),
  recommendations: z.array(z.any()).optional(),
}).omit({
  id: true,
  createdAt: true,
}).extend({
  marketOutlook: z.enum(['bullish', 'bearish', 'neutral']),
  riskLevel: z.enum(['low', 'medium', 'high']),
  fedPolicyExpectation: z.enum(['dovish', 'hawkish', 'neutral']).optional(),
  volatilityExpectation: z.enum(['low', 'medium', 'high']).optional(),
  portfolioRisk: z.enum(['low', 'medium', 'high']).optional(),
});

export const insertPortfolioHoldingSchema = createInsertSchema(portfolioHoldings).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
}).extend({
  marketCap: z.enum(['small', 'mid', 'large', 'mega']).optional(),
  riskRating: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  technicalLevel: z.enum(['support', 'resistance', 'neutral']).optional(),
});

export const insertEconomicEventSchema = createInsertSchema(economicEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  importance: z.enum(['low', 'medium', 'high']),
  category: z.enum(['fomc', 'earnings', 'economic_data', 'political']),
  impact: z.enum(['bullish', 'bearish', 'neutral']).optional(),
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

// PIRATETRADER types
export type InsertOptionTrade = z.infer<typeof insertOptionTradeSchema>;
export type OptionTrade = typeof optionTrades.$inferSelect;

export type InsertDailySession = z.infer<typeof insertDailySessionSchema>;
export type DailySession = typeof dailySessions.$inferSelect;

export type InsertWeeklyPaycheck = z.infer<typeof insertWeeklyPaycheckSchema>;
export type WeeklyPaycheck = typeof weeklyPaychecks.$inferSelect;

export type InsertRuleViolation = z.infer<typeof insertRuleViolationSchema>;
export type RuleViolation = typeof ruleViolations.$inferSelect;

// Strategic Analysis types
export type InsertStrategicAnalysis = z.infer<typeof insertStrategicAnalysisSchema>;
export type StrategicAnalysis = typeof strategicAnalyses.$inferSelect;

export type InsertPortfolioHolding = z.infer<typeof insertPortfolioHoldingSchema>;
export type PortfolioHolding = typeof portfolioHoldings.$inferSelect;

export type InsertEconomicEvent = z.infer<typeof insertEconomicEventSchema>;
export type EconomicEvent = typeof economicEvents.$inferSelect;

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

// Pattern Configuration Management
export interface PatternConfig {
  id: string;
  strategyId: string;
  patternType: string;
  config: Record<string, any>; // PatternDetectionConfig subset
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type InsertPatternConfig = z.infer<typeof insertPatternConfigSchema>;

// Pattern Outcome Tracking
export interface PatternOutcome {
  id: string;
  patternSignalId: string;
  outcome: 'success' | 'failure' | 'timeout';
  profitLoss: number;
  holdTime: number; // in minutes
  exitReason: string;
  exitPrice: number;
  recordedAt: Date;
  metadata?: Record<string, any>;
}

export type InsertPatternOutcome = z.infer<typeof insertPatternOutcomeSchema>;

// Pattern Strategy Parameters
export interface PatternStrategyParameters {
  confidenceThreshold?: number;
  timeframe?: string;
  minPatternSize?: number;
  maxPatternAge?: number;
  rejectionCandleSize?: number;
  poleSize?: number;
}

// Technical Strategy Parameters
export interface TechnicalStrategyParameters {
  period?: number;
  threshold?: number;
  [key: string]: any;
}

// All Strategy Parameters Union
export type StrategyParameters = PatternStrategyParameters | TechnicalStrategyParameters | Record<string, any>;

// Type-safe Strategy interface extending the base Strategy type
export interface TypedStrategy extends Omit<Strategy, 'parameters'> {
  parameters: StrategyParameters;
}

// Enhanced Analytics
export interface PatternBacktestRequest {
  strategyId: string;
  symbols: string[];
  startDate: Date;
  endDate: Date;
  patternTypes?: string[];
  config?: Record<string, any>;
}

export interface PatternBacktestResult {
  totalSignals: number;
  profitableSignals: number;
  totalPnL: number;
  winRate: number;
  averageHoldTime: number;
  maxDrawdown: number;
  sharpeRatio: number;
  signals: Array<{
    symbol: string;
    patternType: string;
    detectedAt: Date;
    outcome: 'success' | 'failure' | 'timeout';
    pnl: number;
    holdTime: number;
  }>;
}

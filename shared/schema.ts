import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  type: text("type").notNull(), // 'moving_average', 'rsi', 'bollinger_bands', 'macd', 'custom'
  description: text("description"),
  symbols: text("symbols").array().notNull(), // ['AAPL', 'MSFT', 'GOOGL']
  parameters: jsonb("parameters").notNull(), // Strategy-specific parameters
  positionSize: decimal("position_size", { precision: 12, scale: 2 }).notNull(),
  stopLoss: decimal("stop_loss", { precision: 5, scale: 2 }), // Percentage
  takeProfit: decimal("take_profit", { precision: 5, scale: 2 }), // Percentage
  isActive: boolean("is_active").notNull().default(false),
  isPaperTrading: boolean("is_paper_trading").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  strategyId: varchar("strategy_id").references(() => strategies.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'buy' or 'sell'
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 4 }).notNull(),
  executedAt: timestamp("executed_at").notNull(),
  pnl: decimal("pnl", { precision: 12, scale: 2 }),
  isPaperTrade: boolean("is_paper_trade").notNull().default(true),
  alpacaOrderId: text("alpaca_order_id"),
  status: text("status").notNull().default('pending'), // 'pending', 'filled', 'cancelled', 'rejected'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
  symbols: z.array(z.string()),
  parameters: z.record(z.any()),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
});

export const insertPortfolioSnapshotSchema = createInsertSchema(portfolioSnapshots).omit({
  id: true,
  timestamp: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
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

# TradeBotPro

## Overview

TradeBotPro is a comprehensive algorithmic trading platform designed for automated strategy execution, risk management, and portfolio analysis. The application provides a full-stack solution for both paper and live trading with Alpaca API integration, featuring real-time market data processing, strategy backtesting, and portfolio monitoring capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React + TypeScript SPA**: Built with modern React 18 using TypeScript for type safety. The frontend uses Vite as the build tool and development server, providing fast hot module replacement and optimized production builds.

**Component Library**: Implements shadcn/ui components based on Radix UI primitives, providing a consistent and accessible design system. The UI is styled with Tailwind CSS using a dark theme optimized for trading interfaces.

**State Management**: Uses TanStack Query (React Query) for server state management, caching, and synchronization. Local component state is managed with React hooks, avoiding the complexity of global state managers for this use case.

**Routing**: Implements client-side routing with Wouter, a lightweight routing library that provides the necessary navigation capabilities without the overhead of React Router.

**Real-time Updates**: WebSocket integration for live market data feeds and trading updates, ensuring users receive immediate notifications of strategy executions and market changes.

### Backend Architecture

**Express.js API Server**: RESTful API built with Express.js and TypeScript, providing endpoints for strategy management, trade execution, portfolio analysis, and user settings.

**WebSocket Service**: Real-time communication layer using native WebSocket for broadcasting market data, trade notifications, and system alerts to connected clients.

**Authentication**: Simplified demo authentication system that can be extended with proper JWT or session-based authentication for production deployment.

**Error Handling**: Centralized error handling middleware with structured error responses and logging for debugging and monitoring.

### Data Storage Solutions

**PostgreSQL with Drizzle ORM**: Uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The schema includes tables for users, strategies, trades, portfolio snapshots, and market data.

**In-Memory Storage Interface**: Implements a storage abstraction layer that currently uses in-memory data structures for demo purposes, but can be easily switched to the PostgreSQL implementation.

**Data Models**: Comprehensive schema design supporting user management, strategy configurations, trade history, portfolio tracking, and market data storage with proper foreign key relationships.

### External Service Integrations

**Alpaca Trading API**: Primary brokerage integration for both paper and live trading. Handles order execution, position management, account data retrieval, and market data feeds.

**Market Data Processing**: Real-time quote processing and historical data management for strategy analysis and backtesting capabilities.

**WebSocket Market Feeds**: Integration with Alpaca's WebSocket feeds for real-time market data streaming to support live trading strategies.

### Risk Management Framework

**Position Sizing**: Configurable position sizing rules based on account equity and risk tolerance settings.

**Stop Loss/Take Profit**: Automated risk management with configurable stop-loss and take-profit levels for each strategy.

**Daily Loss Limits**: Implementation of daily loss limits and emergency stop functionality to prevent catastrophic losses.

**Concurrent Trade Limits**: Controls on maximum concurrent positions to prevent over-leveraging.

### Strategy Engine

**Pluggable Strategy Architecture**: Modular strategy system supporting multiple algorithm types including moving averages, RSI, Bollinger Bands, MACD, and custom algorithms.

**Paper Trading Environment**: Isolated paper trading environment for strategy testing without real money risk.

**Strategy Performance Analytics**: Comprehensive performance tracking including P&L, win rates, drawdown analysis, and risk metrics.

**Real-time Execution**: Live strategy execution engine with market data processing and order management.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connectivity for cloud deployment
- **Alpaca Trading API**: Core brokerage services for trade execution and market data
- **TanStack Query**: Client-side data fetching and caching
- **Drizzle ORM**: Type-safe database operations and migrations
- **shadcn/ui + Radix UI**: Component library and accessibility primitives
- **Tailwind CSS**: Utility-first styling framework
- **WebSocket**: Real-time communication for market data and notifications
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across the entire application stack
#!/usr/bin/env python3
"""
Test script for Schwabbot v2.0 strategies
"""

import os
import sys
from datetime import datetime
import pandas as pd

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import *
from data import historical_bars
from strategies_seasonal import SeasonalStrategy
from options_strategy import OptionsStrategy
from reddit_integration import RedditIntegration

def test_seasonal_strategy():
    """Test the seasonal trading strategy."""
    print("=== Testing Seasonal Strategy ===")
    
    # Initialize strategy
    config = {
        'SEASONAL_STOCKS': SEASONAL_STOCKS,
        'SEASONAL_START_DATES': SEASONAL_START_DATES,
        'MEMORIAL_DAY_START': '05-25',
        'LABOR_DAY_END': '09-01'
    }
    
    strategy = SeasonalStrategy(config)
    
    # Test strategy info
    info = strategy.get_strategy_info()
    print(f"Strategy: {info['strategy_name']}")
    print(f"Description: {info['description']}")
    print(f"Expected ROI: {info['expected_roi']}")
    print(f"Historical Probability: {info['historical_probability']}")
    print(f"Current Period: {info['current_period']}")
    print(f"Active Symbols: {info['active_symbols']}")
    print(f"Seasonal Stocks: {info['seasonal_stocks']}")
    print(f"Start Dates: {info['start_dates']}")
    
    # Test with sample data
    if info['current_period']:
        print("\nTesting with sample data...")
        for symbol in ['CHTR', 'BIO', 'NDAQ']:
            try:
                df = historical_bars(symbol, period="5d", interval="1h")
                if not df.empty:
                    buy, sell, meta = strategy.seasonal_signal(df, symbol)
                    print(f"{symbol}: Buy={buy}, Sell={sell}")
                    if meta:
                        print(f"  Meta: {meta}")
            except Exception as e:
                print(f"Error testing {symbol}: {e}")
    
    print()

def test_options_strategy():
    """Test the options trading strategy."""
    print("=== Testing Options Strategy ===")
    
    # Initialize strategy
    config = {
        'OPTIONS_ENABLED': True,
        'OPTIONS_STRATEGY': 'calls',
        'OPTIONS_EXPIRY_DAYS': 45,
        'OPTIONS_DELTA_TARGET': 0.30
    }
    
    strategy = OptionsStrategy(config)
    
    # Test strategy info
    info = strategy.get_strategy_info()
    print(f"Strategy: {info['strategy_name']}")
    print(f"Description: {info['description']}")
    print(f"Enabled: {info['enabled']}")
    print(f"Strategy Type: {info['strategy_type']}")
    print(f"Example: {info['example']}")
    
    # Test call option evaluation (SPY example)
    print("\nTesting SPY call option evaluation...")
    underlying_price = 597.39  # Current SPY price
    strike_price = 600.0
    option_price = 15.74
    days_to_expiry = 58
    
    should_buy, analysis = strategy.evaluate_call_option(
        'SPY', underlying_price, strike_price, option_price, days_to_expiry
    )
    
    print(f"Should Buy: {should_buy}")
    if analysis:
        metrics = analysis.get('metrics', {})
        print(f"Cost %: {metrics.get('cost_pct', 0):.3f}")
        print(f"Breakeven %: {metrics.get('breakeven_pct', 0):.3f}")
        print(f"Delta: {metrics.get('delta', 0):.2f}")
        print(f"Criteria: {analysis.get('criteria', {})}")
    
    print()

def test_reddit_integration():
    """Test the Reddit integration."""
    print("=== Testing Reddit Integration ===")
    
    # Initialize integration
    config = {
        'REDDIT_ENABLED': True,
        'REDDIT_CLIENT_ID': '8jkzCTWZ4tMiDAsqu_2ltQ',
        'REDDIT_CLIENT_SECRET': 'EqvLbAs-zkJemu-yjlvg1A7zUanfBg',
        'REDDIT_REDIRECT_URI': 'http://localhost',
        'REDDIT_USER_AGENT': 'Schwabbot/1.0'
    }
    
    integration = RedditIntegration(config)
    
    # Test strategy info
    info = integration.get_strategy_info()
    print(f"Strategy: {info['strategy_name']}")
    print(f"Description: {info['description']}")
    print(f"Enabled: {info['enabled']}")
    print(f"App Name: {info['app_name']}")
    print(f"Subreddits: {info['subreddits']}")
    
    # Test sentiment analysis (without actually calling Reddit API)
    print("\nTesting sentiment analysis functions...")
    
    # Test text sentiment
    bullish_text = "SPY to the moon! 🚀 Bullish breakout incoming!"
    bearish_text = "Market crash coming, sell everything!"
    neutral_text = "Market analysis shows mixed signals."
    
    bullish_score = integration._analyze_text_sentiment(bullish_text)
    bearish_score = integration._analyze_text_sentiment(bearish_text)
    neutral_score = integration._analyze_text_sentiment(neutral_text)
    
    print(f"Bullish text score: {bullish_score:.2f}")
    print(f"Bearish text score: {bearish_score:.2f}")
    print(f"Neutral text score: {neutral_score:.2f}")
    
    # Test stock symbol extraction
    test_text = "I'm bullish on $AAPL and $TSLA. Also watching SPY and QQQ."
    symbols = integration._extract_stock_symbols(test_text)
    print(f"Extracted symbols: {symbols}")
    
    print()

def test_integration():
    """Test the integrated system."""
    print("=== Testing Integrated System ===")
    
    # Test with a sample symbol
    symbol = "AAPL"
    print(f"Testing integrated analysis for {symbol}...")
    
    try:
        # Get market data
        df = historical_bars(symbol, period="5d", interval="1h")
        if df.empty:
            print(f"No data available for {symbol}")
            return
        
        current_price = df['close'].iloc[-1]
        print(f"Current price: ${current_price:.2f}")
        
        # Test seasonal strategy
        if SEASONAL_ENABLED:
            seasonal_config = {
                'SEASONAL_STOCKS': SEASONAL_STOCKS,
                'SEASONAL_START_DATES': SEASONAL_START_DATES,
                'MEMORIAL_DAY_START': '05-25',
                'LABOR_DAY_END': '09-01'
            }
            seasonal_strategy = SeasonalStrategy(seasonal_config)
            seasonal_buy, seasonal_sell, seasonal_meta = seasonal_strategy.seasonal_signal(df, symbol)
            print(f"Seasonal signal: Buy={seasonal_buy}, Sell={seasonal_sell}")
        
        # Test options strategy
        if OPTIONS_ENABLED:
            options_config = {
                'OPTIONS_ENABLED': OPTIONS_ENABLED,
                'OPTIONS_STRATEGY': 'calls',
                'OPTIONS_EXPIRY_DAYS': 45,
                'OPTIONS_DELTA_TARGET': 0.30
            }
            options_strategy = OptionsStrategy(options_config)
            options_buy, options_sell, options_meta = options_strategy.generate_options_signals(df, symbol, current_price)
            print(f"Options signal: Buy={options_buy}, Sell={options_sell}")
        
        print("Integration test completed successfully!")
        
    except Exception as e:
        print(f"Integration test error: {e}")

def main():
    """Run all tests."""
    print("Schwabbot v2.0 Strategy Tests")
    print("=" * 40)
    print(f"Test time: {datetime.now()}")
    print()
    
    try:
        test_seasonal_strategy()
        test_options_strategy()
        test_reddit_integration()
        test_integration()
        
        print("All tests completed!")
        
    except Exception as e:
        print(f"Test error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

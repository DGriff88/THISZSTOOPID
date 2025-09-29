"""
Seasonal Trading Strategy - Memorial Day to Labor Day Bullish Pattern
Based on historical analysis showing 80% probability and ~6% ROI
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class SeasonalStrategy:
    """
    Implements the seasonal trading strategy for Memorial Day to Labor Day period.
    
    Strategy:
    - Memorial Day (late May) to Labor Day (early Sept) shows bullish patterns
    - Historical 80% probability of success
    - ~6% average ROI
    - Specific stocks have defined start dates:
      - CHTR: June 20
      - BIO: July 1  
      - NDAQ: July 30
    """
    
    def __init__(self, config):
        self.config = config
        self.seasonal_stocks = config.get('SEASONAL_STOCKS', ['CHTR', 'BIO', 'NDAQ'])
        self.start_dates = config.get('SEASONAL_START_DATES', {
            'CHTR': '06-20',
            'BIO': '07-01',
            'NDAQ': '07-30'
        })
        self.memorial_day = config.get('MEMORIAL_DAY_START', '05-25')
        self.labor_day = config.get('LABOR_DAY_END', '09-01')
        
    def is_seasonal_period(self, date: Optional[datetime] = None) -> bool:
        """Check if current date is within the seasonal trading window."""
        if date is None:
            date = datetime.now()
            
        current_month_day = date.strftime('%m-%d')
        
        # Memorial Day to Labor Day period
        if self.memorial_day <= current_month_day <= self.labor_day:
            return True
            
        return False
    
    def is_stock_active(self, symbol: str, date: Optional[datetime] = None) -> bool:
        """Check if a specific stock should be active based on its start date."""
        if date is None:
            date = datetime.now()
            
        if symbol not in self.start_dates:
            return False
            
        start_date = self.start_dates[symbol]
        current_month_day = date.strftime('%m-%d')
        
        return current_month_day >= start_date
    
    def get_active_symbols(self, date: Optional[datetime] = None) -> List[str]:
        """Get list of symbols that should be active for seasonal trading."""
        if not self.is_seasonal_period(date):
            return []
            
        active_symbols = []
        for symbol in self.seasonal_stocks:
            if self.is_stock_active(symbol, date):
                active_symbols.append(symbol)
                
        return active_symbols
    
    def seasonal_signal(self, df: pd.DataFrame, symbol: str) -> Tuple[bool, bool, Dict]:
        """
        Generate seasonal trading signals based on the Memorial Day to Labor Day pattern.
        
        Returns:
        - buy_signal: True if should buy
        - sell_signal: True if should sell  
        - metadata: Additional strategy info
        """
        if df is None or df.empty:
            return False, False, {}
            
        current_date = datetime.now()
        
        # Check if we're in seasonal period
        if not self.is_seasonal_period(current_date):
            return False, False, {'reason': 'Outside seasonal period'}
            
        # Check if this stock should be active
        if not self.is_stock_active(symbol, current_date):
            return False, False, {'reason': f'{symbol} not yet active'}
            
        # Get recent price action (last 5 days)
        recent_data = df.tail(5)
        if len(recent_data) < 5:
            return False, False, {'reason': 'Insufficient data'}
            
        # Calculate momentum indicators
        recent_data['sma_5'] = recent_data['close'].rolling(5).mean()
        recent_data['sma_10'] = recent_data['close'].rolling(10).mean()
        recent_data['rsi'] = self._calculate_rsi(recent_data['close'], 14)
        
        latest = recent_data.iloc[-1]
        
        # Seasonal bullish conditions:
        # 1. Price above 5-day SMA
        # 2. 5-day SMA above 10-day SMA  
        # 3. RSI between 30-70 (not overbought/oversold)
        # 4. Positive momentum (higher highs)
        
        price_above_sma5 = latest['close'] > latest['sma_5']
        sma5_above_sma10 = latest['sma_5'] > latest['sma_10']
        rsi_healthy = 30 <= latest['rsi'] <= 70
        positive_momentum = self._check_momentum(recent_data)
        
        buy_conditions = price_above_sma5 and sma5_above_sma10 and rsi_healthy and positive_momentum
        
        # Sell conditions (exit seasonal position):
        # 1. RSI > 70 (overbought)
        # 2. Price below 5-day SMA
        # 3. Negative momentum
        # 4. Outside seasonal period
        
        sell_conditions = (
            latest['rsi'] > 70 or 
            latest['close'] < latest['sma_5'] or 
            not positive_momentum or
            not self.is_seasonal_period(current_date)
        )
        
        metadata = {
            'strategy': 'seasonal',
            'period': 'memorial_to_labor',
            'symbol': symbol,
            'current_date': current_date.strftime('%Y-%m-%d'),
            'price': latest['close'],
            'sma_5': latest['sma_5'],
            'sma_10': latest['sma_10'], 
            'rsi': latest['rsi'],
            'price_above_sma5': price_above_sma5,
            'sma5_above_sma10': sma5_above_sma10,
            'rsi_healthy': rsi_healthy,
            'positive_momentum': positive_momentum
        }
        
        return buy_conditions, sell_conditions, metadata
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Relative Strength Index."""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)  # Fill NaN with neutral RSI value
    
    def _check_momentum(self, df: pd.DataFrame) -> bool:
        """Check if price momentum is positive (higher highs)."""
        if len(df) < 3:
            return False
            
        # Check last 3 periods for higher highs
        highs = df['high'].tail(3).values
        return highs[2] > highs[1] > highs[0]
    
    def get_strategy_info(self) -> Dict:
        """Get information about the seasonal strategy."""
        current_date = datetime.now()
        active_symbols = self.get_active_symbols(current_date)
        
        return {
            'strategy_name': 'Memorial Day to Labor Day Seasonal',
            'description': 'Bullish pattern from Memorial Day to Labor Day with 80% historical probability',
            'expected_roi': '6%',
            'historical_probability': '80%',
            'current_period': self.is_seasonal_period(current_date),
            'active_symbols': active_symbols,
            'seasonal_stocks': self.seasonal_stocks,
            'start_dates': self.start_dates,
            'period_start': self.memorial_day,
            'period_end': self.labor_day
        }

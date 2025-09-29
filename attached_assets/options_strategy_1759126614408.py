"""
Options Trading Strategy - Call Options and Spreads
Based on the SPY example showing 120% projected profit potential
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class OptionsStrategy:
    """
    Implements options trading strategies including calls and spreads.
    
    Based on SPY example:
    - Buy SPY August 15, 2025 $600 Calls for $15.74
    - $35 move - $15.74 cost = 120% projected profit
    - Target 2.5% cost of underlying
    """
    
    def __init__(self, config):
        self.config = config
        self.options_enabled = config.get('OPTIONS_ENABLED', False)
        self.strategy = config.get('OPTIONS_STRATEGY', 'calls')
        self.expiry_days = config.get('OPTIONS_EXPIRY_DAYS', 45)
        self.delta_target = config.get('OPTIONS_DELTA_TARGET', 0.30)
        self.max_cost_pct = 0.025  # 2.5% max cost of underlying
        
    def calculate_call_option_metrics(self, 
                                    underlying_price: float,
                                    strike_price: float,
                                    option_price: float,
                                    days_to_expiry: int,
                                    volatility: float = 0.20) -> Dict:
        """
        Calculate key metrics for a call option position.
        
        Args:
            underlying_price: Current price of underlying
            strike_price: Option strike price
            option_price: Option premium
            days_to_expiry: Days until expiration
            volatility: Implied volatility (default 20%)
            
        Returns:
            Dictionary with option metrics
        """
        # Basic calculations
        cost_pct = option_price / underlying_price
        breakeven_price = strike_price + option_price
        breakeven_pct = (breakeven_price - underlying_price) / underlying_price
        
        # Risk metrics
        max_loss = option_price
        max_profit = float('inf')  # Unlimited upside for calls
        
        # Delta approximation (simplified)
        # Delta increases as option goes deeper in the money
        moneyness = underlying_price / strike_price
        if moneyness > 1.1:  # Deep ITM
            delta = 0.9
        elif moneyness > 1.0:  # Slightly ITM
            delta = 0.7
        elif moneyness > 0.95:  # Near ATM
            delta = 0.5
        elif moneyness > 0.9:  # Slightly OTM
            delta = 0.3
        else:  # Deep OTM
            delta = 0.1
            
        # Theta (time decay) approximation
        theta = -option_price / (days_to_expiry + 1)  # Daily time decay
        
        return {
            'underlying_price': underlying_price,
            'strike_price': strike_price,
            'option_price': option_price,
            'cost_pct': cost_pct,
            'breakeven_price': breakeven_price,
            'breakeven_pct': breakeven_pct,
            'max_loss': max_loss,
            'max_profit': max_profit,
            'delta': delta,
            'theta': theta,
            'days_to_expiry': days_to_expiry,
            'moneyness': moneyness
        }
    
    def evaluate_call_option(self, 
                           symbol: str,
                           underlying_price: float,
                           strike_price: float,
                           option_price: float,
                           days_to_expiry: int) -> Tuple[bool, Dict]:
        """
        Evaluate if a call option meets our criteria.
        
        Returns:
            - should_buy: True if option meets criteria
            - analysis: Detailed analysis
        """
        metrics = self.calculate_call_option_metrics(
            underlying_price, strike_price, option_price, days_to_expiry
        )
        
        # Evaluation criteria
        criteria = {
            'cost_acceptable': metrics['cost_pct'] <= self.max_cost_pct,
            'delta_acceptable': metrics['delta'] >= self.delta_target,
            'breakeven_reasonable': metrics['breakeven_pct'] <= 0.10,  # 10% move to breakeven
            'expiry_acceptable': days_to_expiry >= 30,  # At least 30 days
            'moneyness_ok': 0.9 <= metrics['moneyness'] <= 1.1  # Near ATM
        }
        
        should_buy = all(criteria.values())
        
        analysis = {
            'symbol': symbol,
            'metrics': metrics,
            'criteria': criteria,
            'should_buy': should_buy,
            'strategy': 'call_option'
        }
        
        return should_buy, analysis
    
    def calculate_spread_metrics(self,
                               buy_strike: float,
                               sell_strike: float,
                               buy_price: float,
                               sell_price: float,
                               underlying_price: float) -> Dict:
        """
        Calculate metrics for a vertical spread.
        
        Args:
            buy_strike: Strike price of long option
            sell_strike: Strike price of short option  
            buy_price: Premium paid for long option
            sell_price: Premium received for short option
            underlying_price: Current underlying price
            
        Returns:
            Dictionary with spread metrics
        """
        net_debit = buy_price - sell_price
        max_loss = net_debit
        max_profit = sell_strike - buy_strike - net_debit
        spread_width = sell_strike - buy_strike
        
        # Risk/reward ratio
        risk_reward = max_profit / max_loss if max_loss > 0 else 0
        
        # Breakeven
        breakeven_price = buy_strike + net_debit
        
        return {
            'net_debit': net_debit,
            'max_loss': max_loss,
            'max_profit': max_profit,
            'spread_width': spread_width,
            'risk_reward': risk_reward,
            'breakeven_price': breakeven_price,
            'underlying_price': underlying_price
        }
    
    def evaluate_spread(self,
                       symbol: str,
                       buy_strike: float,
                       sell_strike: float,
                       buy_price: float,
                       sell_price: float,
                       underlying_price: float) -> Tuple[bool, Dict]:
        """
        Evaluate if a vertical spread meets our criteria.
        
        Returns:
            - should_buy: True if spread meets criteria
            - analysis: Detailed analysis
        """
        metrics = self.calculate_spread_metrics(
            buy_strike, sell_strike, buy_price, sell_price, underlying_price
        )
        
        # Evaluation criteria
        criteria = {
            'risk_reward_ok': metrics['risk_reward'] >= 2.0,  # 2:1 or better
            'max_loss_acceptable': metrics['max_loss'] <= underlying_price * 0.02,  # 2% max loss
            'spread_width_reasonable': metrics['spread_width'] <= underlying_price * 0.05,  # 5% width
            'breakeven_reasonable': metrics['breakeven_price'] <= underlying_price * 1.05  # 5% move
        }
        
        should_buy = all(criteria.values())
        
        analysis = {
            'symbol': symbol,
            'metrics': metrics,
            'criteria': criteria,
            'should_buy': should_buy,
            'strategy': 'vertical_spread'
        }
        
        return should_buy, analysis
    
    def generate_options_signals(self, 
                               df: pd.DataFrame, 
                               symbol: str,
                               current_price: float) -> Tuple[bool, bool, Dict]:
        """
        Generate options trading signals based on underlying price action.
        
        Returns:
            - buy_signal: True if should buy options
            - sell_signal: True if should sell options
            - metadata: Strategy information
        """
        if df is None or df.empty or not self.options_enabled:
            return False, False, {}
            
        # Calculate technical indicators
        df['sma_20'] = df['close'].rolling(20).mean()
        df['sma_50'] = df['close'].rolling(50).mean()
        df['rsi'] = self._calculate_rsi(df['close'])
        
        latest = df.iloc[-1]
        
        # Options buy conditions (bullish setup):
        # 1. Price above 20-day SMA
        # 2. 20-day SMA above 50-day SMA
        # 3. RSI between 40-70 (not overbought)
        # 4. Positive momentum
        
        price_above_sma20 = latest['close'] > latest['sma_20']
        sma20_above_sma50 = latest['sma_20'] > latest['sma_50']
        rsi_healthy = 40 <= latest['rsi'] <= 70
        positive_momentum = self._check_momentum(df)
        
        buy_conditions = (
            price_above_sma20 and 
            sma20_above_sma50 and 
            rsi_healthy and 
            positive_momentum
        )
        
        # Options sell conditions:
        # 1. RSI > 75 (overbought)
        # 2. Price below 20-day SMA
        # 3. Negative momentum
        # 4. Time decay concerns (close to expiry)
        
        sell_conditions = (
            latest['rsi'] > 75 or
            latest['close'] < latest['sma_20'] or
            not positive_momentum
        )
        
        metadata = {
            'strategy': 'options',
            'symbol': symbol,
            'current_price': current_price,
            'sma_20': latest['sma_20'],
            'sma_50': latest['sma_50'],
            'rsi': latest['rsi'],
            'price_above_sma20': price_above_sma20,
            'sma20_above_sma50': sma20_above_sma50,
            'rsi_healthy': rsi_healthy,
            'positive_momentum': positive_momentum,
            'options_enabled': self.options_enabled,
            'strategy_type': self.strategy
        }
        
        return buy_conditions, sell_conditions, metadata
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Relative Strength Index."""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)
    
    def _check_momentum(self, df: pd.DataFrame) -> bool:
        """Check if price momentum is positive."""
        if len(df) < 5:
            return False
            
        # Check last 5 periods for higher highs
        highs = df['high'].tail(5).values
        return highs[-1] > highs[-2] > highs[-3]
    
    def get_strategy_info(self) -> Dict:
        """Get information about the options strategy."""
        return {
            'strategy_name': 'Options Trading Strategy',
            'description': 'Call options and spreads with 2.5% max cost and delta targeting',
            'enabled': self.options_enabled,
            'strategy_type': self.strategy,
            'expiry_days': self.expiry_days,
            'delta_target': self.delta_target,
            'max_cost_pct': self.max_cost_pct,
            'example': 'SPY $600 calls: $35 move - $15.74 cost = 120% profit'
        }

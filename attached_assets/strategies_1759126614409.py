"""
Unified strategies module
- Exposes multiple strategy functions that accept a price DataFrame and return a dict
- DataFrame format expected: columns ['open','high','low','close','volume'] and index is datetime-like
- Example return:
    {
      "signal": "buy" | "sell" | "hold",
      "size": 1000.0,             # recommended dollars to allocate
      "stop_loss_pct": 0.02,     # e.g., 2% stop loss
      "take_profit_pct": 0.04,   # e.g., 4% take profit
      "meta": {...}
    }
- If you need string fields for positionSize/stopLoss/takeProfit for your API, use format_for_api()
"""

from typing import Dict, Callable, Any
import pandas as pd
import numpy as np


def _ensure_columns(df: pd.DataFrame):
    required = {"open", "high", "low", "close", "volume"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"price DataFrame missing columns: {missing}")


def ema(series: pd.Series, span: int) -> pd.Series:
    """Simple EMA wrapper"""
    return series.ewm(span=span, adjust=False).mean()


def bollinger_bands(close: pd.Series, window: int = 20, n_std: float = 2.0):
    """Return middle, upper, lower"""
    mid = close.rolling(window=window, min_periods=1).mean()
    std = close.rolling(window=window, min_periods=1).std(ddof=0).fillna(0)
    upper = mid + n_std * std
    lower = mid - n_std * std
    return mid, upper, lower


def format_for_api(result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert numeric parts to string fields for a front-end/api that expects strings.
    Keeps numeric fields too under numeric_* names so internal code can still read numbers.
    """
    out = result.copy()
    # Numeric fields we commonly send
    for name in ("size", "stop_loss_pct", "take_profit_pct"):
        if name in result:
            out[f"numeric_{name}"] = result[name]
            # string versions (UI/back-end that expects strings):
            out[name] = str(result[name])
    return out


# -----------------------
# Strategy implementations
# -----------------------

def ema_crossover_strategy(df: pd.DataFrame, short_span: int = 9, long_span: int = 21,
                           account_size: float = 100000.0, risk_per_trade: float = 0.01) -> Dict:
    """
    EMA crossover strategy:
    - Buy when short EMA crosses above long EMA
    - Sell when short EMA crosses below long EMA
    Returns recommended size in dollars (naive: percent of account).
    """
    _ensure_columns(df)
    close = df["close"].astype(float)

    ema_short = ema(close, short_span)
    ema_long = ema(close, long_span)

    # use last two values for cross detection
    if len(close) < 2:
        return {"signal": "hold", "size": 0.0, "stop_loss_pct": 0.0, "take_profit_pct": 0.0, "meta": {}}

    prev_short = ema_short.iloc[-2]
    prev_long = ema_long.iloc[-2]
    last_short = ema_short.iloc[-1]
    last_long = ema_long.iloc[-1]

    signal = "hold"
    if prev_short <= prev_long and last_short > last_long:
        signal = "buy"
    elif prev_short >= prev_long and last_short < last_long:
        signal = "sell"
    else:
        signal = "hold"

    # Risk sizing: flat percent of account_size
    size = account_size * risk_per_trade if signal in ("buy", "sell") else 0.0

    # default stop/take profit: use ATR-like simple volatility proxy
    recent = close[-20:]
    volatility = recent.pct_change().abs().mean() if len(recent) > 1 else 0.01
    stop_loss_pct = max(0.01, volatility * 3)  # at least 1%
    take_profit_pct = stop_loss_pct * 2.0

    return {
        "signal": signal,
        "size": float(round(size, 2)),
        "stop_loss_pct": float(round(stop_loss_pct, 4)),
        "take_profit_pct": float(round(take_profit_pct, 4)),
        "meta": {
            "ema_short": float(last_short),
            "ema_long": float(last_long),
            "volatility": float(volatility),
            "short_span": short_span,
            "long_span": long_span,
        },
    }


def bollinger_mean_reversion(df: pd.DataFrame, window: int = 20, n_std: float = 2.0,
                             account_size: float = 100000.0, risk_per_trade: float = 0.005) -> Dict:
    """
    Bollinger band mean reversion:
    - Buy when price touches lower band
    - Sell when price touches upper band
    """
    _ensure_columns(df)
    close = df["close"].astype(float)
    mid, upper, lower = bollinger_bands(close, window=window, n_std=n_std)

    if len(close) < 1:
        return {"signal": "hold", "size": 0.0, "stop_loss_pct": 0.0, "take_profit_pct": 0.0, "meta": {}}

    last = close.iloc[-1]
    last_upper = upper.iloc[-1]
    last_lower = lower.iloc[-1]

if __name__ == "__main__":
    print("✅ strategies module loaded successfully")

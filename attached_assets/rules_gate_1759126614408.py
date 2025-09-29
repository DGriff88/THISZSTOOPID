from datetime import datetime, time
from zoneinfo import ZoneInfo

PT = ZoneInfo("America/Los_Angeles")

# Trading windows (PT)
TRADE_WINDOWS = [(time(6,30), time(7,30)), (time(12,0), time(13,0))]

# Max trades per window
MAX_TRADES_PER_WINDOW = 2
_window_trades = {}  # {(date, idx): count}

# Protected tickers (never sell)
PROTECTED_NEVER_SELL = {"CWH"}

def in_window(now=None):
    now = now or datetime.now(PT).time()
    return any(start <= now <= end for start, end in TRADE_WINDOWS)

def window_key(dt=None):
    dt = dt or datetime.now(PT)
    for idx, (start, end) in enumerate(TRADE_WINDOWS):
        if start <= dt.time() <= end:
            return (dt.date().isoformat(), idx)
    return None

def allow_order(symbol:str, side:str) -> (bool, str):
    # side: "Buy" or "Sell"
    if not in_window():
        return False, "outside_playbook_window"
    if side == "Sell" and symbol.upper() in PROTECTED_NEVER_SELL:
        return False, "protected_ticker_never_sell"
    wk = window_key()
    if wk:
        count = _window_trades.get(wk, 0)
        if count >= MAX_TRADES_PER_WINDOW:
            return False, "max_trades_this_window"
    return True, ""

def record_order():
    wk = window_key()
    if wk:
        _window_trades[wk] = _window_trades.get(wk, 0) + 1

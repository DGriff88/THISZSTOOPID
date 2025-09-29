# strategies_select.py
import os, json
from strategies import ema_crossover_signal
from strategies_custom import macd_cross_signal, rsi_mr_signal, your_custom_signal

def _params():
    raw = os.getenv("STRAT_PARAMS", "{}")
    try: return json.loads(raw)
    except: return {}

def get_strategy():
    name = (os.getenv("STRATEGY", "ema") or "ema").lower()
    params = _params()
    def run(df):
        if name == "ema":
            return ema_crossover_signal(df,
                fast=int(params.get("fast", 9)),
                slow=int(params.get("slow", 21)))
        if name == "macd":
            return macd_cross_signal(df,
                fast=int(params.get("fast", 12)),
                slow=int(params.get("slow", 26)),
                signal=int(params.get("signal", 9)),
                flip_flop=bool(params.get("flip_flop", False)))
        if name == "rsi_mr":
            return rsi_mr_signal(df,
                period=int(params.get("period", 14)),
                low=float(params.get("low", 30)),
                high=float(params.get("high", 70)))
        if name == "custom":
            return your_custom_signal(df, **params)
        # default fallback
        return ema_crossover_signal(df, 9, 21)
    return run

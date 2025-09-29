from client import api_post, api_get
from config import ACCOUNT_ID, MAX_POS_SIZE, KILL_SWITCH, AUTO_LIQUIDATE, DRY_RUN, OFFLINE_MODE
from risk import check_risk_limits, enforce_limits, position_size_by_atr
from logger import setup_logger
logger = setup_logger("orders")

def account_snapshot():
    return api_get(f"/v1/accounts/{ACCOUNT_ID}")

def risk_ok(symbol, qty, price=None):
    if KILL_SWITCH:
        logger.error("Kill switch active - blocking orders")
        return False
    if abs(int(qty)) > int(MAX_POS_SIZE):
        logger.error("Qty %s exceeds MAX_POS_SIZE %s", qty, MAX_POS_SIZE)
        return False
    if OFFLINE_MODE:
        logger.info("OFFLINE_MODE=true -> skipping broker risk checks")
        return True
    ok, reasons = check_risk_limits()
    if not ok:
        logger.error("Risk limits breached: %s", reasons)
        if AUTO_LIQUIDATE:
            enforce_limits(auto_liquidate=True)
        return False
    return True

def _simulate_order(payload):
    logger.info("[DRY_RUN] Simulated order: %s", payload)
    return {"status":"simulated","payload":payload}

def place_equity_market(symbol, qty):
    qty = int(qty)
    if not risk_ok(symbol, qty):
        raise RuntimeError("Risk check failed - order blocked")
    payload = {
        "accountId": ACCOUNT_ID,
        "orderType": "Market",
        "instrument": {"symbol": symbol, "assetType": "EQ"},
        "quantity": abs(qty),
        "instruction": "Buy" if qty > 0 else "Sell",
    }
    logger.info("Placing market order: %s", payload)
    if DRY_RUN:
        return _simulate_order(payload)
    return api_post("/v1/accounts/orders", payload)

def place_equity_size_by_atr(symbol, risk_per_trade=None, stop_atr_mult=None):
    qty = position_size_by_atr(symbol, risk_per_trade, stop_atr_mult)
    logger.info("Computed qty=%s by ATR sizing for %s", qty, symbol)
    return place_equity_market(symbol, qty if qty > 0 else 1)

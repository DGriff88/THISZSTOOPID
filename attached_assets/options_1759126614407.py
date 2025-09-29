from client import api_post
from config import ACCOUNT_ID

def build_vertical_payload(symbol, leg1, leg2, quantity, debit=True):
    payload = {
        "accountId": ACCOUNT_ID,
        "orderType": "NetDebit" if debit else "NetCredit",
        "symbol": symbol,
        "quantity": int(quantity),
        "legs": [
            {"action":"BuyToOpen","quantity":1,"strike":leg1["strike"],"expiration":leg1["expiration"],"right":leg1["right"]},
            {"action":"SellToOpen","quantity":1,"strike":leg2["strike"],"expiration":leg2["expiration"],"right":leg2["right"]},
        ]
    }
    return payload

def place_options_order(payload):
    return api_post("/v1/accounts/orders", payload)

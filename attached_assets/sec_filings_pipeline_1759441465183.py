import os, json, sys, datetime, requests
from pathlib import Path
from urllib.parse import urlencode

try:
    from dotenv import load_dotenv
except ImportError:
    # Graceful fallback if python-dotenv isn't installed
    def load_dotenv(*args, **kwargs):
        return None

def get_env(name, default=None, required=False):
    v = os.getenv(name, default)
    if required and (v is None or v.strip()==""):
        print(f"Missing required env var: {name}", file=sys.stderr)
        sys.exit(1)
    return v

def iso_utc(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def fetch_sec_filings(api_key, tickers, forms, hours_back=4, size=100):
    # Build time window
    now = datetime.datetime.utcnow()
    start = now - datetime.timedelta(hours=int(hours_back))
    # SEC-API query body (Query API)
    # Docs: https://api.sec-api.io (use your subscription's query format)
    query = {
        "query": f"formType:({ ' OR '.join(forms) }) AND ticker:({ ' OR '.join(tickers) }) AND filedAt:[{iso_utc(start)} TO {iso_utc(now)}]",
        "from": "0",
        "size": str(size),
        "sort": [{"filedAt": {"order": "desc"}}]
    }
    headers = {"Authorization": api_key}  # or use ?token=... depending on your plan
    url = "https://api.sec-api.io"  # base; your plan may use a specific endpoint path
    # Common endpoint path in docs is /? (for Query API) or /insider-trading for that product tier
    # We'll assume a generic POST to the query endpoint:
    resp = requests.post(url, json=query, headers=headers, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    # Expected shape: { filings: [ {ticker, formType, filedAt, linkToHtml, ...}, ... ] }
    filings = data.get("filings", data)  # be tolerant to different shapes
    return filings

def summarize_to_scanner_shape(filings):
    # Turn raw filings into minimal scanner candidates (tickers unique, with why_now text)
    out = []
    seen = set()
    for f in filings:
        ticker = (f.get("ticker") or "").upper()
        form = f.get("formType") or ""
        filed_at = f.get("filedAt") or f.get("filingDate") or ""
        url = f.get("linkToHtml") or f.get("linkToFilingDetails") or f.get("link") or ""
        if not ticker:
            continue
        if ticker in seen:
            continue
        seen.add(ticker)
        # Minimal skeleton matching your Scanner output contract
        out.append({
            "ticker": ticker,
            "setup": "ToBeDecided",  # will be decided after chart/EMA/RVOL checks
            "direction": "n/a",
            "contract": "n/a",
            "debit": 0.0,
            "max_loss": 0,
            "max_profit": 0,
            "rr": 0.0,
            "confidence": 1,
            "why_now": f"Fresh {form} filed at {filed_at}. {url}",
            "do_not_trade_if": "OI<1000 or bid/ask>0.20 or fails EMA/VWAP alignment",
            "skip_reason": ""
        })
    return out

def main():
    load_dotenv()
    api_key = get_env("SEC_API_KEY", required=True)
    tickers = [t.strip().upper() for t in get_env("TICKERS", "SOFI,NVDA").split(",") if t.strip()]
    forms = [f.strip().upper() for f in get_env("FORMS", "8-K").split(",") if f.strip()]
    hours_back = int(get_env("HOURS_BACK", "4"))

    try:
        filings = fetch_sec_filings(api_key, tickers, forms, hours_back=hours_back)
    except Exception as e:
        print("[WARN] Could not fetch SEC filings:", e, file=sys.stderr)
        filings = []

    outdir = Path("./sec_out")
    outdir.mkdir(parents=True, exist_ok=True)

    # Save raw filings
    raw_path = outdir / "today_recent_filings.json"
    with raw_path.open("w") as f:
        json.dump(filings, f, indent=2)

    # Save scanner candidates (skeleton)
    candidates = summarize_to_scanner_shape(filings)
    cand_path = outdir / "trade_candidates.json"
    with cand_path.open("w") as f:
        json.dump(candidates, f, indent=2)

    print("Wrote:", raw_path, "and", cand_path)

if __name__ == "__main__":
    main()

# discovery_engine.py
# Version 5.2 - Correctly handles the request and response flow.
# Scans the S&P 500 and uses dynamic sector data.
# Professional Grade Scanner by Monica

import pandas as pd
import pandas_ta as ta
import yfinance as yf
from datetime import datetime
import urllib.request

# --- CONFIGURATION ---
MIN_PRICE = 50.0
MIN_VOLUME = 2_000_000
SCREENED_SECTORS = []

# --- UNIVERSE DEFINITION ---
def get_sp500_tickers():
    """
    Scrapes the list of S&P 500 tickers from Wikipedia.
    This is our dynamic hunting ground.
    """
    print("Fetching the S&P 500 ticker universe...")
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    
    # --- FIX FOR TypeError ---
    # 1. Create the request with a User-Agent header.
    hdr = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=hdr)
    
    # 2. EXECUTE the request to get a response object.
    response = urllib.request.urlopen(req)
    
    # 3. Pass the response object (not the request) to pandas.
    table = pd.read_html(response)
    # --- END FIX ---
    
    tickers = table[0]['Symbol'].tolist()
    print(f"Universe defined: {len(tickers)} tickers in the S&P 500.")
    # yfinance uses '-' for tickers like BRK.B, Wikipedia uses '.'
    return [ticker.replace('.', '-') for ticker in tickers]

# --- DATA FETCHING ---
def get_stock_data(tickers):
    """Fetches historical stock data for a list of tickers."""
    print("Fetching latest market data for technical analysis... (This may take a moment)")
    all_data = yf.download(tickers, period="3mo", auto_adjust=False, threads=True, group_by='ticker')
    
    # Reformat the multi-level dataframe for easier access
    df = all_data.stack(level=0).rename_axis(['Date', 'Ticker']).reset_index(level=1)
    print("Data fetch and formatting complete.")
    return df

# --- DYNAMIC SECTOR LOOKUP ---
def get_dynamic_sector(ticker):
    """Gets the sector for a ticker using yfinance.info."""
    try:
        return yf.Ticker(ticker).info.get('sector', 'Unknown')
    except Exception:
        return 'Unknown'

# --- SCREENING GATES ---

def gate_1_price_volume(ticker, data):
    """Gate 1: Checks for minimum price and volume."""
    if data.empty:
        return False, "No data available."
    latest_data = data.iloc[-1]
    price = latest_data.get('Close')
    volume = latest_data.get('Volume')

    if price is None or volume is None:
        return False, "Missing Close or Volume data."

    if price > MIN_PRICE and volume > MIN_VOLUME:
        return True, None
    else:
        return False, f"Price (${price:.2f}) or Volume ({int(volume):,}) below threshold."

def gate_2_sector_check(ticker, sector):
    """Gate 2: Checks if the ticker's sector has already been screened."""
    if sector == 'Unknown':
        return False, "Sector could not be identified."
    if sector not in SCREENED_SECTORS:
        return True, sector
    else:
        return False, f"Sector '{sector}' already screened."

def gate_3_technical_analysis(ticker, data):
    """Gate 3: Performs technical analysis."""
    try:
        data.ta.rsi(append=True)
        latest_rsi = data['RSI_14'].iloc[-1]
        if latest_rsi < 35:
            return True, f"RSI({latest_rsi:.2f}) < 35"
        else:
            return False, f"RSI({latest_rsi:.2f}) is not oversold."
    except Exception as e:
        return False, f"TA Error: {e}"

# --- MAIN SCANNER ---
def run_scan(tickers):
    """Main function to run the discovery engine scan."""
    print("="*30)
    print("SCHWABBOT: INITIATING DISCOVERY SCAN...")
    print("="*30)

    all_data = get_stock_data(tickers)
    successful_tickers = []
    
    # Get a unique list of tickers that were successfully downloaded
    downloaded_tickers = all_data['Ticker'].unique()
    total_tickers = len(downloaded_tickers)

    for i, ticker in enumerate(downloaded_tickers):
        print(f"\n[{i+1}/{total_tickers}] Scanning: {ticker}")
        
        ticker_data = all_data[all_data['Ticker'] == ticker].copy()

        gate1_passed, reason1 = gate_1_price_volume(ticker, ticker_data)
        if not gate1_passed:
            print(f"- GATE 1 FAILED: {reason1}")
            continue
        print("- GATE 1 PASSED: Price & Volume OK.")

        sector = get_dynamic_sector(ticker)
        gate2_passed, reason2 = gate_2_sector_check(ticker, sector)
        if not gate2_passed:
            print(f"- GATE 2 FAILED: {reason2}")
            continue
        print(f"- GATE 2 PASSED: Sector '{sector}' is new.")
            
        gate3_passed, reason3 = gate_3_technical_analysis(ticker, ticker_data)
        if not gate3_passed:
            print(f"- GATE 3 FAILED: {reason3}")
            continue
        print(f"- GATE 3 PASSED: Technical condition met ({reason3}).")

        print(f"--- {ticker} PASSED ALL GATES ---")
        successful_tickers.append({'Ticker': ticker, 'Sector': sector, 'Reason': reason3})
        if sector and sector not in SCREENED_SECTORS:
            SCREENED_SECTORS.append(sector)

    print("\n" + "="*30)
    print("DISCOVERY SCAN COMPLETE")
    print("="*30)

    if not successful_tickers:
        print("No tickers met all criteria in this scan.")
    else:
        print("The following tickers passed all gates and are potential opportunities:")
        results_df = pd.DataFrame(successful_tickers)
        print(results_df.to_string(index=False))

    print(f"Finished scan at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    sp500 = get_sp500_tickers()
    # Filter out any None values that might have resulted from the list creation
    sp500_clean = [ticker for ticker in sp500 if ticker]
    run_scan(sp500_clean)
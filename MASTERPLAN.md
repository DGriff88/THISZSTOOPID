# MASTER TRADING SYSTEM DOCUMENTATION
**Last Updated: September 20, 2025 | 01:45 AM PT**

---

## 📊 DAILY TRADE FLOW

### Pre-Market (06:00–06:25 PT)
- Pull universe (SOFI, NVDA, OMAH, AMD, TQQQ, BITX + RVOL≥1.5 movers)
- Run Options Scanner – Paycheck Mode  
- Tag A+ setups (≤4h catalyst, RVOL≥1.5 rising, OI≥1k, bid/ask≤0.20)
- Discard stale/yesterday tape

### First Hour (06:30–07:30 PT) - MAIN SHOT
**Options Trader (Priority 1)**
- Hunt EMA Pullback Spreads / Momentum Pops
- Risk $40–80. Target $100–200
- Walk rule: stop after +$200 or 3 reds
- **RULE ONE: One spread at a time per ticker. No stray legs.**

**Swing Trader (Priority 2)**  
- Only if high-conviction catalyst aligns w/ daily structure
- Use debit/credit spread 3–7 DTE; hold partial if setup survives

### Midday - Only if A+
- Skip unless catalyst + RVOL + tape still clean
- Survival mode rules apply

### Last Hour (12:00–13:00 PT) - SECONDARY SHOT
**Options Trader**
- Scan movers; play debit spread into breakout/retest
- Risk $40–80. Target $100–200

### Night Reset  
- **CANCEL ALL GTC NIGHTLY!!!**
- Log trades (signal JSONs)
- Clear alerts
- Prep zones for next day

---

## 📋 PIRATETRADER PAYCHECK FRAMEWORK

### Weekly Cycle Philosophy
Your "shift" is to scan, stalk, and execute a handful of good trades that pay the bills.
At the end of the week, you close the shop, log the paycheck, and reset for Monday.

### Weekly Goals
- **Baseline:** $300–$500/week (on $2.3k account)
- **Stretch:** $750–$1,000/week when setups align
- **Method:** Sum of 2–5 defined-risk trades, not daily flipping

### Monday–Tuesday: Setup & Entry
- Run scanner → tag 2–3 A+ setups (fresh catalyst, RVOL ≥1.5, ≤$80 debit)
- Place 1–2 spreads max
- Open one short-term debit spread (3–7 DTE) + maybe one swing spread

### Wednesday–Thursday: Manage & Add
- If winners running → scale partials / lock profit
- If flat/red but valid (VWAP/EMA holding) → let ride
- Maybe 1 more fresh entry if catalyst A+

### Friday: Cash Out & Reset
- Close all weeklies → collect paycheck
- Do not carry multiple weeklies into weekend
- Exception: LEAP/swing with months left (like NVDA)

---

## 🎯 CORE STRATEGIES

### 1. EMA Pullback Spread
- Stock price aligned with 50 EMA slope
- Entry on pullback to VWAP/21EMA
- Momentum: RSI/Stoch/MACD confirm
- Options: debit spread in trade direction (3–7 DTE)

### 2. Momentum Pop Spread
- Breakout + retest with RVOL ≥ 1.5
- Options: call/put debit spread near breakout strike
- Tight risk: debit ≤ $80
- Target: 1–2R ($100–200)

### 3. Yesterday Setup (Oversold Bounce)
- Daily RSI(5) < 32 or BB tap; demand zone nearby
- Intraday: first green + volume, RSI >30
- Options: short put spread (bullish) or call spread

### 4. Quick Scalp Lane (Options)
- If catalyst weak but tape clean
- Triggers (need 2/3): VWAP hammer/engulf, RVOL ≥ 1.5, RSI cross
- Options: cheap 0DTE/1DTE spread, risk $40–$60
- Exit: +1R or expiry

---

## 🔍 OPTIONS SCANNER – PAYCHECK MODE

### Universe
**U.S.-listed equities with:**
- Price $10–$150
- Market cap ≥ $1B
- Avg daily stock volume ≥ 2M shares
- Options: OI ≥ 1,000 per strike; bid/ask spread ≤ $0.20
- Always include SOFI, NVDA, OMAH (backup funds/keepers)

### Sessions
- 06:10–06:25 PT: Pre-open prep
- 06:30–07:30 PT: First hour
- 12:00–13:00 PT: Last hour
- Midday scan optional (only if A+ setup)

### Freshness & Drift Filters
- Catalyst ≤ 4h old (PR, FDA, SEC filing, guidance, earnings, activism, UOA)
- AH pop ≤ +10% unless: RVOL still rising AND price pulled back to VWAP/21EMA
- RVOL ≥ 1.5 and rising
- Not extended (last_price ≤ first_candle_high OR pullback to VWAP/21EMA)

### Four Gates (Options Focus)
1. **Catalyst + Freshness** - SEC/PR/FDA/UOA skew/headlines, must pass freshness
2. **Alignment** - 50 EMA slope in trade direction, price near 21EMA/VWAP with 9 curling
3. **Momentum** - 2 of 3: RSI, Stoch, MACD confirm
4. **Profit Math** - Debit/credit spread risk ≤ $80, R:R ≥ 1:1 (prefer ≥ 1:2)

---

## ⚠️ RISK & DISCIPLINE RULES

### Risk Management
- Risk per spread ≤ $80
- R:R ≥ 1:1, prefer ≥ 1:2
- Stop at +$200/day or 3 reds
- No naked calls/puts
- Only debit/credit spreads allowed
- OI ≥ 1,000; bid/ask ≤ $0.20
- Max 1 weekly spread kept open beyond day session
- Daily max loss: −$240

### Iron Discipline
- **RULE ONE:** No new spread to "cover" a leg. Close stray legs first.
- **CANCEL ALL GTC NIGHTLY!!!**
- No stale catalysts (>4h)
- No chasing AH pops >10% unless confirmed pullback
- Respect VWAP/EMA clusters
- Never scalp from IRA
- Never sell CWH
- NVDA/OMAH remain backup funds
- SOFI floor $20+

---

## 🏛️ LEGACY SYSTEMS INTEGRATION

### Riley's Psychology Rules
1. Don't set daily profit goals - not every day offers good conditions
2. Set max loss rules - ALWAYS stop after 2 losses in 1 day
3. Create trading routine for consistency
4. Focus on process, not profits
5. Hide P/L stats during execution
6. Never enter without management plan
7. Journal trades AND emotions

### Supply & Demand Integration
- Mark supply (resistance) and demand (support) zones as bands
- Trade only at zone extremes, avoid mid-range
- Wait for exhaustion signals before entry
- Use tight stops just beyond zones
- Target opposite side of range

### EMA Confirmation Strategy
- Use 3 EMAs (9/21/50 or 9/21/160)
- Uptrend: fast > mid > slow
- Entry on pullback into EMA zone with volume
- Confirm with RSI (40→70 long, 60→30 short)
- Add Stochastic confirmation
- Filter fakeouts: avoid lone spikes, volume dry-ups

---

## 🔧 API CONFIGURATIONS

### Schwab API
```
CLIENT_ID: fcrJyAVeSMcertLmk6OaZjpCzW4uSPbxc
CLIENT_SECRET: 1oyHOf59bNk1U67bxr
REDIRECT_URI: https://127.0.0.1:8080/callback
BASE_URI: https://api.schwabapi.com
TOKENS_FILE: tokens.json
DATA_PROVIDER: schwab
```

### Additional APIs
- **Alpha Advantage:** https://mcp.alphavantage.co/mcp?apikey=F19280MAKW43O2M3
- **Reddit API:** Application: FlimtoFlam Personal Bot
- **ElevenLabs:** sk_e3c2d770b64eecc602e47d6f88216ad4e

---

## ✅ IMPLEMENTATION CHECKLIST

### Core System
- [ ] Implement RULE ONE enforcement in trading logic
- [ ] Add GTC cancellation automation (nightly)
- [ ] Build walk rule automation (+$200 or 3 reds)
- [ ] Create weekly paycheck tracking

### Scanner Integration  
- [ ] Four Gates validation system
- [ ] Freshness filter automation
- [ ] RVOL monitoring alerts
- [ ] A+ setup tagging system

### Risk Management
- [ ] Position sizing calculators ($40-80 risk)
- [ ] R:R validation before entry
- [ ] Spread-only enforcement (no naked options)
- [ ] Daily loss limit tracking (-$240 max)

### AI Integration
- [ ] Market sentiment analysis for trade confirmation
- [ ] Risk assessment for position sizing
- [ ] Strategy optimization based on market conditions
- [ ] News impact analysis for timing

---

## 🔑 KEY REMINDERS
- **RULE ONE:** One spread per ticker, no stray legs, close first
- **CANCEL ALL GTC NIGHTLY!!!**
- **Walk Rule:** +$200 profit or 3 losses = STOP
- **Never sell CWH** (permanent emotional hold)
- **SOFI floor:** $20+ (post-split reference)
- **NVDA/OMAH:** Backup funds only
- **Each trade:** $40-80 risk, aim $100-200 reward
- **Weekly goal:** 2-5 trades = paycheck, not daily flipping
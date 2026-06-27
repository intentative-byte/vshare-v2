# DAX_GOLD_PLUS_v7_LEARNING_READY.py
# Base: DAX_GOLD_PLUS_PATCHED_v7 (ADD-16 Entry Telemetry)
# Learning Ready build — ADD-19 through ADD-30, ADD-31-42, ADD-43-50

import requests
import ui
import threading
import json
import clipboard
import os
import xml.etree.ElementTree as ET
from datetime import datetime, time, timedelta

# =============================================================================
# KEYS & ENDPOINTS
# =============================================================================

ALPACA_API_KEY    = "PKPSQ74DQREDAZ4BGZYGR7SJJJ"
ALPACA_SECRET_KEY = "HLRrYrfhwgxMb7cLZGGAptFQRpHYe7ExvBRR4E2TbLbx"
PAPER_URL = "https://paper-api.alpaca.markets"
DATA_URL  = "https://data.alpaca.markets"
HEADERS = {
    "APCA-API-KEY-ID": ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
}

# =============================================================================
# CONFIG
# =============================================================================

VERSION         = "DAX_GOLD_PLUS_v7_LEARNING_READY"
UPGRADE_VERSION = "GOLD_PLUS_2026_LEARNING"

MANUAL_EXECUTE_ONLY        = True
EXECUTE_COMMAND            = "EXECUTE"
MAX_LIVE_TRADES            = 10
MAX_NEW_TRADES_PER_EXECUTE = 10
MAX_SECTOR_TRADES          = 5
MAX_GOLD_POSITIONS         = 3

END_OF_DAY_LIQUIDATION_ON  = True
FORCE_FLAT_BEFORE_CLOSE    = True
FORCE_FLAT_TIME_UK         = time(20, 45)
EOD_HOLD_GOVERNOR_ON       = True
EOD_MIN_HOLD_PROFIT_PCT    = 0.35
EOD_MAX_GIVEBACK_FROM_PEAK = 0.10
EOD_MIN_CONTINUATION_SCORE = 0.80
LATE_ENTRY_BLOCK_ON        = True
LATE_ENTRY_BLOCK_TIME_UK   = time(20, 30)

MORNING_INTELLIGENCE_ON     = True
MORNING_INTEL_FILE          = "dax_morning_intelligence.json"
AUTO_M_MATH_INTELLIGENCE_ON = True
INTEL_SYMBOLS = [
    "NVDA","AVGO","AMD","QCOM","MRVL","INTC","ARM","TSM","ASML","MU","AMAT","LRCX",
    "MSFT","SNOW","MDB","CRM","NOW","ADBE","ORCL","DDOG","PLTR","TEAM",
    "CRWD","PANW","NET","ZS","OKTA","FTNT","CHKP","S",
    "AAPL","GOOGL","META","AMZN","TSLA","NFLX","UBER","SHOP","SQ","PYPL",
    "JPM","BAC","GS","MS","V","MA","AXP","BLK","COIN",
    "LLY","UNH","JNJ","MRK","ABBV","PFE","TMO","ISRG",
    "XOM","CVX","COP","SLB","OXY","CAT","DE","GE","BA","HON","RTX","LMT",
    "COST","WMT","HD","MCD","NKE","SBUX","TGT",
    "DIS","SPOT","RBLX","ROKU","ABNB","RIVN","LCID","HOOD",
    "SPY","QQQ","SOXX","SMH","XLK","XLF","XLE","XLI","XLY","IWM","GLD",
]
GOLD_UNIVERSE = ["GLD","NEM","GOLD","AEM","WPM","FNV","GDX","GDXJ"]

FT_RSS_INTELLIGENCE_ON = True
FT_RSS_FEEDS = [
    "https://www.ft.com/news-feed?format=rss",
    "https://www.ft.com/markets?format=rss",
    "https://www.ft.com/technology?format=rss",
    "https://www.ft.com/companies?format=rss",
]
FT_NEWS_WEIGHT, FT_MAX_HEADLINES, FT_REQUEST_TIMEOUT = 0.05, 60, 12

HOLD_WINNER_EXTENSION_ON    = True
CONTINUATION_MIN_PROFIT_PCT = 0.35
CONTINUATION_MIN_SCORE      = 0.70
SECTOR_DIVERSIFICATION_ON   = True
MAX_PER_SECTOR_INNOVATION   = 2
MIN_SECTORS_TARGET          = 3
SP500_EXPANSION_ON          = True
ENTRY_SYNC_ON               = True
AUTO_EXIT_MANAGER_ON        = True
EXIT_MANAGER_SECONDS        = 60

# Exit quality engine
EXIT_QUALITY_ENGINE_ON      = True
HARVEST_ARM_PCT             = 0.35
HARVEST_GIVEBACK_RATIO      = 0.10
BREAKEVEN_ARM_PCT           = 0.25
BREAKEVEN_FLOOR_PCT         = 0.02
PARTIAL_TP_ON               = True
PARTIAL_TP_PCT              = 0.50
PARTIAL_TP_RATIO            = 0.50
MAX_PARTIALS_PER_TRADE      = 1
PROFIT_TRAIL_ARM_PCT        = 0.25
PROFIT_FIXED_GIVEBACK_PCT   = 0.10
MIN_LOCKED_PROFIT_PCT       = 0.05
TIME_DECAY_MINUTES          = 25
TIME_DECAY_MIN_PROFIT_PCT   = 0.05
DAILY_GREEN_LOCK_ON         = True
DAILY_LOCK_TRIGGER_DOLLARS  = 150
DAILY_GIVEBACK_RATIO        = 0.25
PROFIT_GOVERNOR_ON          = True
TRAIL_ARM_PCT               = HARVEST_ARM_PCT
TRAIL_GIVEBACK_PCT          = HARVEST_GIVEBACK_RATIO
PROFIT_LOCK_ARM_PCT         = BREAKEVEN_ARM_PCT
PROFIT_LOCK_FLOOR_PCT       = BREAKEVEN_FLOOR_PCT

NEWS_LOOKBACK_DAYS, MIN_NEWS_SCORE_FIRE, NEWS_WEIGHT, NEWS_CACHE = 7, 0.15, 0.18, {}

MIN_FIRE_AUTH          = 72.0
A_PLUS_ONLY            = False
SHADOW_AUTH_THRESHOLDS = [65, 68, 70, 72, 75, 78, 80]

MIN_QTY, MAX_QTY = 1, 25
MAX_CAPITAL_PER_TRADE_PCT, MAX_TOTAL_DEPLOYED_PCT, CONFIDENCE_CAPITAL_BOOST = 0.025, 0.13, 1.25

MAX_ATR_TARGET_PCT              = 0.012
MAX_ATR_STOP_PCT                = 0.008
ATR_TARGET_MULTIPLIER           = 2.10
ATR_STOP_MULTIPLIER             = 1.35
MIN_REWARD_RISK                 = 1.55
GAP_ATR_NORMALIZE_THRESHOLD_PCT = 1.5
GAP_ATR_FALLBACK_PCT            = 0.004

MAX_SECTOR_EXPOSURE_PCT        = 0.38
MAX_CORRELATED_SECTOR_PRESSURE = 0.72
MIN_CROSS_SECTOR_BALANCE       = 2
SECTOR_PRESSURE_WEIGHT         = 0.15
CORRELATION_ENTROPY_PENALTY    = 0.20
SCAN_CAN_MANAGE_EXITS          = False

MIN_VALID_COVERAGE, IDEAL_VALID_COVERAGE = 18, 25
MIN_CONFIDENCE_FIRE, MIN_CONFIDENCE_WATCH = 72, 62
MAX_ENTROPY_FIRE, MAX_ENTROPY_WATCH = 0.31, 0.44
MIN_ALIGNMENT_SCORE, MIN_SHADOW_LIVE_AGREEMENT = 0.68, 0.60

ENTRY_TELEMETRY_ON         = True
MISSED_MOVE_LATE_THRESHOLD = 1.0
MISSED_MOVE_WARN_THRESHOLD = 1.5
VWAP_DISTANCE_WARN_PCT     = 0.8
ENTRY_VELOCITY_MIN_SIGNAL  = 0.10

SYMBOL_COOLDOWN_MINUTES = 45
COOLDOWN_AFTER_LOSS_MIN = 20
COOLDOWN_AFTER_WIN_MIN  = 8

ENABLE_MARKET_REGIME_FILTER = True
BULL_REGIME_MIN, BEAR_REGIME_MAX = 0.35, -0.35
MARKET_BREADTH_WEIGHT, MACRO_ALIGNMENT_WEIGHT = 0.18, 0.22
REGIME_NEUTRAL_ZONE, VIX_RISK_OFF_LEVEL, VIX_PANIC_LEVEL = 0.10, 22, 30
QQQ_MOMENTUM_WEIGHT, SPY_MOMENTUM_WEIGHT, SEMI_STRENGTH_WEIGHT, NEWS_REGIME_WEIGHT = 0.30, 0.25, 0.20, 0.25

DOWNSIDE_AUTO_PULL_PCT             = -10.0
PROFIT_GIVEBACK_PCT                = 0.20
MAX_POSITION_RISK_PCT              = 0.35
MAX_DAILY_RISK_PCT                 = 1.25
MAX_DAILY_LOSS_PCT                 = 1.75
KILL_SWITCH_DRAWDOWN_PCT           = 2.0
PULL_PLUG_AFTER_CONSECUTIVE_LOSSES = 3

TRADE_GEOMETRY_GOVERNOR_ON    = True
OPENING_NOISE_BLOCK_MINUTES   = 5
MIN_TIME_BEFORE_CLOSE_MINUTES = 45
MAX_TRADE_HOLD_MINUTES        = 45
MIN_HOLD_BEFORE_DECAY_MINUTES = 20
LATE_MOMENTUM_CAUTION_MINUTES = 120
MIN_TARGET_SPACE_PCT          = 0.80
MIN_STOP_SPACE_PCT            = 0.25
MAX_STOP_SPACE_PCT            = 1.25
MAX_EXTENSION_PCT             = 6.00
EXTREME_EXTENSION_PCT         = 9.00
MIN_REWARD_RISK_GEOMETRY      = 1.80
MAX_ATR_SPACE_PCT             = 2.50
MAX_SAME_SECTOR_GEOMETRY      = 2
MAX_SYSTEM_CORRELATION_RISK   = 0.70
MIN_GEOMETRY_SCORE_FIRE       = 0.65
REDUCED_RISK_GEOMETRY_SCORE   = 0.75
FULL_RISK_GEOMETRY_SCORE      = 0.85

MIN_VOLUME_HARD_BLOCK = 500_000
FEED = "iex"

SHADOW_GREATS_ON, SHADOW_GREATS_EXECUTE_ON = False, False
SHADOW_GREATS_FILE = "dax_shadow_greats.json"
SHADOW_GREATS_MIN_SCORE, SHADOW_GREATS_MIN_WIN_RATE = 0.70, 55.0
SHADOW_GREATS_MIN_TRADES, SHADOW_GREATS_MAX_RISK_COPY = 20, 0.25

PRICE_ACTION_ENGINE_ON = True
PRICE_ACTION_PATTERNS = [
    "SELLING_CLIMAX","BUYING_CLIMAX","HAMMER","SHOOTING_STAR",
    "FAILED_BREAKDOWN","FAILED_BREAKOUT","SUPPORT_BOUNCE",
    "RESISTANCE_REJECTION","BULLISH_CONFIRMATION","BEARISH_CONFIRMATION",
    "BULLISH_ENGULFING","BEARISH_ENGULFING",
]
PRICE_ACTION_SCORES = {
    "BULLISH_ENGULFING": 0.85, "BEARISH_ENGULFING": 0.85,
    "BULLISH_CONFIRMATION": 0.65, "BEARISH_CONFIRMATION": 0.65,
    "HAMMER": 0.70, "SHOOTING_STAR": 0.70,
    "FAILED_BREAKDOWN": 0.75, "FAILED_BREAKOUT": 0.75,
    "SUPPORT_BOUNCE": 0.60, "RESISTANCE_REJECTION": 0.60,
    "SELLING_CLIMAX": 0.55, "BUYING_CLIMAX": 0.55, "NONE": 0.0,
}

# Persistence paths
OVERNIGHT_STATS_FILE        = "dax_overnight_stats.json"
EDGE_VAULT_FILE             = "dax_edge_vault.json"
EDGE_MIN_TRADES, EDGE_MIN_WIN_RATE, EDGE_MIN_AVG_PNL = 20, 50.0, 0.0
CANDIDATE_MEMORY_FILE       = "dax_candidate_memory.json"
CONFIDENCE_VELOCITY_FILE    = "dax_confidence_velocity.jsonl"
PRE_BREAKOUT_LOG_FILE       = "dax_pre_breakout_log.jsonl"
ENTRY_WINDOW_STATS_FILE     = "dax_entry_window_stats.json"
OPPORTUNITY_DECAY_FILE      = "dax_opportunity_decay.jsonl"
PREDICTIVE_ENTRY_SCORE_FILE = "dax_predictive_entry_score.jsonl"
SAME_SYMBOL_MEMORY_FILE     = "dax_same_symbol_memory.json"
ENTRY_OPTIMIZER_FILE        = "dax_entry_optimizer.jsonl"
EXIT_VALIDATOR_FILE         = "dax_exit_validator.jsonl"
EARLY_ENTRY_FILE            = "dax_early_entry_intelligence.jsonl"
EARLY_WATCHLIST_FILE        = "dax_early_watchlist.json"
JOURNAL_FILE = TRADE_JOURNAL_FILE = "dax_innovation_trade_journal_v2_exit_quality.jsonl"
POST_EXIT_CHECK_FILE = "dax_post_exit_target_check.json"
SESSION_SCORE_FILE   = "dax_session_score.json"

EARLY_ENTRY_ON, EARLY_MIN_AUTH_TRACK = True, 60
EARLY_FIRE_AUTH, EARLY_PREBREAKOUT_MIN, EARLY_COUNTDOWN_MAX_MIN = MIN_FIRE_AUTH, 65, 12

EXIT_VALIDATOR_POST_EXIT_WINDOWS = [5, 15, 30, 60]
INTERNAL_SHADOW_GREAT_THRESHOLDS = {
    "min_trades": 20, "min_profit_factor": 1.30, "min_expectancy": 0.0,
    "min_win_rate": 50.0, "min_net_pnl": 0.0,
}

GOLD_SYMBOLS = ["GLD","GDX","IAU","GC","XAUUSD"]

# =============================================================================
# RUNTIME STATE
# =============================================================================

OVERNIGHT_STATS = {
    "overnight_trades": 0, "overnight_wins": 0, "overnight_losses": 0,
    "overnight_gap_total": 0.0, "overnight_pnl_total": 0.0,
    "best_gap": 0.0, "worst_gap": 0.0,
}
ENTRY_HITS_025 = ENTRY_HITS_050 = ENTRY_HITS_100 = ENTRY_TOTAL = 0
ENTRY_TRACKER = {}
KILL_SWITCH_ACTIVE, KILL_SWITCH_ACTIVATED_AT, KILL_SWITCH_RESET_AT = False, None, None

SCAN_COVERAGE_UNIQUE_SYMBOLS, SCAN_COVERAGE_TOTAL_EVENTS = set(), 0
EXECUTED_SYMBOLS_TODAY, TRADE_COOLDOWNS, POSITION_PEAK_PROFIT = set(), {}, {}
TRADE_STATE, POSITION_MEMORY, DAILY_PEAK_PNL = {}, {}, 0
AUTO_MANAGER_RUNNING = False
EARLY_ENTRY_MEMORY = {}

SESSION_ENTRY_SYMBOLS, SESSION_EXIT_SYMBOLS, SESSION_PARTIAL_KEYS = set(), set(), set()
POST_EXIT_TRACKER = {}
LIVE_SHADOW_BAND_COUNTS = {str(t): 0 for t in SHADOW_AUTH_THRESHOLDS}
LIVE_SHADOW_TOTAL = 0
REGIME_CACHE = {}

SESSION_COUNTERS = {
    "session_start": None, "entries": 0, "partial_takes": 0, "final_exits": 0,
    "execution_errors": 0, "exit_manager_cycles": 0,
    "wins": 0, "losses": 0, "breakevens": 0,
    "consecutive_losses": 0, "max_consecutive_losses": 0,
    "kill_switch_activations": 0, "kill_switch_resets": 0,
    "entry_telemetry_count": 0, "missed_move_score_total": 0.0,
    "move_at_entry_atr_total": 0.0, "vwap_distance_total": 0.0,
    "resp_fast": 0, "resp_normal": 0, "resp_slow": 0, "resp_failed": 0,
    "resp_fast_wins": 0, "resp_normal_wins": 0, "resp_slow_wins": 0, "resp_failed_wins": 0,
}

CLOSED_ORDER_STATES = {"cancelled","canceled","filled","closed","expired","rejected","done_for_day"}

# =============================================================================
# HELPERS
# =============================================================================

def norm_symbol(symbol):
    return str(symbol).upper().strip()

def safe_float(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return default

def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def early_now():
    return now_str()

def pct_fmt(x):
    try:
        return f"{float(x):.2f}%"
    except Exception:
        return "0.00%"

def price_action_score(pattern):
    return PRICE_ACTION_SCORES.get(str(pattern).upper(), 0.0)

def load_json_file(path, default):
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                data = json.load(f)
            return data if data is not None else default
    except Exception:
        pass
    return default

def save_json_file(path, data):
    try:
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass

def append_jsonl(path, row):
    try:
        with open(path, "a") as f:
            f.write(json.dumps(row) + "\n")
    except Exception:
        pass

def safe_list_tail(values, n=10):
    try:
        return list(values)[-n:]
    except Exception:
        return []

def minutes_since(time_str):
    try:
        dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
        return round((datetime.now() - dt).seconds / 60.0, 2)
    except Exception:
        return 0.0

def choose_trade_mode(candidate):
    news = safe_float(candidate.get("news", 0))
    sector_intel = safe_float(candidate.get("sector_intel", 0))
    market_intel = safe_float(candidate.get("market_intel", 0))
    pct = safe_float(candidate.get("pct", 0))
    alignment = news + sector_intel + market_intel
    if alignment > 0.15 and pct > 1.0:
        return "MOMENTUM_LONG"
    if alignment > 0.15 and pct < -0.75:
        return "REVERSAL_LONG"
    if alignment < -0.08 and pct < -1.0:
        return "MOMENTUM_SHORT"
    if alignment < -0.08 and pct > 0.75:
        return "REVERSAL_SHORT"
    return "NO_EDGE"

def chunk_list(items, size=50):
    for i in range(0, len(items), size):
        yield items[i:i + size]

def grade_from_auth(auth):
    if auth >= 90:
        return "A+"
    if auth >= 80:
        return "A"
    if auth >= 65:
        return "B"
    return "C"

def get_session_state():
    now = datetime.now()
    if now.weekday() >= 5:
        return "SESSION_CLOSED"
    current = now.time()
    if time(14, 30) <= current <= time(21, 0):
        return "OPEN_AUTHORITY"
    if time(9, 0) <= current < time(14, 30):
        return "PRE_MARKET"
    return "SESSION_CLOSED"

# =============================================================================
# PERSISTENCE: SESSION / OVERNIGHT
# =============================================================================

def save_overnight_stats():
    try:
        with open(OVERNIGHT_STATS_FILE, "w") as f:
            json.dump(OVERNIGHT_STATS, f, indent=2)
    except Exception:
        pass

def load_overnight_stats():
    global OVERNIGHT_STATS
    try:
        if os.path.exists(OVERNIGHT_STATS_FILE):
            with open(OVERNIGHT_STATS_FILE, "r") as f:
                data = json.load(f)
            if isinstance(data, dict):
                OVERNIGHT_STATS.update(data)
    except Exception:
        pass

def save_session_score():
    try:
        with open(SESSION_SCORE_FILE, "w") as f:
            json.dump({
                "SESSION_COUNTERS": SESSION_COUNTERS,
                "ENTRY_TOTAL": ENTRY_TOTAL,
                "ENTRY_HITS_025": ENTRY_HITS_025,
                "ENTRY_HITS_050": ENTRY_HITS_050,
                "ENTRY_HITS_100": ENTRY_HITS_100,
                "KILL_SWITCH_ACTIVE": KILL_SWITCH_ACTIVE,
                "KILL_SWITCH_ACTIVATED_AT": KILL_SWITCH_ACTIVATED_AT,
                "KILL_SWITCH_RESET_AT": KILL_SWITCH_RESET_AT,
            }, f)
    except Exception:
        pass

def load_session_score():
    global SESSION_COUNTERS, ENTRY_TOTAL, ENTRY_HITS_025, ENTRY_HITS_050, ENTRY_HITS_100
    global KILL_SWITCH_ACTIVE, KILL_SWITCH_ACTIVATED_AT, KILL_SWITCH_RESET_AT
    try:
        with open(SESSION_SCORE_FILE, "r") as f:
            data = json.load(f)
        SESSION_COUNTERS.update(data.get("SESSION_COUNTERS", {}))
        ENTRY_TOTAL = data.get("ENTRY_TOTAL", 0)
        ENTRY_HITS_025 = data.get("ENTRY_HITS_025", 0)
        ENTRY_HITS_050 = data.get("ENTRY_HITS_050", 0)
        ENTRY_HITS_100 = data.get("ENTRY_HITS_100", 0)
        KILL_SWITCH_ACTIVE = data.get("KILL_SWITCH_ACTIVE", False)
        KILL_SWITCH_ACTIVATED_AT = data.get("KILL_SWITCH_ACTIVATED_AT")
        KILL_SWITCH_RESET_AT = data.get("KILL_SWITCH_RESET_AT")
    except Exception:
        pass

# =============================================================================
# API
# =============================================================================

def api_get(url, params=None):
    r = requests.get(url, headers=HEADERS, params=params, timeout=20)
    if r.status_code == 401:
        journal_event("API_AUTH_FAILURE", {"url": url, "message": r.text})
        raise Exception(f"AUTH FAILURE 401: {r.text}")
    if r.status_code >= 300:
        raise Exception(f"GET ERROR {r.status_code}: {r.text}")
    return r.json()

def api_post(url, payload):
    r = requests.post(url, headers=HEADERS, json=payload, timeout=20)
    if r.status_code == 401:
        journal_event("API_AUTH_FAILURE", {"url": url, "message": r.text})
        raise Exception(f"AUTH FAILURE 401: {r.text}")
    if r.status_code >= 300:
        raise Exception(f"POST ERROR {r.status_code}: {r.text}")
    return r.json()

def api_delete(url, params=None):
    r = requests.delete(url, headers=HEADERS, params=params, timeout=20)
    if r.status_code == 401:
        journal_event("API_AUTH_FAILURE", {"url": url, "message": r.text})
        raise Exception(f"AUTH FAILURE 401: {r.text}")
    if r.status_code >= 300:
        raise Exception(f"DELETE ERROR {r.status_code}: {r.text}")
    return r.json() if r.text else {"deleted": True}

def get_account():
    return api_get(f"{PAPER_URL}/v2/account")

def get_positions_safe():
    try:
        return api_get(f"{PAPER_URL}/v2/positions"), True, None
    except Exception as e:
        journal_event("POSITION_API_ERROR", str(e))
        return [], False, str(e)

def get_positions():
    positions, ok, error = get_positions_safe()
    if not ok:
        raise Exception("POSITIONS BLOCKED: " + str(error))
    return positions

def get_positions_retry(max_attempts=3, delay=2):
    last_error = None
    for _ in range(max_attempts):
        try:
            return get_positions()
        except Exception as e:
            last_error = e
            threading.Event().wait(delay)
    journal_event("POSITIONS_RETRY_FAILED", {"attempts": max_attempts, "error": str(last_error)})
    raise Exception("POSITIONS BLOCKED AFTER RETRY: " + str(last_error))

def get_orders():
    return api_get(f"{PAPER_URL}/v2/orders", params={"status": "all", "limit": 100})

def get_snapshots(symbols):
    all_data = {}
    for chunk in chunk_list(symbols, 50):
        data = api_get(f"{DATA_URL}/v2/stocks/snapshots", params={"symbols": ",".join(chunk), "feed": FEED})
        all_data.update(data.get("snapshots", data))
    return all_data

def get_latest_price(symbol):
    try:
        snap = get_snapshots([norm_symbol(symbol)]).get(norm_symbol(symbol), {})
        price = safe_float((snap.get("latestTrade") or {}).get("p"))
        return price if price > 0 else None
    except Exception:
        return None

# =============================================================================
# JOURNAL
# =============================================================================

def journal_event(event_type, payload):
    row = {"time": now_str(), "event": event_type, "payload": payload}
    with open(JOURNAL_FILE, "a") as f:
        f.write(json.dumps(row) + "\n")
    return row

def load_journal_rows():
    if not os.path.exists(JOURNAL_FILE):
        return []
    try:
        with open(JOURNAL_FILE, "r") as f:
            return [json.loads(x) for x in f if x.strip()]
    except Exception:
        return []

def reload_trade_state_from_journal():
    global TRADE_STATE, SESSION_ENTRY_SYMBOLS, SESSION_EXIT_SYMBOLS
    if not os.path.exists(JOURNAL_FILE):
        return
    try:
        rows = load_journal_rows()
    except Exception:
        return
    for row in rows:
        event = str(row.get("event", "")).upper()
        payload = row.get("payload", {})
        if event == "ENTRY":
            sym = norm_symbol(payload.get("symbol"))
            if sym:
                TRADE_STATE[sym] = payload
                SESSION_ENTRY_SYMBOLS.add(sym)
        elif event == "FINAL_EXIT":
            sym = norm_symbol(payload.get("symbol"))
            if sym:
                SESSION_EXIT_SYMBOLS.add(sym)
                if sym in TRADE_STATE:
                    TRADE_STATE[sym]["closed"] = True

# =============================================================================
# ADD-31–42: EARLY ENTRY INTELLIGENCE (scan-time)
# =============================================================================

def classify_entry_window(candidate):
    matr = safe_float(candidate.get("move_at_entry_atr", 0))
    mms = safe_float(candidate.get("missed_move_score", 0))
    vwap = abs(safe_float(candidate.get("vwap_distance_at_entry", 0)))
    if matr < 0.50 and mms < 0.25:
        return "EARLY"
    if matr < 1.00 and mms < 0.40:
        return "EARLY_MID"
    if matr < 1.50 and mms < 0.60:
        return "MID"
    if matr < 2.50 or vwap >= 0.80:
        return "LATE"
    return "CHASE"

def pre_breakout_score(candidate):
    score = 0.0
    if safe_float(candidate.get("atr_pct", 0)) < 0.80:
        score += 20
    if abs(safe_float(candidate.get("vwap_distance_at_entry", 0))) < 0.40:
        score += 20
    if abs(safe_float(candidate.get("entry_velocity", 0))) >= 0.10:
        score += 15
    if safe_float(candidate.get("entry_acceleration", 0)) > 0:
        score += 15
    pat = str(candidate.get("price_action_pattern", "NONE")).upper()
    if pat in ["HAMMER", "SHOOTING_STAR", "FAILED_BREAKDOWN", "FAILED_BREAKOUT"]:
        score += 20
    elif pat in ["BULLISH_CONFIRMATION", "BEARISH_CONFIRMATION"]:
        score += 10
    if abs(safe_float(candidate.get("pct", 0))) < 2.0:
        score += 10
    return round(max(0, min(100, score)), 2)

def opportunity_decay_score(age_minutes):
    age = safe_float(age_minutes)
    if age <= 2:
        return 100
    if age <= 5:
        return 90
    if age <= 8:
        return 75
    if age <= 12:
        return 55
    if age <= 20:
        return 35
    return 20

def mtf_build_score(candidate):
    score = 50.0
    regime = str(candidate.get("regime", "NEUTRAL"))
    if regime == "BULL_EXPANSION" and candidate.get("side") == "LONG":
        score += 15
    if regime == "RISK_OFF" and candidate.get("side") == "SHORT":
        score += 15
    score += safe_float(candidate.get("sector_intel", 0)) * 20
    score += safe_float(candidate.get("market_intel", 0)) * 20
    score += safe_float(candidate.get("news", 0)) * 15
    score += safe_float(candidate.get("price_action_score", 0)) * 20
    return round(max(0, min(100, score)), 2)

def predictive_entry_score(candidate, pb_score, persistence_score, decay_score, mtf_score, velocity):
    auth = safe_float(candidate.get("auth", 0))
    pattern = safe_float(candidate.get("price_action_score", 0)) * 100
    vel_score = max(0, min(100, 50 + velocity * 10))
    vwap = abs(safe_float(candidate.get("vwap_distance_at_entry", 0)))
    vwap_score = max(0, 100 - vwap * 50)
    score = (
        auth * 0.25 + pb_score * 0.20 + persistence_score * 0.15 +
        decay_score * 0.10 + mtf_score * 0.15 + vel_score * 0.10 +
        pattern * 0.03 + vwap_score * 0.02
    )
    return round(max(0, min(100, score)), 2)

def entry_soon_probability(pred_score, pb_score, velocity):
    base = (safe_float(pred_score) * 0.45) + (safe_float(pb_score) * 0.35)
    base += max(0, min(20, safe_float(velocity) * 5))
    return {
        "1m": round(max(0, min(100, base * 0.45)), 1),
        "3m": round(max(0, min(100, base * 0.65)), 1),
        "5m": round(max(0, min(100, base * 0.85)), 1),
        "10m": round(max(0, min(100, base)), 1),
    }

def early_entry_intelligence_update(candidate):
    try:
        sym = norm_symbol(candidate.get("symbol"))
        now = now_str()
        memory = load_json_file(CANDIDATE_MEMORY_FILE, {})
        rec = memory.get(sym, {
            "symbol": sym, "first_seen": now, "scan_count": 0,
            "authority_history": [], "price_history": [], "pattern_history": [],
            "predictive_history": [],
        })
        rec["last_seen"] = now
        rec["scan_count"] = rec.get("scan_count", 0) + 1
        auth = safe_float(candidate.get("auth", 0))
        price = safe_float(candidate.get("entry", 0))
        rec["authority_history"].append(auth)
        rec["price_history"].append(price)
        rec["pattern_history"].append(candidate.get("price_action_pattern", "NONE"))
        rec["authority_history"] = safe_list_tail(rec["authority_history"], 30)
        rec["price_history"] = safe_list_tail(rec["price_history"], 30)
        rec["pattern_history"] = safe_list_tail(rec["pattern_history"], 30)
        auth_hist = rec["authority_history"]
        velocity = round(auth_hist[-1] - auth_hist[-2], 3) if len(auth_hist) >= 2 else 0.0
        acceleration = round(velocity - (auth_hist[-2] - auth_hist[-3]), 3) if len(auth_hist) >= 3 else 0.0
        age = minutes_since(rec.get("first_seen", now))
        decay = opportunity_decay_score(age)
        entry_window = classify_entry_window(candidate)
        pb = pre_breakout_score(candidate)
        persistence_score = min(100, rec["scan_count"] * 10)
        mtf = mtf_build_score(candidate)
        pred = predictive_entry_score(candidate, pb, persistence_score, decay, mtf, velocity)
        soon = entry_soon_probability(pred, pb, velocity)
        rec["predictive_history"] = safe_list_tail(rec.get("predictive_history", []) + [pred], 30)
        memory[sym] = rec
        save_json_file(CANDIDATE_MEMORY_FILE, memory)
        candidate.update({
            "candidate_memory": {"first_seen": rec.get("first_seen"), "scan_count": rec.get("scan_count")},
            "confidence_velocity": velocity, "confidence_acceleration": acceleration,
            "pre_breakout_score": pb, "signal_persistence_score": persistence_score,
            "entry_window": entry_window, "opportunity_age_minutes": age,
            "opportunity_decay_score": decay, "mtf_build_score": mtf,
            "predictive_entry_score": pred, "entry_soon_probability": soon,
        })
        row = {
            "time": now, "symbol": sym, "side": candidate.get("side"), "auth": auth, "price": price,
            "entry_window": entry_window, "confidence_velocity": velocity,
            "confidence_acceleration": acceleration, "pre_breakout_score": pb,
            "persistence_score": persistence_score, "opportunity_age_minutes": age,
            "opportunity_decay_score": decay, "mtf_build_score": mtf,
            "predictive_entry_score": pred, "entry_soon_probability": soon,
        }
        journal_event("EARLY_ENTRY_INTELLIGENCE", row)
        for path in (CONFIDENCE_VELOCITY_FILE, PRE_BREAKOUT_LOG_FILE, OPPORTUNITY_DECAY_FILE, PREDICTIVE_ENTRY_SCORE_FILE):
            append_jsonl(path, row)
        stats = load_json_file(ENTRY_WINDOW_STATS_FILE, {"EARLY": 0, "EARLY_MID": 0, "MID": 0, "LATE": 0, "CHASE": 0})
        stats[entry_window] = stats.get(entry_window, 0) + 1
        save_json_file(ENTRY_WINDOW_STATS_FILE, stats)
    except Exception as e:
        try:
            journal_event("EARLY_ENTRY_INTELLIGENCE_ERROR", str(e))
        except Exception:
            pass
    return candidate

def early_entry_intelligence_report():
    memory = load_json_file(CANDIDATE_MEMORY_FILE, {})
    stats = load_json_file(ENTRY_WINDOW_STATS_FILE, {"EARLY": 0, "EARLY_MID": 0, "MID": 0, "LATE": 0, "CHASE": 0})
    rows = []
    try:
        if os.path.exists(PREDICTIVE_ENTRY_SCORE_FILE):
            with open(PREDICTIVE_ENTRY_SCORE_FILE, "r") as f:
                rows = [json.loads(x) for x in f if x.strip()]
    except Exception:
        rows = []
    avg = lambda key: sum(safe_float(r.get(key, 0)) for r in rows) / len(rows) if rows else 0
    top = sorted(rows[-100:], key=lambda x: safe_float(x.get("predictive_entry_score", 0)), reverse=True)[:10]
    lines = [
        "EARLY ENTRY INTELLIGENCE [ADD-31 to ADD-42]", "=" * 43, "",
        f"CANDIDATES TRACKED: {len(memory)}", f"ROWS LOGGED: {len(rows)}",
        f"AVG PREDICTIVE SCORE: {avg('predictive_entry_score'):.2f}",
        f"AVG PRE-BREAKOUT SCORE: {avg('pre_breakout_score'):.2f}",
        f"AVG CONFIDENCE VELOCITY: {avg('confidence_velocity'):.3f}",
        f"AVG OPPORTUNITY AGE: {avg('opportunity_age_minutes'):.2f}m", "",
        "ENTRY WINDOW DISTRIBUTION", "-" * 25,
    ]
    for k in ("EARLY", "EARLY_MID", "MID", "LATE", "CHASE"):
        lines.append(f"{k + ':':11} {stats.get(k, 0)}")
    lines += ["", "TOP PREDICTIVE CANDIDATES", "-" * 25]
    if not top:
        lines.append("NO DATA YET")
    else:
        for r in top:
            lines.append(
                f"{r.get('symbol')} {r.get('side')} PRED={r.get('predictive_entry_score')} "
                f"PB={r.get('pre_breakout_score')} VEL={r.get('confidence_velocity')} "
                f"WIN={r.get('entry_window')} SOON={r.get('entry_soon_probability')}"
            )
    return "\n".join(lines)

# =============================================================================
# ADD-16/19/20/21/23: TELEMETRY, MEMORY, OPTIMIZER, RESPONSE, EXIT VALIDATOR
# =============================================================================

def compute_entry_telemetry(price, intraday_pct, minute_pct, atr_pct, daily):
    if not ENTRY_TELEMETRY_ON:
        return None
    atr_pct_safe = atr_pct if atr_pct > 0 else 0.001
    move_at_entry_atr = round(abs(intraday_pct) / atr_pct_safe, 3)
    if move_at_entry_atr < 0.50:
        entry_class = "EARLY"
    elif move_at_entry_atr < 1.00:
        entry_class = "ON_TIME"
    elif move_at_entry_atr < 2.00:
        entry_class = "LATE"
    else:
        entry_class = "VERY_LATE"
    mme = move_at_entry_atr
    if mme <= MISSED_MOVE_LATE_THRESHOLD:
        missed_move_score = round((mme / MISSED_MOVE_LATE_THRESHOLD) * 0.25, 3)
    elif mme <= MISSED_MOVE_WARN_THRESHOLD:
        progress = (mme - MISSED_MOVE_LATE_THRESHOLD) / (MISSED_MOVE_WARN_THRESHOLD - MISSED_MOVE_LATE_THRESHOLD)
        missed_move_score = round(0.25 + progress * 0.35, 3)
    else:
        missed_move_score = round(min(1.0, 0.60 + (mme - MISSED_MOVE_WARN_THRESHOLD) * 0.20), 3)
    d_high, d_low = safe_float(daily.get("h"), price), safe_float(daily.get("l"), price)
    vwap_proxy = (d_high + d_low + price) / 3.0 if d_high > 0 and d_low > 0 else price
    vwap_distance_at_entry = round(((price - vwap_proxy) / vwap_proxy) * 100, 4) if vwap_proxy > 0 else 0.0
    entry_velocity = round(minute_pct / atr_pct_safe, 3)
    entry_acceleration = round((intraday_pct - minute_pct) / atr_pct_safe, 3)
    return {
        "move_at_entry_atr": move_at_entry_atr, "entry_class": entry_class,
        "missed_move_score": missed_move_score, "vwap_distance_at_entry": vwap_distance_at_entry,
        "entry_velocity": entry_velocity, "entry_acceleration": entry_acceleration,
        "vwap_proxy": round(vwap_proxy, 4), "intraday_pct": round(intraday_pct, 4),
        "minute_pct": round(minute_pct, 4),
        "late_entry_flag": move_at_entry_atr >= MISSED_MOVE_LATE_THRESHOLD,
        "vwap_extended_flag": abs(vwap_distance_at_entry) >= VWAP_DISTANCE_WARN_PCT,
        "velocity_signal": abs(entry_velocity) >= ENTRY_VELOCITY_MIN_SIGNAL,
    }

def log_entry_optimizer(candidate):
    if not ENTRY_TELEMETRY_ON:
        return
    tel = candidate.get("entry_telemetry", {})
    row = {
        "symbol": norm_symbol(candidate.get("symbol")), "side": candidate.get("side"),
        "entry_time": now_str(), "entry_price": candidate.get("entry"),
        "signal_price": candidate.get("entry"), "auth": candidate.get("auth"),
        "grade": candidate.get("grade"), "trade_mode": candidate.get("trade_mode", "UNKNOWN"),
        "price_action_pattern": candidate.get("price_action_pattern", "NONE"),
        "sector": candidate.get("sector"),
        "move_at_entry_atr": tel.get("move_at_entry_atr"),
        "missed_move_score": tel.get("missed_move_score"),
        "vwap_distance_pct": tel.get("vwap_distance_at_entry"),
        "entry_velocity": tel.get("entry_velocity"),
        "entry_acceleration": tel.get("entry_acceleration"),
        "entry_class": tel.get("entry_class", "UNKNOWN"),
        "best_1m": None, "worst_1m": None, "best_3m": None, "worst_3m": None,
        "best_5m": None, "worst_5m": None, "best_10m": None, "worst_10m": None,
        "best_30m": None, "worst_30m": None, "best_60m": None, "worst_60m": None,
        "actual_entry_quality_score": None, "outcome_pnl_pct": None,
        "response_class": None, "finalized": False,
    }
    append_jsonl(ENTRY_OPTIMIZER_FILE, row)

def compute_entry_quality_score(entry_class, missed_move_score, vwap_distance_pct, entry_acceleration):
    score = 100
    ec = str(entry_class or "UNKNOWN").upper()
    if ec == "LATE":
        score -= 20
    if ec == "VERY_LATE":
        score -= 35
    if safe_float(missed_move_score) > 0.50:
        score -= 15
    if abs(safe_float(vwap_distance_pct)) > 0.80:
        score -= 15
    if safe_float(entry_acceleration) < 0:
        score -= 15
    return max(0, min(100, score))

def _rewrite_jsonl_row(path, symbol, updater):
    sym = norm_symbol(symbol)
    if not os.path.exists(path):
        return
    with open(path, "r") as f:
        lines = f.readlines()
    indices = []
    for i, line in enumerate(lines):
        try:
            rec = json.loads(line)
            if rec.get("symbol") == sym and not rec.get("finalized"):
                indices.append(i)
        except Exception:
            pass
    if not indices:
        return
    target_idx = indices[-1]
    new_lines = []
    for i, line in enumerate(lines):
        if i == target_idx:
            try:
                rec = json.loads(line)
                updater(rec)
                new_lines.append(json.dumps(rec) + "\n")
            except Exception:
                new_lines.append(line)
        else:
            new_lines.append(line)
    with open(path, "w") as f:
        f.writelines(new_lines)

def finalize_entry_optimizer(symbol, outcome_pnl_pct, response_class):
    sym = norm_symbol(symbol)
    def updater(rec):
        rec["outcome_pnl_pct"] = round(outcome_pnl_pct, 3)
        rec["response_class"] = response_class
        rec["actual_entry_quality_score"] = compute_entry_quality_score(
            rec.get("entry_class", "UNKNOWN"), rec.get("missed_move_score"),
            rec.get("vwap_distance_pct"), rec.get("entry_acceleration")
        )
        rec["finalized"] = True
    try:
        _rewrite_jsonl_row(ENTRY_OPTIMIZER_FILE, sym, updater)
    except Exception:
        pass

def _ssm_key(symbol, side, pattern, trade_mode, grade):
    return "|".join([norm_symbol(symbol), str(side or "UNKNOWN"), str(pattern or "NONE"),
                     str(trade_mode or "UNKNOWN"), str(grade or "UNKNOWN")])

def load_same_symbol_memory():
    return load_json_file(SAME_SYMBOL_MEMORY_FILE, {})

def save_same_symbol_memory(data):
    save_json_file(SAME_SYMBOL_MEMORY_FILE, data)

def _default_ssm_record(key):
    return {
        "key": key, "trades": 0, "wins": 0, "losses": 0, "breakevens": 0,
        "net_pnl_pct": 0.0, "avg_pnl_pct": 0.0, "win_rate": 0.0, "profit_factor": 0.0,
        "avg_win": 0.0, "avg_loss": 0.0, "expectancy": 0.0,
        "avg_move_at_entry_atr": 0.0, "avg_missed_move_score": 0.0,
        "avg_vwap_distance_pct": 0.0, "avg_entry_velocity": 0.0, "avg_entry_acceleration": 0.0,
        "entry_class_counts": {"EARLY": 0, "ON_TIME": 0, "LATE": 0, "VERY_LATE": 0, "UNKNOWN": 0},
        "best_entry_class": None, "worst_entry_class": None,
        "_win_pnl_sum": 0.0, "_loss_pnl_sum": 0.0,
        "_tel_move_sum": 0.0, "_tel_mms_sum": 0.0, "_tel_vwap_sum": 0.0,
        "_tel_vel_sum": 0.0, "_tel_acc_sum": 0.0,
    }

def update_same_symbol_memory(symbol, side, pattern, trade_mode, grade, pnl_pct, entry_telemetry):
    mem = load_same_symbol_memory()
    key = _ssm_key(symbol, side, pattern, trade_mode, grade)
    r = mem.get(key) or _default_ssm_record(key)
    r["trades"] += 1
    r["net_pnl_pct"] = round(r["net_pnl_pct"] + pnl_pct, 4)
    if pnl_pct > 0:
        r["wins"] += 1
        r["_win_pnl_sum"] = round(r["_win_pnl_sum"] + pnl_pct, 4)
    elif pnl_pct < 0:
        r["losses"] += 1
        r["_loss_pnl_sum"] = round(r["_loss_pnl_sum"] + abs(pnl_pct), 4)
    else:
        r["breakevens"] += 1
    t = r["trades"]
    r["avg_pnl_pct"] = round(r["net_pnl_pct"] / t, 4)
    r["win_rate"] = round((r["wins"] / t) * 100, 1)
    r["avg_win"] = round(r["_win_pnl_sum"] / r["wins"], 4) if r["wins"] else 0.0
    r["avg_loss"] = round(r["_loss_pnl_sum"] / r["losses"], 4) if r["losses"] else 0.0
    r["profit_factor"] = round(r["_win_pnl_sum"] / r["_loss_pnl_sum"], 4) if r["_loss_pnl_sum"] > 0 else (99.0 if r["_win_pnl_sum"] > 0 else 0.0)
    r["expectancy"] = round((r["win_rate"] / 100 * r["avg_win"]) - ((1 - r["win_rate"] / 100) * r["avg_loss"]), 4)
    if entry_telemetry:
        r["_tel_move_sum"] = round(r["_tel_move_sum"] + safe_float(entry_telemetry.get("move_at_entry_atr", 0)), 4)
        r["_tel_mms_sum"] = round(r["_tel_mms_sum"] + safe_float(entry_telemetry.get("missed_move_score", 0)), 4)
        r["_tel_vwap_sum"] = round(r["_tel_vwap_sum"] + abs(safe_float(entry_telemetry.get("vwap_distance_at_entry", 0))), 4)
        r["_tel_vel_sum"] = round(r["_tel_vel_sum"] + safe_float(entry_telemetry.get("entry_velocity", 0)), 4)
        r["_tel_acc_sum"] = round(r["_tel_acc_sum"] + safe_float(entry_telemetry.get("entry_acceleration", 0)), 4)
        r["avg_move_at_entry_atr"] = round(r["_tel_move_sum"] / t, 4)
        r["avg_missed_move_score"] = round(r["_tel_mms_sum"] / t, 4)
        r["avg_vwap_distance_pct"] = round(r["_tel_vwap_sum"] / t, 4)
        r["avg_entry_velocity"] = round(r["_tel_vel_sum"] / t, 4)
        r["avg_entry_acceleration"] = round(r["_tel_acc_sum"] / t, 4)
        ec = str(entry_telemetry.get("entry_class", "UNKNOWN")).upper()
        if ec in r["entry_class_counts"]:
            r["entry_class_counts"][ec] += 1
        else:
            r["entry_class_counts"]["UNKNOWN"] = r["entry_class_counts"].get("UNKNOWN", 0) + 1
    non_zero = {k: v for k, v in r["entry_class_counts"].items() if v > 0}
    if non_zero:
        r["best_entry_class"] = max(non_zero, key=non_zero.get)
        r["worst_entry_class"] = min(non_zero, key=non_zero.get)
    mem[key] = r
    save_same_symbol_memory(mem)

def same_symbol_memory_report():
    mem = load_same_symbol_memory()
    if not mem:
        return "SAME SYMBOL MEMORY\n==================\n\nNO DATA YET"
    records = [v for v in mem.values() if v.get("trades", 0) >= 2]
    best = sorted(records, key=lambda x: (x.get("profit_factor", 0), x.get("expectancy", 0)), reverse=True)
    worst = sorted(records, key=lambda x: (x.get("profit_factor", 0), x.get("expectancy", 0)))
    lines = ["SAME SYMBOL MEMORY", "==================", "", "TOP 10 STRONGEST SETUPS", "-" * 30]
    for r in best[:10]:
        lines += [
            r["key"],
            f"  T={r['trades']} WR={r['win_rate']}% PF={r['profit_factor']} E={r['expectancy']} NET={r['net_pnl_pct']}%",
            f"  MMS={r['avg_missed_move_score']} MATR={r['avg_move_at_entry_atr']} BEST_CLASS={r['best_entry_class']}", "",
        ]
    lines += ["TOP 10 WEAKEST SETUPS", "-" * 30]
    for r in worst[:10]:
        lines += [
            r["key"],
            f"  T={r['trades']} WR={r['win_rate']}% PF={r['profit_factor']} E={r['expectancy']} NET={r['net_pnl_pct']}%",
            f"  MMS={r['avg_missed_move_score']} WORST_CLASS={r['worst_entry_class']}", "",
        ]
    lines += ["LATE/VERY_LATE CONSISTENT LOSERS", "-" * 30]
    for r in records:
        ec = r.get("entry_class_counts", {})
        late_count = ec.get("LATE", 0) + ec.get("VERY_LATE", 0)
        if late_count >= 2 and r.get("win_rate", 100) < 40:
            lines.append(f"{r['key']}  LATE+VL={late_count} WR={r['win_rate']}% PF={r['profit_factor']} NET={r['net_pnl_pct']}%")
    lines.append("")
    return "\n".join(lines)

def check_first_response(symbol, profit_pct):
    sym = norm_symbol(symbol)
    state = TRADE_STATE.get(sym)
    if not state or state.get("closed"):
        return
    for threshold, key in [(0.10, "first_profit_010_time"), (0.25, "first_profit_025_time"),
                           (0.50, "first_profit_050_time"), (1.00, "first_profit_100_time")]:
        if profit_pct >= threshold and state.get(key) is None:
            state[key] = now_str()
    if state.get("response_class") is None:
        entry_dt = POSITION_MEMORY.get(sym, {}).get("entry_time")
        first_010 = state.get("first_profit_010_time")
        if entry_dt and isinstance(entry_dt, datetime) and first_010:
            try:
                elapsed = (datetime.strptime(first_010, "%Y-%m-%d %H:%M:%S") - entry_dt).seconds / 60.0
                if elapsed <= 3:
                    state["response_class"] = "FAST_RESPONSE"
                elif elapsed <= 10:
                    state["response_class"] = "NORMAL_RESPONSE"
                else:
                    state["response_class"] = "SLOW_RESPONSE"
            except Exception:
                pass

def finalize_response_class(symbol):
    state = TRADE_STATE.get(norm_symbol(symbol), {})
    if state.get("response_class") is None:
        state["response_class"] = "FAILED_RESPONSE"
    return state["response_class"]

def _minutes_between(time_str, entry_dt):
    if not time_str or not entry_dt:
        return None
    try:
        return round((datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S") - entry_dt).seconds / 60.0, 1)
    except Exception:
        return None

def start_exit_validator_record(symbol, side, exit_reason, exit_price, exit_pnl_pct, target, stop):
    sym = norm_symbol(symbol)
    rec = {
        "symbol": sym, "side": side, "exit_reason": exit_reason,
        "exit_price": round(safe_float(exit_price), 4), "exit_pnl_pct": round(safe_float(exit_pnl_pct), 3),
        "target": round(safe_float(target), 4), "stop": round(safe_float(stop), 4),
        "exit_time": now_str(), "exit_dt": now_str(),
        "high_5m": None, "low_5m": None, "high_15m": None, "low_15m": None,
        "high_30m": None, "low_30m": None, "high_60m": None, "low_60m": None,
        "target_hit_after_exit": False, "max_missed_opportunity_pct": 0.0,
        "exit_quality_class": "UNKNOWN", "finalized": False,
    }
    POST_EXIT_TRACKER[sym] = rec
    append_jsonl(EXIT_VALIDATOR_FILE, rec)

def update_exit_validator_prices(symbol, live_price):
    sym = norm_symbol(symbol)
    rec = POST_EXIT_TRACKER.get(sym)
    if not rec or rec.get("finalized"):
        return
    price = safe_float(live_price)
    if price <= 0:
        return
    try:
        elapsed = (datetime.now() - datetime.strptime(rec["exit_dt"], "%Y-%m-%d %H:%M:%S")).seconds / 60.0
    except Exception:
        elapsed = 9999
    for window in EXIT_VALIDATOR_POST_EXIT_WINDOWS:
        if elapsed <= window:
            h_key, l_key = f"high_{window}m", f"low_{window}m"
            rec[h_key] = max(price, safe_float(rec.get(h_key) or price))
            rec[l_key] = min(price, safe_float(rec.get(l_key) or price))
    side, target = rec.get("side", "LONG"), safe_float(rec.get("target"))
    if target > 0:
        if (side == "LONG" and price >= target) or (side == "SHORT" and price <= target):
            rec["target_hit_after_exit"] = True
    exit_price = safe_float(rec.get("exit_price"))
    if exit_price > 0:
        if side == "LONG" and rec.get("high_60m"):
            rec["max_missed_opportunity_pct"] = round(((safe_float(rec["high_60m"]) - exit_price) / exit_price) * 100, 3)
        if side == "SHORT" and rec.get("low_60m"):
            rec["max_missed_opportunity_pct"] = round(((exit_price - safe_float(rec["low_60m"])) / exit_price) * 100, 3)
    POST_EXIT_TRACKER[sym] = rec

def finalize_exit_validator(symbol):
    sym = norm_symbol(symbol)
    rec = POST_EXIT_TRACKER.get(sym)
    if not rec or rec.get("finalized"):
        return
    try:
        if (datetime.now() - datetime.strptime(rec["exit_dt"], "%Y-%m-%d %H:%M:%S")).seconds < 3600:
            return
    except Exception:
        pass
    mmo, tgt_hit = safe_float(rec.get("max_missed_opportunity_pct", 0)), rec.get("target_hit_after_exit", False)
    if tgt_hit or mmo > 0.50:
        cls = "EARLY_EXIT"
    elif mmo < -0.20:
        cls = "LATE_EXIT"
    elif not tgt_hit and mmo <= 0.10:
        cls = "GOOD_EXIT"
    else:
        cls = "UNKNOWN"
    rec["exit_quality_class"], rec["finalized"] = cls, True
    POST_EXIT_TRACKER[sym] = rec
    def updater(r):
        r.update({k: v for k, v in rec.items() if k.startswith("high_") or k.startswith("low_") or
                  k in ("target_hit_after_exit", "max_missed_opportunity_pct", "exit_quality_class", "finalized")})
    try:
        _rewrite_jsonl_row(EXIT_VALIDATOR_FILE, sym, updater)
    except Exception:
        pass

def exit_validator_report():
    counts = {"GOOD_EXIT": 0, "EARLY_EXIT": 0, "LATE_EXIT": 0, "UNKNOWN": 0}
    total = 0
    try:
        if os.path.exists(EXIT_VALIDATOR_FILE):
            with open(EXIT_VALIDATOR_FILE, "r") as f:
                for line in f:
                    try:
                        rec = json.loads(line)
                        if rec.get("finalized"):
                            counts[rec.get("exit_quality_class", "UNKNOWN")] = counts.get(rec.get("exit_quality_class", "UNKNOWN"), 0) + 1
                            total += 1
                    except Exception:
                        pass
    except Exception:
        pass
    accuracy = counts.get("GOOD_EXIT", 0) / total * 100 if total else 0
    return (
        "EXIT VALIDATION [ADD-23]\n------------------------\n"
        f"TRADES CHECKED:    {total}\nGOOD EXIT:         {counts['GOOD_EXIT']}\n"
        f"EARLY EXIT:        {counts['EARLY_EXIT']}\nLATE EXIT:         {counts['LATE_EXIT']}\n"
        f"UNKNOWN:           {counts['UNKNOWN']}\nEXIT ACCURACY:     {accuracy:.1f}%\n"
    )

def entry_optimizer_report():
    rows = []
    try:
        if os.path.exists(ENTRY_OPTIMIZER_FILE):
            with open(ENTRY_OPTIMIZER_FILE, "r") as f:
                for line in f:
                    try:
                        rows.append(json.loads(line))
                    except Exception:
                        pass
    except Exception:
        pass
    finalized = [r for r in rows if r.get("finalized") and r.get("actual_entry_quality_score") is not None]
    if not finalized:
        return "ENTRY OPTIMIZER\n===============\n\nNO FINALIZED DATA YET"
    scores = [r["actual_entry_quality_score"] for r in finalized]
    winners = [r for r in finalized if safe_float(r.get("outcome_pnl_pct", 0)) > 0]
    losers = [r for r in finalized if safe_float(r.get("outcome_pnl_pct", 0)) < 0]
    avg_score = sum(scores) / len(scores)
    avg_win_score = sum(r["actual_entry_quality_score"] for r in winners) / len(winners) if winners else 0
    avg_loss_score = sum(r["actual_entry_quality_score"] for r in losers) / len(losers) if losers else 0
    class_scores = {}
    for r in finalized:
        class_scores.setdefault(r.get("entry_class", "UNKNOWN"), []).append(r["actual_entry_quality_score"])
    class_lines = [f"  {ec}: {len(sc)} trades  avg_score={sum(sc)/len(sc):.1f}" for ec, sc in sorted(class_scores.items())]
    return (
        "ENTRY OPTIMIZER [ADD-20]\n------------------------\n"
        f"FINALIZED TRADES:     {len(finalized)}\nAVG ENTRY QUALITY:    {avg_score:.1f} / 100\n"
        f"AVG SCORE (WINNERS):  {avg_win_score:.1f}\nAVG SCORE (LOSERS):   {avg_loss_score:.1f}\n\n"
        "BY ENTRY CLASS:\n" + "\n".join(class_lines) + "\n"
    )

def entry_class_performance_report():
    rows = load_journal_rows()
    if not rows:
        return "ENTRY CLASS PERFORMANCE\n=======================\n\nNO DATA YET"
    entry_class_map = {}
    for row in rows:
        if str(row.get("event", "")).upper() == "ENTRY_TELEMETRY":
            p = row.get("payload", {})
            sym = norm_symbol(p.get("symbol", ""))
            if sym:
                entry_class_map[sym] = p.get("entry_class", "UNKNOWN") or "UNKNOWN"
    class_data = {}
    for row in rows:
        if str(row.get("event", "")).upper() != "FINAL_EXIT":
            continue
        p = row.get("payload", {})
        sym, pnl = norm_symbol(p.get("symbol", "")), safe_float(p.get("realized_pnl_pct", 0))
        ec = entry_class_map.get(sym, "UNKNOWN")
        d = class_data.setdefault(ec, {"trades": 0, "wins": 0, "losses": 0, "net_pnl": 0.0, "win_pnl": 0.0, "loss_pnl": 0.0})
        d["trades"] += 1
        d["net_pnl"] += pnl
        if pnl > 0:
            d["wins"] += 1
            d["win_pnl"] += pnl
        elif pnl < 0:
            d["losses"] += 1
            d["loss_pnl"] += abs(pnl)
    if not class_data:
        return "ENTRY CLASS PERFORMANCE\n=======================\n\nINSUFFICIENT DATA"
    lines = ["ENTRY CLASS PERFORMANCE [ADD-24]", "--------------------------------", ""]
    for ec in ["EARLY", "ON_TIME", "LATE", "VERY_LATE", "UNKNOWN"]:
        if ec not in class_data:
            continue
        d, t = class_data[ec], max(class_data[ec]["trades"], 1)
        pf = d["win_pnl"] / d["loss_pnl"] if d["loss_pnl"] > 0 else (99.0 if d["win_pnl"] > 0 else 0.0)
        lines += [ec, f"  trades={d['trades']} wins={d['wins']} losses={d['losses']}",
                  f"  win_rate={d['wins']/t*100:.1f}%  avg_pnl={d['net_pnl']/t:.3f}%  profit_factor={pf:.2f}", ""]
    lines += [f"BEST CLASS:  {max(class_data, key=lambda x: class_data[x].get('net_pnl', 0))}",
              f"WORST CLASS: {min(class_data, key=lambda x: class_data[x].get('net_pnl', 0))}", ""]
    return "\n".join(lines)

# =============================================================================
# TRADE RECORDS & ENTRY ACCURACY
# =============================================================================

def init_entry_tracker(symbol):
    if symbol not in ENTRY_TRACKER:
        ENTRY_TRACKER[symbol] = {"hit_025": False, "hit_050": False, "hit_100": False}

def init_position_memory(symbol):
    sym = norm_symbol(symbol)
    if sym not in POSITION_MEMORY:
        POSITION_MEMORY[sym] = {
            "entry_time": datetime.now(), "peak_profit_pct": 0.0, "lowest_profit_pct": 0.0,
            "partial_taken": False, "partials": 0, "breakeven_locked": False,
        }

def entry_accuracy_check(symbol, profit_pct):
    global ENTRY_HITS_025, ENTRY_HITS_050, ENTRY_HITS_100
    sym = norm_symbol(symbol)
    if sym not in SESSION_ENTRY_SYMBOLS:
        return
    init_entry_tracker(sym)
    rec = ENTRY_TRACKER[sym]
    checks = [
        (0.25, "hit_025", "ENTRY_HIT_025", "ENTRY_HITS_025"),
        (0.50, "hit_050", "ENTRY_HIT_050", "ENTRY_HITS_050"),
        (1.00, "hit_100", "ENTRY_HIT_100", "ENTRY_HITS_100"),
    ]
    for threshold, hit_key, event, counter_name in checks:
        if profit_pct >= threshold and not rec[hit_key]:
            rec[hit_key] = True
            if counter_name == "ENTRY_HITS_025":
                ENTRY_HITS_025 += 1
            elif counter_name == "ENTRY_HITS_050":
                ENTRY_HITS_050 += 1
            else:
                ENTRY_HITS_100 += 1
            journal_event(event, {"symbol": sym, "pnl_pct": round(profit_pct, 2)})
            save_session_score()

def update_trade_peak(symbol, pnl_pct):
    sym = norm_symbol(symbol)
    if sym not in TRADE_STATE:
        TRADE_STATE[sym] = {
            "symbol": sym, "highest_pnl_seen": pnl_pct, "lowest_pnl_seen": pnl_pct,
            "mfe_pct": max(0, pnl_pct), "mae_pct": min(0, pnl_pct),
            "partials": 0, "closed": False,
            "30m_high_after_entry": None, "30m_low_after_entry": None,
            "60m_high_after_entry": None, "60m_low_after_entry": None,
            "session_high_after_entry": None, "session_low_after_entry": None,
            "first_profit_010_time": None, "first_profit_025_time": None,
            "first_profit_050_time": None, "first_profit_100_time": None,
            "response_class": None,
        }
    state = TRADE_STATE[sym]
    high = max(safe_float(state.get("highest_pnl_seen", pnl_pct)), pnl_pct)
    low = min(safe_float(state.get("lowest_pnl_seen", pnl_pct)), pnl_pct)
    state.update({"highest_pnl_seen": high, "lowest_pnl_seen": low, "mfe_pct": max(0, high), "mae_pct": min(0, low)})
    init_position_memory(sym)
    mem = POSITION_MEMORY[sym]
    mem["peak_profit_pct"] = max(safe_float(mem.get("peak_profit_pct", pnl_pct)), pnl_pct)
    mem["lowest_profit_pct"] = min(safe_float(mem.get("lowest_profit_pct", pnl_pct)), pnl_pct)

def update_post_entry_highs_lows(symbol, live_price):
    sym = norm_symbol(symbol)
    if not live_price or sym not in TRADE_STATE:
        return
    state = TRADE_STATE[sym]
    for key in ("30m_high_after_entry", "30m_low_after_entry", "60m_high_after_entry",
                "60m_low_after_entry", "session_high_after_entry", "session_low_after_entry"):
        if state.get(key) is None:
            state[key] = live_price
    entry_dt = POSITION_MEMORY.get(sym, {}).get("entry_time")
    hold_minutes = ((datetime.now() - entry_dt).seconds / 60.0 if entry_dt and isinstance(entry_dt, datetime) else 9999)
    price = safe_float(live_price)
    if price <= 0:
        return
    state["session_high_after_entry"] = max(safe_float(state["session_high_after_entry"]), price)
    state["session_low_after_entry"] = min(safe_float(state["session_low_after_entry"]), price)
    if hold_minutes <= 60:
        state["60m_high_after_entry"] = max(safe_float(state["60m_high_after_entry"]), price)
        state["60m_low_after_entry"] = min(safe_float(state["60m_low_after_entry"]), price)
    if hold_minutes <= 30:
        state["30m_high_after_entry"] = max(safe_float(state["30m_high_after_entry"]), price)
        state["30m_low_after_entry"] = min(safe_float(state["30m_low_after_entry"]), price)
    update_exit_validator_prices(sym, price)

def start_trade_record(candidate, order=None):
    global ENTRY_TOTAL
    sym = norm_symbol(candidate.get("symbol"))
    if sym in SESSION_ENTRY_SYMBOLS:
        return
    SESSION_ENTRY_SYMBOLS.add(sym)
    TRADE_STATE[sym] = {
        "symbol": sym, "side": candidate.get("side"), "grade": candidate.get("grade"),
        "sector": candidate.get("sector"), "trade_mode": candidate.get("trade_mode", "UNKNOWN"),
        "entry": candidate.get("entry"), "target": candidate.get("target"), "stop": candidate.get("stop"),
        "auth": candidate.get("auth"), "rr": candidate.get("rr"), "entry_time": now_str(),
        "highest_pnl_seen": 0.0, "lowest_pnl_seen": 0.0, "mfe_pct": 0.0, "mae_pct": 0.0,
        "partials": 0, "closed": False, "order_id": order.get("id") if order else None,
        "30m_high_after_entry": candidate.get("entry"), "30m_low_after_entry": candidate.get("entry"),
        "60m_high_after_entry": candidate.get("entry"), "60m_low_after_entry": candidate.get("entry"),
        "session_high_after_entry": candidate.get("entry"), "session_low_after_entry": candidate.get("entry"),
        "first_profit_010_time": None, "first_profit_025_time": None,
        "first_profit_050_time": None, "first_profit_100_time": None, "response_class": None,
        "price_action_pattern": candidate.get("price_action_pattern", "NONE"),
    }
    init_position_memory(sym)
    init_entry_tracker(sym)
    ENTRY_TOTAL += 1
    if not SESSION_COUNTERS.get("session_start"):
        SESSION_COUNTERS["session_start"] = now_str()
    SESSION_COUNTERS["entries"] += 1
    if ENTRY_TELEMETRY_ON and candidate.get("entry_telemetry"):
        tel = candidate["entry_telemetry"]
        SESSION_COUNTERS["entry_telemetry_count"] += 1
        SESSION_COUNTERS["missed_move_score_total"] += tel.get("missed_move_score", 0.0)
        SESSION_COUNTERS["move_at_entry_atr_total"] += tel.get("move_at_entry_atr", 0.0)
        SESSION_COUNTERS["vwap_distance_total"] += abs(tel.get("vwap_distance_at_entry", 0.0))
        journal_event("ENTRY_TELEMETRY", {
            "symbol": sym, "side": candidate.get("side"), "entry_price": candidate.get("entry"),
            "atr": candidate.get("atr"), "atr_pct": candidate.get("atr_pct"),
            "move_at_entry_atr": tel.get("move_at_entry_atr"), "missed_move_score": tel.get("missed_move_score"),
            "vwap_distance_at_entry": tel.get("vwap_distance_at_entry"),
            "entry_velocity": tel.get("entry_velocity"), "entry_acceleration": tel.get("entry_acceleration"),
            "entry_class": tel.get("entry_class"), "intraday_pct": tel.get("intraday_pct"),
            "minute_pct": tel.get("minute_pct"), "vwap_proxy": tel.get("vwap_proxy"),
            "late_entry_flag": tel.get("late_entry_flag"), "vwap_extended_flag": tel.get("vwap_extended_flag"),
            "velocity_signal": tel.get("velocity_signal"),
            "post_entry_tracking": {
                "30m_high": candidate.get("entry"), "30m_low": candidate.get("entry"),
                "60m_high": candidate.get("entry"), "60m_low": candidate.get("entry"),
                "sess_high": candidate.get("entry"), "sess_low": candidate.get("entry"),
            },
            "m_math_basis": "Physics: entry velocity = directional speed / ATR unit.",
        })
    log_entry_optimizer(candidate)
    save_session_score()
    journal_event("ENTRY", TRADE_STATE[sym])

def record_partial(symbol, pnl_pct, qty_closed=None):
    sym = norm_symbol(symbol)
    if sym not in SESSION_ENTRY_SYMBOLS:
        journal_event("UNTRACKED_PARTIAL_TAKE", {"symbol": sym, "pnl_pct": round(pnl_pct, 2), "qty_closed": qty_closed})
        return
    update_trade_peak(sym, pnl_pct)
    key = sym + "_PARTIAL_LOCK"
    if key in SESSION_PARTIAL_KEYS:
        return
    SESSION_PARTIAL_KEYS.add(key)
    partial_number = TRADE_STATE.get(sym, {}).get("partials", 0) + 1
    TRADE_STATE[sym]["partials"] = partial_number
    journal_event("PARTIAL_TAKE", {
        "symbol": sym, "event_type": "PARTIAL_TAKE", "pnl_pct": round(pnl_pct, 2),
        "qty_closed": qty_closed, "sector": sector_for(sym),
        "trade_mode": TRADE_STATE.get(sym, {}).get("trade_mode", "UNKNOWN"),
        "highest_pnl_seen": TRADE_STATE.get(sym, {}).get("highest_pnl_seen", pnl_pct),
        "lowest_pnl_seen": TRADE_STATE.get(sym, {}).get("lowest_pnl_seen", pnl_pct),
        "mfe_pct": TRADE_STATE.get(sym, {}).get("mfe_pct", max(0, pnl_pct)),
        "mae_pct": TRADE_STATE.get(sym, {}).get("mae_pct", min(0, pnl_pct)),
        "partials": partial_number, "tracked": True,
    })
    SESSION_COUNTERS["partial_takes"] += 1
    save_session_score()

def record_final_exit(symbol, reason, pnl_pct):
    global KILL_SWITCH_ACTIVE, KILL_SWITCH_ACTIVATED_AT, KILL_SWITCH_RESET_AT
    sym = norm_symbol(symbol)
    try:
        safe_sector = safe_sector_for(sym)
    except Exception:
        safe_sector = "OTHER"
    if sym in SESSION_EXIT_SYMBOLS:
        return
    if sym not in SESSION_ENTRY_SYMBOLS:
        journal_event("UNTRACKED_FINAL_EXIT", {"symbol": sym, "exit_reason": reason, "pnl_pct": round(pnl_pct, 2)})
        return
    SESSION_EXIT_SYMBOLS.add(sym)
    update_trade_peak(sym, pnl_pct)
    state = TRADE_STATE.get(sym, {})
    mfe, mae, realized = safe_float(state.get("mfe_pct", max(0, pnl_pct))), safe_float(state.get("mae_pct", min(0, pnl_pct))), safe_float(pnl_pct)
    giveback_pct = mfe - realized if mfe > 0 else 0.0
    harvest_efficiency = (realized / mfe) * 100 if mfe > 0 else 0.0
    response_class = finalize_response_class(sym)
    entry_dt = POSITION_MEMORY.get(sym, {}).get("entry_time")
    event = {
        "symbol": sym, "exit_reason": reason, "realized_pnl_pct": round(realized, 2),
        "side": state.get("side", "UNKNOWN"), "grade": state.get("grade", "UNKNOWN"),
        "sector": state.get("sector", safe_sector), "trade_mode": state.get("trade_mode", "UNKNOWN"),
        "entry": state.get("entry"), "target": state.get("target"), "stop": state.get("stop"),
        "highest_pnl_seen": state.get("highest_pnl_seen", pnl_pct), "lowest_pnl_seen": state.get("lowest_pnl_seen", pnl_pct),
        "mfe_pct": round(mfe, 2), "mae_pct": round(mae, 2), "giveback_pct": round(giveback_pct, 2),
        "harvest_efficiency_pct": round(harvest_efficiency, 1), "partials": state.get("partials", 0),
        "tracked": True, "closed": True,
        "30m_high_after_entry": state.get("30m_high_after_entry"), "30m_low_after_entry": state.get("30m_low_after_entry"),
        "60m_high_after_entry": state.get("60m_high_after_entry"), "60m_low_after_entry": state.get("60m_low_after_entry"),
        "session_high_after_entry": state.get("session_high_after_entry"), "session_low_after_entry": state.get("session_low_after_entry"),
        "response_class": response_class,
        "minutes_to_010": _minutes_between(state.get("first_profit_010_time"), entry_dt),
        "minutes_to_025": _minutes_between(state.get("first_profit_025_time"), entry_dt),
        "minutes_to_050": _minutes_between(state.get("first_profit_050_time"), entry_dt),
        "minutes_to_100": _minutes_between(state.get("first_profit_100_time"), entry_dt),
    }
    start_exit_validator_record(sym, state.get("side", "LONG"), reason, state.get("entry"), realized, state.get("target"), state.get("stop"))
    if reason in ("END_OF_DAY_FLAT", "OVERNIGHT_EXIT", "HOLD_OVERNIGHT"):
        OVERNIGHT_STATS["overnight_trades"] += 1
        OVERNIGHT_STATS["overnight_pnl_total"] += realized
        if realized > 0:
            OVERNIGHT_STATS["overnight_wins"] += 1
        elif realized < 0:
            OVERNIGHT_STATS["overnight_losses"] += 1
        OVERNIGHT_STATS["best_gap"] = max(OVERNIGHT_STATS["best_gap"], realized)
        OVERNIGHT_STATS["worst_gap"] = min(OVERNIGHT_STATS["worst_gap"], realized)
        save_overnight_stats()
        journal_event("OVERNIGHT_EXIT", {"symbol": sym, "pnl_pct": round(realized, 2), "exit_reason": reason})
    journal_event("FINAL_EXIT", event)
    if sym in TRADE_STATE:
        TRADE_STATE[sym]["closed"] = True
    SESSION_COUNTERS["final_exits"] += 1
    rc_key = {"FAST_RESPONSE": "resp_fast", "NORMAL_RESPONSE": "resp_normal",
              "SLOW_RESPONSE": "resp_slow", "FAILED_RESPONSE": "resp_failed"}.get(response_class, "resp_failed")
    SESSION_COUNTERS[rc_key] = SESSION_COUNTERS.get(rc_key, 0) + 1
    if realized > 0:
        SESSION_COUNTERS[rc_key + "_wins"] = SESSION_COUNTERS.get(rc_key + "_wins", 0) + 1
    finalize_entry_optimizer(sym, realized, response_class)
    try:
        tel = state.get("entry_telemetry") or {
            "move_at_entry_atr": state.get("move_at_entry_atr"), "missed_move_score": state.get("missed_move_score"),
            "vwap_distance_at_entry": state.get("vwap_distance_at_entry"), "entry_velocity": state.get("entry_velocity"),
            "entry_acceleration": state.get("entry_acceleration"), "entry_class": state.get("entry_class", "UNKNOWN"),
        }
        update_same_symbol_memory(sym, state.get("side", "UNKNOWN"), state.get("price_action_pattern", "NONE"),
                                  state.get("trade_mode", "UNKNOWN"), state.get("grade", "UNKNOWN"), realized, tel)
    except Exception:
        pass
    if realized > 0:
        SESSION_COUNTERS["wins"] += 1
        prev_consecutive = SESSION_COUNTERS["consecutive_losses"]
        SESSION_COUNTERS["consecutive_losses"] = 0
        if KILL_SWITCH_ACTIVE:
            KILL_SWITCH_ACTIVE = False
            KILL_SWITCH_RESET_AT = now_str()
            SESSION_COUNTERS["kill_switch_resets"] += 1
            journal_event("KILL_SWITCH_RESET", {"symbol": sym, "realized_pnl_pct": round(realized, 2), "previous_consecutive_losses": prev_consecutive})
    elif realized < 0:
        SESSION_COUNTERS["losses"] += 1
        SESSION_COUNTERS["consecutive_losses"] += 1
        SESSION_COUNTERS["max_consecutive_losses"] = max(SESSION_COUNTERS["max_consecutive_losses"], SESSION_COUNTERS["consecutive_losses"])
        if SESSION_COUNTERS["consecutive_losses"] >= PULL_PLUG_AFTER_CONSECUTIVE_LOSSES and not KILL_SWITCH_ACTIVE:
            KILL_SWITCH_ACTIVE = True
            KILL_SWITCH_ACTIVATED_AT = now_str()
            SESSION_COUNTERS["kill_switch_activations"] += 1
            journal_event("KILL_SWITCH_CONSECUTIVE_LOSS", {"symbol": sym, "consecutive_losses": SESSION_COUNTERS["consecutive_losses"]})
    else:
        SESSION_COUNTERS["breakevens"] += 1
    try:
        promote_to_shadow_great_if_qualified(state.get("sector", safe_sector), state.get("side", "LONG"),
                                             state.get("trade_mode", "UNKNOWN"), state.get("grade", "UNKNOWN"))
    except Exception:
        pass
    save_session_score()

def reset_kill_switch_manual():
    global KILL_SWITCH_ACTIVE, KILL_SWITCH_RESET_AT
    if not KILL_SWITCH_ACTIVE:
        journal_event("KILL_SWITCH_RESET_IGNORED", {"reason": "Kill switch was already clear", "reset_at": now_str()})
        return "KILL SWITCH STATUS: ALREADY CLEAR\n\nNo action taken (ADD-29: redundant resets suppressed)"
    KILL_SWITCH_ACTIVE = False
    KILL_SWITCH_RESET_AT = now_str()
    SESSION_COUNTERS["consecutive_losses"] = 0
    SESSION_COUNTERS["kill_switch_resets"] += 1
    journal_event("KILL_SWITCH_MANUAL_RESET", {"reset_at": KILL_SWITCH_RESET_AT})
    save_session_score()
    return "KILL SWITCH RESET\n\nSTATUS: CLEAR\nCONSECUTIVE LOSSES: 0"

# PART6 sections A-D — merged into main file

# =============================================================================
# SHADOW GREATS
# =============================================================================

def load_shadow_greats():
    if not os.path.exists(SHADOW_GREATS_FILE):
        template = {"updated": now_str(), "traders": []}
        with open(SHADOW_GREATS_FILE, "w") as f:
            json.dump(template, f, indent=2)
        return template
    try:
        with open(SHADOW_GREATS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {"updated": now_str(), "traders": []}

def shadow_greats_score(trader):
    win_rate = safe_float(trader.get("win_rate", 0))
    trades = safe_float(trader.get("trades", 0))
    avg_pnl = safe_float(trader.get("avg_pnl", 0))
    drawdown = abs(safe_float(trader.get("drawdown", 0)))
    score = min(win_rate / 100, 1.0) * 0.35
    score += min(trades / 100, 1.0) * 0.20
    score += min(max(avg_pnl, 0) / 5, 1.0) * 0.25
    score -= min(drawdown / 20, 1.0) * 0.20
    return max(0.0, min(1.0, score))

def promote_to_shadow_great_if_qualified(sector, side, trade_mode, grade):
    edge_key = "|".join([str(sector or "UNKNOWN"), str(side or "UNKNOWN"), str(trade_mode or "UNKNOWN"), str(grade or "UNKNOWN")])
    try:
        vault = build_edge_vault()
        e = vault.get("edges", {}).get(edge_key)
        if not e:
            return
        th = INTERNAL_SHADOW_GREAT_THRESHOLDS
        if (e.get("trades", 0) < th["min_trades"] or e.get("profit_factor", 0) < th["min_profit_factor"] or
                e.get("expectancy_pct", 0) < th["min_expectancy"] or e.get("win_rate", 0) < th["min_win_rate"] or
                e.get("net_pnl_pct", 0) < th["min_net_pnl"]):
            return
        sg_data = load_shadow_greats()
        traders = sg_data.get("traders", [])
        name = f"DAX_{sector}_{side}_{trade_mode}_{grade}"
        record = {
            "name": name, "source": "DAX_INTERNAL_EVIDENCE", "sector": sector, "side": side,
            "trade_mode": trade_mode, "grade": grade, "trades": e.get("trades"),
            "win_rate": e.get("win_rate"), "profit_factor": e.get("profit_factor"),
            "expectancy_pct": e.get("expectancy_pct"), "net_pnl_pct": e.get("net_pnl_pct"),
            "drawdown": 0.0, "avg_pnl": e.get("avg_pnl_pct", 0), "status": "INTERNAL_SHADOW_GREAT",
            "active_trades": [], "updated": now_str(),
        }
        existing = next((t for t in traders if t.get("name") == name), None)
        if existing:
            traders[traders.index(existing)] = record
        else:
            traders.append(record)
            journal_event("SHADOW_GREAT_PROMOTED", {"name": name, "sector": sector, "profit_factor": e.get("profit_factor")})
        sg_data["traders"] = traders
        sg_data["updated"] = now_str()
        with open(SHADOW_GREATS_FILE, "w") as f:
            json.dump(sg_data, f, indent=2)
    except Exception:
        pass

def shadow_greats_candidates(machine_candidates):
    if not SHADOW_GREATS_ON:
        return []
    data = load_shadow_greats()
    traders = data.get("traders", [])
    results = []
    for trader in traders:
        ts = shadow_greats_score(trader)
        if ts < SHADOW_GREATS_MIN_SCORE:
            continue
        if safe_float(trader.get("win_rate", 0)) < SHADOW_GREATS_MIN_WIN_RATE:
            continue
        if safe_float(trader.get("trades", 0)) < SHADOW_GREATS_MIN_TRADES:
            continue
        for idea in trader.get("active_trades", []):
            sym = norm_symbol(idea.get("symbol"))
            side = str(idea.get("side", "")).upper()
            for c in machine_candidates:
                if norm_symbol(c.get("symbol")) == sym and c.get("side") == side:
                    shadow = dict(c)
                    shadow["shadow_great"] = trader.get("name", "UNKNOWN")
                    shadow["shadow_great_score"] = round(ts, 3)
                    shadow["shadow_source"] = trader.get("source", "MANUAL")
                    results.append(shadow)
    return results

def shadow_greats_report():
    data = load_shadow_greats()
    traders = data.get("traders", [])
    lines = ["DAX SHADOW GREATS", "=================",
             "MODE: OBSERVATION ONLY" if not SHADOW_GREATS_EXECUTE_ON else "MODE: EXECUTION ENABLED", ""]
    if not traders:
        lines.append("NO SHADOW TRADERS LOADED YET")
        return "\n".join(lines)
    for t in sorted(traders, key=shadow_greats_score, reverse=True)[:20]:
        lines += [
            str(t.get("name", "UNKNOWN")), "-" * 30,
            "SOURCE: " + str(t.get("source", "MANUAL")),
            "SCORE: " + str(round(shadow_greats_score(t), 3)),
            "WIN RATE: " + str(t.get("win_rate", 0)) + "%",
            "TRADES: " + str(t.get("trades", 0)),
            "AVG PNL: " + str(t.get("avg_pnl", 0)) + "%",
            "STATUS: " + str(t.get("status", "EXTERNAL")), "",
        ]
    return "\n".join(lines)

# =============================================================================
# POST-EXIT / ORDER HYGIENE
# =============================================================================

def post_exit_target_check():
    tracker = load_json_file(POST_EXIT_CHECK_FILE, {})
    updated = False
    for sym, rec in list(tracker.items()):
        if rec.get("finalized"):
            continue
        price = get_latest_price(sym)
        if not price:
            continue
        target = safe_float(rec.get("target"))
        side = rec.get("side", "LONG")
        if target <= 0:
            continue
        hit = (side == "LONG" and price >= target) or (side == "SHORT" and price <= target)
        if hit:
            rec.update({"target_hit": True, "target_hit_price": price, "finalized": True})
            updated = True
            journal_event("POST_EXIT_TARGET_HIT", {"symbol": sym, "price": price, "target": target})
    if updated:
        save_json_file(POST_EXIT_CHECK_FILE, tracker)
    return tracker

def clean_live_orders(orders):
    live_states = {"new", "accepted", "pending_new", "partially_filled", "held", "calculated"}
    return [o for o in (orders or []) if str(o.get("status", "")).lower() in live_states]

def manual_cancel_all_orders():
    orders = get_orders()
    cancelled = []
    for o in clean_live_orders(orders):
        try:
            cancel_order(o.get("id"))
            cancelled.append({"symbol": o.get("symbol"), "order_id": o.get("id"), "status": "cancelled"})
        except Exception as e:
            cancelled.append({"symbol": o.get("symbol"), "order_id": o.get("id"), "error": str(e)})
    journal_event("MANUAL_CANCEL_ALL_ORDERS", cancelled)
    return cancelled

def manual_close_all_positions():
    orders = get_orders()
    positions = get_positions_retry()
    for o in clean_live_orders(orders):
        try:
            cancel_order(o.get("id"))
        except Exception:
            pass
    threading.Event().wait(2.5)
    results = []
    for p in positions:
        sym = norm_symbol(p.get("symbol"))
        try:
            api_delete(f"{PAPER_URL}/v2/positions/{sym}")
            results.append({"symbol": sym, "closed": True})
        except Exception as e:
            results.append({"symbol": sym, "closed": False, "error": str(e)})
    journal_event("MANUAL_CLOSE_ALL_POSITIONS", results)
    return results

def emergency_pull_plug():
    positions = get_positions_retry()
    orders = get_orders()
    for o in clean_live_orders(orders):
        if o.get("id"):
            try:
                cancel_order(o.get("id"))
            except Exception:
                pass
    results = []
    for p in positions:
        sym = p.get("symbol")
        try:
            close_position(sym)
            results.append({"symbol": sym, "closed": True})
        except Exception as e:
            results.append({"symbol": sym, "closed": False, "error": str(e)})
    return results

def reconcile_missing_positions():
    try:
        positions = get_positions()
    except Exception as e:
        return f"RECONCILE FAILED: {e}"
    live_syms = {norm_symbol(p.get("symbol")) for p in positions}
    journal_syms = {sym for sym, st in TRADE_STATE.items() if not st.get("closed")}
    missing_in_broker = journal_syms - live_syms
    missing_in_journal = live_syms - journal_syms
    for sym in missing_in_broker:
        if sym in TRADE_STATE:
            TRADE_STATE[sym]["closed"] = True
            journal_event("RECONCILE_JOURNAL_CLOSED", {"symbol": sym, "reason": "NOT_IN_BROKER"})
    for sym in missing_in_journal:
        journal_event("RECONCILE_UNTRACKED_POSITION", {"symbol": sym})
    return (
        f"RECONCILIATION\nLIVE: {len(live_syms)}  JOURNAL: {len(journal_syms)}\n"
        f"CLOSED IN JOURNAL: {len(missing_in_broker)}\nUNTRACKED LIVE: {len(missing_in_journal)}"
    )

# =============================================================================
# SESSION DISPLAY / RESET
# =============================================================================

def session_score_display():
    sc = SESSION_COUNTERS
    start = sc.get("session_start") or "NOT SET"
    entries, partials, exits = sc.get("entries", 0), sc.get("partial_takes", 0), sc.get("final_exits", 0)
    wins, losses, breakevens = sc.get("wins", 0), sc.get("losses", 0), sc.get("breakevens", 0)
    total = wins + losses + breakevens
    wr = (wins / total * 100) if total else 0
    rate025 = (ENTRY_HITS_025 / ENTRY_TOTAL * 100) if ENTRY_TOTAL else 0
    rate050 = (ENTRY_HITS_050 / ENTRY_TOTAL * 100) if ENTRY_TOTAL else 0
    rate100 = (ENTRY_HITS_100 / ENTRY_TOTAL * 100) if ENTRY_TOTAL else 0
    on = OVERNIGHT_STATS
    on_wr = (on["overnight_wins"] / on["overnight_trades"] * 100) if on["overnight_trades"] else 0
    ks_state = "ACTIVE" if KILL_SWITCH_ACTIVE else "CLEAR"
    tel_count = sc.get("entry_telemetry_count", 0)
    avg_mms = (sc.get("missed_move_score_total", 0.0) / tel_count) if tel_count else 0.0
    avg_maeatr = (sc.get("move_at_entry_atr_total", 0.0) / tel_count) if tel_count else 0.0
    avg_vwap = (sc.get("vwap_distance_total", 0.0) / tel_count) if tel_count else 0.0
    rf, rf_w = sc.get("resp_fast", 0), sc.get("resp_fast_wins", 0)
    rn, rn_w = sc.get("resp_normal", 0), sc.get("resp_normal_wins", 0)
    rs, rs_w = sc.get("resp_slow", 0), sc.get("resp_slow_wins", 0)
    rfl, rfl_w = sc.get("resp_failed", 0), sc.get("resp_failed_wins", 0)

    def wr_line(c, w):
        return f"{(w / c * 100):.0f}%" if c else "0%"

    shadow_band_lines = []
    for t in SHADOW_AUTH_THRESHOLDS:
        t_str = str(t)
        count = LIVE_SHADOW_BAND_COUNTS.get(t_str, 0)
        pct = (count / LIVE_SHADOW_TOTAL * 100) if LIVE_SHADOW_TOTAL else 0
        fire_marker = " <<FIRE" if t == MIN_FIRE_AUTH else ""
        shadow_band_lines.append(f"  >={t_str}: {count} ({pct:.1f}%){fire_marker}")

    return f"""
DAX SESSION SCORE
=================
BUILD: {UPGRADE_VERSION}
SESSION START: {start}

ENTRIES:       {entries}
PARTIAL TAKES: {partials}
FINAL EXITS:   {exits}

WINS:          {wins}
LOSSES:        {losses}
BREAKEVENS:    {breakevens}
WIN RATE:      {wr:.1f}%

KILL SWITCH [ADD-14 / ADD-29]
-----------------------------
STATUS:               {ks_state}
CONSECUTIVE LOSSES:   {sc.get('consecutive_losses', 0)}
MAX CONSECUTIVE HWM:  {sc.get('max_consecutive_losses', 0)}
THRESHOLD:            {PULL_PLUG_AFTER_CONSECUTIVE_LOSSES}
ACTIVATIONS:          {sc.get('kill_switch_activations', 0)}
RESETS:               {sc.get('kill_switch_resets', 0)}
LAST ACTIVATED:       {KILL_SWITCH_ACTIVATED_AT or '---'}
LAST RESET:           {KILL_SWITCH_RESET_AT or '---'}

ENTRY TELEMETRY [ADD-16]
------------------------
TRADES TRACKED:         {tel_count}
AVG MISSED_MOVE_SCORE:  {avg_mms:.3f}
AVG MOVE_AT_ENTRY_ATR:  {avg_maeatr:.3f}
AVG |VWAP_DISTANCE|:    {avg_vwap:.3f}%

FIRST RESPONSE ENGINE [ADD-21]
-------------------------------
FAST   (<=3m):  {rf}  wins={rf_w}  wr={wr_line(rf, rf_w)}
NORMAL (<=10m): {rn}  wins={rn_w}  wr={wr_line(rn, rn_w)}
SLOW   (>10m):  {rs}  wins={rs_w}  wr={wr_line(rs, rs_w)}
FAILED (never): {rfl} wins={rfl_w} wr={wr_line(rfl, rfl_w)}

ENTRY ACCURACY
--------------
TOTAL TRACKED:   {ENTRY_TOTAL}
REACHED +0.25%:  {ENTRY_HITS_025}  ({rate025:.1f}%)
REACHED +0.50%:  {ENTRY_HITS_050}  ({rate050:.1f}%)
REACHED +1.00%:  {ENTRY_HITS_100}  ({rate100:.1f}%)

OVERNIGHT STATS
---------------
TRADES: {on['overnight_trades']}  WR: {on_wr:.1f}%
TOTAL PNL: {on['overnight_pnl_total']:.2f}%
BEST: {on['best_gap']:.2f}%  WORST: {on['worst_gap']:.2f}%

AUTH SHADOW BANDS [LIVE]
------------------------
TOTAL SCANNED: {LIVE_SHADOW_TOTAL}
{chr(10).join(shadow_band_lines)}

EXEC ERRORS:   {sc.get('execution_errors', 0)}
MGR CYCLES:    {sc.get('exit_manager_cycles', 0)}
"""

def reset_journal_and_session():
    global TRADE_STATE, SESSION_ENTRY_SYMBOLS, SESSION_EXIT_SYMBOLS, SESSION_PARTIAL_KEYS
    global ENTRY_HITS_025, ENTRY_HITS_050, ENTRY_HITS_100, ENTRY_TOTAL, ENTRY_TRACKER
    global KILL_SWITCH_ACTIVE, KILL_SWITCH_ACTIVATED_AT, KILL_SWITCH_RESET_AT
    global EXECUTED_SYMBOLS_TODAY, TRADE_COOLDOWNS, POSITION_PEAK_PROFIT, POSITION_MEMORY
    global DAILY_PEAK_PNL, POST_EXIT_TRACKER, EARLY_ENTRY_MEMORY
    try:
        if os.path.exists(JOURNAL_FILE):
            bak = JOURNAL_FILE + ".bak_" + datetime.now().strftime("%Y%m%d_%H%M%S")
            os.rename(JOURNAL_FILE, bak)
    except Exception:
        pass
    TRADE_STATE, SESSION_ENTRY_SYMBOLS, SESSION_EXIT_SYMBOLS, SESSION_PARTIAL_KEYS = {}, set(), set(), set()
    ENTRY_HITS_025 = ENTRY_HITS_050 = ENTRY_HITS_100 = ENTRY_TOTAL = 0
    ENTRY_TRACKER, EXECUTED_SYMBOLS_TODAY, TRADE_COOLDOWNS = {}, set(), {}
    POSITION_PEAK_PROFIT, POSITION_MEMORY, DAILY_PEAK_PNL, POST_EXIT_TRACKER = {}, {}, 0, {}
    EARLY_ENTRY_MEMORY = {}
    KILL_SWITCH_ACTIVE, KILL_SWITCH_ACTIVATED_AT, KILL_SWITCH_RESET_AT = False, None, None
    for k in SESSION_COUNTERS:
        if k == "session_start":
            SESSION_COUNTERS[k] = now_str()
        else:
            SESSION_COUNTERS[k] = 0
    save_session_score()
    journal_event("SESSION_RESET", {"time": now_str()})
    return "SESSION & JOURNAL RESET COMPLETE"

# =============================================================================
# MORNING INTELLIGENCE / FT RSS / M-MATH AUTO INTELLIGENCE
# =============================================================================

def fetch_ft_rss_headlines():
    if not FT_RSS_INTELLIGENCE_ON:
        return []
    headlines = []
    for url in FT_RSS_FEEDS:
        try:
            r = requests.get(url, timeout=FT_REQUEST_TIMEOUT)
            if r.status_code >= 300:
                continue
            root = ET.fromstring(r.content)
            for item in root.findall(".//item")[:FT_MAX_HEADLINES // len(FT_RSS_FEEDS)]:
                title = item.findtext("title", "")
                if title:
                    headlines.append(title.strip())
        except Exception as e:
            journal_event("FT_RSS_ERROR", {"url": url, "error": str(e)})
    return headlines[:FT_MAX_HEADLINES]

FT_BULL_KEYWORDS = [
    "surge", "rally", "gain", "beat", "upgrade", "record", "strong", "growth", "bull", "rise", "jump", "soar",
]
FT_BEAR_KEYWORDS = [
    "fall", "drop", "cut", "miss", "downgrade", "weak", "loss", "crisis", "bear", "slump", "plunge", "warn",
]

def ft_keyword_score(headline, symbol=None):
    if not headline:
        return 0.0
    hl = headline.lower()
    sym = norm_symbol(symbol) if symbol else ""
    score = 0.0
    for w in FT_BULL_KEYWORDS:
        if w in hl:
            score += 0.02
    for w in FT_BEAR_KEYWORDS:
        if w in hl:
            score -= 0.02
    if sym and sym.lower() in hl:
        score += 0.05
    sec = sector_for(sym) if sym else ""
    if sec and sec.lower().replace("_", " ") in hl:
        score += 0.03
    return round(max(-1.0, min(1.0, score)), 4)

def aggregate_ft_keyword_score(headlines, symbol):
    if not headlines:
        return 0.0
    total = sum(ft_keyword_score(h, symbol) for h in headlines)
    return round(max(-1.0, min(1.0, total * FT_NEWS_WEIGHT)), 4)

def ft_news_sentiment(headlines=None):
    headlines = headlines or fetch_ft_rss_headlines()
    if not headlines:
        return 0.0
    bull = ["surge", "rally", "gain", "beat", "upgrade", "record", "strong", "growth", "bull"]
    bear = ["fall", "drop", "cut", "miss", "downgrade", "weak", "loss", "crisis", "bear", "slump"]
    score = 0.0
    for h in headlines:
        hl = h.lower()
        score += sum(1 for w in bull if w in hl) * 0.02
        score -= sum(1 for w in bear if w in hl) * 0.02
    return round(max(-1.0, min(1.0, score * FT_NEWS_WEIGHT)), 4)

def default_morning_intelligence():
    return {
        "date": datetime.now().strftime("%Y-%m-%d"), "market_bias": "NEUTRAL",
        "sector_scores": {}, "symbol_scores": {},
        "macro_scores": {"DXY": 0.0, "US10Y": 0.0, "GOLD": 0.0}, "notes": [],
    }

def load_morning_intelligence():
    if not MORNING_INTELLIGENCE_ON:
        return default_morning_intelligence()
    try:
        with open(MORNING_INTEL_FILE, "r") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return default_morning_intelligence()

def morning_symbol_score(symbol):
    return safe_float(load_morning_intelligence().get("symbol_scores", {}).get(norm_symbol(symbol), 0.0))

def morning_sector_score(sector):
    return safe_float(load_morning_intelligence().get("sector_scores", {}).get(str(sector).upper(), 0.0))

def morning_market_bias_score():
    bias = str(load_morning_intelligence().get("market_bias", "NEUTRAL")).upper()
    if bias == "BULLISH":
        return 0.08
    if bias == "BEARISH":
        return -0.08
    return 0.0

def morning_gold_macro_score():
    return safe_float(load_morning_intelligence().get("macro_scores", {}).get("GOLD", 0.0))

def fetch_morning_intelligence():
    if not MORNING_INTELLIGENCE_ON:
        return load_morning_intelligence()
    data = {"symbols": {}, "macro": {}, "updated": now_str(), "ft_sentiment": 0.0}
    headlines = fetch_ft_rss_headlines()
    try:
        snaps = get_snapshots(INTEL_SYMBOLS)
    except Exception as e:
        journal_event("MORNING_INTEL_SNAP_ERROR", str(e))
        snaps = {}
    for sym in INTEL_SYMBOLS:
        snap = snaps.get(sym, {})
        daily = snap.get("dailyBar") or snap.get("daily_bar") or {}
        prev = snap.get("prevDailyBar") or snap.get("prev_daily_bar") or {}
        price = safe_float((snap.get("latestTrade") or {}).get("p"))
        prev_c = safe_float(prev.get("c"), price)
        pct = ((price - prev_c) / prev_c * 100) if prev_c > 0 else 0.0
        vol = safe_float(daily.get("v"))
        ft_kw = aggregate_ft_keyword_score(headlines, sym)
        data["symbols"][sym] = {
            "price": price, "pct": round(pct, 3), "volume": vol, "ft_keyword_score": ft_kw,
        }
    ft_sent = ft_news_sentiment(headlines)
    data["ft_sentiment"] = ft_sent
    data["macro"] = {
        "qqq_pct": safe_float(data["symbols"].get("QQQ", {}).get("pct")),
        "spy_pct": safe_float(data["symbols"].get("SPY", {}).get("pct")),
        "soxx_pct": safe_float(data["symbols"].get("SOXX", {}).get("pct")),
        "gld_pct": safe_float(data["symbols"].get("GLD", {}).get("pct")),
        "ft_sentiment": ft_sent,
    }
    save_morning_intelligence(data)
    journal_event("MORNING_INTELLIGENCE_FETCH", {"symbols": len(data["symbols"]), "ft_sentiment": ft_sent})
    return data

def morning_intelligence_report():
    data = load_morning_intelligence()
    if not data.get("symbols"):
        data = fetch_morning_intelligence()
    macro = data.get("macro", {})
    lines = [
        "MORNING INTELLIGENCE", "=" * 20, f"UPDATED: {data.get('updated', 'N/A')}", "",
        "MACRO", "-" * 5,
        f"SPY: {macro.get('spy_pct', 0):+.2f}%  QQQ: {macro.get('qqq_pct', 0):+.2f}%  "
        f"SOXX: {macro.get('soxx_pct', 0):+.2f}%  GLD: {macro.get('gld_pct', 0):+.2f}%",
        f"FT SENTIMENT: {macro.get('ft_sentiment', 0):+.4f}", "",
        "TOP MOVERS", "-" * 10,
    ]
    movers = sorted(data.get("symbols", {}).items(), key=lambda x: abs(safe_float(x[1].get("pct"))), reverse=True)[:12]
    for sym, info in movers:
        lines.append(
            f"{sym:6} {safe_float(info.get('pct')):+.2f}%  vol={int(safe_float(info.get('volume')))}  "
            f"FT={safe_float(info.get('ft_keyword_score', 0)):+.4f}"
        )
    return "\n".join(lines)

def m_math_auto_intelligence():
    if not AUTO_M_MATH_INTELLIGENCE_ON:
        return {}
    intel = fetch_morning_intelligence() if MORNING_INTELLIGENCE_ON else load_morning_intelligence()
    macro = intel.get("macro", {})
    qqq = safe_float(macro.get("qqq_pct", 0)) / 100.0
    spy = safe_float(macro.get("spy_pct", 0)) / 100.0
    soxx = safe_float(macro.get("soxx_pct", 0)) / 100.0
    ft = safe_float(macro.get("ft_sentiment", 0))
    market_intel = round(
        qqq * QQQ_MOMENTUM_WEIGHT + spy * SPY_MOMENTUM_WEIGHT +
        soxx * SEMI_STRENGTH_WEIGHT + ft * NEWS_REGIME_WEIGHT, 4
    )
    sector_scores = {}
    for sym, info in intel.get("symbols", {}).items():
        sec = sector_for(sym)
        sector_scores.setdefault(sec, []).append(safe_float(info.get("pct", 0)))
    sector_intel = {}
    for sec, pcts in sector_scores.items():
        sector_intel[sec] = round(sum(pcts) / len(pcts) / 100.0, 4) if pcts else 0.0
    result = {
        "market_intel": market_intel, "sector_intel": sector_intel,
        "ft_sentiment": ft, "updated": now_str(),
    }
    journal_event("M_MATH_AUTO_INTELLIGENCE", result)
    return result

# =============================================================================
# UNIVERSE DEFINITIONS
# =============================================================================

SECTOR_MAP = {
    "NVDA": "SEMICONDUCTORS", "AVGO": "SEMICONDUCTORS", "AMD": "SEMICONDUCTORS", "QCOM": "SEMICONDUCTORS",
    "MRVL": "SEMICONDUCTORS", "INTC": "SEMICONDUCTORS", "ARM": "SEMICONDUCTORS", "TSM": "SEMICONDUCTORS",
    "ASML": "SEMICONDUCTORS", "MU": "SEMICONDUCTORS", "AMAT": "SEMICONDUCTORS", "LRCX": "SEMICONDUCTORS",
    "MSFT": "SOFTWARE", "SNOW": "SOFTWARE", "MDB": "SOFTWARE", "CRM": "SOFTWARE", "NOW": "SOFTWARE",
    "ADBE": "SOFTWARE", "ORCL": "SOFTWARE", "DDOG": "SOFTWARE", "PLTR": "SOFTWARE", "TEAM": "SOFTWARE",
    "CRWD": "CYBERSECURITY", "PANW": "CYBERSECURITY", "NET": "CYBERSECURITY", "ZS": "CYBERSECURITY",
    "OKTA": "CYBERSECURITY", "FTNT": "CYBERSECURITY", "CHKP": "CYBERSECURITY", "S": "CYBERSECURITY",
    "AAPL": "CONSUMER_TECH", "GOOGL": "CONSUMER_TECH", "META": "CONSUMER_TECH", "AMZN": "CONSUMER_TECH",
    "TSLA": "CONSUMER_TECH", "NFLX": "CONSUMER_TECH", "UBER": "CONSUMER_TECH", "SHOP": "CONSUMER_TECH",
    "SQ": "FINTECH", "PYPL": "FINTECH",
    "JPM": "FINANCIALS", "BAC": "FINANCIALS", "GS": "FINANCIALS", "MS": "FINANCIALS",
    "V": "FINANCIALS", "MA": "FINANCIALS", "AXP": "FINANCIALS", "BLK": "FINANCIALS", "COIN": "FINTECH",
    "LLY": "HEALTHCARE", "UNH": "HEALTHCARE", "JNJ": "HEALTHCARE", "MRK": "HEALTHCARE",
    "ABBV": "HEALTHCARE", "PFE": "HEALTHCARE", "TMO": "HEALTHCARE", "ISRG": "HEALTHCARE",
    "XOM": "ENERGY", "CVX": "ENERGY", "COP": "ENERGY", "SLB": "ENERGY", "OXY": "ENERGY",
    "CAT": "INDUSTRIALS", "DE": "INDUSTRIALS", "GE": "INDUSTRIALS", "BA": "INDUSTRIALS",
    "HON": "INDUSTRIALS", "RTX": "INDUSTRIALS", "LMT": "INDUSTRIALS",
    "COST": "CONSUMER", "WMT": "CONSUMER", "HD": "CONSUMER", "MCD": "CONSUMER",
    "NKE": "CONSUMER", "SBUX": "CONSUMER", "TGT": "CONSUMER",
    "DIS": "MEDIA", "SPOT": "MEDIA", "RBLX": "MEDIA", "ROKU": "MEDIA", "ABNB": "MEDIA",
    "RIVN": "AUTO", "LCID": "AUTO", "HOOD": "FINTECH",
    "GLD": "GOLD", "NEM": "GOLD", "GOLD": "GOLD", "AEM": "GOLD", "WPM": "GOLD", "FNV": "GOLD",
    "GDX": "GOLD", "GDXJ": "GOLD", "IAU": "GOLD",
    "SPY": "INDEX", "QQQ": "INDEX", "SOXX": "INDEX", "SMH": "INDEX",
    "XLK": "INDEX", "XLF": "INDEX", "XLE": "INDEX", "XLI": "INDEX", "XLY": "INDEX", "IWM": "INDEX",
}

DEFAULT_CORE = [
    "NVDA", "AVGO", "AMD", "MSFT", "AAPL", "GOOGL", "META", "AMZN", "TSLA",
    "CRWD", "PANW", "JPM", "LLY", "XOM", "CAT", "COST", "GLD", "NEM", "SPY", "QQQ",
]

SP500 = [
    "NVDA", "AVGO", "AMD", "QCOM", "MRVL", "INTC", "ARM", "TSM", "ASML", "MU", "AMAT", "LRCX",
    "MSFT", "SNOW", "MDB", "CRM", "NOW", "ADBE", "ORCL", "DDOG", "PLTR", "TEAM",
    "CRWD", "PANW", "NET", "ZS", "OKTA", "FTNT", "CHKP", "S",
    "AAPL", "GOOGL", "META", "AMZN", "TSLA", "NFLX", "UBER", "SHOP", "SQ", "PYPL",
    "JPM", "BAC", "GS", "MS", "V", "MA", "AXP", "BLK", "COIN",
    "LLY", "UNH", "JNJ", "MRK", "ABBV", "PFE", "TMO", "ISRG",
    "XOM", "CVX", "COP", "SLB", "OXY", "CAT", "DE", "GE", "BA", "HON", "RTX", "LMT",
    "COST", "WMT", "HD", "MCD", "NKE", "SBUX", "TGT",
    "DIS", "SPOT", "RBLX", "ROKU", "ABNB", "RIVN", "LCID", "HOOD",
    "NEM", "GOLD", "AEM", "WPM", "FNV", "GDX", "GDXJ",
]

MAJOR = list(dict.fromkeys(DEFAULT_CORE + SP500 + ["SOXX", "SMH", "XLK", "XLF", "XLE", "IWM"]))

LIVE_UNIVERSE = list(dict.fromkeys(DEFAULT_CORE + (SP500 if SP500_EXPANSION_ON else [])))
SHADOW_UNIVERSE = list(dict.fromkeys(MAJOR + INTEL_SYMBOLS))

def sector_for(symbol):
    return SECTOR_MAP.get(norm_symbol(symbol), "OTHER")

def safe_sector_for(symbol):
    try:
        return sector_for(symbol)
    except Exception:
        return "OTHER"


def estimate_atr_proxy(daily, prev, price):
    high = safe_float(daily.get("h"), price)
    low = safe_float(daily.get("l"), price)
    prev_close = safe_float(prev.get("c"), price)
    true_range = max(high - low, abs(high - prev_close), abs(low - prev_close))
    atr = true_range if true_range > 0 else price * 0.004
    return max(atr, price * 0.002)

def get_market_regime():
    if REGIME_CACHE.get("timestamp"):
        if (datetime.now() - REGIME_CACHE["timestamp"]).seconds < 90:
            return REGIME_CACHE["data"]
    try:
        snaps = get_snapshots(["SPY", "QQQ", "NVDA", "AMD", "SOXX", "VIXY"])

        def pct(sym):
            s = snaps.get(sym, {})
            prev = s.get("prevDailyBar") or {}
            trade = s.get("latestTrade") or {}
            price = safe_float(trade.get("p"))
            prev_close = safe_float(prev.get("c"), price)
            if prev_close <= 0:
                return 0
            return (price - prev_close) / prev_close

        spy = pct("SPY")
        qqq = pct("QQQ")
        nvda = pct("NVDA")
        amd = pct("AMD")
        soxx = pct("SOXX")
        vixy = pct("VIXY")
        semi_strength = (nvda + amd + soxx) / 3
        breadth = (spy * SPY_MOMENTUM_WEIGHT) + (qqq * QQQ_MOMENTUM_WEIGHT) + (semi_strength * SEMI_STRENGTH_WEIGHT)
        risk_pressure = max(0, vixy)
        regime_score = breadth - (risk_pressure * 0.75)
        if regime_score >= BULL_REGIME_MIN:
            regime = "BULL_EXPANSION"
        elif regime_score <= BEAR_REGIME_MAX:
            regime = "RISK_OFF"
        else:
            regime = "NEUTRAL"
        result = {
            "regime": regime, "score": round(regime_score, 4),
            "breadth": round(breadth, 4), "risk_pressure": round(risk_pressure, 4),
            "spy": round(spy, 4), "qqq": round(qqq, 4),
            "semi_strength": round(semi_strength, 4), "vixy": round(vixy, 4),
        }
        prev_data = REGIME_CACHE.get("data", {})
        if prev_data and prev_data.get("regime") != regime:
            journal_event("REGIME_CHANGE", {
                "from_regime": prev_data.get("regime"), "to_regime": regime,
                "from_score": prev_data.get("score"), "to_score": round(regime_score, 4),
            })
        REGIME_CACHE["timestamp"] = datetime.now()
        REGIME_CACHE["data"] = result
        return result
    except Exception:
        return {"regime": "NEUTRAL", "score": 0, "breadth": 0, "risk_pressure": 0, "spy": 0, "qqq": 0, "semi_strength": 0, "vixy": 0}

def news_score_for(symbol):
    return morning_symbol_score(symbol)

def detect_price_action_pattern(daily, minute, price, intraday_pct, gap_pct, side):
    high = safe_float(daily.get("h"), price)
    low = safe_float(daily.get("l"), price)
    open_ = safe_float(daily.get("o"), price)
    body = abs(price - open_)
    upper_wick = high - max(price, open_)
    lower_wick = min(price, open_) - low
    full_range = high - low if high > low else 0.0001
    body_pct = body / full_range
    upper_wick_pct = upper_wick / full_range
    lower_wick_pct = lower_wick / full_range
    if gap_pct > 3.0 and intraday_pct > 3.0:
        return "BUYING_CLIMAX"
    if gap_pct < -3.0 and intraday_pct < -3.0:
        return "SELLING_CLIMAX"
    if lower_wick_pct > 0.55 and body_pct < 0.30 and side == "LONG":
        return "HAMMER"
    if upper_wick_pct > 0.55 and body_pct < 0.30 and side == "SHORT":
        return "SHOOTING_STAR"
    if body_pct > 0.70 and intraday_pct > 1.5 and side == "LONG":
        return "BULLISH_ENGULFING"
    if body_pct > 0.70 and intraday_pct < -1.5 and side == "SHORT":
        return "BEARISH_ENGULFING"
    if gap_pct > 1.5 and intraday_pct < -0.5:
        return "FAILED_BREAKOUT"
    if gap_pct < -1.5 and intraday_pct > 0.5:
        return "FAILED_BREAKDOWN"
    if intraday_pct > 0.5 and body_pct > 0.50:
        return "BULLISH_CONFIRMATION"
    if intraday_pct < -0.5 and body_pct > 0.50:
        return "BEARISH_CONFIRMATION"
    return "NONE"

def build_candidate(symbol, snapshot):
    global LIVE_SHADOW_BAND_COUNTS, LIVE_SHADOW_TOTAL
    minute = snapshot.get("minuteBar") or {}
    daily = snapshot.get("dailyBar") or {}
    prev = snapshot.get("prevDailyBar") or {}
    trade = snapshot.get("latestTrade") or {}
    symbol = norm_symbol(symbol)
    price = safe_float(trade.get("p"))
    if price <= 0 or price < 20:
        return None
    if "LIVE_UNIVERSE" in globals() and symbol not in LIVE_UNIVERSE:
        return None
    volume_raw = max(safe_float(daily.get("v"), 0), safe_float(minute.get("v"), 0) * 390)
    if volume_raw < MIN_VOLUME_HARD_BLOCK:
        return None
    raw_atr = estimate_atr_proxy(daily, prev, price)
    daily_open = safe_float(daily.get("o"), price)
    prev_close = safe_float(prev.get("c"), daily_open)
    minute_open = safe_float(minute.get("o"), price)
    minute_close = safe_float(minute.get("c"), price)
    gap_pct = ((daily_open - prev_close) / prev_close) * 100 if prev_close else 0
    if abs(gap_pct) > GAP_ATR_NORMALIZE_THRESHOLD_PCT:
        raw_atr = min(raw_atr, price * GAP_ATR_FALLBACK_PCT)
    atr = min(raw_atr, price * MAX_ATR_TARGET_PCT)
    stop_atr = min(raw_atr, price * MAX_ATR_STOP_PCT)
    intraday_pct = ((price - daily_open) / daily_open) * 100 if daily_open else 0
    minute_pct = ((minute_close - minute_open) / minute_open) * 100 if minute_open else 0
    atr_pct = (atr / price) * 100 if price else 0
    side_preliminary = "LONG" if intraday_pct >= 0 else "SHORT"
    momentum = abs((intraday_pct * 5.5) + (minute_pct * 8.0))
    gap_aligned = gap_pct >= 0 if side_preliminary == "LONG" else gap_pct <= 0
    gap_force = abs(gap_pct) * 1.5 * (1.0 if gap_aligned else -0.5)
    raw_score = max(0, momentum + gap_force)
    volume_boost = min(volume_raw / 25_000_000, 4)
    volatility_quality = max(0.70, min(1.15, 1.0 + (atr_pct / 18)))
    auth = (48 + raw_score * 2.6 + volume_boost) * volatility_quality
    sector = sector_for(symbol)
    news_score = safe_float(morning_symbol_score(symbol))
    sector_intel = morning_sector_score(sector)
    market_intel = morning_market_bias_score()
    gold_intel = morning_gold_macro_score() if norm_symbol(symbol) in GOLD_SYMBOLS else 0.0
    regime_data = get_market_regime()
    regime = regime_data.get("regime", "NEUTRAL")
    regime_score = regime_data.get("score", 0)
    breadth = regime_data.get("breadth", 0)
    risk_pressure = regime_data.get("risk_pressure", 0)
    if news_score < -0.25:
        return None
    side = side_preliminary
    if news_score < -0.10 and side == "LONG":
        return None
    if news_score > 0.25 and side == "SHORT":
        return None
    auth += news_score * 18
    auth += sector_intel * 12
    auth += market_intel * 10
    auth += gold_intel
    if side == "LONG":
        auth += 8 if regime == "BULL_EXPANSION" else (-18 if regime == "RISK_OFF" else 0)
    else:
        auth += 8 if regime == "RISK_OFF" else (-18 if regime == "BULL_EXPANSION" else 0)
    auth += breadth * 100 * MARKET_BREADTH_WEIGHT
    auth -= risk_pressure * 100 * MACRO_ALIGNMENT_WEIGHT
    if sector == "CRYPTO_EQUITY":
        auth -= 12
    if sector == "SEMI" and regime != "RISK_OFF":
        auth += 4
    if sector == "TECH" and regime != "RISK_OFF":
        auth += 3
    if symbol in {"SPY", "QQQ"}:
        auth += 5
    auth = max(0, min(99, auth))
    if side == "LONG":
        target = round(price + (atr * ATR_TARGET_MULTIPLIER), 2)
        stop = round(price - (stop_atr * ATR_STOP_MULTIPLIER), 2)
    else:
        target = round(price - (atr * ATR_TARGET_MULTIPLIER), 2)
        stop = round(price + (stop_atr * ATR_STOP_MULTIPLIER), 2)
    risk = abs(price - stop)
    reward = abs(target - price)
    rr = reward / risk if risk > 0 else 0
    if rr < MIN_REWARD_RISK:
        target = round(price + (risk * MIN_REWARD_RISK), 2) if side == "LONG" else round(price - (risk * MIN_REWARD_RISK), 2)
        reward = abs(target - price)
        rr = reward / risk if risk > 0 else 0
    candidate = {
        "symbol": symbol, "side": side, "auth": round(auth, 2), "grade": grade_from_auth(auth),
        "entry": round(price, 2), "target": target, "stop": stop, "pct": round(intraday_pct, 4),
        "sector": sector, "atr": round(atr, 4), "raw_atr": round(raw_atr, 4), "atr_pct": round(atr_pct, 4),
        "rr": round(rr, 2), "news": round(news_score, 3), "sector_intel": round(sector_intel, 3),
        "market_intel": round(market_intel, 3), "gold_intel": round(gold_intel, 3),
        "regime": regime, "regime_score": round(regime_score, 4), "breadth": round(breadth, 4),
        "risk_pressure": risk_pressure, "gap_pct": round(gap_pct, 4), "gap_aligned": gap_aligned,
        "gap_atr_normalized": abs(gap_pct) > GAP_ATR_NORMALIZE_THRESHOLD_PCT,
    }
    candidate["trade_mode"] = choose_trade_mode(candidate)
    if candidate["trade_mode"] == "NO_EDGE":
        candidate["trade_mode"] = "RAW_MOMENTUM"
    if candidate["trade_mode"] in ["MOMENTUM_LONG", "REVERSAL_LONG"]:
        candidate["side"] = "LONG"
    if candidate["trade_mode"] in ["MOMENTUM_SHORT", "REVERSAL_SHORT"]:
        candidate["side"] = "SHORT"
    candidate = trade_geometry_governor(candidate)
    if candidate.get("geometry_status") in [
        "BLOCKED_POOR_SPACE", "BLOCKED_BAD_ENTRY", "BLOCKED_LATE_ENTRY", "BLOCKED_NO_SPACE",
        "BLOCKED_TOO_EXTENDED", "BLOCKED_BAD_RR", "BLOCKED_ATR_NOISE", "BLOCKED_CONSTRAINT_PRESSURE",
    ]:
        return None
    SCAN_COVERAGE_UNIQUE_SYMBOLS.add(symbol)
    shadow_auth_levels = {str(t): auth >= t for t in SHADOW_AUTH_THRESHOLDS}
    candidate["shadow_auth_levels"] = shadow_auth_levels
    LIVE_SHADOW_TOTAL += 1
    for t_str, passed in shadow_auth_levels.items():
        if passed:
            LIVE_SHADOW_BAND_COUNTS[t_str] = LIVE_SHADOW_BAND_COUNTS.get(t_str, 0) + 1
    journal_event("AUTH_SHADOW_BAND", {
        "symbol": symbol, "auth": round(auth, 2), "side": candidate["side"], "sector": sector,
        "shadow_auth_levels": shadow_auth_levels, "gap_aligned": gap_aligned,
        "gap_atr_normalized": candidate["gap_atr_normalized"],
    })
    if PRICE_ACTION_ENGINE_ON:
        pattern = detect_price_action_pattern(daily, minute, price, intraday_pct, gap_pct, candidate["side"])
        candidate["price_action_pattern"] = pattern
        candidate["price_action_score"] = price_action_score(pattern)
    tel = compute_entry_telemetry(price, intraday_pct, minute_pct, atr_pct, daily)
    if tel:
        candidate["entry_telemetry"] = tel
        candidate.update({
            "missed_move_score": tel["missed_move_score"], "move_at_entry_atr": tel["move_at_entry_atr"],
            "vwap_distance_at_entry": tel["vwap_distance_at_entry"], "entry_velocity": tel["entry_velocity"],
            "entry_acceleration": tel["entry_acceleration"], "entry_class": tel["entry_class"],
        })
        candidate = early_entry_intelligence_update(candidate)
        if candidate.get("entry_class") in ["LATE", "VERY_LATE"]:
            if safe_float(candidate.get("predictive_entry_score")) < 65:
                return None
            if safe_float(candidate.get("missed_move_score")) >= 0.85:
                return None
            if abs(safe_float(candidate.get("vwap_distance_at_entry"))) >= 1.50:
                return None
        if safe_float(candidate.get("missed_move_score")) >= 0.85:
            return None
        if abs(safe_float(candidate.get("vwap_distance_at_entry"))) >= 1.50:
            return None
    return candidate

def scan_market():
    global SCAN_COVERAGE_TOTAL_EVENTS
    SCAN_COVERAGE_TOTAL_EVENTS += 1
    snapshots = get_snapshots(LIVE_UNIVERSE)
    candidates = []
    for sym in LIVE_UNIVERSE:
        snap = snapshots.get(sym)
        if not snap:
            continue
        c = build_candidate(sym, snap)
        if c:
            candidates.append(c)
    return candidates

def rank_candidates(candidates):
    return sorted(candidates, key=lambda x: (safe_float(x["auth"]), abs(safe_float(x["pct"]))), reverse=True)



def is_symbol_live(symbol, live_registry):
    return norm_symbol(symbol) in live_registry

def already_traded_today(symbol):
    return norm_symbol(symbol) in EXECUTED_SYMBOLS_TODAY

def mark_traded_today(symbol):
    sym = norm_symbol(symbol)
    EXECUTED_SYMBOLS_TODAY.add(sym)
    TRADE_COOLDOWNS[sym] = datetime.now()

def in_cooldown(symbol):
    sym = norm_symbol(symbol)
    if sym not in TRADE_COOLDOWNS:
        return False
    return datetime.now() - TRADE_COOLDOWNS[sym] < timedelta(minutes=SYMBOL_COOLDOWN_MINUTES)

def build_live_registry(positions, orders):
    registry = {}
    for p in positions or []:
        sym = norm_symbol(p.get("symbol"))
        qty = safe_float(p.get("qty"))
        if sym and qty != 0:
            registry[sym] = {"symbol": sym, "qty": qty, "source": "POSITION"}
    for o in clean_live_orders(orders):
        sym = norm_symbol(o.get("symbol"))
        if sym:
            registry[sym] = {"symbol": sym, "qty": safe_float(o.get("qty")), "source": "ORDER"}
    return registry

def remove_live_symbols(candidates, live_registry):
    clean, removed = [], []
    for c in candidates:
        (removed if is_symbol_live(c["symbol"], live_registry) else clean).append(c)
    return clean, removed

# =============================================================================
# GOVERNANCE / EXECUTION
# =============================================================================

def sector_pressure_map(candidates):
    pressure = {}
    for c in candidates:
        sector = c.get("sector", "OTHER")
        auth = safe_float(c.get("auth"))
        pct = abs(safe_float(c.get("pct")))
        if sector not in pressure:
            pressure[sector] = {"count": 0, "auth_total": 0, "move_total": 0, "pressure": 0}
        pressure[sector]["count"] += 1
        pressure[sector]["auth_total"] += auth
        pressure[sector]["move_total"] += pct
    for sector, data in pressure.items():
        count = max(data["count"], 1)
        avg_auth = data["auth_total"] / count
        avg_move = data["move_total"] / count
        data["pressure"] = round((avg_auth * 0.7) + (avg_move * 3.0), 2)
    return pressure

def correlation_entropy(candidate, selected, ranked):
    sector = candidate.get("sector")
    if not ranked:
        return 0
    same_sector_ranked = len([c for c in ranked if c.get("sector") == sector])
    same_sector_selected = len([c for c in selected if c.get("sector") == sector])
    ranked_ratio = same_sector_ranked / max(len(ranked), 1)
    selected_ratio = same_sector_selected / max(len(selected) + 1, 1)
    return round((ranked_ratio * 0.6) + (selected_ratio * 0.4), 4)

def passes_sector_diversification(candidate, selected, ranked, pressure_map_cache=None):
    if not selected:
        return True
    sector = candidate.get("sector")
    same_sector = len([c for c in selected if c.get("sector") == sector])
    if SECTOR_DIVERSIFICATION_ON and same_sector >= MAX_PER_SECTOR_INNOVATION:
        return False
    projected_total = len(selected) + 1
    projected_sector_pct = (same_sector + 1) / projected_total
    if projected_sector_pct > MAX_SECTOR_EXPOSURE_PCT:
        p_map = pressure_map_cache if pressure_map_cache is not None else sector_pressure_map(ranked)
        candidate_pressure = p_map.get(sector, {}).get("pressure", 0)
        all_pressure = [v.get("pressure", 0) for v in p_map.values()]
        global_avg = sum(all_pressure) / max(len(all_pressure), 1)
        if candidate_pressure <= global_avg * 1.25:
            return False
    if correlation_entropy(candidate, selected, ranked) > MAX_CORRELATED_SECTOR_PRESSURE:
        return False
    return True

def sector_count_live_and_new(symbol_sector, live_registry, selected):
    count = sum(1 for sym in live_registry if safe_sector_for(sym) == symbol_sector)
    count += sum(1 for c in selected if c.get("sector") == symbol_sector)
    return count

def gold_position_count(live_registry, selected=None):
    count = sum(1 for sym in live_registry if norm_symbol(sym) == "GLD" or safe_sector_for(sym) == "GOLD")
    count += sum(1 for c in (selected or []) if norm_symbol(c.get("symbol")) == "GLD" or c.get("sector") == "GOLD")
    return count

def get_executable_candidates(ranked, live_registry):
    executable = []
    open_slots = MAX_LIVE_TRADES - len(live_registry)
    if open_slots <= 0:
        return []
    pressure_cache = sector_pressure_map(ranked)
    for c in ranked:
        sym = c["symbol"]
        if is_symbol_live(sym, live_registry):
            continue
        if (norm_symbol(sym) == "GLD" or c.get("sector") == "GOLD") and gold_position_count(live_registry, executable) >= MAX_GOLD_POSITIONS:
            continue
        if already_traded_today(sym):
            continue
        if in_cooldown(sym):
            continue
        if safe_float(c["auth"]) < MIN_FIRE_AUTH:
            continue
        if KILL_SWITCH_ACTIVE:
            journal_event("ENTRY_PAUSED_KILL_SWITCH", {
                "symbol": sym,
                "consecutive_losses": SESSION_COUNTERS.get("consecutive_losses", 0),
                "threshold": PULL_PLUG_AFTER_CONSECUTIVE_LOSSES,
            })
            continue
        if A_PLUS_ONLY and c["grade"] != "A+":
            continue
        if sector_count_live_and_new(c["sector"], live_registry, executable) >= MAX_SECTOR_TRADES:
            continue
        if not passes_sector_diversification(c, executable, ranked, pressure_cache):
            continue
        executable.append(c)
        if len(executable) >= open_slots:
            break
        if len(executable) >= MAX_NEW_TRADES_PER_EXECUTE:
            break
    return executable

def m_math_quantity(candidate, account, positions):
    equity = safe_float(account.get("equity"), 0)
    price = safe_float(candidate.get("entry"), 0)
    if equity <= 0 or price <= 0:
        return MIN_QTY
    auth = safe_float(candidate.get("auth"), 0)
    atr_pct = safe_float(candidate.get("atr_pct"), 1)
    rr = safe_float(candidate.get("rr"), 1)
    pressure_factor = min(max(auth / 100, 0.1), 1.0)
    volatility_drag = min(max(atr_pct / 8, 0.05), 1.0)
    confidence_boost = min(CONFIDENCE_CAPITAL_BOOST, max(0.75, rr / MIN_REWARD_RISK))
    capital = equity * MAX_CAPITAL_PER_TRADE_PCT
    adjusted = capital * pressure_factor * confidence_boost
    adjusted *= (1 - volatility_drag * 0.35)
    total_position_value = sum(abs(safe_float(p.get("market_value"))) for p in positions or [])
    remaining_deployable = max(0, equity * MAX_TOTAL_DEPLOYED_PCT - total_position_value)
    adjusted = min(adjusted, remaining_deployable)
    return max(MIN_QTY, min(MAX_QTY, int(adjusted / price)))

def sync_entry_geometry(candidate):
    if not ENTRY_SYNC_ON:
        return dict(candidate)
    c = dict(candidate)
    live_price = get_latest_price(c.get("symbol"))
    if not live_price:
        return c
    old_entry = safe_float(c.get("entry"))
    new_entry = safe_float(live_price)
    if old_entry <= 0 or new_entry <= 0:
        return c
    atr = safe_float(c.get("atr"), new_entry * 0.004)
    side = c.get("side")
    c["entry"] = round(new_entry, 2)
    if side == "LONG":
        c["target"] = round(new_entry + (atr * ATR_TARGET_MULTIPLIER), 2)
        c["stop"] = round(new_entry - (atr * ATR_STOP_MULTIPLIER), 2)
    else:
        c["target"] = round(new_entry - (atr * ATR_TARGET_MULTIPLIER), 2)
        c["stop"] = round(new_entry + (atr * ATR_STOP_MULTIPLIER), 2)
    risk = abs(c["entry"] - c["stop"])
    reward = abs(c["target"] - c["entry"])
    c["rr"] = round((reward / risk) if risk > 0 else 0, 2)
    c["entry_sync_old"] = round(old_entry, 2)
    c["entry_sync_new"] = round(new_entry, 2)
    return c

def submit_bracket_order(candidate):
    candidate = sync_entry_geometry(candidate)
    account = get_account()
    positions = get_positions_retry()
    qty = m_math_quantity(candidate, account, positions)
    entry = safe_float(candidate["entry"])
    target = safe_float(candidate["target"])
    stop = safe_float(candidate["stop"])
    if candidate["side"] == "SHORT":
        target = min(target, round(entry * 0.985, 2))
        if target >= entry:
            target = round(entry - 0.10, 2)
        if stop <= entry:
            stop = round(entry + 0.10, 2)
    else:
        target = max(target, round(entry * 1.015, 2))
        if target <= entry:
            target = round(entry + 0.10, 2)
        if stop >= entry:
            stop = round(entry - 0.10, 2)
    payload = {
        "symbol": candidate["symbol"], "qty": str(qty),
        "side": alpaca_side(candidate["side"]),
        "type": "market", "time_in_force": "day", "order_class": "bracket",
        "take_profit": {"limit_price": str(round(target, 2))},
        "stop_loss": {"stop_price": str(round(stop, 2))},
    }
    order = api_post(f"{PAPER_URL}/v2/orders", payload)
    if candidate.get("entry_sync_old") is not None:
        journal_event("ENTRY_SYNC", {
            "symbol": candidate.get("symbol"), "old_entry": candidate.get("entry_sync_old"),
            "new_entry": candidate.get("entry_sync_new"), "target": target, "stop": stop,
        })
    return order

def governed_execute(executable, user_command=None):
    current_session = get_session_state()
    if current_session == "SESSION_CLOSED":
        return {"executed": False, "status": "SESSION_CLOSED_BLOCK"}
    if LATE_ENTRY_BLOCK_ON and datetime.now().time() >= LATE_ENTRY_BLOCK_TIME_UK:
        return {"executed": False, "status": "LATE_ENTRY_BLOCK"}
    if not executable:
        return {"executed": False, "status": "NO_EXECUTABLE"}
    if MANUAL_EXECUTE_ONLY and user_command != EXECUTE_COMMAND:
        return {"executed": False, "status": "ARMED_NOT_EXECUTED", "candidates": executable}
    results = []
    for c in executable:
        try:
            order = submit_bracket_order(c)
            start_trade_record(c, order)
            mark_traded_today(c["symbol"])
            result = {
                "executed": True, "symbol": c["symbol"], "side": c["side"],
                "entry": c.get("entry"), "target": c.get("target"), "stop": c.get("stop"),
                "auth": c.get("auth"), "grade": c.get("grade"), "sector": c.get("sector"),
                "trade_mode": c.get("trade_mode", "UNKNOWN"), "pct": c.get("pct"),
                "status": order.get("status"), "order_id": order.get("id"),
                "session": get_session_state(),
            }
            journal_event("EXECUTION", result)
            results.append(result)
        except Exception as e:
            result = {"executed": False, "symbol": c["symbol"], "side": c["side"], "error": str(e), "session": get_session_state()}
            journal_event("EXECUTION_ERROR", result)
            results.append(result)
            SESSION_COUNTERS["execution_errors"] += 1
    return {"executed": True, "results": results}

# =============================================================================
# EXIT GOVERNOR
# =============================================================================

def cancel_order(order_id):
    return api_delete(f"{PAPER_URL}/v2/orders/{order_id}")

def close_position(symbol, reason="MANUAL"):
    sym = norm_symbol(symbol)
    try:
        positions = get_positions()
    except Exception as e:
        return {"error": str(e)}
    pos = next((p for p in positions if norm_symbol(p.get("symbol")) == sym), None)
    if not pos:
        return {"error": "NO_POSITION"}
    side = "sell" if safe_float(pos.get("qty")) > 0 else "buy"
    qty = abs(int(safe_float(pos.get("qty"))))
    order = api_post(f"{PAPER_URL}/v2/orders", {
        "symbol": sym, "qty": qty, "side": side, "type": "market", "time_in_force": "day",
    })
    pnl_pct = position_profit_pct(pos)
    record_final_exit(sym, reason, pnl_pct)
    journal_event("POSITION_CLOSED", {"symbol": sym, "reason": reason, "pnl_pct": pnl_pct})
    return order

def position_profit_pct(position):
    pnl = safe_float(position.get("unrealized_plpc", position.get("unrealized_plpc"))) * 100
    if pnl == 0:
        entry = safe_float(position.get("avg_entry_price"))
        current = safe_float(position.get("current_price"))
        qty = safe_float(position.get("qty"))
        if entry > 0:
            if qty >= 0:
                pnl = (current - entry) / entry * 100
            else:
                pnl = (entry - current) / entry * 100
    return round(pnl, 3)

def profit_preservation_check(symbol, pnl_pct):
    sym = norm_symbol(symbol)
    mem = POSITION_MEMORY.get(sym, {})
    peak = safe_float(mem.get("peak_profit_pct", pnl_pct))
    if peak <= 0:
        return None
    giveback = peak - pnl_pct
    if peak >= HARVEST_ARM_PCT and giveback >= peak * HARVEST_GIVEBACK_RATIO:
        return "HARVEST_TRAIL"
    if peak >= BREAKEVEN_ARM_PCT and pnl_pct <= BREAKEVEN_FLOOR_PCT:
        return "BREAKEVEN_LOCK"
    if peak >= PROFIT_TRAIL_ARM_PCT and giveback >= PROFIT_FIXED_GIVEBACK_PCT:
        return "PROFIT_TRAIL"
    return None

def auto_exit_governor(positions=None):
    actions = []
    try:
        positions = positions if positions is not None else get_positions()
    except Exception:
        return actions
    for pos in positions:
        sym = norm_symbol(pos.get("symbol"))
        pnl = position_profit_pct(pos)
        update_trade_peak(sym, pnl)
        check_first_response(sym, pnl)
        entry_accuracy_check(sym, pnl)
        update_post_entry_highs_lows(sym, safe_float(pos.get("current_price")))
        if pnl <= DOWNSIDE_AUTO_PULL_PCT:
            close_position(sym, "DOWNSIDE_AUTO_PULL")
            actions.append(f"{sym}:DOWNSIDE_PULL")
            continue
        preserve = profit_preservation_check(sym, pnl)
        if preserve and PROFIT_GOVERNOR_ON:
            mem = POSITION_MEMORY.get(sym, {})
            if PARTIAL_TP_ON and not mem.get("partial_taken") and pnl >= PARTIAL_TP_PCT:
                qty = abs(int(safe_float(pos.get("qty"))))
                partial_qty = max(1, int(qty * PARTIAL_TP_RATIO))
                side = "sell" if safe_float(pos.get("qty")) > 0 else "buy"
                try:
                    api_post(f"{PAPER_URL}/v2/orders", {
                        "symbol": sym, "qty": partial_qty, "side": side,
                        "type": "market", "time_in_force": "day",
                    })
                    mem["partial_taken"] = True
                    mem["partials"] = mem.get("partials", 0) + 1
                    record_partial(sym, pnl, partial_qty)
                    actions.append(f"{sym}:PARTIAL_TP")
                except Exception as e:
                    journal_event("PARTIAL_TP_ERROR", {"symbol": sym, "error": str(e)})
            elif preserve in ("HARVEST_TRAIL", "PROFIT_TRAIL", "BREAKEVEN_LOCK"):
                close_position(sym, preserve)
                actions.append(f"{sym}:{preserve}")
        mem = POSITION_MEMORY.get(sym, {})
        entry_dt = mem.get("entry_time")
        if entry_dt and isinstance(entry_dt, datetime):
            hold_min = (datetime.now() - entry_dt).seconds / 60.0
            if hold_min >= TIME_DECAY_MINUTES and pnl < TIME_DECAY_MIN_PROFIT_PCT:
                close_position(sym, "TIME_DECAY")
                actions.append(f"{sym}:TIME_DECAY")
    return actions

def end_of_day_flat_check():
    if not END_OF_DAY_LIQUIDATION_ON:
        return []
    if datetime.now().time() < FORCE_FLAT_TIME_UK:
        return []
    actions = []
    try:
        positions = get_positions()
    except Exception:
        return actions
    for pos in positions:
        sym = norm_symbol(pos.get("symbol"))
        pnl = position_profit_pct(pos)
        if EOD_HOLD_GOVERNOR_ON and pnl >= EOD_MIN_HOLD_PROFIT_PCT:
            mem = POSITION_MEMORY.get(sym, {})
            peak = safe_float(mem.get("peak_profit_pct", pnl))
            giveback = peak - pnl
            if giveback <= EOD_MAX_GIVEBACK_FROM_PEAK and pnl >= EOD_MIN_CONTINUATION_SCORE:
                continue
        if FORCE_FLAT_BEFORE_CLOSE or pnl < EOD_MIN_HOLD_PROFIT_PCT:
            close_position(sym, "END_OF_DAY_FLAT")
            actions.append(sym)
    return actions

def emergency_flat_all(reason="EMERGENCY_FLAT"):
    results = []
    try:
        positions = get_positions()
    except Exception as e:
        return [str(e)]
    for pos in positions:
        sym = norm_symbol(pos.get("symbol"))
        try:
            close_position(sym, reason)
            results.append(sym)
        except Exception as e:
            results.append(f"{sym}:ERROR:{e}")
    journal_event("EMERGENCY_FLAT", {"reason": reason, "symbols": results})
    return results

def emergency_cancel_all():
    cancelled = []
    try:
        orders = get_orders()
    except Exception as e:
        return [str(e)]
    for o in orders:
        status = str(o.get("status", "")).lower()
        if status not in CLOSED_ORDER_STATES:
            try:
                cancel_order(o.get("id"))
                cancelled.append(o.get("id"))
            except Exception:
                pass
    journal_event("EMERGENCY_CANCEL_ALL", {"cancelled": len(cancelled)})
    return cancelled

def auto_exit_manager_loop():
    global AUTO_MANAGER_RUNNING, DAILY_PEAK_PNL
    while AUTO_MANAGER_RUNNING:
        try:
            SESSION_COUNTERS["exit_manager_cycles"] += 1
            if SCAN_CAN_MANAGE_EXITS:
                scan_market()
            auto_exit_governor()
            end_of_day_flat_check()
            post_exit_target_check()
            for sym in list(POST_EXIT_TRACKER.keys()):
                finalize_exit_validator(sym)
            try:
                acct = get_account()
                day_pnl = safe_float(acct.get("equity", 0)) - safe_float(acct.get("last_equity", acct.get("equity", 0)))
                DAILY_PEAK_PNL = max(DAILY_PEAK_PNL, day_pnl)
                if DAILY_GREEN_LOCK_ON and DAILY_PEAK_PNL >= DAILY_LOCK_TRIGGER_DOLLARS:
                    giveback = DAILY_PEAK_PNL - day_pnl
                    if giveback >= DAILY_PEAK_PNL * DAILY_GIVEBACK_RATIO:
                        emergency_flat_all("DAILY_GREEN_LOCK")
            except Exception:
                pass
            save_session_score()
        except Exception as e:
            journal_event("EXIT_MANAGER_ERROR", str(e))
        threading.Event().wait(EXIT_MANAGER_SECONDS)

def start_auto_manager():
    global AUTO_MANAGER_RUNNING
    if AUTO_MANAGER_RUNNING:
        return "AUTO MANAGER ALREADY RUNNING"
    AUTO_MANAGER_RUNNING = True
    threading.Thread(target=auto_exit_manager_loop, daemon=True).start()
    journal_event("AUTO_MANAGER_START", {"seconds": EXIT_MANAGER_SECONDS})
    return "AUTO MANAGER STARTED"

def stop_auto_manager():
    global AUTO_MANAGER_RUNNING
    AUTO_MANAGER_RUNNING = False
    journal_event("AUTO_MANAGER_STOP", {})
    return "AUTO MANAGER STOPPED"

def position_health_display():
    try:
        positions = get_positions()
    except Exception as e:
        return f"POSITION HEALTH ERROR: {e}"
    if not positions:
        return "POSITION HEALTH\n===============\n\nNO OPEN POSITIONS"
    lines = ["POSITION HEALTH", "===============", ""]
    for pos in positions:
        sym = norm_symbol(pos.get("symbol"))
        pnl = position_profit_pct(pos)
        mem = POSITION_MEMORY.get(sym, {})
        peak = safe_float(mem.get("peak_profit_pct", pnl))
        state = TRADE_STATE.get(sym, {})
        lines.append(
            f"{sym} PNL={pnl:.2f}% PEAK={peak:.2f}% SECTOR={sector_for(sym)} "
            f"MODE={state.get('trade_mode', 'N/A')} RESP={state.get('response_class', 'N/A')}"
        )
    return "\n".join(lines)

# =============================================================================
# LEARNING / REPORTS / RECONCILIATION
# =============================================================================

def build_edge_vault():
    rows = load_journal_rows()
    vault = load_json_file(EDGE_VAULT_FILE, {"edges": {}, "updated": None})
    for row in rows:
        if str(row.get("event", "")).upper() != "FINAL_EXIT":
            continue
        p = row.get("payload", {})
        sym = norm_symbol(p.get("symbol", ""))
        key = _ssm_key(sym, p.get("side"), p.get("price_action_pattern", "NONE"),
                       p.get("trade_mode"), p.get("grade"))
        e = vault["edges"].setdefault(key, {
            "key": key, "trades": 0, "wins": 0, "losses": 0, "net_pnl_pct": 0.0,
            "win_rate": 0.0, "avg_pnl_pct": 0.0,
        })
        pnl = safe_float(p.get("realized_pnl_pct", 0))
        e["trades"] += 1
        e["net_pnl_pct"] = round(e["net_pnl_pct"] + pnl, 4)
        if pnl > 0:
            e["wins"] += 1
        elif pnl < 0:
            e["losses"] += 1
        t = e["trades"]
        e["win_rate"] = round(e["wins"] / t * 100, 1) if t else 0
        e["avg_pnl_pct"] = round(e["net_pnl_pct"] / t, 4) if t else 0
    vault["updated"] = now_str()
    save_json_file(EDGE_VAULT_FILE, vault)
    return vault

def edge_vault_report():
    vault = build_edge_vault()
    edges = vault.get("edges", {})
    qualified = [e for e in edges.values() if e.get("trades", 0) >= EDGE_MIN_TRADES
                 and e.get("win_rate", 0) >= EDGE_MIN_WIN_RATE and e.get("avg_pnl_pct", 0) >= EDGE_MIN_AVG_PNL]
    lines = ["EDGE VAULT", "==========", f"UPDATED: {vault.get('updated')}", f"TOTAL EDGES: {len(edges)}", ""]
    if not qualified:
        lines.append("NO QUALIFIED EDGES YET")
        return "\n".join(lines)
    for e in sorted(qualified, key=lambda x: x.get("avg_pnl_pct", 0), reverse=True)[:15]:
        lines.append(f"{e['key']} T={e['trades']} WR={e['win_rate']}% AVG={e['avg_pnl_pct']}% NET={e['net_pnl_pct']}%")
    return "\n".join(lines)

def add_perf(metric, value):
    append_jsonl(EDGE_VAULT_FILE.replace(".json", "_perf.jsonl"), {"time": now_str(), "metric": metric, "value": value})

def dax_evidence_dashboard():
    lines = [
        "DAX EVIDENCE DASHBOARD", "=" * 24, "",
        session_score_display(),
        entry_optimizer_report(),
        exit_validator_report(),
        entry_class_performance_report(),
        same_symbol_memory_report(),
    ]
    return "\n".join(lines)

def dax_weekly_report():
    rows = load_journal_rows()
    week_ago = datetime.now() - timedelta(days=7)
    exits = []
    for row in rows:
        if str(row.get("event", "")).upper() != "FINAL_EXIT":
            continue
        try:
            t = datetime.strptime(row.get("time", ""), "%Y-%m-%d %H:%M:%S")
            if t >= week_ago:
                exits.append(row.get("payload", {}))
        except Exception:
            pass
    wins = sum(1 for e in exits if safe_float(e.get("realized_pnl_pct", 0)) > 0)
    losses = sum(1 for e in exits if safe_float(e.get("realized_pnl_pct", 0)) < 0)
    net = sum(safe_float(e.get("realized_pnl_pct", 0)) for e in exits)
    lines = [
        "DAX WEEKLY REPORT", "=================", "",
        f"TRADES: {len(exits)}  WINS: {wins}  LOSSES: {losses}",
        f"NET PNL: {net:.2f}%",
        f"WIN RATE: {(wins/len(exits)*100 if exits else 0):.1f}%", "",
        edge_vault_report(),
    ]
    return "\n".join(lines)

def learning_dashboard():
    lines = [
        "LEARNING DASHBOARD", "==================", "",
        early_intelligence_report(),
        early_entry_intelligence_report(),
        shadow_greats_report(),
        edge_vault_report(),
    ]
    return "\n".join(lines)

def monday_readiness_check():
    checks = []
    try:
        acct = get_account()
        checks.append(f"ACCOUNT OK — equity=${safe_float(acct.get('equity')):,.0f}")
    except Exception as e:
        checks.append(f"ACCOUNT FAIL: {e}")
    try:
        get_snapshots(["SPY", "QQQ"])
        checks.append("MARKET DATA OK")
    except Exception as e:
        checks.append(f"MARKET DATA FAIL: {e}")
    if MORNING_INTELLIGENCE_ON:
        try:
            fetch_morning_intelligence()
            checks.append("MORNING INTEL OK")
        except Exception as e:
            checks.append(f"MORNING INTEL FAIL: {e}")
    reload_trade_state_from_journal()
    checks.append(f"JOURNAL TRADES LOADED: {len(TRADE_STATE)}")
    checks.append(f"KILL SWITCH: {'ACTIVE' if KILL_SWITCH_ACTIVE else 'CLEAR'}")
    checks.append(f"SESSION STATE: {get_session_state()}")
    ok = all("FAIL" not in c for c in checks)
    header = "MONDAY READINESS: PASS" if ok else "MONDAY READINESS: REVIEW"
    return header + "\n" + "\n".join(checks)

def account_reconciliation():
    try:
        acct = get_account()
        positions = get_positions()
    except Exception as e:
        return f"RECONCILIATION ERROR: {e}"
    pos_recon = reconcile_missing_positions()
    lines = [
        "ACCOUNT RECONCILIATION", "======================", "",
        f"EQUITY: ${safe_float(acct.get('equity')):,.2f}",
        f"BUYING POWER: ${safe_float(acct.get('buying_power')):,.2f}",
        f"OPEN POSITIONS: {len(positions)}",
        f"DAY TRADES: {acct.get('daytrade_count', 'N/A')}", "",
        pos_recon,
    ]
    return "\n".join(lines)

# =============================================================================
# ADD-43–50: EARLY ENTRY WATCHLIST LAYER
# =============================================================================

def early_entry_log(candidate):
    row = {
        "time": now_str(), "symbol": norm_symbol(candidate.get("symbol")),
        "side": candidate.get("side"), "auth": candidate.get("auth"),
        "prebreakout": prebreakout_score(candidate),
        "entry_window": entry_window_label(candidate),
        "reasons": early_entry_reason_map(candidate),
    }
    append_jsonl(EARLY_ENTRY_FILE, row)
    return row

def prebreakout_score(candidate):
    return pre_breakout_score(candidate)

def confidence_growth_rate(symbol):
    sym = norm_symbol(symbol)
    memory = load_json_file(CANDIDATE_MEMORY_FILE, {})
    rec = memory.get(sym, {})
    hist = rec.get("authority_history", [])
    if len(hist) < 2:
        return 0.0
    return round((hist[-1] - hist[0]) / max(len(hist) - 1, 1), 3)

def time_to_entry_minutes(candidate):
    sym = norm_symbol(candidate.get("symbol"))
    memory = load_json_file(CANDIDATE_MEMORY_FILE, {})
    rec = memory.get(sym, {})
    if not rec.get("first_seen"):
        return 0.0
    return minutes_since(rec.get("first_seen"))

def entry_window_label(candidate):
    return candidate.get("entry_window") or classify_entry_window(candidate)

def early_entry_reason_map(candidate):
    reasons = []
    if safe_float(candidate.get("pre_breakout_score", 0)) >= EARLY_PREBREAKOUT_MIN:
        reasons.append("PRE_BREAKOUT")
    if safe_float(candidate.get("confidence_velocity", 0)) >= ENTRY_VELOCITY_MIN_SIGNAL:
        reasons.append("CONFIDENCE_VELOCITY")
    if safe_float(candidate.get("predictive_entry_score", 0)) >= MIN_CONFIDENCE_WATCH:
        reasons.append("PREDICTIVE_SCORE")
    soon = candidate.get("entry_soon_probability") or {}
    if safe_float(soon.get("5m", 0)) >= 60:
        reasons.append("SOON_5M")
    pat = str(candidate.get("price_action_pattern", "NONE"))
    if pat not in ("NONE", ""):
        reasons.append(f"PATTERN_{pat}")
    if not reasons:
        reasons.append("TRACKING")
    return reasons

def early_entry_enrich(candidate):
    sym = norm_symbol(candidate.get("symbol"))
    candidate["prebreakout_score"] = prebreakout_score(candidate)
    candidate["confidence_growth_rate"] = confidence_growth_rate(sym)
    candidate["time_to_entry_minutes"] = time_to_entry_minutes(candidate)
    candidate["entry_window_label"] = entry_window_label(candidate)
    candidate["early_entry_reasons"] = early_entry_reason_map(candidate)
    soon = candidate.get("entry_soon_probability") or entry_soon_probability(
        candidate.get("predictive_entry_score", candidate.get("auth", 0)),
        candidate.get("prebreakout_score", 0),
        candidate.get("confidence_velocity", 0),
    )
    candidate["entry_soon_probability"] = soon
    EARLY_ENTRY_MEMORY[sym] = {
        "last_update": now_str(), "auth": candidate.get("auth"),
        "predictive_entry_score": candidate.get("predictive_entry_score"),
        "entry_window": candidate.get("entry_window_label"),
        "reasons": candidate.get("early_entry_reasons"),
    }
    early_entry_log(candidate)
    return candidate

def build_early_watchlist(candidates):
    if not EARLY_ENTRY_ON:
        return []
    watchlist = []
    for c in candidates:
        auth = safe_float(c.get("auth", 0))
        pb = prebreakout_score(c)
        if auth < EARLY_MIN_AUTH_TRACK and pb < EARLY_PREBREAKOUT_MIN:
            continue
        c = early_entry_enrich(c)
        tte = safe_float(c.get("time_to_entry_minutes", 999))
        if tte <= EARLY_COUNTDOWN_MAX_MIN or pb >= EARLY_PREBREAKOUT_MIN:
            watchlist.append({
                "symbol": c.get("symbol"), "side": c.get("side"), "auth": c.get("auth"),
                "prebreakout_score": pb, "predictive_entry_score": c.get("predictive_entry_score"),
                "entry_window": c.get("entry_window_label"),
                "time_to_entry_minutes": tte,
                "reasons": c.get("early_entry_reasons"),
                "entry_soon_probability": c.get("entry_soon_probability"),
            })
    watchlist = sorted(watchlist, key=lambda x: safe_float(x.get("predictive_entry_score", 0)), reverse=True)[:25]
    save_json_file(EARLY_WATCHLIST_FILE, {"updated": now_str(), "watchlist": watchlist})
    return watchlist

def early_intelligence_report():
    wl = load_json_file(EARLY_WATCHLIST_FILE, {"watchlist": []})
    items = wl.get("watchlist", [])
    lines = [
        "EARLY INTELLIGENCE [ADD-43 to ADD-50]", "=" * 40,
        f"UPDATED: {wl.get('updated', 'N/A')}", f"WATCHLIST: {len(items)}", "",
    ]
    if not items:
        lines.append("NO EARLY WATCHLIST ITEMS")
        return "\n".join(lines)
    for w in items[:15]:
        lines.append(
            f"{w.get('symbol')} {w.get('side')} AUTH={w.get('auth')} PB={w.get('prebreakout_score')} "
            f"PRED={w.get('predictive_entry_score')} WIN={w.get('entry_window')} "
            f"TTE={w.get('time_to_entry_minutes')}m REASONS={w.get('reasons')}"
        )
    return "\n".join(lines)

# =============================================================================
# UI HELPERS
# =============================================================================

def journal_report():
    rows = load_journal_rows()
    lines = ["TRADE JOURNAL", "=" * 14, f"EVENTS: {len(rows)}", ""]
    for r in rows[-40:]:
        evt = r.get("event", "")
        pld = r.get("payload", {})
        if isinstance(pld, dict):
            sym = pld.get("symbol", "")
            lines.append(f"{r.get('time', '')} {evt} {sym}")
        else:
            lines.append(f"{r.get('time', '')} {evt} {pld}")
    return "\n".join(lines)

def auto_intel_report():
    result = m_math_auto_intelligence()
    if not result:
        return "AUTO INTEL OFF"
    lines = [
        "AUTO INTEL", "=" * 10, f"UPDATED: {result.get('updated', 'N/A')}", "",
        f"MARKET INTEL: {result.get('market_intel', 0):+.4f}",
        f"FT SENTIMENT: {result.get('ft_sentiment', 0):+.4f}", "", "SECTOR INTEL", "-" * 12,
    ]
    for sec, val in sorted(result.get("sector_intel", {}).items(), key=lambda x: abs(x[1]), reverse=True)[:12]:
        lines.append(f"{sec:18} {val:+.4f}")
    return "\n".join(lines)

def post_exit_check_report():
    tracker = post_exit_target_check()
    lines = ["POST EXIT TARGET CHECK", "=" * 24, f"TRACKED: {len(tracker)}", ""]
    if not tracker:
        lines.append("NO POST-EXIT TRACKS")
        return "\n".join(lines)
    for sym, rec in tracker.items():
        lines.append(
            f"{sym} side={rec.get('side')} target={rec.get('target')} "
            f"hit={rec.get('target_hit', False)} finalized={rec.get('finalized', False)}"
        )
    return "\n".join(lines)

def clean_orders_report():
    remaining = clean_live_orders()
    lines = ["ORDER CLEANUP", "=" * 13, f"REMAINING ACTIVE: {len(remaining)}", ""]
    for o in remaining[:20]:
        lines.append(f"{o.get('symbol')} {o.get('status')} {o.get('type', o.get('order_type', ''))}")
    return "\n".join(lines)

def pull_plug():
    global KILL_SWITCH_ACTIVE, KILL_SWITCH_ACTIVATED_AT
    KILL_SWITCH_ACTIVE = True
    KILL_SWITCH_ACTIVATED_AT = now_str()
    SESSION_COUNTERS["kill_switch_activations"] += 1
    journal_event("PULL_PLUG", {"activated_at": KILL_SWITCH_ACTIVATED_AT})
    flat = emergency_flat_all("PULL_PLUG")
    cancelled = emergency_cancel_all()
    save_session_score()
    return (
        f"PULL PLUG ACTIVATED\nKILL SWITCH: ACTIVE\n"
        f"FLATTENED: {len(flat)}\nCANCELLED ORDERS: {len(cancelled)}"
    )

# =============================================================================
# DAXScreen UI
# =============================================================================

class DAXScreen(ui.View):
    def __init__(self):
        super().__init__()
        self.name = VERSION
        self.background_color = "#0d1117"
        self._btn_specs = [
            ("SCAN", self.on_scan, "#238636"),
            ("EXECUTE", self.on_execute, "#da3633"),
            ("JOURNAL", self.on_journal, "#1f6feb"),
            ("EARLY INTEL", self.on_early_intel, "#8957e5"),
            ("EXIT MANAGER", self.on_exit_manager, "#3fb950"),
            ("AUTO INTEL", self.on_auto_intel, "#3fb950"),
            ("SESSION", self.on_session, "#1f6feb"),
            ("REPORT", self.on_report, "#388bfd"),
            ("POST EXIT CHECK", self.on_post_exit_check, "#388bfd"),
            ("POSITIONS", self.on_positions, "#1f6feb"),
            ("CANCEL ORDERS", self.on_cancel_orders, "#f85149"),
            ("CLOSE ALL", self.on_close_all, "#f85149"),
            ("COPY", self.on_copy, "#6e7681"),
            ("RESET", self.on_reset, "#9e6a03"),
            ("PULL PLUG", self.on_pull_plug, "#da3633"),
            ("LEARNING", self.on_learning, "#8957e5"),
            ("READY CHECK", self.on_ready_check, "#388bfd"),
        ]
        self._buttons = []
        self.output = ui.TextView()
        self.output.font = ("Menlo", 11)
        self.output.text_color = "#c9d1d9"
        self.output.background_color = "#161b22"
        self.output.editable = False
        self.scroll = ui.ScrollView()
        self.scroll.add_subview(self.output)
        self.add_subview(self.scroll)
        for title, action, color in self._btn_specs:
            b = ui.Button(title=title)
            b.background_color = color
            b.tint_color = "white"
            b.corner_radius = 8
            b.action = action
            self._buttons.append(b)
            self.add_subview(b)
        self.frame = (0, 0, 430, 900)

    def layout(self):
        w, h = self.width, self.height
        cols, bw, bh, gap = 4, 98, 36, 8
        for i, b in enumerate(self._buttons):
            row, col = divmod(i, cols)
            b.frame = (col * (bw + gap) + gap, row * (bh + gap) + gap, bw, bh)
        rows = (len(self._buttons) + cols - 1) // cols
        btn_h = rows * (bh + gap) + gap
        self.scroll.frame = (0, btn_h, w, max(h - btn_h, 0))
        self.output.frame = (0, 0, w, max(self.scroll.height, 200))

    def _show(self, text):
        self.output.text = str(text)
        try:
            clipboard.set(str(text))
        except Exception:
            pass

    def _run_bg(self, fn, *args):
        def worker():
            try:
                result = fn(*args)
                ui.delay(lambda: self._show(result), 0)
            except Exception as e:
                ui.delay(lambda: self._show(f"ERROR: {e}"), 0)
        threading.Thread(target=worker, daemon=True).start()

    def on_scan(self, sender):
        self._show("SCANNING...")
        self.run_scan(command=None)

    def on_execute(self, sender):
        self._show("EXECUTE REQUEST SENT...")
        self.run_scan(command="EXECUTE")

    def run_scan(self, command=None):
        def worker():
            try:
                account = get_account()
                positions = get_positions_retry()
                orders = get_orders()
                live_registry = build_live_registry(positions, orders)
                candidates = scan_market()
                raw_count = len(candidates)
                clean_candidates, removed = remove_live_symbols(candidates, live_registry)
                ranked = rank_candidates(clean_candidates)
                unique_scanned = len(SCAN_COVERAGE_UNIQUE_SYMBOLS)
                coverage_pct = (unique_scanned / len(LIVE_UNIVERSE)) * 100 if LIVE_UNIVERSE else 0
                coverage_status = "OK" if unique_scanned >= IDEAL_VALID_COVERAGE else ("THIN" if unique_scanned >= MIN_VALID_COVERAGE else "LOW")
                executable = get_executable_candidates(ranked, live_registry)
                shadow_great_matches = shadow_greats_candidates(ranked)
                execution = governed_execute(executable, user_command=command)
                kill_status = (
                    f"ACTIVE — {SESSION_COUNTERS.get('consecutive_losses', 0)} CONSEC "
                    f"(threshold: {PULL_PLUG_AFTER_CONSECUTIVE_LOSSES})"
                    if KILL_SWITCH_ACTIVE else
                    f"CLEAR (consecutive: {SESSION_COUNTERS.get('consecutive_losses', 0)})"
                )
                regime_data = get_market_regime()
                lines = [
                    VERSION, "=" * 60,
                    f"EQUITY: ${account.get('equity')}",
                    f"SESSION: {get_session_state()}",
                    f"REGIME: {regime_data.get('regime')} (score={regime_data.get('score')})",
                    f"AUTO MANAGER: {'ON' if AUTO_MANAGER_RUNNING else 'OFF'}",
                    f"KILL SWITCH: {kill_status}", "",
                    f"SHADOW SIZE: {len(SHADOW_UNIVERSE)}",
                    f"LIVE SCAN SIZE: {len(LIVE_UNIVERSE)}", "",
                    f"RAW CANDIDATES: {raw_count}",
                    f"CLEAN CANDIDATES: {len(clean_candidates)}",
                    f"RANKED: {len(ranked)}",
                    f"UNIQUE SYMBOLS SCANNED: {unique_scanned}/{len(LIVE_UNIVERSE)} ({coverage_pct:.0f}%) [{coverage_status}]",
                    f"TOTAL SCAN EVENTS: {SCAN_COVERAGE_TOTAL_EVENTS}", "",
                    "LIVE:", str(live_registry), "",
                    "EXECUTABLE:", str(executable), "",
                    "TOP 5:",
                ]
                for i, c in enumerate(ranked[:5], 1):
                    lines.append(
                        f"{i}. {c['symbol']} {c['side']} {c['grade']} AUTH {c['auth']} "
                        f"MODE {c.get('trade_mode', '?')} PAT {c.get('price_action_pattern', 'NONE')} "
                        f"EC {c.get('entry_class', '?')} MMS {c.get('missed_move_score', '?')} "
                        f"MATR {c.get('move_at_entry_atr', '?')} VWAP_D {c.get('vwap_distance_at_entry', '?')} "
                        f"VEL {c.get('entry_velocity', '?')} ACC {c.get('entry_acceleration', '?')} "
                        f"E {c['entry']} T {c['target']} SL {c['stop']} ATR {c.get('atr')} RR {c.get('rr')} SEC {c['sector']}"
                    )
                lines += ["", "SHADOW GREATS MATCHES:", str(shadow_great_matches), "", "EXECUTION:", str(execution), "", "JOURNAL:", TRADE_JOURNAL_FILE]
                ui.delay(lambda: self._show("\n".join(lines)), 0)
            except Exception:
                import traceback
                ui.delay(lambda: self._show("SCAN ERROR\n\n" + traceback.format_exc()), 0)
        threading.Thread(target=worker, daemon=True).start()

    def on_journal(self, sender):
        self._run_bg(dax_evidence_dashboard)

    def on_early_intel(self, sender):
        self._run_bg(early_intelligence_report)

    def on_exit_manager(self, sender):
        if AUTO_MANAGER_RUNNING:
            self._show(stop_auto_manager())
        else:
            self._show(start_auto_manager())

    def on_auto_intel(self, sender):
        def worker():
            try:
                data = m_math_auto_intelligence()
                ui.delay(lambda: self._show("AUTO M-MATH INTELLIGENCE CREATED\n\n" + f"FILE: {MORNING_INTEL_FILE}\n\n" + json.dumps(data, indent=2)), 0)
            except Exception as e:
                ui.delay(lambda: self._show("AUTO INTEL ERROR\n\n" + str(e)), 0)
        threading.Thread(target=worker, daemon=True).start()

    def on_session(self, sender):
        self._show(session_score_display())

    def on_report(self, sender):
        def worker():
            try:
                ui.delay(lambda: self._show(edge_vault_report() + "\n\n" + shadow_greats_report()), 0)
            except Exception as e:
                ui.delay(lambda: self._show("REPORT ERROR\n\n" + str(e)), 0)
        threading.Thread(target=worker, daemon=True).start()

    def on_post_exit_check(self, sender):
        self._run_bg(post_exit_target_check)

    def on_positions(self, sender):
        self._run_bg(position_health_display)

    def on_cancel_orders(self, sender):
        try:
            result = manual_cancel_all_orders()
            self._show("MANUAL CANCEL ORDERS\n====================\n\n" + json.dumps(result, indent=2))
        except Exception as e:
            self._show("CANCEL ORDERS ERROR\n\n" + str(e))

    def on_close_all(self, sender):
        try:
            result = manual_close_all_positions()
            self._show("MANUAL CLOSE ALL\n================\n\n" + json.dumps(result, indent=2))
        except Exception as e:
            self._show("CLOSE ALL ERROR\n\n" + str(e))

    def on_copy(self, sender):
        try:
            clipboard.set(self.output.text)
            self._show(self.output.text + "\n\n[COPIED TO CLIPBOARD]")
        except Exception as e:
            self._show(f"COPY FAILED: {e}")

    def on_reset(self, sender):
        self._show(reset_journal_and_session())

    def on_pull_plug(self, sender):
        try:
            result = emergency_pull_plug()
            journal_event("PULL_PLUG", result)
            self._show(json.dumps(result, indent=2))
        except Exception as e:
            self._show(str(e))

    def on_learning(self, sender):
        self._run_bg(learning_dashboard)

    def on_ready_check(self, sender):
        self._run_bg(monday_readiness_check)

# =============================================================================
# STARTUP
# =============================================================================

load_session_score()
load_overnight_stats()
reload_trade_state_from_journal()
if KILL_SWITCH_ACTIVE:
    reset_kill_switch_manual()
if AUTO_EXIT_MANAGER_ON:
    start_auto_manager()
app = DAXScreen()
app.present("fullscreen")


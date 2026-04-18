#!/usr/bin/env python3
"""
generate_stats.py
-----------------
Fetches Most Runs and Most Wickets directly from the public Google Sheet
and writes data/stats.json for the GitHub Pages dashboard.

Usage:
    python generate_stats.py
"""

import json
import math
import sys
import urllib.request
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    sys.exit("❌  pandas is required:  pip install pandas")

# ── Config ────────────────────────────────────────────────────────────────────

SHEET_ID   = "1-cFc4T7x4wiIiorQE8iVMrn_EsyWtxV-4Txc2wVrSiU"
BASE_URL   = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"

SHEETS = {
    "most_runs":    {"gid": "0"},
    "most_wickets": {"gid": "457280272"},
}

RUNS_COLS = {
    "Player":      "player",
    "Total Runs":  "total_runs",
    "Innings":     "innings",
    "Average":     "average",
}

WICKETS_COLS = {
    "Player":         "player",
    "Total Wickets":  "total_wickets",
    "Innings":        "innings",
}

OUTPUT_FILE = Path("data/stats.json")

# ── Helpers ───────────────────────────────────────────────────────────────────

def clean(val):
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    return val

def fetch_csv(gid: str) -> pd.DataFrame:
    url = f"{BASE_URL}&gid={gid}"
    print(f"   Fetching gid={gid} …")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read().decode("utf-8")
    return pd.read_csv(StringIO(content))

def parse_sheet(df: pd.DataFrame, col_map: dict) -> list[dict]:
    df.columns = [c.strip() for c in df.columns]
    missing = [c for c in col_map if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}. Found: {list(df.columns)}")
    df = df[list(col_map.keys())].rename(columns=col_map)
    df = df[df["player"].notna() & (df["player"].astype(str).str.strip() != "")]
    return [{k: clean(v) for k, v in row.items()} for _, row in df.iterrows()]

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("📡  Fetching data from Google Sheets …")

    runs_df    = fetch_csv(SHEETS["most_runs"]["gid"])
    wickets_df = fetch_csv(SHEETS["most_wickets"]["gid"])

    most_runs    = parse_sheet(runs_df,    RUNS_COLS)
    most_wickets = parse_sheet(wickets_df, WICKETS_COLS)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "most_runs":    most_runs,
        "most_wickets": most_wickets,
    }

    OUTPUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(f"✅  Written → {OUTPUT_FILE}")
    print(f"   most_runs:    {len(most_runs)} players")
    print(f"   most_wickets: {len(most_wickets)} players")

if __name__ == "__main__":
    main()

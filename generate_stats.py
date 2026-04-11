#!/usr/bin/env python3
"""
generate_stats.py
-----------------
Reads Cricket_Stats_-_Topi_group.xlsx and writes data/stats.json
for the GitHub Pages dashboard.

Usage:
    python generate_stats.py
    python generate_stats.py path/to/your_file.xlsx
"""

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    sys.exit("❌  pandas is required:  pip install pandas openpyxl")


# ── Config ────────────────────────────────────────────────────────────────────

EXCEL_FILE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("Cricket_Stats_-_Topi_group.xlsx")
OUTPUT_FILE = Path("data/stats.json")

RUNS_SHEET    = "Most Runs"
WICKETS_SHEET = "Most Wickets"

# Column name mappings  →  normalised key used in JSON
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def clean(val):
    """Convert NaN / inf to None so JSON serialises cleanly."""
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    return val


def read_sheet(xl: pd.ExcelFile, sheet: str, col_map: dict) -> list[dict]:
    df = xl.parse(sheet)

    # Rename columns to expected names (strip whitespace first)
    df.columns = [c.strip() for c in df.columns]
    missing = [c for c in col_map if c not in df.columns]
    if missing:
        raise ValueError(f"Sheet '{sheet}' is missing columns: {missing}\n  Found: {list(df.columns)}")

    df = df[list(col_map.keys())].rename(columns=col_map)

    # Drop rows with no player name or all-zero data rows (empty match templates)
    df = df[df["player"].notna() & (df["player"].astype(str).str.strip() != "")]

    records = []
    for _, row in df.iterrows():
        records.append({k: clean(v) for k, v in row.items()})
    return records


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not EXCEL_FILE.exists():
        sys.exit(f"❌  File not found: {EXCEL_FILE}")

    print(f"📂  Reading {EXCEL_FILE} …")
    xl = pd.ExcelFile(EXCEL_FILE, engine="openpyxl")

    most_runs    = read_sheet(xl, RUNS_SHEET,    RUNS_COLS)
    most_wickets = read_sheet(xl, WICKETS_SHEET, WICKETS_COLS)

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

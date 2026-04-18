// ── Cricket Analytics · app.js ──────────────────────────────────────────────
(async function () {
  "use strict";

  const SHEET_ID    = "1-cFc4T7x4wiIiorQE8iVMrn_EsyWtxV-4Txc2wVrSiU";
  const BASE_URL    = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
  const RUNS_GID    = "0";
  const WICKETS_GID = "457280272";

  function initials(name) {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }
  function fmt(val, decimals = 0) {
    if (val === null || val === undefined || val === "" || isNaN(val)) return "—";
    return Number(val).toFixed(decimals);
  }
  function rankClass(i) { return ["rank-1","rank-2","rank-3"][i] || ""; }
  function rankIcon(i)  { return ["🥇","🥈","🥉"][i] || `#${i+1}`; }

  function barHtml(value, max, orange = false) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return `<div class="bar-wrap">
      <div class="bar-track"><div class="bar-fill${orange?" orange":""}" style="width:${pct}%"></div></div>
      <span class="bar-num">${value}</span>
    </div>`;
  }

  // ── CSV parser ──────────────────────────────────────────────────────────
  function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map(line => {
      const cols = []; let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      cols.push(cur.trim());
      const row = {};
      headers.forEach((h, i) => row[h] = cols[i] ?? "");
      return row;
    });
  }

  function csvToRuns(rows) {
    return rows.filter(r => r["Player"] && r["Player"].trim()).map(r => ({
      player:     r["Player"].trim(),
      total_runs: Number(r["Runs"]) || 0,
      innings:    Number(r["Innings"])    || 0,
      average:    parseFloat(r["Average"]) || 0,
    }));
  }

  function csvToWickets(rows) {
    return rows.filter(r => r["Player"] && r["Player"].trim()).map(r => ({
      player:        r["Player"].trim(),
      total_wickets: Number(r["Wickets"]) || 0,
      innings:       Number(r["Innings"])        || 0,
    }));
  }

  // ── Renderers ───────────────────────────────────────────────────────────
  function renderRuns(data, container) {
    const maxRuns = Math.max(...data.map(r => r.total_runs));
    const rows = data.map((r, i) => `
      <tr style="animation-delay:${0.05+i*0.05}s">
        <td class="rank-cell ${rankClass(i)}">${rankIcon(i)}</td>
        <td><div class="name-cell"><div class="avatar">${initials(r.player)}</div>${r.player}</div></td>
        <td class="stat-cell">${fmt(r.total_runs)}</td>
        <td class="stat-cell">${fmt(r.innings)}</td>
        <td class="avg-cell">${fmt(r.average, 2)}</td>
      </tr>`).join("");
    container.innerHTML = `<table class="runs-table">
      <thead><tr><th>RNK</th><th>Player</th><th>Total Runs</th><th>Innings</th><th>Average</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  function renderWickets(data, container) {
    const maxWkts = Math.max(...data.map(r => r.total_wickets));
    const rows = data.map((r, i) => `
      <tr style="animation-delay:${0.05+i*0.05}s">
        <td class="rank-cell ${rankClass(i)}">${rankIcon(i)}</td>
        <td><div class="name-cell"><div class="avatar">${initials(r.player)}</div>${r.player}</div></td>
        <td class="stat-cell">${fmt(r.total_wickets)}</td>
        <td class="stat-cell">${fmt(r.innings)}</td>
      </tr>`).join("");
    container.innerHTML = `<table class="wickets-table">
      <thead><tr><th>RNK</th><th>Player</th><th>Total Wickets</th><th>Innings</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  function applyStats(stats) {
    renderRuns(stats.most_runs, runsWrap);
    renderWickets(stats.most_wickets, wicketsWrap);
    if (stats.generated_at) {
      const d = new Date(stats.generated_at);
      lastUpdated.textContent = "Updated: " + d.toLocaleString("en-PK", {
        day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"
      });
    }
  }

  // ── Fetch from Google Sheets ─────────────────────────────────────────────
  async function fetchFromSheets() {
    const bust = Date.now();
    const [rRes, wRes] = await Promise.all([
      fetch(`${BASE_URL}&gid=${RUNS_GID}&cachebust=${bust}`),
      fetch(`${BASE_URL}&gid=${WICKETS_GID}&cachebust=${bust}`),
    ]);
    if (!rRes.ok) throw new Error(`Runs fetch failed: HTTP ${rRes.status}`);
    if (!wRes.ok) throw new Error(`Wickets fetch failed: HTTP ${wRes.status}`);
    const [rText, wText] = await Promise.all([rRes.text(), wRes.text()]);
    return {
      most_runs:    csvToRuns(parseCSV(rText)),
      most_wickets: csvToWickets(parseCSV(wText)),
      generated_at: new Date().toISOString(),
    };
  }

  // ── Button helpers ────────────────────────────────────────────────────────
  function setLoading(on) {
    fetchBtn.disabled = on;
    fetchBtn.classList.toggle("loading", on);
    fetchBtn.innerHTML = on
      ? `<span class="btn-spinner"></span>Fetching…`
      : `<span class="btn-icon">↻</span>Fetch Latest Data`;
  }

  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.className = "toast"; }, 3000);
  }

  // ── DOM ───────────────────────────────────────────────────────────────────
  const runsWrap    = document.getElementById("runs-wrap");
  const wicketsWrap = document.getElementById("wickets-wrap");
  const lastUpdated = document.getElementById("last-updated");
  const fetchBtn    = document.getElementById("fetch-btn");
  const toast       = document.getElementById("toast");

  fetchBtn.addEventListener("click", async () => {
    setLoading(true);
    try {
      const stats = await fetchFromSheets();
      applyStats(stats);
      showToast("✓ Stats updated from Google Sheets");
    } catch (err) {
      console.error(err);
      showToast("⚠ Could not reach Google Sheets. Try again.", true);
    } finally {
      setLoading(false);
    }
  });

  // ── Initial load from stats.json ──────────────────────────────────────────
  try {
    const res = await fetch("data/stats.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    applyStats(await res.json());
  } catch (err) {
    const msg = `<div class="error">⚠ Could not load stats.json<br><small>${err.message}</small></div>`;
    runsWrap.innerHTML = msg;
    wicketsWrap.innerHTML = msg;
  }
})();

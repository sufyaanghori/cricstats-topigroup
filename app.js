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
      player:  r["Player"].trim(),
      runs:    Number(r["Runs"]) || 0,
      innings: Number(r["Innings"]) || 0,
      average: parseFloat(r["Average"]) || 0,
    }));
  }

  function csvToWickets(rows) {
    return rows.filter(r => r["Player"] && r["Player"].trim()).map(r => ({
      player:  r["Player"].trim(),
      wickets: Number(r["Wickets"]) || 0,
      innings: Number(r["Innings"]) || 0,
    }));
  }

  // ── Renderers ───────────────────────────────────────────────────────────
  function renderRuns(data, container) {
    const rows = data.map((r, i) => `
      <tr style="animation-delay:${0.05+i*0.05}s">
        <td class="rank-cell ${rankClass(i)}">${rankIcon(i)}</td>
        <td><div class="name-cell"><div class="avatar">${initials(r.player)}</div>${r.player}</div></td>
        <td class="stat-cell">${fmt(r.runs)}</td>
        <td class="stat-cell">${fmt(r.innings)}</td>
        <td class="stat-cell">${fmt(r.average, 2)}</td>
      </tr>`).join("");
    container.innerHTML = `<table class="runs-table">
      <thead><tr><th>RNK</th><th>Player</th><th>Runs</th><th>Innings</th><th>Average</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  function renderAverage(data, container) {
    const sorted = [...data]
      .filter(r => r.innings > 0)
      .sort((a, b) => b.average - a.average);
    const rows = sorted.map((r, i) => `
      <tr style="animation-delay:${0.05+i*0.05}s">
        <td class="rank-cell ${rankClass(i)}">${rankIcon(i)}</td>
        <td><div class="name-cell"><div class="avatar">${initials(r.player)}</div>${r.player}</div></td>
        <td class="stat-cell stat-highlight">${fmt(r.average, 2)}</td>
      </tr>`).join("");
    container.innerHTML = `<table class="avg-table">
      <thead><tr><th>RNK</th><th>Player</th><th>Average</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  function renderWickets(data, container) {
    const rows = data.map((r, i) => `
      <tr style="animation-delay:${0.05+i*0.05}s">
        <td class="rank-cell ${rankClass(i)}">${rankIcon(i)}</td>
        <td><div class="name-cell"><div class="avatar">${initials(r.player)}</div>${r.player}</div></td>
        <td class="stat-cell">${fmt(r.wickets)}</td>
        <td class="stat-cell">${fmt(r.innings)}</td>
      </tr>`).join("");
    container.innerHTML = `<table class="wickets-table">
      <thead><tr><th>RNK</th><th>Player</th><th>Wickets</th><th>Innings</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  function applyStats(stats) {
    renderRuns(stats.most_runs, runsWrap);
    renderAverage(stats.most_runs, averageWrap);
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

  // ── Tab switching ─────────────────────────────────────────────────────────
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  // ── DOM ───────────────────────────────────────────────────────────────────
  const runsWrap    = document.getElementById("runs-wrap");
  const averageWrap = document.getElementById("average-wrap");
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

  // ── Initial load ──────────────────────────────────────────────────────────
  try {
    const res = await fetch("data/stats.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    applyStats(await res.json());
  } catch (err) {
    const msg = `<div class="error">⚠ Could not load stats.json<br><small>${err.message}</small></div>`;
    runsWrap.innerHTML = msg;
    averageWrap.innerHTML = msg;
    wicketsWrap.innerHTML = msg;
  }
})();

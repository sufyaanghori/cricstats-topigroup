// ── Cricket Analytics · app.js ──────────────────────────────────────────────
// Fetches data from data/stats.json (generated from the Excel file)
// and renders the Most Runs and Most Wickets leaderboards.

(async function () {
  "use strict";

  // ── Helpers ────────────────────────────────────────────────────────────────

  function initials(name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function fmt(val, decimals = 0) {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return Number(val).toFixed(decimals);
  }

  function rankClass(i) {
    if (i === 0) return "rank-1";
    if (i === 1) return "rank-2";
    if (i === 2) return "rank-3";
    return "";
  }

  function rankIcon(i) {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `#${i + 1}`;
  }

  function barHtml(value, max, orange = false) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return `
      <div class="bar-wrap">
        <div class="bar-track">
          <div class="bar-fill${orange ? " orange" : ""}" style="width:${pct}%"></div>
        </div>
        <span class="bar-num">${value}</span>
      </div>`;
  }

  // ── Render: Most Runs ──────────────────────────────────────────────────────

  function renderRuns(data, container) {
    const maxRuns = Math.max(...data.map((r) => r.total_runs));

    const rows = data
      .map(
        (r, i) => `
      <tr style="animation-delay:${0.05 + i * 0.05}s">
        <td class="rank-cell ${rankClass(i)}">${rankIcon(i)}</td>
        <td>
          <div class="name-cell">
            <div class="avatar">${initials(r.player)}</div>
            ${r.player}
          </div>
        </td>
        <td class="bar-cell">${barHtml(r.total_runs, maxRuns)}</td>
        <td class="stat-cell hide-mobile">${fmt(r.innings)}</td>
        <td class="avg-cell hide-mobile">${fmt(r.average, 2)}</td>
      </tr>`
      )
      .join("");

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>RNK</th>
            <th>Player</th>
            <th>Total Runs</th>
            <th class="hide-mobile">Innings</th>
            <th class="hide-mobile">Average</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ── Render: Most Wickets ───────────────────────────────────────────────────

  function renderWickets(data, container) {
    const maxWkts = Math.max(...data.map((r) => r.total_wickets));

    const rows = data
      .map(
        (r, i) => `
      <tr style="animation-delay:${0.05 + i * 0.05}s">
        <td class="rank-cell ${rankClass(i)}">${rankIcon(i)}</td>
        <td>
          <div class="name-cell">
            <div class="avatar">${initials(r.player)}</div>
            ${r.player}
          </div>
        </td>
        <td class="bar-cell">${barHtml(r.total_wickets, maxWkts, true)}</td>
        <td class="stat-cell hide-mobile">${fmt(r.innings)}</td>
      </tr>`
      )
      .join("");

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>RNK</th>
            <th>Player</th>
            <th>Total Wickets</th>
            <th class="hide-mobile">Innings</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // ── Fetch & Bootstrap ──────────────────────────────────────────────────────

  const runsWrap = document.getElementById("runs-wrap");
  const wicketsWrap = document.getElementById("wickets-wrap");
  const lastUpdated = document.getElementById("last-updated");

  try {
    const res = await fetch("data/stats.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const stats = await res.json();

    renderRuns(stats.most_runs, runsWrap);
    renderWickets(stats.most_wickets, wicketsWrap);

    if (stats.generated_at) {
      const d = new Date(stats.generated_at);
      lastUpdated.textContent =
        "Updated: " +
        d.toLocaleString("en-PK", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
    }
  } catch (err) {
    const msg = `<div class="error">⚠ Could not load stats.json<br><small>${err.message}</small></div>`;
    runsWrap.innerHTML = msg;
    wicketsWrap.innerHTML = msg;
    console.error(err);
  }
})();

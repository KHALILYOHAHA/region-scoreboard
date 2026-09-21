const REGIONS = ["HKI", "KC", "KE", "KWS", "T&Y", "TNS", "WTT"];
const STORAGE_KEY = "region-scoreboard-v1";
const DEMO_SCORES = { HKI: 1280, KC: 1150, KE: 1320, KWS: 980, "T&Y": 1410, TNS: 1095, WTT: 1240 };

const params = new URLSearchParams(location.search);
const editMode = params.get("edit") === "1";
const cfg = window.SCOREBOARD_CONFIG || {};
const sheetId = String(params.get("sheet") || cfg.sheetId || "").trim();
const sheetName = String(params.get("tab") || cfg.sheetName || "Scores").trim();
const pollMs = Number(cfg.pollMs) > 1000 ? Number(cfg.pollMs) : 5000;
const useSheets = Boolean(sheetId) && !editMode;

const chartBoard = document.getElementById("chartBoard");
const cardBoard = document.getElementById("cardBoard");
const updatedAt = document.getElementById("updatedAt");
const livePill = document.getElementById("livePill");
const openEdit = document.getElementById("openEdit");
const editHint = document.getElementById("editHint");
const editDialog = document.getElementById("editDialog");
const editFields = document.getElementById("editFields");
const editForm = document.getElementById("editForm");
const resetDemo = document.getElementById("resetDemo");

let scores = loadScores();
let liveTimer = null;
let pollTimer = null;
const barEls = {};
const cardEls = {};

function loadScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEMO_SCORES };
    const parsed = JSON.parse(raw);
    const next = { ...DEMO_SCORES };
    for (const id of REGIONS) {
      if (typeof parsed[id] === "number") next[id] = parsed[id];
    }
    return next;
  } catch {
    return { ...DEMO_SCORES };
  }
}

function saveScores() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

function formatTime(d = new Date()) {
  return d.toLocaleString("zh-HK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function maxScore() {
  return Math.max(...REGIONS.map((id) => scores[id]), 1) * 1.12;
}

function barHeightPct(id) {
  return Math.max(2, (scores[id] / maxScore()) * 100);
}

function renderChart() {
  chartBoard.innerHTML = "";
  for (const id of REGIONS) {
    const col = document.createElement("div");
    col.className = "bar-col";
    col.dataset.region = id;
    col.innerHTML = `
      <div class="delta" data-delta></div>
      <div class="score" data-score>${scores[id].toLocaleString("zh-HK")}</div>
      <div class="bar-track">
        <div class="bar" data-bar style="height:${barHeightPct(id)}%"></div>
      </div>
      <div class="label">${id}</div>
    `;
    chartBoard.appendChild(col);
    barEls[id] = {
      col,
      score: col.querySelector("[data-score]"),
      bar: col.querySelector("[data-bar]"),
      delta: col.querySelector("[data-delta]"),
    };
  }
}

function renderCards() {
  cardBoard.innerHTML = "";
  for (const id of REGIONS) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.region = id;
    card.innerHTML = `
      <div class="region">
        <span class="region-name">${id}</span>
      </div>
      <div class="score" data-score>${scores[id].toLocaleString("zh-HK")}</div>
      <div class="delta" data-delta></div>
    `;
    cardBoard.appendChild(card);
    cardEls[id] = {
      card,
      score: card.querySelector("[data-score]"),
      delta: card.querySelector("[data-delta]"),
    };
  }
}

function refreshAllHeights() {
  for (const id of REGIONS) {
    const el = barEls[id];
    if (el) el.bar.style.height = `${barHeightPct(id)}%`;
  }
}

function stamp(extra = "") {
  const base = `更新於 ${formatTime()}`;
  updatedAt.textContent = extra ? `${base} · ${extra}` : base;
}

function flashDelta(target, delta) {
  if (!target || delta === 0) return;
  target.textContent = delta > 0 ? `+${delta}` : `${delta}`;
  target.classList.toggle("down", delta < 0);
  target.classList.add("show");
  setTimeout(() => target.classList.remove("show"), 1200);
}

function setScore(id, value, delta = 0) {
  scores[id] = Math.max(0, Math.round(value));
  const text = scores[id].toLocaleString("zh-HK");

  const bar = barEls[id];
  if (bar) {
    bar.score.textContent = text;
    bar.score.classList.add("flash");
    bar.col.classList.add("bump");
    setTimeout(() => {
      bar.score.classList.remove("flash");
      bar.col.classList.remove("bump");
    }, 350);
    flashDelta(bar.delta, delta);
  }

  const card = cardEls[id];
  if (card) {
    card.score.textContent = text;
    card.score.classList.add("flash");
    card.card.classList.add("bump");
    setTimeout(() => {
      card.score.classList.remove("flash");
      card.card.classList.remove("bump");
    }, 350);
    flashDelta(card.delta, delta);
  }

  refreshAllHeights();
}

function applyScores(next, sourceLabel) {
  for (const id of REGIONS) {
    if (typeof next[id] !== "number" || !Number.isFinite(next[id])) continue;
    const value = Math.max(0, Math.round(next[id]));
    const delta = value - scores[id];
    if (delta !== 0) setScore(id, value, delta);
    else {
      scores[id] = value;
      if (barEls[id]) barEls[id].score.textContent = value.toLocaleString("zh-HK");
      if (cardEls[id]) cardEls[id].score.textContent = value.toLocaleString("zh-HK");
    }
  }
  refreshAllHeights();
  stamp(sourceLabel || "");
}

function normalizeRegion(raw) {
  if (raw == null) return "";
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  // Exact match first (handles T&Y)
  for (const id of REGIONS) {
    if (s === id.toUpperCase() || s === id.toUpperCase().replace(/&/g, "")) return id;
  }
  // Allow "地區 HKI" / "Region KC"
  for (const id of REGIONS) {
    const key = id.toUpperCase();
    if (s.includes(key) || s.includes(key.replace(/&/g, ""))) return id;
  }
  return "";
}

function parseSheetRows(rows) {
  const next = {};
  for (const row of rows) {
    const keys = Object.keys(row);
    let regionVal = null;
    let scoreVal = null;
    for (const k of keys) {
      const lk = k.trim().toLowerCase();
      if (
        ["region", "地區", "區", "id", "區域"].includes(lk) ||
        lk.includes("region") ||
        lk.includes("地區")
      ) {
        regionVal = row[k];
      }
      if (
        ["score", "分數", "分", "points", "pt"].includes(lk) ||
        lk.includes("score") ||
        lk.includes("分數")
      ) {
        scoreVal = row[k];
      }
    }
    if (regionVal == null && keys[0]) regionVal = row[keys[0]];
    if (scoreVal == null && keys[1]) scoreVal = row[keys[1]];
    const id = normalizeRegion(regionVal);
    const n = Number(String(scoreVal).replace(/,/g, ""));
    if (id && Number.isFinite(n)) next[id] = n;
  }
  return next;
}

function bust(url) {
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}_ts=${Date.now()}`;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const split = (line) => {
    const out = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (ch === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
}

async function fetchFromCsv() {
  // Direct Google CSV — usually fresher than opensheet proxy cache
  const url = bust(
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq` +
      `?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
  );
  const res = await fetch(url, { cache: "no-store", credentials: "omit" });
  if (!res.ok) throw new Error(`csv ${res.status}`);
  const text = await res.text();
  if (/<!DOCTYPE html>/i.test(text) || /Sign in/i.test(text.slice(0, 200))) {
    throw new Error("csv: not public");
  }
  return parseSheetRows(parseCsv(text));
}

async function fetchFromGviz() {
  const url = bust(
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq` +
      `?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
  );
  const res = await fetch(url, { cache: "no-store", credentials: "omit" });
  if (!res.ok) throw new Error(`gviz ${res.status}`);
  const text = await res.text();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("gviz: bad payload");
  const json = JSON.parse(text.slice(start, end + 1));
  const table = json.table;
  if (!table || !table.rows) throw new Error("gviz: no rows");
  const cols = (table.cols || []).map((c) => (c.label || c.id || "").trim());
  const rows = table.rows.map((r) => {
    const obj = {};
    (r.c || []).forEach((cell, i) => {
      const key = cols[i] || `col${i}`;
      obj[key] = cell ? (cell.v ?? cell.f ?? "") : "";
    });
    return obj;
  });
  return parseSheetRows(rows);
}

async function fetchFromOpensheet() {
  const url = bust(
    `https://opensheet.elk.sh/${encodeURIComponent(sheetId)}/${encodeURIComponent(sheetName)}`
  );
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`opensheet ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("opensheet: not an array");
  return parseSheetRows(data);
}

async function pullSheets() {
  try {
    let next;
    const errors = [];
    for (const fn of [fetchFromCsv, fetchFromGviz, fetchFromOpensheet]) {
      try {
        next = await fn();
        break;
      } catch (e) {
        errors.push(e);
      }
    }
    if (!next) throw errors[errors.length - 1] || new Error("all fetch failed");
    const have = REGIONS.filter((id) => typeof next[id] === "number");
    if (have.length === 0) {
      livePill.classList.add("paused");
      livePill.innerHTML = '<span class="dot"></span>Sheet 無資料';
      stamp("Sheets 讀唔到地區");
      return;
    }
    applyScores(next, "Google Sheets");
    livePill.classList.remove("paused");
    livePill.innerHTML = '<span class="dot"></span>Sheets';
  } catch (err) {
    console.error(err);
    livePill.classList.add("paused");
    livePill.innerHTML = '<span class="dot"></span>Sheet 失敗';
    stamp("Sheets 連接失敗");
  }
}

function startSheetsPoll() {
  stopLive();
  stopSheetsPoll();
  livePill.classList.remove("paused");
  livePill.innerHTML = '<span class="dot"></span>Sheets';
  pullSheets();
  pollTimer = setInterval(pullSheets, pollMs);
}

function stopSheetsPoll() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function tickLive() {
  const id = REGIONS[Math.floor(Math.random() * REGIONS.length)];
  const delta = Math.floor(Math.random() * 8) + 1;
  setScore(id, scores[id] + delta, delta);
  stamp("示範");
}

function startLive() {
  stopLive();
  stopSheetsPoll();
  livePill.classList.remove("paused");
  livePill.innerHTML = '<span class="dot"></span>實時';
  liveTimer = setInterval(tickLive, 2800);
}

function stopLive() {
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = null;
}

function setupEdit() {
  if (!editMode) return;
  openEdit.hidden = false;
  editHint.hidden = false;
  livePill.classList.add("paused");
  livePill.innerHTML = '<span class="dot"></span>編輯中（暫停自動加分）';
  stopLive();
  stopSheetsPoll();

  editFields.innerHTML = REGIONS.map(
    (id) => `
    <div class="edit-row">
      <label for="score-${id}">${id}</label>
      <input id="score-${id}" name="${id}" type="number" min="0" step="1" value="${scores[id]}" />
    </div>`
  ).join("");

  openEdit.addEventListener("click", () => {
    for (const id of REGIONS) {
      const input = document.getElementById(`score-${id}`);
      if (input) input.value = String(scores[id]);
    }
    editDialog.showModal();
  });

  resetDemo.addEventListener("click", () => {
    scores = { ...DEMO_SCORES };
    saveScores();
    for (const id of REGIONS) setScore(id, scores[id], 0);
    for (const id of REGIONS) {
      const input = document.getElementById(`score-${id}`);
      if (input) input.value = String(scores[id]);
    }
    stamp("本機");
  });

  editForm.addEventListener("submit", (e) => {
    const submitter = e.submitter;
    if (submitter && submitter.value === "cancel") return;
    e.preventDefault();
    for (const id of REGIONS) {
      const input = document.getElementById(`score-${id}`);
      const n = Number(input.value);
      if (Number.isFinite(n)) setScore(id, n, 0);
    }
    saveScores();
    stamp("本機");
    editDialog.close();
  });
}

renderChart();
renderCards();
stamp(useSheets ? "等待 Sheets…" : "示範");
setupEdit();

if (editMode) {
  // edit mode pauses auto updates
} else if (useSheets) {
  startSheetsPoll();
} else {
  startLive();
}

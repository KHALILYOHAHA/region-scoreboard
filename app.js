const REGIONS = ["A", "B", "C", "D", "E", "F", "G"];
const STORAGE_KEY = "region-scoreboard-v1";
const DEMO_SCORES = { A: 1280, B: 1150, C: 1320, D: 980, E: 1410, F: 1095, G: 1240 };

const params = new URLSearchParams(location.search);
const editMode = params.get("edit") === "1";

const board = document.getElementById("board");
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

function renderBoard() {
  board.innerHTML = "";
  for (const id of REGIONS) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.region = id;
    card.innerHTML = `
      <div class="region">
        <span class="region-name">地區 ${id}</span>
        <span class="region-id">Region ${id}</span>
      </div>
      <div class="score" data-score>${scores[id].toLocaleString("zh-HK")}</div>
      <div class="delta" data-delta></div>
    `;
    board.appendChild(card);
    cardEls[id] = {
      card,
      score: card.querySelector("[data-score]"),
      delta: card.querySelector("[data-delta]"),
    };
  }
  stamp();
}

function stamp() {
  updatedAt.textContent = `更新於 ${formatTime()}`;
}

function setScore(id, value, delta = 0) {
  scores[id] = Math.max(0, Math.round(value));
  const el = cardEls[id];
  if (!el) return;
  el.score.textContent = scores[id].toLocaleString("zh-HK");
  el.score.classList.add("flash");
  el.card.classList.add("bump");
  setTimeout(() => {
    el.score.classList.remove("flash");
    el.card.classList.remove("bump");
  }, 350);

  if (delta !== 0) {
    el.delta.textContent = delta > 0 ? `+${delta}` : `${delta}`;
    el.delta.classList.toggle("down", delta < 0);
    el.delta.classList.add("show");
    setTimeout(() => el.delta.classList.remove("show"), 1200);
  }
  stamp();
}

function tickLive() {
  // Fixed order A→G; never sort by score. Random small bump on one region.
  const id = REGIONS[Math.floor(Math.random() * REGIONS.length)];
  const delta = Math.floor(Math.random() * 8) + 1;
  setScore(id, scores[id] + delta, delta);
}

function startLive() {
  stopLive();
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

  editFields.innerHTML = REGIONS.map(
    (id) => `
    <div class="edit-row">
      <label for="score-${id}">地區 ${id}</label>
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
    editDialog.close();
  });
}

renderBoard();
setupEdit();
if (!editMode) startLive();

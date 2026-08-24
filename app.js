// Bridge Convention Card Maker — online version.
//
// No file on disk carries the data — the exported PDF itself does (see
// pdf-export.js / pdf-import.js). This file owns: the card data schema, the
// form rendering (ported near-unchanged from the local app's editor.js,
// since it's already fully data-driven), the live card preview (ported from
// the local app's render.js), and the landing screen that chooses between
// starting blank and uploading an existing PDF.

const LIST_FIELD_DEFS = {
  notrumpRanges: [
    { key: "seat", type: "text", placeholder: "Seat (e.g. 1st / 2nd seat)" },
    { key: "range", type: "text", placeholder: "Range" }
  ],
  openingBids: [
    { key: "bid", type: "text", placeholder: "Bid (e.g. 1♣)" },
    { key: "meaning", type: "text", placeholder: "Meaning" },
    { key: "alert", type: "checkbox", label: "Alert" }
  ],
  notrumpConventions: [
    { key: "label", type: "text", placeholder: "Name" },
    { key: "checked", type: "checkbox", label: "On" },
    { key: "note", type: "text", placeholder: "Note (optional)" }
  ],
  conventions: [
    { key: "label", type: "text", placeholder: "Name" },
    { key: "checked", type: "checkbox", label: "On" },
    { key: "note", type: "text", placeholder: "Note (optional)" }
  ],
  leads: [
    { key: "label", type: "text", placeholder: "Label" },
    { key: "note", type: "text", placeholder: "Note" }
  ],
  signals: [
    { key: "label", type: "text", placeholder: "Label" },
    { key: "note", type: "text", placeholder: "Note" }
  ],
  defenses: [
    { key: "label", type: "text", placeholder: "Label" },
    { key: "note", type: "text", placeholder: "Note" }
  ],
  doubles: [
    { key: "label", type: "text", placeholder: "Label" },
    { key: "note", type: "text", placeholder: "Note" }
  ]
};

// Most lists live at the top level of state (e.g. state.openingBids), but
// notrumpRanges is nested under generalApproach — this map is how
// renderList/wireAddButtons find the right array either way.
const LIST_PATHS = {
  notrumpRanges: ["generalApproach", "notrumpRanges"],
  openingBids: ["openingBids"],
  notrumpConventions: ["notrumpConventions"],
  conventions: ["conventions"],
  leads: ["leads"],
  signals: ["signals"],
  defenses: ["defenses"],
  doubles: ["doubles"]
};

// Minimal blank shape — used internally by loadState() to backfill any
// fields a loaded card is missing (e.g. an uploaded PDF from an older
// version of this app). Keep this empty/blank; it is NOT what "Start New"
// shows the user (see STARTER_TEMPLATE below) — if it held real example
// content, loading an unrelated card that was merely missing one field would
// incorrectly backfill that field with this data instead of a blank.
const DEFAULT_CONFIG = {
  header: { pairNames: "", systemName: "", date: "" },
  generalApproach: { summary: "", notrumpRanges: [] },
  openingBids: [],
  notrumpConventions: [],
  conventions: [],
  leads: [],
  signals: [],
  defenses: [],
  doubles: [],
  notes: ""
};

// What "Start New Card" actually populates the form with — a SAYC starter
// card, edited via the local app's editor.html and handed off as a plain
// data file. header.date is overridden to today's date at Start New time
// regardless of what's here (see startNewCard), so it's left blank below.
const STARTER_TEMPLATE = {
  header: { pairNames: "", systemName: "", date: "" },
  generalApproach: {
    summary: "Standard American Yellow Card (SAYC)",
    notrumpRanges: [
      { seat: "All", range: "15–17, Balanced" }
    ]
  },
  openingBids: [
    { bid: "1♣", meaning: "3+ ♣, 12–19 points", alert: false },
    { bid: "1♦", meaning: "4+ ♦, 12–19 points", alert: false },
    { bid: "1♥ / 1♠", meaning: "5+ ♥/♠, 12–19 points", alert: false },
    { bid: "1NT", meaning: "15–17 balanced, but could have a 5 card major", alert: true },
    { bid: "2♣", meaning: "Strong, artificial, 22+ points", alert: false },
    { bid: "2♦ / 2♥ / 2♠", meaning: "Weak two, 6-card suit, 6–10 pts", alert: false },
    { bid: "2NT", meaning: "20–21 balanced, but could have a 5 card major", alert: false },
    { bid: "3-level", meaning: "7-card suit: If the suit is ♣, it could be 6 card", alert: false },
    { bid: "4-level", meaning: "8-card suit", alert: false }
  ],
  notrumpConventions: [
    { label: "Stayman", checked: true, note: "2♣ promises a 4-card major & 8 points" },
    { label: "Jacoby Transfers", checked: true, note: "♦=♥,  ♥=♠" }
  ],
  conventions: [
    { label: "Roman Keycard Blackwood", checked: true, note: "4NT Initiates slam investigation for majors (1430)" },
    { label: "Jacoby 2NT", checked: true, note: "2NT response to 1♥/♠ promising 4 cards and 14+ points" }
  ],
  leads: [
    { label: "Vs. Suit contracts", note: "A from AK, K from KQ, Card from partner's bid," },
    { label: "Vs. Notrump contracts", note: "4th from longest and strongest" }
  ],
  signals: [
    { label: "Response to lead", note: "Standard (high = encourage)" }
  ],
  defenses: [],
  doubles: [
    { label: "Takeout doubles", note: "Promises 12points and support for the 3 unbid suits" }
  ],
  notes: "Fill in any additional partnership agreements here."
};

// Prefix used to find embedded card data inside an exported PDF's text
// content (see pdf-export.js's buildPdfBlob and pdf-import.js's
// extractConfigFromPdf). Declared once here since both files need it and
// browsers reject a `const` re-declared across separate <script> tags in the
// same document.
const DATA_MARKER = "BRIDGECC1:";

let state = null;

// Holds the FileSystemFileHandle from the last Export/Save-As, when the File
// System Access API is available. null means "no handle yet" — Export falls
// back to Save-As (or a plain download) in that case. Read/written by
// pdf-export.js and reset when starting over.
let currentFileHandle = null;

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getListArray(stateKey) {
  const path = LIST_PATHS[stateKey];
  let obj = state;
  for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
  const lastKey = path[path.length - 1];
  if (!Array.isArray(obj[lastKey])) obj[lastKey] = [];
  return obj[lastKey];
}

function blankRow(fieldDefs) {
  const row = {};
  for (const f of fieldDefs) row[f.key] = f.type === "checkbox" ? false : "";
  return row;
}

// ---- Form rendering ----

function renderList(stateKey, containerId) {
  const fieldDefs = LIST_FIELD_DEFS[stateKey];
  const container = document.getElementById(containerId);
  const items = getListArray(stateKey);

  container.innerHTML = "";
  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "repeat-row";

    for (const field of fieldDefs) {
      if (field.type === "checkbox") {
        const wrap = document.createElement("label");
        wrap.className = "checkbox-field";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!item[field.key];
        input.addEventListener("change", () => { item[field.key] = input.checked; renderCard(); });
        wrap.appendChild(input);
        wrap.appendChild(document.createTextNode(field.label));
        row.appendChild(wrap);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = field.placeholder || "";
        input.value = item[field.key] || "";
        input.addEventListener("input", () => { item[field.key] = input.value; renderCard(); });
        row.appendChild(input);
      }
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      items.splice(index, 1);
      renderList(stateKey, containerId);
      renderCard();
    });
    row.appendChild(removeBtn);

    container.appendChild(row);
  });
}

function renderAllLists() {
  renderList("notrumpRanges", "list-notrumpRanges");
  renderList("openingBids", "list-openingBids");
  renderList("notrumpConventions", "list-notrumpConventions");
  renderList("conventions", "list-conventions");
  renderList("leads", "list-leads");
  renderList("signals", "list-signals");
  renderList("defenses", "list-defenses");
  renderList("doubles", "list-doubles");
}

function bindScalarFields() {
  const bindings = [
    ["f-pairNames", () => state.header.pairNames, v => state.header.pairNames = v],
    ["f-systemName", () => state.header.systemName, v => state.header.systemName = v],
    ["f-date", () => state.header.date, v => state.header.date = v],
    ["f-summary", () => state.generalApproach.summary, v => state.generalApproach.summary = v],
    ["f-notes", () => state.notes, v => state.notes = v]
  ];
  for (const [id, getter, setter] of bindings) {
    const el = document.getElementById(id);
    el.value = getter() || "";
    el.addEventListener("input", () => { setter(el.value); renderCard(); });
  }
}

function wireAddButtons() {
  document.querySelectorAll(".add-btn").forEach(btn => {
    const stateKey = btn.dataset.list;
    btn.addEventListener("click", () => {
      getListArray(stateKey).push(blankRow(LIST_FIELD_DEFS[stateKey]));
      renderList(stateKey, "list-" + stateKey);
      renderCard();
    });
  });
}

function loadState(newConfig) {
  state = deepClone(Object.assign({}, DEFAULT_CONFIG, newConfig));
  state.header = Object.assign({}, DEFAULT_CONFIG.header, state.header);
  state.generalApproach = Object.assign({}, DEFAULT_CONFIG.generalApproach, state.generalApproach);
  for (const key of Object.keys(LIST_FIELD_DEFS)) {
    getListArray(key); // lazily creates the array at its correct path if missing
  }
  bindScalarFields();
  renderAllLists();
  renderCard();
}

// ---- Live card preview (front/back), also what gets captured for export ----

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Traditional bridge suit coloring: hearts/diamonds red, clubs/spades left
// as the surrounding text color. Runs after escaping, so it only ever
// matches the literal ♥/♦ characters, never user-supplied markup — safe to
// use anywhere card text is rendered as innerHTML. The PDF export captures
// a screenshot of this rendered preview, so this coloring carries straight
// through into the exported PDF too, not just the on-screen view.
function colorizeSuits(escaped) {
  return escaped.replace(/[♥♦]/g, m => `<span class="suit-red">${m}</span>`);
}

function renderText(s) {
  return colorizeSuits(escapeHtml(s));
}

function checkbox(isChecked) {
  return `<span class="checkbox ${isChecked ? "yes" : ""}">${isChecked ? "☑" : "☐"}</span>`;
}

function renderChecklist(listEl, items) {
  listEl.innerHTML = items.map(item => `
    <li>${checkbox(item.checked)} ${renderText(item.label)}${item.note ? ` <span class="note">(${renderText(item.note)})</span>` : ""}</li>
  `).join("");
}

function renderNoteRows(bodyEl, items) {
  bodyEl.innerHTML = items.map(item => `
    <tr><td>${renderText(item.label)}</td><td>${renderText(item.note)}</td></tr>
  `).join("");
}

function renderCard() {
  const cfg = state;
  if (!cfg) return;

  document.getElementById("pairNamesFront").innerHTML = renderText(cfg.header.pairNames);
  document.getElementById("pairNamesBack").innerHTML = renderText(cfg.header.pairNames);
  document.getElementById("systemName").innerHTML = renderText(cfg.header.systemName);
  document.getElementById("cardDate").textContent = cfg.header.date || "________";

  document.getElementById("approachSummary").innerHTML = renderText(cfg.generalApproach.summary);
  document.getElementById("ntRangesBody").innerHTML = cfg.generalApproach.notrumpRanges.map(r => `
    <tr><td>${renderText(r.seat)}</td><td>${renderText(r.range)}</td></tr>
  `).join("");

  document.getElementById("openingBidsBody").innerHTML = cfg.openingBids.map(row => `
    <tr>
      <td>${renderText(row.bid)}</td>
      <td>${renderText(row.meaning)}</td>
      <td>${checkbox(row.alert)}</td>
    </tr>
  `).join("");

  renderChecklist(document.getElementById("ntConventionsList"), cfg.notrumpConventions);
  renderChecklist(document.getElementById("conventionsList"), cfg.conventions);

  renderNoteRows(document.getElementById("leadsBody"), cfg.leads);
  renderNoteRows(document.getElementById("signalsBody"), cfg.signals);
  renderNoteRows(document.getElementById("defensesBody"), cfg.defenses);
  renderNoteRows(document.getElementById("doublesBody"), cfg.doubles);

  document.getElementById("notesText").innerHTML = renderText(cfg.notes || "");
}

// ---- Landing screen / workspace switching ----

function showWorkspace() {
  document.getElementById("landing").hidden = true;
  document.getElementById("workspace").hidden = false;
  document.getElementById("workspaceActions").hidden = false;
}

function showLanding() {
  document.getElementById("workspace").hidden = true;
  document.getElementById("workspaceActions").hidden = true;
  document.getElementById("landing").hidden = false;
  hideLandingError();
}

function showLandingError(msg) {
  const el = document.getElementById("landingError");
  el.textContent = msg;
  el.hidden = false;
}

function hideLandingError() {
  document.getElementById("landingError").hidden = true;
}

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function startNewCard() {
  currentFileHandle = null;
  const cfg = deepClone(STARTER_TEMPLATE);
  cfg.header.date = todayFormatted();
  loadState(cfg);
  showWorkspace();
}

// handle is the FileSystemFileHandle when opened via the native picker (so
// Export can offer to save back in place), or null for the plain <input
// type=file> fallback path.
async function handleUploadedFile(file, handle) {
  hideLandingError();
  try {
    const cfg = await extractConfigFromPdf(file); // pdf-import.js
    currentFileHandle = handle;
    loadState(cfg);
    showWorkspace();
  } catch (err) {
    showLandingError(err.message);
  }
}

async function uploadExistingCard() {
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "PDF file", accept: { "application/pdf": [".pdf"] } }]
      });
      const file = await handle.getFile();
      await handleUploadedFile(file, handle);
    } catch (err) {
      if (err.name !== "AbortError") showLandingError("Could not open that file:\n" + err.message);
    }
    return;
  }
  document.getElementById("uploadFileInput").click();
}

// ---- Suit symbol toolbar ----
//
// Inserts a suit symbol into whichever text field was last focused, at that
// field's cursor position. Tracking focus via delegation on `document` (not
// wiring each field individually) means it works for every text field on
// the page automatically, including repeat-row inputs created later by
// renderList() — no extra wiring needed when a row is added.

let lastFocusedField = null;

document.addEventListener("focusin", e => {
  if (e.target.matches('input[type="text"], textarea')) {
    lastFocusedField = e.target;
  }
});

function insertSuitSymbol(symbol) {
  const field = lastFocusedField;
  if (!field || !document.body.contains(field)) return; // e.g. row was removed
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? field.value.length;
  field.setRangeText(symbol, start, end, "end");
  field.focus();
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

document.querySelectorAll(".suit-btn").forEach(btn => {
  btn.addEventListener("click", () => insertSuitSymbol(btn.dataset.suit));
});

document.getElementById("startNewBtn").addEventListener("click", startNewCard);
document.getElementById("uploadBtn").addEventListener("click", uploadExistingCard);
document.getElementById("uploadFileInput").addEventListener("change", e => {
  if (e.target.files[0]) handleUploadedFile(e.target.files[0], null);
});
document.getElementById("startOverBtn").addEventListener("click", showLanding);
wireAddButtons();

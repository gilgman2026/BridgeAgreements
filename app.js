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

function checkbox(isChecked) {
  return `<span class="checkbox ${isChecked ? "yes" : ""}">${isChecked ? "☑" : "☐"}</span>`;
}

function renderChecklist(listEl, items) {
  listEl.innerHTML = items.map(item => `
    <li>${checkbox(item.checked)} ${escapeHtml(item.label)}${item.note ? ` <span class="note">(${escapeHtml(item.note)})</span>` : ""}</li>
  `).join("");
}

function renderNoteRows(bodyEl, items) {
  bodyEl.innerHTML = items.map(item => `
    <tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.note)}</td></tr>
  `).join("");
}

function renderCard() {
  const cfg = state;
  if (!cfg) return;

  document.getElementById("pairNamesFront").textContent = cfg.header.pairNames;
  document.getElementById("pairNamesBack").textContent = cfg.header.pairNames;
  document.getElementById("systemName").textContent = cfg.header.systemName;
  document.getElementById("cardDate").textContent = cfg.header.date || "________";

  document.getElementById("approachSummary").textContent = cfg.generalApproach.summary;
  document.getElementById("ntRangesBody").innerHTML = cfg.generalApproach.notrumpRanges.map(r => `
    <tr><td>${escapeHtml(r.seat)}</td><td>${escapeHtml(r.range)}</td></tr>
  `).join("");

  document.getElementById("openingBidsBody").innerHTML = cfg.openingBids.map(row => `
    <tr>
      <td>${escapeHtml(row.bid)}</td>
      <td>${escapeHtml(row.meaning)}</td>
      <td>${checkbox(row.alert)}</td>
    </tr>
  `).join("");

  renderChecklist(document.getElementById("ntConventionsList"), cfg.notrumpConventions);
  renderChecklist(document.getElementById("conventionsList"), cfg.conventions);

  renderNoteRows(document.getElementById("leadsBody"), cfg.leads);
  renderNoteRows(document.getElementById("signalsBody"), cfg.signals);
  renderNoteRows(document.getElementById("defensesBody"), cfg.defenses);
  renderNoteRows(document.getElementById("doublesBody"), cfg.doubles);

  document.getElementById("notesText").textContent = cfg.notes || "";
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

function startNewCard() {
  currentFileHandle = null;
  loadState(deepClone(DEFAULT_CONFIG));
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

document.getElementById("startNewBtn").addEventListener("click", startNewCard);
document.getElementById("uploadBtn").addEventListener("click", uploadExistingCard);
document.getElementById("uploadFileInput").addEventListener("change", e => {
  if (e.target.files[0]) handleUploadedFile(e.target.files[0], null);
});
document.getElementById("startOverBtn").addEventListener("click", showLanding);
wireAddButtons();

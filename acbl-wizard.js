// Step-through wizard for converting a completed card to the standard ACBL
// convention-card format. Entry point is the 3rd landing button: it re-uses
// the existing upload/extractConfigFromPdf path (see app.js/pdf-import.js)
// to load a completed card's data, pre-fills whatever the hint matcher in
// acbl-schema.js can confidently suggest, then walks the user through every
// ACBL section one at a time so they can fill in (or skip) the rest.
//
// This never touches `state` / the regular editor — acblState is a wholly
// separate object, and generation is one-shot (see acbl-export.js).

let acblState = null;
let acblSourceState = null;
let acblStepIndex = 0;

function ensureAcblSection(sectionId) {
  if (!acblState[sectionId]) acblState[sectionId] = {};
  return acblState[sectionId];
}

function buildAcblFieldElement(section, field) {
  const sectionState = ensureAcblSection(section.id);
  const getVal = () => sectionState[field.key];
  const setVal = v => { sectionState[field.key] = v; };

  const wrap = document.createElement("div");
  wrap.className = "acbl-field";

  if (field.type === "text" || field.type === "textarea") {
    if (field.label) {
      const label = document.createElement("label");
      label.className = "acbl-field-label";
      label.textContent = field.label;
      wrap.appendChild(label);
    }
    const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
    if (field.type === "text") input.type = "text";
    else input.rows = 6;
    input.value = getVal() || "";
    input.addEventListener("input", () => setVal(input.value));
    wrap.appendChild(input);
  } else if (field.type === "checkbox") {
    const label = document.createElement("label");
    label.className = "acbl-checkbox-field";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!getVal();
    input.addEventListener("change", () => setVal(input.checked));
    label.appendChild(input);
    label.appendChild(document.createTextNode(field.label));
    wrap.appendChild(label);
  } else if (field.type === "checkboxText") {
    const row = document.createElement("div");
    row.className = "acbl-checkbox-text-row";
    const cur = getVal() || { checked: false, text: "" };
    const label = document.createElement("label");
    label.className = "acbl-checkbox-field";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!cur.checked;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(field.label));
    const txt = document.createElement("input");
    txt.type = "text";
    txt.placeholder = field.textPlaceholder || "";
    txt.value = cur.text || "";
    cb.addEventListener("change", () => setVal(Object.assign({}, getVal(), { checked: cb.checked })));
    txt.addEventListener("input", () => setVal(Object.assign({}, getVal(), { text: txt.value })));
    row.appendChild(label);
    row.appendChild(txt);
    wrap.appendChild(row);
  } else if (field.type === "range") {
    if (field.label) {
      const label = document.createElement("span");
      label.className = "acbl-field-label";
      label.textContent = field.label;
      wrap.appendChild(label);
    }
    const cur = getVal() || { from: "", to: "" };
    const row = document.createElement("div");
    row.className = "acbl-range";
    const from = document.createElement("input");
    from.type = "text"; from.placeholder = "from"; from.value = cur.from || "";
    const to = document.createElement("input");
    to.type = "text"; to.placeholder = "to"; to.value = cur.to || "";
    from.addEventListener("input", () => setVal(Object.assign({}, getVal(), { from: from.value })));
    to.addEventListener("input", () => setVal(Object.assign({}, getVal(), { to: to.value })));
    row.appendChild(from);
    row.appendChild(document.createTextNode(" to "));
    row.appendChild(to);
    wrap.appendChild(row);
  } else if (field.type === "checklist") {
    if (field.label) {
      const label = document.createElement("span");
      label.className = "acbl-field-label";
      label.textContent = field.label;
      wrap.appendChild(label);
    }
    const cur = getVal() || {};
    const list = document.createElement("div");
    list.className = "acbl-checklist";
    field.options.forEach(opt => {
      const olabel = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!cur[opt.value];
      input.addEventListener("change", () => {
        const v = Object.assign({}, getVal());
        v[opt.value] = input.checked;
        setVal(v);
      });
      olabel.appendChild(input);
      olabel.appendChild(document.createTextNode(opt.label));
      list.appendChild(olabel);
    });
    wrap.appendChild(list);
  }

  return wrap;
}

function renderAcblWizardStep() {
  const panel = document.getElementById("acblWizardPanel");
  const section = ACBL_SECTIONS[acblStepIndex];
  panel.innerHTML = "";

  const header = document.createElement("div");
  header.className = "acbl-wizard-header";
  const title = document.createElement("h3");
  title.className = "acbl-wizard-title";
  title.textContent = section.title;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "acbl-wizard-close";
  closeBtn.textContent = "×";
  closeBtn.title = "Cancel";
  closeBtn.addEventListener("click", closeAcblWizard);
  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const progress = document.createElement("div");
  progress.className = "acbl-wizard-progress";
  progress.textContent = `Section ${acblStepIndex + 1} of ${ACBL_SECTIONS.length}`;
  panel.appendChild(progress);

  const fieldsWrap = document.createElement("div");
  section.fields.forEach(field => fieldsWrap.appendChild(buildAcblFieldElement(section, field)));
  panel.appendChild(fieldsWrap);

  const footer = document.createElement("div");
  footer.className = "acbl-wizard-footer";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "link-btn";
  backBtn.textContent = "Back";
  backBtn.disabled = acblStepIndex === 0;
  backBtn.addEventListener("click", () => { acblStepIndex--; renderAcblWizardStep(); });

  const spacer = document.createElement("div");
  spacer.className = "spacer";

  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.className = "acbl-skip-link";
  skipBtn.textContent = "Skip remaining & generate PDF";
  skipBtn.addEventListener("click", finishAcblWizard);

  const isLast = acblStepIndex === ACBL_SECTIONS.length - 1;
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "acbl-next-btn";
  nextBtn.textContent = isLast ? "Generate ACBL PDF" : "Next";
  nextBtn.addEventListener("click", () => {
    if (isLast) finishAcblWizard();
    else { acblStepIndex++; renderAcblWizardStep(); }
  });

  footer.appendChild(backBtn);
  footer.appendChild(spacer);
  if (!isLast) footer.appendChild(skipBtn);
  footer.appendChild(nextBtn);
  panel.appendChild(footer);
}

function openAcblWizard(sourceState) {
  acblSourceState = sourceState;
  acblState = defaultAcblState();

  const { hints, extra } = computeAcblHints(sourceState);
  Object.keys(hints).forEach(sectionId => {
    Object.assign(acblState[sectionId], hints[sectionId]);
  });
  if (extra.length) acblState.additionalNotes.text = extra.join("\n");

  acblStepIndex = 0;
  document.getElementById("acblWizard").hidden = false;
  renderAcblWizardStep();
}

function closeAcblWizard() {
  document.getElementById("acblWizard").hidden = true;
}

async function finishAcblWizard() {
  closeAcblWizard();
  try {
    const filename = await exportAcblPdf(acblState, acblSourceState);
    showLandingStatus(`Downloaded ${filename}`);
  } catch (err) {
    showLandingError("Could not generate the ACBL PDF: " + err.message);
  }
}

// ---- Landing status message (separate from the existing error banner) ----

function showLandingStatus(msg) {
  hideLandingError();
  const el = document.getElementById("landingStatus");
  el.textContent = msg;
  el.hidden = false;
}

function hideLandingStatus() {
  document.getElementById("landingStatus").hidden = true;
}

// ---- Landing entry point: upload a completed card, then open the wizard ----

async function handleAcblUpload(file) {
  hideLandingError();
  hideLandingStatus();
  try {
    const cfg = await extractConfigFromPdf(file);
    openAcblWizard(cfg);
  } catch (err) {
    showLandingError(err.message);
  }
}

async function startAcblConversion() {
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "PDF file", accept: { "application/pdf": [".pdf"] } }]
      });
      const file = await handle.getFile();
      await handleAcblUpload(file);
    } catch (err) {
      if (err.name !== "AbortError") showLandingError("Could not open that file:\n" + err.message);
    }
    return;
  }
  document.getElementById("acblFileInput").click();
}

document.getElementById("convertAcblBtn").addEventListener("click", startAcblConversion);
document.getElementById("acblFileInput").addEventListener("change", e => {
  if (e.target.files[0]) handleAcblUpload(e.target.files[0]);
});

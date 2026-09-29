// Step-through wizard for the ACBL convention-card format. Two entry points,
// both landing-page buttons:
//
//  - "Create ACBL Card": uploads a completed Agreement (this tool's regular
//    card PDF), pre-fills whatever the hint matcher in acbl-schema.js can
//    confidently suggest from it, then walks the user through every ACBL
//    section so they can fill in (or skip) the rest.
//  - "Edit ACBL Card": uploads a previously-generated ACBL PDF (from either
//    of these two flows) and restores its exact answers, since those are
//    embedded in the PDF the same way the regular card round-trips (see
//    acbl-export.js / extractAcblConfigFromPdf in pdf-import.js).
//
// This never touches `state` / the regular editor — acblState is a wholly
// separate object.

let acblState = null;
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

function showAcblWizard() {
  acblStepIndex = 0;
  document.getElementById("acblWizard").hidden = false;
  renderAcblWizardStep();
}

// "Create ACBL Card": build a fresh acblState from an Agreement's data,
// pre-filled with whatever the hint matcher can confidently suggest.
function openAcblWizardFromAgreement(sourceState) {
  acblState = defaultAcblState();

  const { hints, extra } = computeAcblHints(sourceState);
  Object.keys(hints).forEach(sectionId => {
    Object.assign(acblState[sectionId], hints[sectionId]);
  });
  if (extra.length) acblState.additionalNotes.text = extra.join("\n");

  showAcblWizard();
}

// "Edit ACBL Card": restore an exact, previously-answered acblState.
function openAcblWizardFromAcblPdf(loadedAcblState) {
  acblState = mergeAcblState(loadedAcblState);
  showAcblWizard();
}

function closeAcblWizard() {
  document.getElementById("acblWizard").hidden = true;
}

async function finishAcblWizard() {
  closeAcblWizard();
  try {
    const filename = await exportAcblPdf(acblState);
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

// ---- Landing entry points ----
//
// Both follow the same shape: open a native/file-input picker, read the
// PDF, hand its data to the matching wizard opener above. Factored into one
// helper (openFileThen) parameterized by which extractor/opener/input to
// use, rather than duplicating the picker-vs-fallback-input dance twice.

async function openFileThen(inputId, extractFn, openFn) {
  hideLandingError();
  hideLandingStatus();

  const handleFile = async file => {
    try {
      const data = await extractFn(file);
      openFn(data);
    } catch (err) {
      showLandingError(err.message);
    }
  };

  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "PDF file", accept: { "application/pdf": [".pdf"] } }]
      });
      const file = await handle.getFile();
      await handleFile(file);
    } catch (err) {
      if (err.name !== "AbortError") showLandingError("Could not open that file:\n" + err.message);
    }
    return;
  }

  const input = document.getElementById(inputId);
  const onChange = e => {
    input.removeEventListener("change", onChange);
    if (e.target.files[0]) handleFile(e.target.files[0]);
    input.value = "";
  };
  input.addEventListener("change", onChange);
  input.click();
}

document.getElementById("convertAcblBtn").addEventListener("click", () => {
  openFileThen("acblFileInput", extractConfigFromPdf, openAcblWizardFromAgreement);
});

document.getElementById("editAcblBtn").addEventListener("click", () => {
  openFileThen("editAcblFileInput", extractAcblConfigFromPdf, openAcblWizardFromAcblPdf);
});

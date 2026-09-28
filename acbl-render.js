// Renders the ACBL-shaped print layout from an acblState object built by
// acbl-wizard.js. Reuses escapeHtml/renderText/checkbox from app.js — same
// suit-coloring and escaping rules as the regular card's preview.

function renderAcblFieldRow(field, value) {
  switch (field.type) {
    case "text":
      return `<div class="acbl-row"><span class="lbl">${escapeHtml(field.label)}:</span> ${renderText(value || "")}</div>`;
    case "textarea":
      if (!value) return "";
      return `<div class="acbl-row">${renderText(value).replace(/\n/g, "<br>")}</div>`;
    case "checkbox":
      return `<div class="acbl-row">${checkbox(!!value)} ${escapeHtml(field.label)}</div>`;
    case "checkboxText": {
      const v = value || { checked: false, text: "" };
      return `<div class="acbl-row">${checkbox(!!v.checked)} ${escapeHtml(field.label)} ${renderText(v.text || "")}</div>`;
    }
    case "range": {
      const v = value || { from: "", to: "" };
      const label = field.label ? `<span class="lbl">${escapeHtml(field.label)}:</span> ` : "";
      return `<div class="acbl-row">${label}${renderText(v.from || "___")} to ${renderText(v.to || "___")}</div>`;
    }
    case "checklist": {
      const v = value || {};
      const label = field.label ? `<span class="lbl">${escapeHtml(field.label)}:</span> ` : "";
      const opts = field.options.map(o => `<span class="opt">${checkbox(!!v[o.value])} ${escapeHtml(o.label)}</span>`).join("");
      return `<div class="acbl-row">${label}${opts}</div>`;
    }
    default:
      return "";
  }
}

function renderAcblBox(section, acblState) {
  const values = acblState[section.id] || {};
  const rows = section.fields.map(f => renderAcblFieldRow(f, values[f.key])).join("");
  return `<div class="acbl-box"><h4>${escapeHtml(section.title)}</h4>${rows}</div>`;
}

function renderAcblCard(acblState) {
  let root = document.getElementById("acblRoot");
  if (!root) {
    const clip = document.createElement("div");
    clip.className = "acbl-export-clip";
    root = document.createElement("div");
    root.id = "acblRoot";
    clip.appendChild(root);
    document.body.appendChild(clip);
  }

  const columns = { left: [], middle: [], right: [] };
  let bottomHtml = "";
  ACBL_SECTIONS.forEach(section => {
    if (section.column === "bottom") {
      const values = acblState[section.id] || {};
      const hasContent = section.fields.some(f => {
        const v = values[f.key];
        return typeof v === "string" ? v.trim() : !!v;
      });
      if (hasContent) bottomHtml = renderAcblBox(section, acblState);
      return;
    }
    columns[section.column].push(renderAcblBox(section, acblState));
  });

  root.innerHTML = `
    <div class="acbl-page">
      <div class="acbl-grid">
        <div class="acbl-column">${columns.left.join("")}</div>
        <div class="acbl-column">${columns.middle.join("")}</div>
        <div class="acbl-column">${columns.right.join("")}</div>
      </div>
      <div class="acbl-notes-box">${bottomHtml}</div>
    </div>`;

  return root;
}

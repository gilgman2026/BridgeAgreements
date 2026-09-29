// Renders acblState onto an exact image of the reference ACBL card
// (assets/acbl-card-front.png) via absolutely-positioned overlays, using
// the coordinates measured in acbl-image-positions.js. A second, plain page
// carries anything that doesn't fit on the card itself (the "Additional
// Notes" catch-all from the hint matcher) — only added when there's
// something in it.
//
// Reuses escapeHtml/renderText/checkbox from app.js for consistent suit
// coloring and escaping.

function overlaySpan(x, y, text, extraStyle) {
  if (text === "" || text == null) return "";
  return `<span class="acbl-ov acbl-ov-text" style="left:${x}pt;top:${y}pt;${extraStyle || ""}">${renderText(text)}</span>`;
}

function overlayMark(x, y) {
  return `<span class="acbl-ov acbl-ov-mark" style="left:${x}pt;top:${y}pt;">X</span>`;
}

function renderFieldOverlay(field, value, pos) {
  if (!pos) return "";
  switch (field.type) {
    case "text":
      return overlaySpan(pos.x, pos.y, value);
    case "checkbox":
      return value ? overlayMark(pos.x, pos.y) : "";
    case "checkboxText": {
      const v = value || { checked: false, text: "" };
      return (v.checked ? overlayMark(pos.box.x, pos.box.y) : "") + overlaySpan(pos.text.x, pos.text.y, v.text);
    }
    case "range": {
      const v = value || { from: "", to: "" };
      return overlaySpan(pos.from.x, pos.from.y, v.from) + overlaySpan(pos.to.x, pos.to.y, v.to);
    }
    case "checklist": {
      const v = value || {};
      return field.options.map(o => (v[o.value] && pos[o.value]) ? overlayMark(pos[o.value].x, pos[o.value].y) : "").join("");
    }
    default:
      return "";
  }
}

// Always rendered as its own page — even with no notes text — because the
// hidden data-marker text (see acbl-export.js) has to be written somewhere,
// and writing it directly onto the image page has shown a real jsPDF quirk:
// at 1pt font size, the "invisible" marker text doesn't reliably render as
// pure white, and lands visibly on top of the printed card wherever it
// happens to overlap dense content. Keeping it off the image page entirely
// sidesteps that regardless of the exact cause. A blank second page when
// there's no additional notes is a minor cosmetic cost for that guarantee.
function renderAcblNotesPage(text) {
  const hasText = text && text.trim();
  return `
    <div class="acbl-page acbl-notes-page">
      ${hasText ? `<h4>Additional Notes (carried over from your existing card)</h4>
      <div class="acbl-notes-body">${renderText(text).replace(/\n/g, "<br>")}</div>` : ""}
    </div>`;
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

  let overlays = "";
  ACBL_SECTIONS.forEach(section => {
    if (section.column === "bottom") return;
    const values = acblState[section.id] || {};
    const positions = ACBL_IMAGE_POSITIONS[section.id] || {};
    section.fields.forEach(field => {
      overlays += renderFieldOverlay(field, values[field.key], positions[field.key]);
    });
  });

  const notesText = (acblState.additionalNotes || {}).text || "";

  root.innerHTML = `
    <div class="acbl-page acbl-image-page">
      <img class="acbl-bg" src="assets/acbl-card-front.png" alt="">
      ${overlays}
    </div>
    ${renderAcblNotesPage(notesText)}`;

  return root;
}

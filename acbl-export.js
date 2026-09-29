// Captures the ACBL-shaped layout (acbl-render.js) as a PDF, using the same
// html2pdf pipeline pdf-export.js already uses for the regular card.
//
// The reference card's own page size is 8in x 8.5in (not standard letter),
// so jsPDF is given that as a custom format. A second page (carrying
// "Additional Notes" if there are any, otherwise blank) is always captured
// too — the hidden data marker below is written there rather than on the
// image page; see the comment on renderAcblNotesPage in acbl-render.js for
// why. Two-pass capture is the same pattern pdf-export.js uses for
// front/back.
//
// The generated PDF also embeds its own acblState as hidden text (same
// technique as pdf-export.js's regular card, different marker — see
// ACBL_DATA_MARKER in acbl-schema.js), so "Edit ACBL Card" can later
// re-upload it and restore every answer exactly, not just re-derive hints.

function acblFilename(acblState) {
  const slug = acblState && acblState.names && acblState.names.pairNames
    ? slugify(acblState.names.pairNames)
    : "";
  return slug ? `acbl-convention-card-${slug}.pdf` : "acbl-convention-card.pdf";
}

function waitForImage(img) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", () => reject(new Error("Could not load the ACBL card background image.")), { once: true });
  });
}

async function exportAcblPdf(acblState) {
  const root = renderAcblCard(acblState);
  const imagePage = root.querySelector(".acbl-image-page");
  const notesPage = root.querySelector(".acbl-notes-page");

  await waitForImage(imagePage.querySelector(".acbl-bg"));

  const opt = {
    margin: 0,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "in", format: [8, 8.5], orientation: "portrait" }
  };

  const pdf = await html2pdf().set(opt).from(imagePage).toPdf()
    .get("pdf").then(pdf => { pdf.addPage([8, 8.5], "portrait"); })
    .from(notesPage).toContainer().toCanvas().toPdf()
    .get("pdf");

  writeHiddenMarker(pdf, encodeCardData(acblState, ACBL_DATA_MARKER));
  const blob = pdf.output("blob");
  const filename = acblFilename(acblState);
  downloadBlob(blob, filename);
  return filename;
}

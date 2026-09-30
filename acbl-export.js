// Captures the ACBL-shaped layout (acbl-render.js) as a PDF, using the same
// html2pdf pipeline pdf-export.js already uses for the regular card.
//
// The reference card's own page size is 8in x 8.5in (not standard letter).
// The exported image page is made slightly taller than that (see
// ACBL_MARGIN_IN below) so there's real blank margin above and below the
// printed card — used to write the hidden data marker without it sharing
// space with visible content (see the acbl-card-body comment in style.css
// for why that matters) and without needing a whole extra page for it. A
// second page is still added, but only when there's "Additional Notes"
// overflow text to show.
//
// The generated PDF also embeds its own acblState as hidden text (same
// technique as pdf-export.js's regular card, different marker — see
// ACBL_DATA_MARKER in acbl-schema.js), so "Edit ACBL Card" can later
// re-upload it and restore every answer exactly, not just re-derive hints.

const ACBL_CARD_HEIGHT_IN = 8.5;
const ACBL_MARGIN_IN = 0.6; // must match .acbl-image-page's height in style.css
const ACBL_PAGE_HEIGHT_IN = ACBL_CARD_HEIGHT_IN + 2 * ACBL_MARGIN_IN;
const ACBL_MARKER_START_Y_IN = ACBL_MARGIN_IN + ACBL_CARD_HEIGHT_IN + 0.05; // just into the bottom margin

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

  let chain = html2pdf().set({
    margin: 0,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "in", format: [8, ACBL_PAGE_HEIGHT_IN], orientation: "portrait" }
  }).from(imagePage).toPdf();

  // html2canvas's captured canvas can come out a couple of pixels taller
  // than the source element (subpixel layout vs. canvas rounding). That's
  // normally invisible, but it's enough to tip html2pdf's own canvas-to-page
  // splitting into producing a near-empty second page for what is visually
  // a single page of content. The image page is never meant to span more
  // than one page, so drop any such artifact page before deciding whether a
  // real notes page is needed.
  chain = chain.get("pdf").then(pdf => {
    while (pdf.internal.getNumberOfPages() > 1) {
      pdf.deletePage(pdf.internal.getNumberOfPages());
    }
  });

  if (notesPage) {
    chain = chain.get("pdf").then(pdf => { pdf.addPage([8, ACBL_CARD_HEIGHT_IN], "portrait"); })
      .from(notesPage).toContainer().toCanvas().toPdf();
  }

  const pdf = await chain.get("pdf");

  // The marker always belongs on page 1's own bottom margin, regardless of
  // whether a notes page just got added after it (which would otherwise
  // become jsPDF's "current" page for subsequent text() calls).
  pdf.setPage(1);
  writeHiddenMarker(pdf, encodeCardData(acblState, ACBL_DATA_MARKER), ACBL_MARKER_START_Y_IN);

  const blob = pdf.output("blob");
  const filename = acblFilename(acblState);
  downloadBlob(blob, filename);
  return filename;
}

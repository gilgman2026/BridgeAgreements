// Captures the ACBL-shaped layout (acbl-render.js) as a PDF, using the same
// html2pdf pipeline pdf-export.js already uses for the regular card.
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

async function exportAcblPdf(acblState) {
  const root = renderAcblCard(acblState);
  const opt = {
    margin: 0,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
  };
  const pdf = await html2pdf().set(opt).from(root).toPdf().get("pdf");
  writeHiddenMarker(pdf, encodeCardData(acblState, ACBL_DATA_MARKER));
  const blob = pdf.output("blob");
  const filename = acblFilename(acblState);
  downloadBlob(blob, filename);
  return filename;
}

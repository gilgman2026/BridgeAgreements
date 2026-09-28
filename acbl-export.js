// Captures the ACBL-shaped layout (acbl-render.js) as a PDF, using the same
// html2pdf pipeline pdf-export.js already uses for the regular card.
//
// Unlike the regular card's export, this is one-shot: no data marker is
// embedded for re-import. The simplified card stays the source of record;
// the ACBL wizard's answers are regenerated fresh each time you convert
// (see the conversation that scoped this out — round-tripping the ACBL
// answers themselves was explicitly deferred).

function acblFilename(sourceState) {
  const slug = sourceState && sourceState.header && sourceState.header.pairNames
    ? slugify(sourceState.header.pairNames)
    : "";
  return slug ? `acbl-convention-card-${slug}.pdf` : "acbl-convention-card.pdf";
}

async function exportAcblPdf(acblState, sourceState) {
  const root = renderAcblCard(acblState);
  const opt = {
    margin: 0,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
  };
  const pdf = await html2pdf().set(opt).from(root).toPdf().get("pdf");
  const blob = pdf.output("blob");
  downloadBlob(blob, acblFilename(sourceState));
  return acblFilename(sourceState);
}

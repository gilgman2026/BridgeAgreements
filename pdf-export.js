// Builds the exported PDF and embeds the card's data inside it as tiny,
// near-invisible text, so re-uploading that same PDF (see pdf-import.js)
// restores the exact data — no separate file needed alongside the PDF.

const PDF_FILE_TYPES = [{ description: "PDF file", accept: { "application/pdf": [".pdf"] } }];

function encodeCardData(cfg) {
  return DATA_MARKER + btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Renders front and back as two separate html2pdf passes rather than relying
// on CSS page-break detection: that detection reads computed style at
// capture time, but page-break rules only apply inside @media print, which
// isn't active during an on-screen html2canvas capture (this was a real bug
// in the local app — blank first page, back card cut off — already found
// and fixed there; this reuses that fix). The hidden data marker is added to
// the finished document just before producing the output blob.
function buildPdfBlob() {
  const front = document.querySelector("#pdfRoot .card-page.front");
  const back = document.querySelector("#pdfRoot .card-page.back");
  const opt = {
    margin: 0,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
  };
  const marker = encodeCardData(state);

  return html2pdf().set(opt).from(front).toPdf()
    .get("pdf").then(pdf => { pdf.addPage(); })
    .from(back).toContainer().toCanvas().toPdf()
    .get("pdf").then(pdf => {
      pdf.setFontSize(1);
      pdf.setTextColor(255, 255, 255);
      pdf.text(marker, 0.1, 10.9); // near-invisible: 1pt, white, within page bounds
      return pdf.output("blob");
    });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let statusTimer = null;
function showExportStatus(msg) {
  const el = document.getElementById("exportStatus");
  el.textContent = msg;
  el.classList.add("visible");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => el.classList.remove("visible"), 3000);
}

async function exportPdf() {
  const filename = `convention-card-${slugify(state.header.pairNames) || "card"}.pdf`;
  const blob = await buildPdfBlob();

  if (currentFileHandle) {
    try {
      const writable = await currentFileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      showExportStatus(`Saved to ${currentFileHandle.name}`);
      return;
    } catch (err) {
      alert("Could not save to the open file, falling back to a new save:\n" + err.message);
    }
  }

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: filename, types: PDF_FILE_TYPES });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      currentFileHandle = handle;
      showExportStatus(`Saved to ${handle.name}`);
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
      alert("Could not save file, falling back to download:\n" + err.message);
    }
  }

  downloadBlob(blob, filename);
  showExportStatus(`Downloaded ${filename}`);
}

document.getElementById("exportBtn").addEventListener("click", exportPdf);

// Extracts card data embedded by pdf-export.js from an uploaded PDF.
//
// Uses the vendored PDF.js legacy UMD build (loaded as a plain global via
// <script src="vendor/pdf.min.js">, same pattern as html2pdf.bundle.min.js)
// rather than a modern ES-module build — that avoids needing dynamic
// import() / <script type="module"> (which have their own MIME-type and
// module-scoping gotchas on some static hosts) for a feature this small.

const PDF_WORKER_SRC = "vendor/pdf.worker.min.js";
pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}

async function extractConfigFromPdf(file) {
  let doc;
  try {
    const buffer = await file.arrayBuffer();
    doc = await withTimeout(
      pdfjsLib.getDocument({ data: buffer }).promise,
      20000,
      "Timed out reading that PDF. It may be corrupted, or your browser may not support reading it — try a different browser if this keeps happening."
    );
  } catch (err) {
    throw new Error("Couldn't read that file as a PDF: " + err.message);
  }

  let fullText = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join("");
  }

  const markerIndex = fullText.indexOf(DATA_MARKER);
  if (markerIndex === -1) {
    throw new Error("This PDF doesn't contain card data — please upload a PDF that was exported from this tool, or start a new card instead.");
  }

  const match = fullText.slice(markerIndex + DATA_MARKER.length).match(/^[A-Za-z0-9+/=]+/);
  if (!match) {
    throw new Error("This PDF's embedded card data looks corrupted.");
  }

  try {
    return JSON.parse(decodeURIComponent(escape(atob(match[0]))));
  } catch (err) {
    throw new Error("This PDF's embedded card data could not be read: " + err.message);
  }
}

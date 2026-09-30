// Extracts data embedded by pdf-export.js (the regular card) or
// acbl-export.js (the ACBL card) from an uploaded PDF — both use the same
// hidden-text marker technique, just with a different marker string.
//
// Both "Edit Existing Agreement" and "Edit ACBL Card" route through
// extractAnyCardFromPdf, which checks for both markers and reports which
// one it found, rather than each button being hard-wired to only accept
// its own file type. A real user hit exactly that failure mode — uploaded
// a genuine ACBL card PDF to the Agreement button — and it read as a
// confusing intermittent bug rather than the simple mismatch it was.
// Auto-detecting removes the failure mode entirely instead of just
// diagnosing it better.
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

async function extractCleanedPdfText(file) {
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

  // The marker + payload is written as a single long text run (see
  // pdf-export.js / acbl-export.js), but PDF text-layer reconstruction can
  // still insert stray whitespace when joining text items back together —
  // and neither the marker nor base64 ever legitimately contain whitespace,
  // so stripping all of it first is always safe and guards against a single
  // inserted space silently truncating the match below.
  return { cleaned: fullText.replace(/\s+/g, ""), numPages: doc.numPages };
}

// Returns the decoded payload if `marker` is present, or null if it isn't.
// Throws only if the marker is there but what follows it won't decode.
function decodeMarkerPayload(cleaned, marker) {
  const markerIndex = cleaned.indexOf(marker);
  if (markerIndex === -1) return null;

  const match = cleaned.slice(markerIndex + marker.length).match(/^[A-Za-z0-9+/=]+/);
  if (!match) {
    throw new Error("This PDF's embedded data looks corrupted.");
  }

  try {
    return JSON.parse(decodeURIComponent(escape(atob(match[0]))));
  } catch (err) {
    throw new Error("This PDF's embedded data could not be read: " + err.message);
  }
}

function notFoundDiagnostic(cleaned, numPages) {
  const snippet = cleaned.slice(0, 80);
  return `\n\n[diagnostic] pages: ${numPages}, extracted chars: ${cleaned.length}` +
    (cleaned.length ? `, starts with: "${snippet}"` : ", no text was extracted at all");
}

// Used by both "Edit Existing Agreement" and "Edit ACBL Card" — reads
// whichever marker is actually present rather than requiring the caller to
// have picked the right button for the file's actual type.
async function extractAnyCardFromPdf(file) {
  const { cleaned, numPages } = await extractCleanedPdfText(file);

  const agreementData = decodeMarkerPayload(cleaned, DATA_MARKER);
  if (agreementData) return { kind: "agreement", data: agreementData };

  const acblData = decodeMarkerPayload(cleaned, ACBL_DATA_MARKER);
  if (acblData) return { kind: "acbl", data: acblData };

  throw new Error(
    "This PDF doesn't contain card data from this tool — please upload a PDF " +
    "that was exported from it (either the regular Agreement card or an ACBL card)." +
    notFoundDiagnostic(cleaned, numPages)
  );
}

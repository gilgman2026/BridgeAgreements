# BridgeAgreements

Static HTML/CSS/vanilla JS app, no build step, no framework. Two card
editors live side by side: a simplified "Agreement" card (app.js,
pdf-export.js, pdf-import.js) and a pixel-accurate ACBL convention card
(acbl-*.js) that visually matches a reference ACBL PDF exactly.

## Round-trip data embedding

Both editors export PDFs with the card's full state embedded as hidden,
near-invisible text, so re-uploading that same PDF restores every answer
exactly (see pdf-export.js / pdf-import.js). The two card types use
different markers and must not be confused:

- `DATA_MARKER = "BRIDGECC1:"` — Agreement card (app.js)
- `ACBL_DATA_MARKER = "BRIDGEACBL1:"` — ACBL card (acbl-schema.js)

Both "Edit" buttons on the landing page auto-detect which marker a
PDF contains (`extractAnyCardFromPdf` in pdf-import.js) and route
accordingly — do not assume a given upload button implies a given card
type.

## ACBL card layout

- The reference card's own page size is **8in x 8.5in** (576x612pt),
  not US Letter. Coordinates in `acbl-image-positions.js` are exact PDF
  points extracted from the reference PDF via `pdfplumber`
  (character/rect-level extraction), not eyeballed — if something is
  misaligned, re-measure it the same way rather than nudging by guessed
  offsets.
- The card fits on less than one page, so the exported image page is
  padded to **8in x 9.7in** with a symmetric 0.6in margin above and
  below the 8.5in card body (`.acbl-card-body` in style.css), keeping it
  visually centered. The hidden data marker lives in that bottom margin
  whitespace instead of forcing a second page.
- A second page is only added when there's real "Additional Notes"
  overflow text (`acbl-render.js` / `acbl-export.js`). `ACBL_MARGIN_IN`
  in acbl-export.js must stay in sync with `.acbl-image-page`'s height
  in style.css.

## html2pdf / html2canvas / jsPDF gotchas (all confirmed by direct testing)

- An element with `position:absolute`/`fixed` passed as the html2canvas
  capture target measures as **height 0**. Capture from a
  `position:static` root instead; if it needs to stay off-screen, wrap
  it in a `height:0;overflow:hidden` clip container (doesn't affect the
  capture, since html2canvas renders the target directly).
- html2canvas's captured canvas can come out **a couple of pixels
  taller** than the source element (subpixel layout vs. canvas
  rounding). This is enough to tip html2pdf's own canvas-to-page
  splitting into producing a near-empty second page even for
  single-page content. Fix: after `.toPdf()`, check
  `pdf.internal.getNumberOfPages()` and `pdf.deletePage()` any such
  artifact page(s) before trusting the count — don't assume matching
  the jsPDF page format to the element's CSS height is enough on its
  own.
- `pdf.text()` (jsPDF) silently **truncates** a single line beyond
  roughly 1000-1100 characters at 1pt font size — no error, no
  wrapping. Long embedded payloads must be split across multiple
  shorter lines (see `writeHiddenMarker` in pdf-export.js).
- `pdf.setTextColor(255,255,255)` alone is **not** enough to make text
  invisible. jsPDF also applies the current *draw/stroke* color to
  text, which defaults to black — at tiny font sizes that stroke
  outline shows through as faint marks. Always pair it with
  `pdf.setDrawColor(255,255,255)`.

## Testing

No test framework — verification is done with ad hoc Playwright scripts
run against a local static server, e.g.:

```
python3 -m http.server 8934   # serve repo root
NODE_PATH=/opt/node22/lib/node_modules node some-test.js
```

Playwright/Chromium: `executablePath: '/opt/pw-browsers/chromium'`.

For anything PDF-shaped, don't trust visual inspection alone —
cross-check with `pdfinfo` (page count/size) and by rendering to PNG
(`pdftoppm`) and sampling actual pixel values (e.g. via PIL) to confirm
things like "this margin is really pure white," not just "looks blank
in a screenshot." This caught real bugs (the 2-page artifact, a
near-black "invisible" marker) that eyeballing missed.

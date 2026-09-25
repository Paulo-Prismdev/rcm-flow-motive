// Shared layout + drawing helpers for instruction PDFs (repairer & credit repair).
// `yPosAccess` lets each caller keep its own `yPos` variable while the helpers
// read/write it through getters/setters — so callers can mix direct `yPos`
// references with helper calls without any call-site changes.

const LM = 20, PW = 210, MW = PW - LM * 2, PH = 297;
const TOP = 20, BL = PH - 25, FOOTER_Y = 286;
const PAD_X = 5, PAD_TOP = 4, PAD_BOTTOM = 4, SECTION_GAP = 5;
const HEADER_H = 8, ROW_H = 6.2, LABEL_W = 60, VAL_GAP = 4;
const TX = LM + PAD_X, VX = TX + LABEL_W + VAL_GAP;

const NAVY = [19, 29, 71];
const AMBER_BG = [255, 248, 230];
const AMBER_BD = [230, 180, 30];
const RED = [200, 0, 0];
const DARK_TEXT = [40, 40, 40];
const WHITE = [255, 255, 255];

export const PDF_CONST = { LM, PW, MW, PH, TOP, BL, FOOTER_Y, PAD_X, PAD_TOP, PAD_BOTTOM, SECTION_GAP, HEADER_H, ROW_H, LABEL_W, VAL_GAP, TX, VX };
export const PDF_COLORS = { NAVY, AMBER_BG, AMBER_BD, RED, DARK_TEXT, WHITE };

export function createPdfHelpers(doc: any, yPosAccess: { get(): number; set(v: number): void }) {
  const valWidth = () => MW - PAD_X * 2 - LABEL_W - VAL_GAP;

  function estimateRow(value) {
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(String(value), valWidth());
    return Math.max(ROW_H, lines.length * ROW_H);
  }
  function estimateSection(rows) {
    let h = HEADER_H + PAD_TOP + PAD_BOTTOM;
    if (rows) { for (const [, value] of rows) h += estimateRow(value); }
    return h;
  }
  function ensureSpace(neededH) {
    if (yPosAccess.get() + neededH > BL) { doc.addPage(); yPosAccess.set(TOP); return true; }
    return false;
  }
  function drawHeader(title) {
    doc.setFillColor(...NAVY);
    doc.rect(LM, yPosAccess.get(), MW, HEADER_H, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, TX, yPosAccess.get() + 5.5);
    yPosAccess.set(yPosAccess.get() + HEADER_H + PAD_TOP);
  }
  function drawRow(label, value) {
    const vw = valWidth();
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(String(value), vw);
    const rh = Math.max(ROW_H, lines.length * ROW_H);
    if (yPosAccess.get() + rh > BL) { doc.addPage(); yPosAccess.set(TOP); }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text(label, TX, yPosAccess.get() + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    lines.forEach((line, i) => { doc.text(line, VX, yPosAccess.get() + 4.2 + ROW_H * i); });
    yPosAccess.set(yPosAccess.get() + rh);
  }
  function finishSection() {
    yPosAccess.set(yPosAccess.get() + PAD_BOTTOM + SECTION_GAP);
  }
  function drawWarningBox(label, text, fontSize, lineHeight) {
    const textW = MW - PAD_X * 2;
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, textW - 8);
    const boxH = 9 + lines.length * lineHeight;
    doc.setFillColor(...AMBER_BG);
    doc.setDrawColor(...AMBER_BD);
    doc.setLineWidth(0.5);
    doc.roundedRect(TX, yPosAccess.get(), textW, boxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RED);
    doc.text(`${label}:`, TX + 3, yPosAccess.get() + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], TX + 3, yPosAccess.get() + 5 + lineHeight * (i + 1));
    }
    yPosAccess.set(yPosAccess.get() + boxH + 2.5);
  }
  function drawParagraph(text) {
    const textW = MW - PAD_X * 2;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    const lines = doc.splitTextToSize(text, textW);
    for (const line of lines) {
      if (yPosAccess.get() + 5 > BL) { doc.addPage(); yPosAccess.set(TOP); }
      doc.text(line, TX, yPosAccess.get() + 4);
      yPosAccess.set(yPosAccess.get() + 5);
    }
    yPosAccess.set(yPosAccess.get() + 2);
  }
  function drawAllFooters() {
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(...NAVY);
      doc.setLineWidth(0.3);
      doc.line(LM, FOOTER_Y - 2, PW - LM, FOOTER_Y - 2);
      doc.setTextColor(...NAVY);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('RCM Automotive Ltd | www.rcmautomotive.co.uk | info@rcmautomotive.co.uk', PW / 2, FOOTER_Y, { align: 'center' });
    }
  }

  return { valWidth, estimateRow, estimateSection, ensureSpace, drawHeader, drawRow, finishSection, drawWarningBox, drawParagraph, drawAllFooters };
}
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

// ═══════════════════════════════════════════
// BRANDED HEADER — RCM logo + full-width navy band
// ═══════════════════════════════════════════
const LOGO_URL = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/3e6371987_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';
let logoCache: { dataUrl: string; w: number; h: number } | null = null;

function parseJpegDimensions(bytes: Uint8Array): [number, number] {
  let i = 2; // skip SOI (FF D8)
  while (i < bytes.length - 8) {
    if (bytes[i] !== 0xFF) { i++; continue; }
    const marker = bytes[i + 1];
    // SOF0–SOF15 (excluding DHT/JPG/DAC) carry width/height
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return [width, height];
    }
    i += 2 + (((bytes[i + 2] << 8) | bytes[i + 3]) || 2);
  }
  return [0, 0];
}

async function getLogo(): Promise<{ dataUrl: string; w: number; h: number }> {
  if (logoCache) return logoCache;
  const res = await fetch(LOGO_URL);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const [w, h] = parseJpegDimensions(bytes);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  const dataUrl = `data:image/jpeg;base64,${btoa(binary)}`;
  logoCache = { dataUrl, w: w || 1, h: h || 1 };
  return logoCache;
}

// Draws the branded header spanning the full top of the first page:
// full-width navy band with the RCM logo on the left and a subtitle on the
// right, then a light claim-reference sub-band. Returns the y position at
// which body content should begin.
export async function drawBrandedHeader(
  doc: any,
  opts: { subtitle: string; claimRef: string; instructionDate?: string }
): Promise<number> {
  const { subtitle, claimRef, instructionDate } = opts;
  const logo = await getLogo();

  // Full-width navy band across the very top of the page
  const BAND_H = 26;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, BAND_H, 'F');

  // Logo — fit to height 18mm, preserve aspect ratio, cap width at 34mm
  const targetH = 18;
  const aspect = logo.w / logo.h;
  let logoW = targetH * aspect;
  let logoH = targetH;
  if (logoW > 34) { logoW = 34; logoH = logoW / aspect; }
  const logoX = LM;
  const logoY = (BAND_H - logoH) / 2;
  try {
    doc.addImage(logo.dataUrl, 'JPEG', logoX, logoY, logoW, logoH);
  } catch {
    // fall back to text wordmark if the image ever fails to embed
    doc.setTextColor(...WHITE);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('RCM Automotive', TX, 16);
  }

  // Subtitle + company line on the right of the navy band
  doc.setTextColor(...WHITE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(subtitle, PW - LM - PAD_X, 12, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('RCM Automotive Ltd', PW - LM - PAD_X, 18, { align: 'right' });

  // Claim reference sub-band
  const SUB_Y = BAND_H + 1;
  const SUB_H = 7;
  doc.setFillColor(240, 240, 240);
  doc.rect(LM, SUB_Y, MW, SUB_H, 'F');
  doc.setTextColor(...DARK_TEXT);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`RCM Claim Reference: ${claimRef}`, TX, SUB_Y + 4.5);
  if (instructionDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Instruction Date: ${instructionDate}`, PW - LM - PAD_X, SUB_Y + 4.5, { align: 'right' });
  }

  return SUB_Y + SUB_H + 4; // content start position
}

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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.user_type !== 'internal') {
      return Response.json({ error: 'Forbidden: Admin or internal users only' }, { status: 403 });
    }

    const { claimId, contactOverrides } = await req.json();

    if (!claimId) {
      return Response.json({ error: 'Missing claimId' }, { status: 400 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    const doc = new jsPDF();

    // ═══════════════════════════════════════════
    // PAGE & MARGIN SETUP (A4, 20mm all sides)
    // ═══════════════════════════════════════════
    const LM = 20;              // left margin mm
    const PW = 210;             // A4 width
    const MW = PW - LM * 2;     // max content width = 170mm
    const PH = 297;             // A4 height
    const TOP = 20;             // top margin
    const BL = PH - 20;         // bottom limit = 277mm
    const FOOTER_Y = 282;       // footer baseline

    // ═══════════════════════════════════════════
    // SPACING & TYPOGRAPHY
    // ═══════════════════════════════════════════
    const SECTION_GAP = 5;      // 16-20px equivalent gap between sections
    const PAD_X = 5;            // internal horizontal padding (16px)
    const PAD_TOP = 4;          // internal top padding (12px)
    const PAD_BOTTOM = 4;       // internal bottom padding (12px)
    const HEADER_H = 8;         // section header bar height
    const ROW_H = 6.2;          // single data row height
    const LINE_H = 5.5;         // line height for wrapped text
    const LABEL_W = 60;         // label column width for two-column layout
    const VAL_GAP = 4;          // gap between label and value columns
    const TX = LM + PAD_X;      // text start X (left margin + pad)
    const VX = TX + LABEL_W + VAL_GAP; // value column X

    // ═══════════════════════════════════════════
    // COLOURS
    // ═══════════════════════════════════════════
    const NAVY = [19, 29, 71];           // RCM brand: #131d47
    const AMBER_BG = [255, 248, 230];    // light amber
    const AMBER_BD = [230, 180, 30];     // amber border
    const RED = [200, 0, 0];
    const MID_GREY = [220, 220, 220];
    const LIGHT_GREY = [245, 245, 248];
    const DARK_TEXT = [40, 40, 40];
    const WHITE = [255, 255, 255];

    // ═══════════════════════════════════════════
    // FIELD DATA
    // ═══════════════════════════════════════════
    const today = new Date().toLocaleDateString('en-GB');
    const formatBool = (v) => (v ? 'Yes' : 'No');

    const clientAddress = [
      claim.client_address_line_1,
      claim.client_address_line_2,
      claim.client_town,
      claim.client_county,
      claim.client_postcode
    ].filter(Boolean).join(', ') || 'N/A';

    const fields = {
      instruction_date: today,
      claim_type: claim.claim_type || 'N/A',
      repairer: claim.bodyshop || 'N/A',
      client_name: claim.client_name || 'N/A',
      client_address: clientAddress,
      driver_contact_name: contactOverrides?.name || claim.driver_contact_name || claim.client_name || 'N/A',
      client_email: contactOverrides?.email || claim.driver_contact_email || claim.client_email || 'N/A',
      client_phone: contactOverrides?.phone || claim.client_phone || 'N/A',
      client_vat_status: claim.client_vat_status || 'N/A',
      make_model: claim.make_model || 'N/A',
      reg: claim.reg || 'N/A',
      vehicle_location: claim.vehicle_location || 'N/A',
      vehicle_damage: claim.vehicle_damage || 'N/A',
      recovery_required: formatBool(claim.recovery_required),
      unroadworthy: formatBool(claim.unroadworthy),
      courtesy_car_required: formatBool(claim.courtesy_car_required),
      insurer: claim.insurer || 'N/A',
      claim_ref: claim.claim_ref || 'N/A',
      policy_number: claim.policy_number || 'N/A',
      send_estimate_email: claim.send_estimate_email || 'N/A',
      audatex_code: claim.audatex_code || 'N/A',
      policy_excess: claim.policy_excess ? Number(claim.policy_excess).toFixed(2) : 'N/A'
    };

    // ═══════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════
    let yPos = TOP;

    // ═══════════════════════════════════════════
    // HELPERS — Height Estimation
    // ═══════════════════════════════════════════

    const valWidth = () => MW - PAD_X * 2 - LABEL_W - VAL_GAP;

    /** Estimate height of a single data row (handles multi-line values) */
    function estimateRow(value) {
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(String(value), valWidth());
      return Math.max(ROW_H, lines.length * ROW_H);
    }

    /** Estimate total height of a section (header + padding + rows + warnings + body blocks) */
    function estimateSection(rows, warnings, bodyBlocks) {
      let h = HEADER_H + PAD_TOP + PAD_BOTTOM;
      // Data rows
      if (rows) {
        for (const [, value] of rows) h += estimateRow(value);
      }
      // Section gap between rows and body text
      if ((rows && rows.length) && (warnings && warnings.length || bodyBlocks && bodyBlocks.length)) h += 2;
      // Body text blocks
      if (bodyBlocks) {
        doc.setFontSize(9);
        for (const { text } of bodyBlocks) {
          const lines = doc.splitTextToSize(String(text), MW - PAD_X * 2);
          h += lines.length * LINE_H + 1;
        }
        h += 2;
      }
      // Warning blocks
      if (warnings) {
        for (const text of warnings) {
          doc.setFontSize(9);
          const lines = doc.splitTextToSize(String(text), MW - PAD_X * 2 - 8);
          h += lines.length * ROW_H + 12; // box padding + text
        }
        h += 3;
      }
      return h;
    }

    /** Page-break if section won't fit; returns new yPos */
    function ensureSpace(neededH) {
      if (yPos + neededH > BL) {
        doc.addPage();
        yPos = TOP;
        return true;
      }
      return false;
    }

    // ═══════════════════════════════════════════
    // HELPERS — Drawing
    // ═══════════════════════════════════════════

    /** Draw a section header bar */
    function drawHeader(title) {
      doc.setFillColor(...NAVY);
      doc.rect(LM, yPos, MW, HEADER_H, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, TX, yPos + 5.5);
      yPos += HEADER_H + PAD_TOP;
    }

    /** Draw a two-column labelled row: bold label | regular value */
    function drawRow(label, value) {
      const vw = valWidth();
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(String(value), vw);
      const rh = Math.max(ROW_H, lines.length * ROW_H);

      if (yPos + rh > BL) { doc.addPage(); yPos = TOP; }

      // Label (bold)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK_TEXT);
      doc.text(label, TX, yPos + 4.2);

      // Value (regular) — top-align with label, but multi-line wrapped
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK_TEXT);
      lines.forEach((line, i) => {
        doc.text(line, VX, yPos + 4.2 + ROW_H * i);
      });

      yPos += rh;
    }

    /** Draw a warning alert box with amber background */
    function drawWarning(text, fontSize = 9) {
      doc.setFontSize(fontSize);
      const ww = MW - PAD_X * 2 - 8;
      const lines = doc.splitTextToSize(text, ww);
      const boxH = 12 + lines.length * ROW_H;

      if (yPos + boxH > BL) { doc.addPage(); yPos = TOP; }

      doc.setFillColor(...AMBER_BG);
      doc.setDrawColor(...AMBER_BD);
      doc.setLineWidth(0.5);
      doc.roundedRect(TX, yPos, MW - PAD_X * 2, boxH, 2, 2, 'FD');

      // "WARNING:" prefix in red bold
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...RED);
      doc.text('WARNING:', TX + 4, yPos + 6);

      // Warning text
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK_TEXT);
      lines.forEach((line, i) => {
        doc.text(line, TX + 4, yPos + 6 + ROW_H * (i + 1));
      });

      yPos += boxH + 3;
    }

    /** Draw body text block (regular paragraphs) */
    function drawBodyText(text, opts = {}) {
      const { bold = false, color = DARK_TEXT } = opts;
      doc.setFontSize(9);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text), MW - PAD_X * 2);
      lines.forEach((line, i) => {
        if (yPos + LINE_H > BL) { doc.addPage(); yPos = TOP; }
        doc.text(line, TX, yPos + 4);
        yPos += LINE_H;
      });
      yPos += 1;
    }

    /** Draw footer on all pages */
    function drawAllFooters() {
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);

        // Thin rule line above footer
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(0.3);
        doc.line(LM, FOOTER_Y - 2, PW - LM, FOOTER_Y - 2);

        // Footer text
        doc.setTextColor(...NAVY);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('RCM Automotive Ltd | www.rcmautomotive.co.uk | info@rcmautomotive.co.uk', PW / 2, FOOTER_Y, { align: 'center' });
      }
    }

    /** Finish a section: add bottom padding and gap */
    function finishSection() {
      yPos += PAD_BOTTOM + SECTION_GAP;
    }

    // ═══════════════════════════════════════════
    // DOCUMENT HEADER
    // ═══════════════════════════════════════════
    {
      // RCM Navy brand bar
      doc.setFillColor(...NAVY);
      doc.rect(LM, 12, MW, 12, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RCM Automotive', TX, 20.5);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Repairer Instruction', PW - LM - PAD_X, 20.5, { align: 'right' });

      // Claim reference sub-bar
      doc.setFillColor(240, 240, 240);
      doc.rect(LM, 25, MW, 7, 'F');
      doc.setTextColor(...DARK_TEXT);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`RCM Claim Reference: ${claim.job_number || 'N/A'}`, TX, 29.5);

      yPos = 37;
    }

    // ═══════════════════════════════════════════
    // SECTION 1 — Client & Repairer Details
    // ═══════════════════════════════════════════
    {
      const rows = [
        ['Instruction Date', fields.instruction_date],
        ['Claim Type', fields.claim_type],
        ['Repairer', fields.repairer],
        ['Client', fields.client_name],
        ['Client Address', fields.client_address],
        ['Contact Name', fields.driver_contact_name],
        ['Email Address', fields.client_email],
        ['Contact Number', fields.client_phone],
        ['Client VAT Status', fields.client_vat_status],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Client & Repairer Details');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
    }

    // ═══════════════════════════════════════════
    // SECTION 2 — Vehicle Details
    // ═══════════════════════════════════════════
    {
      const rows = [
        ['Vehicle Make & Model', fields.make_model],
        ['Vehicle Registration', fields.reg],
        ['Vehicle Location', fields.vehicle_location],
        ['Vehicle Damage', fields.vehicle_damage],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Vehicle Details');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
    }

    // ═══════════════════════════════════════════
    // SECTION 3 — Recovery & Courtesy Details
    // ═══════════════════════════════════════════
    {
      const rows = [
        ['Urgent Recovery Required?', fields.recovery_required],
        ['Vehicle Unroadworthy', fields.unroadworthy],
        ['Courtesy Car Required?', fields.courtesy_car_required],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Recovery & Courtesy Details');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
    }

    // ═══════════════════════════════════════════
    // SECTION 4 — Insurance Details
    // ═══════════════════════════════════════════
    {
      const rows = [
        ['Insurer', fields.insurer],
        ['Claim Number', fields.claim_ref],
        ['Policy Number', fields.policy_number],
        ['Email Estimate to', fields.send_estimate_email],
        ['Audatex Code', fields.audatex_code],
        ['Excess (GBP)', fields.policy_excess],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Insurance Details');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
      // Measure both remaining sections combined
const decalsH = estimateSection(null, [
  'Use of any other supplier for RCM Automotive branded decals is not permitted without prior written approval.',
  'Any repair delayed as a result of the mismanagement of a decal order - including failure to order on time - will result in a charge of GBP 100 per day for each day of delay attributable to the repairer. This will be deducted from any outstanding VAT and excess payments due.',
], [
  { text: 'All repairers MUST use the RCM Automotive approved decal supplier for any branded vehicle decals or signage.' },
  { text: 'Where a vehicle requires decals, these MUST be ordered as soon as the repair is authorised - if the vehicle is already on site, this should be done immediately. If the vehicle has not yet arrived, decals MUST be ordered prior to the vehicle coming on site.' },
  { text: 'Please contact John or Michael Welch at our approved supplier, quoting Orkin as the client and providing the vehicle registration number:' },
]);

const invoicingH = 120; // conservative fixed estimate for invoicing section

const combinedH = decalsH + invoicingH;
const remainingSpace = BL - yPos;

if (remainingSpace < combinedH) {
  doc.addPage(); yPos = TOP;

}
    }

    // ═══════════════════════════════════════════
    // SECTION 5 — Branded Decals & Signage
    // ═══════════════════════════════════════════
    {
      // Pre-measure the entire section before drawing anything
      const bodyParas = [
        'All repairers MUST use the RCM Automotive approved decal supplier for any branded vehicle decals or signage.',
        'Where a vehicle requires decals, these MUST be ordered as soon as the repair is authorised - if the vehicle is already on site, this should be done immediately. If the vehicle has not yet arrived, decals MUST be ordered prior to the vehicle coming on site.',
        'Please contact John or Michael Welch at our approved supplier, quoting Orkin as the client and providing the vehicle registration number:',
      ];
      const warnings = [
        'Use of any other supplier for RCM Automotive branded decals is not permitted without prior written approval.',
        'Any repair delayed as a result of the mismanagement of a decal order - including failure to order on time - will result in a charge of GBP 100 per day for each day of delay attributable to the repairer. This will be deducted from any outstanding VAT and excess payments due.',
      ];

      // Measure body paras
      let estH = HEADER_H + PAD_TOP;
      doc.setFontSize(8.5);
      for (const p of bodyParas) {
        const lines = doc.splitTextToSize(p, MW - PAD_X * 2);
        estH += lines.length * 5.2 + 0.8;
      }
      // Supplier box
      estH += 1.5 + (4 + 5.5 * 4 + 4) + 4; // gap + box + gap
      // Warnings
      for (const w of warnings) {
        const lines = doc.splitTextToSize(w, MW - PAD_X * 2 - 8);
        estH += 12 + lines.length * ROW_H + 3;
      }
      estH += PAD_BOTTOM + SECTION_GAP;

      // If section won't fit, go to next page (should already be page 2)
      ensureSpace(estH);
      drawHeader('Branded Decals & Signage');

      // Body paragraphs
      for (const p of bodyParas) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK_TEXT);
        const lines = doc.splitTextToSize(p, MW - PAD_X * 2);
        for (const line of lines) {
          doc.text(line, TX, yPos + 3.5);
          yPos += 5.2;
        }
        yPos += 0.8;
      }

      yPos += 1.5;

      // Supplier info box
      const supplierLines = [
        { text: 'Signs Plus', bold: true, size: 9.5 },
        { text: '147 Main Road, Biggin Hill, Kent, TN16 3JP', bold: false, size: 8.5 },
        { text: 'Email: enquiries@signsplus.uk', bold: false, size: 8.5 },
        { text: 'Phone: 01959 571 074', bold: false, size: 8.5 },
      ];
      const sBoxH = 4 + 5.5 * supplierLines.length + 4;
      doc.setFillColor(...LIGHT_GREY);
      doc.setDrawColor(180, 180, 190);
      doc.roundedRect(TX + 4, yPos, MW - PAD_X * 2 - 8, sBoxH, 2, 2, 'FD');
      let sy = yPos + 4;
      for (const sl of supplierLines) {
        doc.setFontSize(sl.size);
        doc.setFont('helvetica', sl.bold ? 'bold' : 'normal');
        doc.setTextColor(...DARK_TEXT);
        doc.text(sl.text, TX + 8, sy + 3.5);
        sy += 5.5;
      }
      yPos += sBoxH + 4;

      // Warning boxes
      for (const w of warnings) {
        drawWarning(w, 8.5);
      }

      yPos += PAD_BOTTOM + SECTION_GAP;
    }

    // ═══════════════════════════════════════════
    // SECTION 6 — Invoicing
    // ═══════════════════════════════════════════
    {
      const repairerReferralFee = (claim.referral_fee_repairer != null) ? `${claim.referral_fee_repairer}%` : null;
      const estFee = claim.est_fee ? `GBP ${Number(claim.est_fee).toFixed(2)}` : null;

      const invoicingTexts = [
        "Your invoice for the insurer's element of the repair should be addressed and sent to the authorising party, as instructed on the authority and as per your usual practice.",
        'Your full invoice pack MUST also be sent to invoices@rcmautomotive.co.uk and MUST include: main invoice, any excess or VAT invoices, final authority, and a signed satisfaction note.',
        'Your invoice pack MUST be submitted within 48 hours of vehicle completion approval or final authority being issued - whichever applies.',
        'VAT and excess invoices MUST be made out to RCM Automotive Ltd - payment will be made within 14 days.',
        'Upon receipt of your invoice pack, you will receive an invoice from RCM Automotive for our referral fee, which will be payable within 7 days of invoice.',
      ];
      const criticalLines = [
        'Failure to submit your invoice pack within 48 hours will result in delays to your VAT and excess payment, and an admin charge of GBP 150 will be added to your referral fee invoice.',
        'Failure to pay your referral fee within 7 days will result in an additional admin charge of GBP 150 and removal from the RCM Automotive network.',
      ];
      const BODY_ROW = 5.8;
      const textW = MW - PAD_X * 2;

      // ── Pre-measure entire Invoicing section ──
      let estH = HEADER_H + PAD_TOP;

      // Deductions rows (small)
      let dedRows = 0;
      if (repairerReferralFee) dedRows++;
      if (estFee) dedRows++;
      estH += 7 + (dedRows > 0 ? dedRows * 6.5 : 0) + 4; // header bar + rows + gap

      // Invoicing body text
      doc.setFontSize(8.5);
      estH += 7; // INVOICING & PAYMENTS heading
      for (const t of invoicingTexts) {
        const lines = doc.splitTextToSize(t, textW);
        estH += BODY_ROW * lines.length;
      }
      estH += 1.5; // gap before NEVER INVOICE

      // NEVER INVOICE line
      const neverLines = doc.splitTextToSize('***** NEVER INVOICE THE CLIENT DIRECTLY FOR VAT OR EXCESS *****', textW);
      estH += BODY_ROW * neverLines.length + 1.5;

      // IMPORTANT heading + critical lines
      estH += 6.5;
      for (const t of criticalLines) {
        const lines = doc.splitTextToSize(t, textW);
        estH += BODY_ROW * lines.length;
      }

      // Final notice + disclaimer
      estH += 6.5 + 6.5 + PAD_BOTTOM + SECTION_GAP;

      // Force to next page if entire section won't fit
      ensureSpace(estH);
      drawHeader('Invoicing');

      // ── Invoice Deductions (compact single-column block) ──
      if (repairerReferralFee || estFee) {
        doc.setFillColor(...MID_GREY);
        doc.rect(LM, yPos, MW, 7, 'F');
        doc.setDrawColor(150, 150, 150);
        doc.rect(LM, yPos, MW, 7, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK_TEXT);
        doc.text('Invoice Deductions', TX, yPos + 5);
        yPos += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        if (repairerReferralFee) {
          doc.text(`Rep. Referral Fee: ${repairerReferralFee}`, TX, yPos + 5);
          yPos += 6.5;
        }
        if (estFee) {
          doc.text(`Estimate Fee: ${estFee}`, TX, yPos + 5);
          yPos += 6.5;
        }
        yPos += 3;
      }

      // ── INVOICING & PAYMENTS heading ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...DARK_TEXT);
      doc.text('INVOICING & PAYMENTS', TX, yPos + 5);
      yPos += 7;

      // ── Body text ──
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK_TEXT);
      for (const t of invoicingTexts) {
        const lines = doc.splitTextToSize(t, textW);
        for (const line of lines) {
          doc.text(line, TX, yPos + 4);
          yPos += BODY_ROW;
        }
      }
      yPos += 1.5;

      // ── NEVER INVOICE (red bold, centred) ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...RED);
      const neverWrapped = doc.splitTextToSize('***** NEVER INVOICE THE CLIENT DIRECTLY FOR VAT OR EXCESS *****', textW);
      for (const line of neverWrapped) {
        doc.text(line, PW / 2, yPos + 4, { align: 'center' });
        yPos += BODY_ROW;
      }
      yPos += 1.5;

      // ── IMPORTANT heading ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...RED);
      doc.text('IMPORTANT - FAILURE TO COMPLY', TX, yPos + 5);
      yPos += 6.5;

      // ── Critical lines ──
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK_TEXT);
      for (const t of criticalLines) {
        const lines = doc.splitTextToSize(t, textW);
        for (const line of lines) {
          doc.text(line, TX, yPos + 4);
          yPos += BODY_ROW;
        }
        yPos += 1;
      }
      yPos += 3;

      // ── Final notice ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...RED);
      doc.text('PLEASE DO NOT SEND TO ANY OTHER PARTY WITHOUT PRIOR CONSENT', PW / 2, yPos, { align: 'center' });
      yPos += 6.5;

      // ── Disclaimer ──
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      const disclaimer = '*By accepting this repair instruction, you agree to the T&Cs within the supplied SLA provided with this instruction.';
      const discLines = doc.splitTextToSize(disclaimer, MW);
      for (const line of discLines) {
        doc.text(line, PW / 2, yPos, { align: 'center' });
        yPos += 5;
      }

      yPos += PAD_BOTTOM + SECTION_GAP;
    }

    // ═══════════════════════════════════════════
    // FOOTERS — on every page
    // ═══════════════════════════════════════════
    drawAllFooters();

    console.log('PDF generation complete');

    const pdfBytes = doc.output('arraybuffer');

    // Upload & save to claim
    try {
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${claim.job_number || 'instruction'}-${timestamp}.pdf`;
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
      console.log('PDF uploaded:', uploadResult.file_url);

      const currentFileUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
      await base44.asServiceRole.entities.Claim.update(claim.id, {
        file_urls: [...currentFileUrls, uploadResult.file_url],
        instruction_pdf_url: uploadResult.file_url
      });
      console.log('PDF saved to claim documents');
    } catch (uploadError) {
      console.error('Failed to upload PDF:', uploadError);
    }

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${claim.job_number || 'instruction'}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
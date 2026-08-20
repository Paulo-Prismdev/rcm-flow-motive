import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.user_type !== 'internal') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { claimId, contactOverrides, templateType, saveToClaim = true, repairerName: repairerOverride } = await req.json();
    if (!claimId) return Response.json({ error: 'Missing claimId' }, { status: 400 });

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    // ── Resolve the repairer name: prefer an explicit override (passed from
    //    the wizard before allocation), then the claim's bodyshop field, then
    //    a lookup by bodyshop_id ──
    let repairerName = repairerOverride || claim.bodyshop || '';
    if (!repairerName && claim.bodyshop_id) {
      try {
        const bodyshop = await base44.asServiceRole.entities.Bodyshop.get(claim.bodyshop_id);
        if (bodyshop?.name) repairerName = bodyshop.name;
      } catch (_) { /* ignore — fall back to N/A */ }
    }

    const isOrkin = templateType === 'orkin';
    const isPrivate = templateType === 'private';
    const isThirdParty = templateType === 'third_party';

    const doc = new jsPDF();

    // ═══════════════════════════════════════════
    // PAGE & MARGIN SETUP
    // ═══════════════════════════════════════════
    const LM = 20;
    const PW = 210;
    const MW = PW - LM * 2;
    const PH = 297;
    const TOP = 20;
    const BL = PH - 25;
    const FOOTER_Y = 286;
    const PAD_X = 5;
    const PAD_TOP = 4;
    const PAD_BOTTOM = 4;
    const SECTION_GAP = 5;
    const HEADER_H = 8;
    const ROW_H = 6.2;
    const LABEL_W = 60;
    const VAL_GAP = 4;
    const TX = LM + PAD_X;
    const VX = TX + LABEL_W + VAL_GAP;

    // ═══════════════════════════════════════════
    // COLOURS
    // ═══════════════════════════════════════════
    const NAVY = [19, 29, 71];
    const AMBER_BG = [255, 248, 230];
    const AMBER_BD = [230, 180, 30];
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

    // ── Determine which insurer's details to display on the PDF ──
    // The wizard sets `authorised_by`: "Client Insurer", "Third Party Insurer", or "Uninsured"
    const authorisedBy = claim.authorised_by || 'Client Insurer';
    let displayInsurer, displayClaimRef, displayPolicyNumber, displayPolicyExcess;
    if (authorisedBy === 'Third Party Insurer') {
      displayInsurer = claim.tp_insurer || 'N/A';
      displayClaimRef = claim.tp_claim_ref || 'N/A';
      displayPolicyNumber = claim.tp_policy_number || 'N/A';
      displayPolicyExcess = claim.tp_policy_excess != null && claim.tp_policy_excess !== ''
        ? (isNaN(Number(claim.tp_policy_excess)) ? String(claim.tp_policy_excess) : Number(claim.tp_policy_excess).toFixed(2))
        : 'N/A';
    } else if (authorisedBy === 'Third Party') {
      displayInsurer = 'N/A';
      displayClaimRef = 'N/A';
      displayPolicyNumber = 'N/A';
      displayPolicyExcess = 'N/A';
    } else if (authorisedBy === 'Uninsured') {
      displayInsurer = 'N/A';
      displayClaimRef = 'N/A';
      displayPolicyNumber = 'N/A';
      displayPolicyExcess = claim.policy_excess != null && claim.policy_excess !== ''
        ? (isNaN(Number(claim.policy_excess)) ? String(claim.policy_excess) : Number(claim.policy_excess).toFixed(2))
        : 'N/A';
    } else {
      displayInsurer = claim.insurer || 'N/A';
      displayClaimRef = claim.claim_ref || 'N/A';
      displayPolicyNumber = claim.policy_number || 'N/A';
      displayPolicyExcess = claim.policy_excess != null && claim.policy_excess !== ''
        ? (isNaN(Number(claim.policy_excess)) ? String(claim.policy_excess) : Number(claim.policy_excess).toFixed(2))
        : 'N/A';
    }

    const fields = {
      instruction_date: today,
      claim_type: claim.claim_type || 'N/A',
      repairer: repairerName || 'N/A',
      client_name: claim.client_name || 'N/A',
      client_address: clientAddress,
      driver_contact_name: claim.instruction_contact_name || contactOverrides?.name || claim.driver_contact_name || claim.client_name || 'N/A',
      client_email: claim.instruction_contact_email || contactOverrides?.email || claim.driver_contact_email || claim.client_email || 'N/A',
      client_phone: claim.instruction_contact_phone || contactOverrides?.phone || claim.client_phone || 'N/A',
      client_vat_status: claim.client_vat_status || 'N/A',
      make_model: claim.make_model || 'N/A',
      reg: claim.reg || 'N/A',
      vehicle_location: claim.vehicle_location || 'N/A',
      vehicle_damage: claim.vehicle_damage || 'N/A',
      recovery_required: formatBool(claim.recovery_required),
      unroadworthy: formatBool(claim.unroadworthy),
      courtesy_car_required: formatBool(claim.courtesy_car_required),
      insurer: displayInsurer,
      claim_ref: displayClaimRef,
      policy_number: displayPolicyNumber,
      send_estimate_email: claim.send_estimate_email || 'N/A',
      audatex_code: claim.audatex_code || 'N/A',
      policy_excess: displayPolicyExcess,
      tp_name: claim.tp_name || 'N/A',
      tp_phone: claim.tp_phone || 'N/A',
      tp_email: claim.tp_email || 'N/A',
      tp_address: [
        claim.tp_address_line_1,
        claim.tp_address_line_2,
        claim.tp_town,
        claim.tp_county,
        claim.tp_postcode
      ].filter(Boolean).join(', ') || 'N/A',
      referral_fee: (claim.referral_fee_repairer != null && claim.referral_fee_repairer !== '' && claim.referral_fee_repairer !== 0)
        ? `${claim.referral_fee_repairer}%`
        : (claim.referral_fee_repairer_gbp ? '0%' : '20%'),
      referral_fee_gbp: claim.referral_fee_repairer_gbp != null && claim.referral_fee_repairer_gbp !== '' ? `GBP ${Number(claim.referral_fee_repairer_gbp).toFixed(2)}` : null,
    };

    // ── Insurer party label for the Insurance Details section header ──
    const insurerPartyLabel = authorisedBy === 'Third Party Insurer'
      ? 'Third Party Insurer'
      : authorisedBy === 'Third Party'
        ? 'Third Party'
        : authorisedBy === 'Uninsured'
          ? 'Uninsured'
          : 'Insured (Client)';

    let yPos = TOP;

    // ═══════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════

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
      if (yPos + neededH > BL) { doc.addPage(); yPos = TOP; return true; }
      return false;
    }

    function drawHeader(title) {
      doc.setFillColor(...NAVY);
      doc.rect(LM, yPos, MW, HEADER_H, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, TX, yPos + 5.5);
      yPos += HEADER_H + PAD_TOP;
    }

    function drawRow(label, value) {
      const vw = valWidth();
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(String(value), vw);
      const rh = Math.max(ROW_H, lines.length * ROW_H);
      if (yPos + rh > BL) { doc.addPage(); yPos = TOP; }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK_TEXT);
      doc.text(label, TX, yPos + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK_TEXT);
      lines.forEach((line, i) => { doc.text(line, VX, yPos + 4.2 + ROW_H * i); });
      yPos += rh;
    }

    function finishSection() {
      yPos += PAD_BOTTOM + SECTION_GAP;
    }

    function drawWarningBox(label, text, fontSize, lineHeight) {
      const textW = MW - PAD_X * 2;
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, textW - 8);
      const boxH = 9 + lines.length * lineHeight;
      doc.setFillColor(...AMBER_BG);
      doc.setDrawColor(...AMBER_BD);
      doc.setLineWidth(0.5);
      doc.roundedRect(TX, yPos, textW, boxH, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...RED);
      doc.text(`${label}:`, TX + 3, yPos + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK_TEXT);
      for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], TX + 3, yPos + 5 + lineHeight * (i + 1));
      }
      yPos += boxH + 2.5;
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

    // ═══════════════════════════════════════════
    // DOCUMENT HEADER
    // ═══════════════════════════════════════════
    doc.setFillColor(...NAVY);
    doc.rect(LM, 12, MW, 12, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RCM Automotive', TX, 20.5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Repairer Instruction', PW - LM - PAD_X, 20.5, { align: 'right' });
    doc.setFillColor(240, 240, 240);
    doc.rect(LM, 25, MW, 7, 'F');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`RCM Claim Reference: ${claim.job_number || 'N/A'}`, TX, 29.5);
    yPos = 37;

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
    // SECTION 4 — Insurance Details (or Non-Insurance notice)
    // ═══════════════════════════════════════════
    // "Paying Privately" template skips the insurance section entirely.
    if (isPrivate) {
      // No insurance section for private repairs — just add spacing.
      yPos += SECTION_GAP;
    } else if (authorisedBy === 'Third Party') {
      // Third Party paying directly — show invoice details in place of insurer
      const tpRows = [
        ['Third Party Name', fields.tp_name],
        ['Third Party Address', fields.tp_address],
        ['Send Invoice To', 'invoices@rcmautomotive.co.uk'],
      ];
      ensureSpace(estimateSection(tpRows));
      drawHeader('Third Party Invoice Details');
      for (const [label, value] of tpRows) drawRow(label, value);
      finishSection();

      // Estimate & Authority section for third-party direct instructions
      const eaRows = [
        ['Send Estimate To', 'claims@rcmautomotive.co.uk'],
      ];
      ensureSpace(estimateSection(eaRows));
      drawHeader('Estimate & Authority');
      for (const [label, value] of eaRows) drawRow(label, value);
      finishSection();
    } else if (authorisedBy === 'Uninsured') {
      // Non-insurance / paying privately — no insurer details shown
      const textW = MW - PAD_X * 2;
      const noticeLines = doc.splitTextToSize(
        'This repair is being carried out on a Non-Insurance basis — the client is Paying Privately. There is no insurer involvement and no insurance claim reference for this job.',
        textW - 8
      );
      const noticeBoxH = 11 + noticeLines.length * 5.2;
      ensureSpace(noticeBoxH + SECTION_GAP);
      doc.setFillColor(...NAVY);
      doc.roundedRect(LM, yPos, MW, noticeBoxH, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...WHITE);
      doc.text('NON-INSURANCE — PAYING PRIVATELY', TX + 3, yPos + 7.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(220, 222, 230);
      for (let i = 0; i < noticeLines.length; i++) {
        doc.text(noticeLines[i], TX + 3, yPos + 7.5 + 5.2 * (i + 1));
      }
      yPos += noticeBoxH + SECTION_GAP;
    } else {
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
      // ── Party badge: shows whose insurance details these are ──
      const badgeW = 42;
      const badgeH = 5;
      const badgeX = LM + MW - PAD_X - badgeW;
      const badgeY = yPos - HEADER_H - PAD_TOP + (HEADER_H - badgeH) / 2;
      const badgeColor = authorisedBy === 'Third Party Insurer' ? [200, 0, 0] : [0, 120, 60];
      doc.setFillColor(...badgeColor);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(insurerPartyLabel.toUpperCase(), badgeX + badgeW / 2, badgeY + 3.5, { align: 'center' });
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
    }

    // ═══════════════════════════════════════════
    // PAGE 2
    // ═══════════════════════════════════════════
    doc.addPage();
    yPos = TOP;

    if (isOrkin) {

      // ═══════════════════════════════════════════
      // ORKIN — SECTION 5: Branded Decals & Signage
      // ═══════════════════════════════════════════
      {
        const FS = 8;
        const LH = 4.8;
        const textW = MW - PAD_X * 2;

        drawHeader('Branded Decals & Signage');

        const bodyParas = [
          'All repairers MUST use the RCM Automotive approved decal supplier for any branded vehicle decals or signage.',
          'Where a vehicle requires decals, these MUST be ordered as soon as the repair is authorised - if the vehicle is already on site, this should be done immediately. If the vehicle has not yet arrived, decals MUST be ordered prior to the vehicle coming on site.',
          'Please contact John or Michael Welch at our approved supplier, quoting Orkin as the client and providing the vehicle registration number:',
        ];

        doc.setFontSize(FS);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK_TEXT);
        for (const p of bodyParas) {
          const lines = doc.splitTextToSize(p, textW);
          for (const line of lines) { doc.text(line, TX, yPos + 3.2); yPos += LH; }
          yPos += 1;
        }

        yPos += 1;

        // Supplier box
        const supplierLines = [
          { text: 'Signs Plus', bold: true, size: 9 },
          { text: '147 Main Road, Biggin Hill, Kent, TN16 3JP', bold: false, size: 8 },
          { text: 'Email: enquiries@signsplus.uk', bold: false, size: 8 },
          { text: 'Phone: 01959 571 074', bold: false, size: 8 },
        ];
        const sBoxH = 3 + 5 * supplierLines.length + 3;
        doc.setFillColor(...LIGHT_GREY);
        doc.setDrawColor(180, 180, 190);
        doc.roundedRect(TX + 4, yPos, textW - 8, sBoxH, 2, 2, 'FD');
        let sy = yPos + 3;
        for (const sl of supplierLines) {
          doc.setFontSize(sl.size);
          doc.setFont('helvetica', sl.bold ? 'bold' : 'normal');
          doc.setTextColor(...DARK_TEXT);
          doc.text(sl.text, TX + 8, sy + 3.2);
          sy += 5;
        }
        yPos += sBoxH + 3;

        drawWarningBox('WARNING', 'Use of any other supplier for RCM Automotive branded decals is not permitted without prior written approval.', FS, LH);
        drawWarningBox('WARNING', 'Any repair delayed as a result of the mismanagement of a decal order - including failure to order on time - will result in a charge of GBP 100 per day for each day of delay attributable to the repairer. This will be deducted from any outstanding VAT and excess payments due.', FS, LH);

        yPos += 3;
      }

      // ═══════════════════════════════════════════
      // ORKIN — SECTION 6: Invoicing
      // ═══════════════════════════════════════════
      {
        const FS = 8;
        const LH = 4.8;
        const textW = MW - PAD_X * 2;

        drawHeader('Invoicing');

        // Deductions bar
        doc.setFillColor(...MID_GREY);
        doc.setDrawColor(150, 150, 150);
        doc.rect(LM, yPos, MW, 6, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK_TEXT);
        doc.text('Invoice Deductions', TX, yPos + 4.2);
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...NAVY);
        doc.text(`Repairer Referral Fee ${fields.referral_fee}`, TX, yPos + 6);
        if (fields.referral_fee_gbp) {
          doc.text(`Repairer Referral Fee ${fields.referral_fee_gbp}`, PW - LM - PAD_X, yPos + 6, { align: 'right' });
        }
        yPos += 9;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FS);
        doc.setTextColor(...DARK_TEXT);
        yPos += 2;

        // INVOICING & PAYMENTS heading
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...DARK_TEXT);
        doc.text('INVOICING & PAYMENTS', TX, yPos + 4);
        yPos += 6;

        // Body paragraphs
        const bodyLines = [
          "Your invoice for the insurer's element of the repair should be addressed and sent to the authorising party, as instructed on the authority and as per your usual practice.",
          'Your full invoice pack MUST also be sent to invoices@rcmautomotive.co.uk and MUST include: main invoice, any excess or VAT invoices, final authority, and a signed satisfaction note.',
          'Your invoice pack MUST be submitted within 48 hours of vehicle completion approval or final authority being issued - whichever applies.',
          'VAT and excess invoices MUST be made out to RCM Automotive Ltd - payment will be made within 14 days.',
          'Upon receipt of your invoice pack, you will receive an invoice from RCM Automotive for our referral fee, which will be payable within 7 days of invoice.',
        ];
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FS);
        doc.setTextColor(...DARK_TEXT);
        for (const t of bodyLines) {
          const wrapped = doc.splitTextToSize(t, textW);
          for (const line of wrapped) { doc.text(line, TX, yPos + 3.2); yPos += LH; }
          yPos += 1;
        }

        yPos += 1;

        drawWarningBox('WARNING', 'NEVER INVOICE THE CLIENT DIRECTLY FOR VAT OR EXCESS', FS, LH);
        drawWarningBox('IMPORTANT', 'Failure to submit your invoice pack within 48 hours will result in delays to your VAT and excess payment, and an admin charge of GBP 150 will be added to your referral fee invoice.', FS, LH);
        drawWarningBox('IMPORTANT', 'Failure to pay your referral fee within 7 days will result in an additional admin charge of GBP 150 and removal from the RCM Automotive network.', FS, LH);

        yPos += 2;

        // Final notice
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FS);
        doc.setTextColor(...RED);
        doc.text('PLEASE DO NOT SEND TO ANY OTHER PARTY WITHOUT PRIOR CONSENT', PW / 2, yPos + 3.2, { align: 'center' });
        yPos += 6;

        // Disclaimer
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(80, 80, 80);
        const discW = doc.splitTextToSize('*By accepting this repair instruction, you agree to the T&Cs within the supplied SLA provided with this instruction.', MW);
        for (const line of discW) { doc.text(line, PW / 2, yPos + 3.2, { align: 'center' }); yPos += LH; }
      }

    } else if (isThirdParty) {

      // ═══════════════════════════════════════════
      // THIRD PARTY PAYING — Invoicing
      // ═══════════════════════════════════════════
      {
        const FS = 9;
        const LH = 5.5;
        const textW = MW - PAD_X * 2;

        drawHeader('Invoicing');

        // Deductions bar
        doc.setFillColor(...MID_GREY);
        doc.setDrawColor(150, 150, 150);
        doc.rect(LM, yPos, MW, 6, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK_TEXT);
        doc.text('Invoice Deductions', TX, yPos + 4.2);
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...NAVY);
        doc.text(`Repairer Referral Fee ${fields.referral_fee}`, TX, yPos + 6);
        if (fields.referral_fee_gbp) {
          doc.text(`Repairer Referral Fee ${fields.referral_fee_gbp}`, PW - LM - PAD_X, yPos + 6, { align: 'right' });
        }
        yPos += 9;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FS);
        doc.setTextColor(...DARK_TEXT);
        yPos += 2;

        // Body text
        const invoicingParas = [
          'This repair is being carried out on a Third-Party Paying basis. The third party named on this instruction is responsible for payment of the repair directly.',
          'Your full invoice MUST be addressed to the third party and a copy sent to invoices@rcmautomotive.co.uk.',
          'Your invoice pack MUST include: main invoice, final authority (if applicable), and a signed satisfaction note.',
          'Your invoice MUST be submitted within 48 hours of vehicle completion.',
          'Payment will be made within 14 DAYS of receipt of your invoice.',
          `Upon receipt of your invoice, you will receive an invoice from RCM Automotive for our referral fee (${fields.referral_fee}), which will be payable within 7 days of invoice.`,
        ];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FS);
        doc.setTextColor(...DARK_TEXT);
        for (const p of invoicingParas) {
          const wrapped = doc.splitTextToSize(p, textW);
          for (const line of wrapped) { doc.text(line, TX, yPos + 4); yPos += LH; }
          yPos += 2;
        }

        yPos += 2;

        drawWarningBox('WARNING', 'NEVER SEND ANY INVOICE OR COMMUNICATION DIRECTLY TO THE CLIENT', FS, LH);
        drawWarningBox('IMPORTANT', 'Failure to submit your invoice pack within 48 hours will result in delays to your payment, and an admin charge of GBP 150 will be added to your referral fee invoice.', FS, LH);
        drawWarningBox('IMPORTANT', 'Failure to pay your referral fee within 7 days will result in an additional admin charge of GBP 150 and removal from the RCM Automotive network.', FS, LH);

        yPos += 4;

        // Disclaimer
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const discW = doc.splitTextToSize('*By accepting this instruction, you agree to the T&Cs within the supplied SLA provided with this instruction.', MW);
        for (const line of discW) { doc.text(line, PW / 2, yPos + 3.2, { align: 'center' }); yPos += LH; }
      }

    } else if (isPrivate) {

      // ═══════════════════════════════════════════
      // PAYING PRIVATELY — Invoicing
      // ═══════════════════════════════════════════
      {
        const FS = 9;
        const LH = 5.5;
        const textW = MW - PAD_X * 2;

        drawHeader('Invoicing');

        // Deductions bar
        doc.setFillColor(...MID_GREY);
        doc.setDrawColor(150, 150, 150);
        doc.rect(LM, yPos, MW, 6, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK_TEXT);
        doc.text('Invoice Deductions', TX, yPos + 4.2);
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...NAVY);
        doc.text(`Repairer Referral Fee ${fields.referral_fee}`, TX, yPos + 6);
        if (fields.referral_fee_gbp) {
          doc.text(`Repairer Referral Fee ${fields.referral_fee_gbp}`, PW - LM - PAD_X, yPos + 6, { align: 'right' });
        }
        yPos += 9;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FS);
        doc.setTextColor(...DARK_TEXT);
        yPos += 2;

        // Body text
        const invoicingParas = [
          'This repair is being carried out on a non-insurance (Paying Privately) basis. There is no insurer involvement.',
          'Your full invoice MUST be addressed to RCM Automotive Ltd and sent to invoices@rcmautomotive.co.uk.',
          'Your invoice pack MUST include: main invoice, final authority (if applicable), and a signed satisfaction note.',
          'Your invoice MUST be submitted within 48 hours of vehicle completion.',
          'Payment will be made within 14 DAYS of receipt of your invoice.',
          `Upon receipt of your invoice, you will receive an invoice from RCM Automotive for our referral fee (${fields.referral_fee}), which will be payable within 7 days of invoice.`,
        ];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FS);
        doc.setTextColor(...DARK_TEXT);
        for (const p of invoicingParas) {
          const wrapped = doc.splitTextToSize(p, textW);
          for (const line of wrapped) { doc.text(line, TX, yPos + 4); yPos += LH; }
          yPos += 2;
        }

        yPos += 2;

        drawWarningBox('WARNING', 'NEVER SEND ANY INVOICE OR COMMUNICATION DIRECTLY TO THE CLIENT', FS, LH);
        drawWarningBox('IMPORTANT', 'Failure to submit your invoice pack within 48 hours will result in delays to your payment, and an admin charge of GBP 150 will be added to your referral fee invoice.', FS, LH);
        drawWarningBox('IMPORTANT', 'Failure to pay your referral fee within 7 days will result in an additional admin charge of GBP 150 and removal from the RCM Automotive network.', FS, LH);

        yPos += 4;

        // Disclaimer
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const discW = doc.splitTextToSize('*By accepting this instruction, you agree to the T&Cs within the supplied SLA provided with this instruction.', MW);
        for (const line of discW) { doc.text(line, PW / 2, yPos + 3.2, { align: 'center' }); yPos += LH; }
      }

    } else {

      // ═══════════════════════════════════════════
      // STANDARD — Invoicing
      // ═══════════════════════════════════════════
      {
        const FS = 9;
        const LH = 5.5;
        const textW = MW - PAD_X * 2;

        drawHeader('Invoicing');

        // Deductions bar
        doc.setFillColor(...MID_GREY);
        doc.setDrawColor(150, 150, 150);
        doc.rect(LM, yPos, MW, 6, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK_TEXT);
        doc.text('Invoice Deductions', TX, yPos + 4.2);
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...NAVY);
        doc.text(`Repairer Referral Fee ${fields.referral_fee}`, TX, yPos + 6);
        if (fields.referral_fee_gbp) {
          doc.text(`Repairer Referral Fee ${fields.referral_fee_gbp}`, PW - LM - PAD_X, yPos + 6, { align: 'right' });
        }
        yPos += 9;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FS);
        doc.setTextColor(...DARK_TEXT);
        yPos += 2;

        // Body text
        const invoicingParas = [
          'Your invoice should be addressed and sent to the authorising party, as instructed on the authority and as per your usual practice.',
          'A copy of the final invoice, authority and collection note must be emailed to invoices@rcmautomotive.co.uk',
          `You will receive an invoice from RCM for ${fields.referral_fee} of the final repair figure and will be payable within 7 DAYS of invoice.`,
        ];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FS);
        doc.setTextColor(...DARK_TEXT);
        for (const p of invoicingParas) {
          const wrapped = doc.splitTextToSize(p, textW);
          for (const line of wrapped) { doc.text(line, TX, yPos + 4); yPos += LH; }
          yPos += 2;
        }

        yPos += 2;

        drawWarningBox('IMPORTANT', 'Failure to submit your invoice pack within 48 hours will result in delays to your VAT and excess payment, and an admin charge of GBP 150 will be added to your referral fee invoice.', FS, LH);
        drawWarningBox('IMPORTANT', 'Failure to pay your referral fee within 7 days will result in an additional admin charge of GBP 150 and removal from the RCM Automotive network.', FS, LH);

        yPos += 4;

        // Disclaimer
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        const discW = doc.splitTextToSize('*By accepting this instruction, you agree to the T&Cs within the supplied SLA provided with this instruction.', MW);
        for (const line of discW) { doc.text(line, PW / 2, yPos + 3.2, { align: 'center' }); yPos += LH; }
      }
    }

    // ═══════════════════════════════════════════
    // FOOTERS — on every page
    // ═══════════════════════════════════════════
    drawAllFooters();

    const pdfBytes = doc.output('arraybuffer');
    const filename = `${claim.job_number || 'instruction'}-${isOrkin ? 'orkin' : isPrivate ? 'private' : isThirdParty ? 'third-party' : 'standard'}.pdf`;

    // Upload the PDF. Only persist it to the claim's docs when saveToClaim is
    // true — the allocation wizard generates with saveToClaim=false so that
    // regenerating doesn't pile up unused PDFs; the final PDF is saved at the
    // point of allocating the repairer instead.
    let file_url = null;
    try {
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
      file_url = uploadResult.file_url;
      if (saveToClaim) {
        const currentFileUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
        await base44.asServiceRole.entities.Claim.update(claim.id, {
          file_urls: [...currentFileUrls, file_url],
          instruction_pdf_url: file_url
        });
      }
    } catch (uploadError) {
      console.error('Failed to upload PDF:', uploadError);
      return Response.json({ error: 'Failed to upload PDF: ' + uploadError.message }, { status: 500 });
    }

    return Response.json({ file_url, filename });

  } catch (error) {
    console.error('PDF generation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { requireInternalUser } from '../../shared/internalAccess.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Internal-only: purchase orders are produced by internal staff.
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;

    // `total` is the amount the user confirmed on the issue screen. Without it the
    // figure is resolved the same way that screen resolves it, so an order is never
    // issued at whatever field happened to be first.
    const { claimId, saveToClaim = true, total: confirmedTotal } = await req.json();
    if (!claimId) return Response.json({ error: 'Missing claimId' }, { status: 400 });

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    // ── Resolve the repairer name (supplier on the PO) ──
    let repairerName = claim.bodyshop || '';
    let repairerEmail = claim.bodyshop_email || '';
    if (!repairerName && claim.bodyshop_id) {
      try {
        const bodyshop = await base44.asServiceRole.entities.Bodyshop.get(claim.bodyshop_id);
        if (bodyshop?.name) repairerName = bodyshop.name;
        if (bodyshop?.email) repairerEmail = bodyshop.email;
      } catch (_) { /* ignore */ }
    }

    // ── The figure the order is issued at: the latest authorised amount — the
    //    supplementary authority where there is one, otherwise the initial authority —
    //    and failing any authority the latest estimate the same way. A supplementary
    //    figure is a revised total, so it replaces the one before it. ──
    const records = claim.invoice_tracker?.documents || {};
    const firstFigure = (...values: any[]) => {
      for (const value of values) {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return 0;
    };
    const confirmed = Number(confirmedTotal);
    const authorityFigure = Number.isFinite(confirmed) && confirmed > 0
      ? Math.round(confirmed * 100) / 100
      : firstFigure(
        records.supplementary_authority?.gross,
        claim.supplementary_authority_cost_gross,
        claim.authority_cost_gross,
        records.initial_authority?.gross,
        records.supplementary_estimate?.gross,
        claim.supplementary_estimate_cost_gross,
        claim.estimate_cost_gross,
        claim.authority_cost_net,
        claim.estimate_cost_net,
      );

    const fmtMoney = (n) => {
      const v = Number(n) || 0;
      return `£${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // ── PO number: the job number with PO1, PO2 … for each revision ──
    // A revised order replaces the one before it: the newest is the Final Purchase
    // Order the repairer's invoice is measured against, and the earlier ones stay on
    // the claim marked superseded.
    const reg = (claim.reg || '').toString().toUpperCase().replace(/\s+/g, '');
    const jobNumber = claim.job_number || 'PO';
    const existingOrders = Array.isArray(claim.invoice_tracker?.purchase_orders)
      ? claim.invoice_tracker.purchase_orders.filter((po: any) => po && po.number)
      : [];
    const poNumber = `${jobNumber}-PO${existingOrders.length + 1}`;

    // ── The amount, split the way the order states it ──
    const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
    const poNet = round2(authorityFigure / 1.2);
    const poVat = round2(authorityFigure - poNet);
    const poTotal = round2(authorityFigure);

    const today = new Date().toISOString().split('T')[0];
    const todayPrinted = new Date().toLocaleDateString('en-GB');

    const doc = new jsPDF();

    // ═══════════════════════════════════════════
    // LAYOUT CONSTANTS
    // ═══════════════════════════════════════════
    const LM = 20;
    const PW = 210;
    const MW = PW - LM * 2;
    const NAVY = [19, 29, 71];
    const DARK_TEXT = [40, 40, 40];
    const WHITE = [255, 255, 255];
    const LIGHT_GREY = [245, 245, 248];
    const MID_GREY = [220, 220, 220];

    // ═══════════════════════════════════════════
    // LOGO + HEADER BAR (logo inside navy block)
    // ═══════════════════════════════════════════
    const logoUrl = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';
    let logoDataUrl = null;
    let logoProps = null;
    try {
      const logoResp = await fetch(logoUrl);
      if (logoResp.ok) {
        const logoBuffer = await logoResp.arrayBuffer();
        const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoBuffer)));
        logoDataUrl = `data:image/jpeg;base64,${logoBase64}`;
        logoProps = doc.getImageProperties(logoDataUrl);
      }
    } catch (_) { /* ignore logo errors */ }

    const headerY = 14;
    const headerH = 22;
    doc.setFillColor(...NAVY);
    doc.rect(LM, headerY, MW, headerH, 'F');

    // Logo inside the navy bar — left side, correct aspect ratio
    if (logoDataUrl && logoProps) {
      const maxLogoH = 16;
      const maxLogoW = 45;
      const ratio = logoProps.width / logoProps.height;
      let lh = maxLogoH;
      let lw = lh * ratio;
      if (lw > maxLogoW) { lw = maxLogoW; lh = lw / ratio; }
      const lx = LM + 4;
      const ly = headerY + (headerH - lh) / 2;
      doc.addImage(logoDataUrl, 'JPEG', lx, ly, lw, lh);
    }

    // PURCHASE ORDER title — centred in the bar
    doc.setTextColor(...WHITE);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', PW / 2, headerY + 10, { align: 'center' });
    // Company contact — right side of the bar
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('RCM Automotive Ltd', PW - LM - 5, headerY + 9, { align: 'right' });
    doc.text('info@rcmautomotive.co.uk', PW - LM - 5, headerY + 15, { align: 'right' });

    // ═══════════════════════════════════════════
    // PO META BOX (PO number, date, reference)
    // ═══════════════════════════════════════════
    let y = headerY + headerH + 6;
    doc.setFillColor(...LIGHT_GREY);
    doc.setDrawColor(...MID_GREY);
    doc.roundedRect(LM, y, MW, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 110);
    doc.text('PO NUMBER', LM + 5, y + 6);
    doc.text('DATE', LM + 70, y + 6);
    doc.text('REFERENCE (REG / JOB)', LM + 120, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK_TEXT);
    doc.text(poNumber, LM + 5, y + 13);
    doc.text(todayPrinted, LM + 70, y + 13);
    const refText = [reg, jobNumber].filter(Boolean).join('  ·  ') || 'N/A';
    doc.text(doc.splitTextToSize(refText, 65), LM + 120, y + 13);

    y += 24;

    // ═══════════════════════════════════════════
    // SUPPLIER (TO) + DELIVER TO
    // ═══════════════════════════════════════════
    const colW = (MW - 6) / 2;
    const colX2 = LM + colW + 6;

    // Supplier box
    doc.setFillColor(...NAVY);
    doc.rect(LM, y, colW, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER (TO)', LM + 3, y + 5);
    y += 7;
    doc.setDrawColor(...MID_GREY);
    doc.setFillColor(...WHITE);
    doc.rect(LM, y, colW, 22, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    doc.setFont('helvetica', 'bold');
    doc.text(repairerName || 'N/A', LM + 3, y + 6);
    doc.setFont('helvetica', 'normal');
    if (repairerEmail) doc.text(doc.splitTextToSize(repairerEmail, colW - 6), LM + 3, y + 12);
    const supplierY = y;

    // Deliver To box (right column) — starts at same top as supplier header
    let y2 = y - 7;
    doc.setFillColor(...NAVY);
    doc.rect(colX2, y2, colW, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVER TO / CLIENT', colX2 + 3, y2 + 5);
    y2 += 7;
    doc.setDrawColor(...MID_GREY);
    doc.setFillColor(...WHITE);
    doc.rect(colX2, y2, colW, 22, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    doc.setFont('helvetica', 'bold');
    doc.text(claim.client_name || 'N/A', colX2 + 3, y2 + 6);
    doc.setFont('helvetica', 'normal');
    const clientAddr = [
      claim.client_address_line_1,
      claim.client_address_line_2,
      [claim.client_town, claim.client_county, claim.client_postcode].filter(Boolean).join(', '),
    ].filter(Boolean);
    let ay = y2 + 12;
    for (const line of clientAddr.slice(0, 3)) {
      doc.text(doc.splitTextToSize(line, colW - 6), colX2 + 3, ay);
      ay += 5;
    }

    y = Math.max(y + 22, y2 + 22) + 8;

    // ═══════════════════════════════════════════
    // VEHICLE / JOB DETAILS
    // ═══════════════════════════════════════════
    doc.setFillColor(...NAVY);
    doc.rect(LM, y, MW, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('VEHICLE & JOB DETAILS', LM + 3, y + 5);
    y += 7;
    doc.setDrawColor(...MID_GREY);
    doc.setFillColor(...WHITE);
    const detailRows = [
      ['Vehicle Make & Model', claim.make_model || 'N/A'],
      ['Vehicle Registration', reg || 'N/A'],
      ['Job Number', jobNumber],
      ['Claim Type', claim.claim_type || 'N/A'],
      ['Insurer', claim.insurer || 'N/A'],
      ['Claim Reference', claim.claim_ref || 'N/A'],
    ];
    const detailH = detailRows.length * 6 + 2;
    doc.rect(LM, y, MW, detailH, 'FD');
    doc.setFontSize(9);
    let ry = y + 6;
    for (const [label, value] of detailRows) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 110);
      doc.text(label, LM + 3, ry);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK_TEXT);
      doc.text(String(value), LM + 65, ry);
      ry += 6;
    }
    y += detailH + 8;

    // ═══════════════════════════════════════════
    // ORDER VALUE — the amount with its VAT split shown
    // ═══════════════════════════════════════════
    doc.setFillColor(255, 248, 230);
    doc.setDrawColor(230, 180, 30);
    doc.setLineWidth(0.5);
    doc.roundedRect(LM, y, MW, 27, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 90, 0);
    doc.text('PURCHASE ORDER VALUE', LM + 6, y + 7);

    // The three figures, each under its own heading: what the order is worth before
    // VAT, the VAT on it, and the total the repair is authorised at.
    const splitCols = [
      { label: 'EX VAT', value: fmtMoney(poNet), x: LM + 8 },
      { label: 'VAT (20%)', value: fmtMoney(poVat), x: LM + 62 },
      { label: 'TOTAL INC VAT', value: fmtMoney(poTotal), x: LM + 116 },
    ];
    for (const col of splitCols) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(120, 90, 0);
      doc.text(col.label, col.x, y + 14);
      doc.setFontSize(12);
      doc.setTextColor(...NAVY);
      doc.text(col.value, col.x, y + 21);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 90, 0);
    doc.text('The total inc VAT is the amount this repair is authorised at.', LM + 8, y + 25);
    y += 33;

    // ═══════════════════════════════════════════
    // AUTHORITY / INSTRUCTION NOTE
    // ═══════════════════════════════════════════
    doc.setFillColor(...NAVY);
    doc.rect(LM, y, MW, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORITY & INSTRUCTION', LM + 3, y + 5);
    y += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    const noteLines = [
      `Please proceed with the repair of the vehicle detailed above, authorised up to the purchase order value of ${fmtMoney(poTotal)} (${fmtMoney(poNet)} ex VAT plus ${fmtMoney(poVat)} VAT).`,
      'Any additional work required beyond this figure must be authorised in writing by RCM Automotive prior to commencement.',
      'The vehicle registration and job number shown above must be quoted on all correspondence and invoices.',
    ];
    for (const line of noteLines) {
      const wrapped = doc.splitTextToSize(line, MW - 6);
      for (const w of wrapped) { doc.text(w, LM + 3, y); y += 12; }
      y += 6;
    }
    y += 6;

    // ═══════════════════════════════════════════
    // SIGNATURE BLOCK
    // ═══════════════════════════════════════════
    const sigY = Math.max(y, 230);
    doc.setDrawColor(...MID_GREY);
    doc.setLineWidth(0.3);
    doc.line(LM + 5, sigY, LM + 80, sigY);
    doc.line(PW - LM - 80, sigY, PW - LM - 5, sigY);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 110);
    doc.text('Authorised by (RCM Automotive)', LM + 5, sigY + 5);
    doc.text('Date', PW - LM - 80, sigY + 5);

    // ═══════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    doc.line(LM, 284, PW - LM, 284);
    doc.setTextColor(...NAVY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('RCM Automotive Ltd | www.rcmautomotive.co.uk | info@rcmautomotive.co.uk', PW / 2, 289, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');
    const filename = `PO-${poNumber}.pdf`;

    let file_url = null;
    try {
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
      file_url = uploadResult.file_url;
      if (saveToClaim) {
        const currentFileUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
        // The order is recorded on the claim as well as filed with its documents:
        // the newest is the Final Purchase Order the repairer's invoice is measured
        // against, and every order before it is kept, marked superseded.
        const orderRecord = {
          number: poNumber,
          date: today,
          net: poNet,
          vat: poVat,
          total: poTotal,
          file_url,
          file_name: filename,
          superseded: false,
          generated_at: new Date().toISOString(),
          by: gate.user?.email || '',
        };
        const tracker = {
          ...(claim.invoice_tracker || {}),
          purchase_orders: [
            ...existingOrders.map((po: any) => ({ ...po, superseded: true })),
            orderRecord,
          ],
        };
        await base44.asServiceRole.entities.Claim.update(claim.id, {
          file_urls: [...currentFileUrls, file_url],
          invoice_tracker: tracker,
        });
        claim.invoice_tracker = tracker;
      }
    } catch (uploadError) {
      console.error('Failed to upload PO PDF:', uploadError);
      return Response.json({ error: 'Failed to upload PDF: ' + uploadError.message }, { status: 500 });
    }

    return Response.json({
      file_url,
      filename,
      poNumber,
      authorityFigure,
      purchaseOrder: { number: poNumber, date: today, net: poNet, vat: poVat, total: poTotal, file_url },
    });
  } catch (error) {
    console.error('PO PDF generation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
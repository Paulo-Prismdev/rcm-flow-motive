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

    const { claimId, saveToClaim = true } = await req.json();
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

    // ── Authority figure: prefer the authorised (authority) gross total,
    //    fall back to the estimate gross total. ──
    const authorityFigure =
      (claim.authority_cost_gross != null && claim.authority_cost_gross !== '') ? Number(claim.authority_cost_gross) :
      (claim.estimate_cost_gross != null && claim.estimate_cost_gross !== '') ? Number(claim.estimate_cost_gross) :
      (claim.authority_cost_net != null && claim.authority_cost_net !== '') ? Number(claim.authority_cost_net) :
      (claim.estimate_cost_net != null && claim.estimate_cost_net !== '') ? Number(claim.estimate_cost_net) :
      0;

    const fmtMoney = (n) => {
      const v = Number(n) || 0;
      return `£${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // ── PO number: job number + reg (sanitised) ──
    const reg = (claim.reg || '').toString().toUpperCase().replace(/\s+/g, '');
    const jobNumber = claim.job_number || 'PO';
    const poNumber = reg ? `${jobNumber}-${reg}` : jobNumber;

    const today = new Date().toLocaleDateString('en-GB');

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
    // HEADER BAR
    // ═══════════════════════════════════════════
    doc.setFillColor(...NAVY);
    doc.rect(LM, 14, MW, 16, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', LM + 5, 24);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('RCM Automotive Ltd', PW - LM - 5, 20, { align: 'right' });
    doc.text('info@rcmautomotive.co.uk', PW - LM - 5, 25, { align: 'right' });

    // ═══════════════════════════════════════════
    // PO META BOX (PO number, date, reference)
    // ═══════════════════════════════════════════
    let y = 36;
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
    doc.text(today, LM + 70, y + 13);
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
    // AUTHORITY FIGURE (estimate total)
    // ═══════════════════════════════════════════
    doc.setFillColor(255, 248, 230);
    doc.setDrawColor(230, 180, 30);
    doc.setLineWidth(0.5);
    doc.roundedRect(LM, y, MW, 16, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 90, 0);
    doc.text('AUTHORITY FIGURE (Estimate Total)', LM + 5, y + 6.5);
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.text(fmtMoney(authorityFigure), PW - LM - 5, y + 11, { align: 'right' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 90, 0);
    doc.text('This amount represents the authorised repair value based on the estimate.', LM + 5, y + 12.5);
    y += 22;

    // ═══════════════════════════════════════════
    // AUTHORITY / INSTRUCTION NOTE
    // ═══════════════════════════════════════════
    doc.setFillColor(...NAVY);
    doc.rect(LM, y, MW, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORITY & INSTRUCTION', LM + 3, y + 5);
    y += 9;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK_TEXT);
    const noteLines = [
      `Please proceed with the repair of the vehicle detailed above, authorised up to the authority figure of ${fmtMoney(authorityFigure)}.`,
      'Any additional work required beyond this figure must be authorised in writing by RCM Automotive prior to commencement.',
      'The vehicle registration and job number shown above must be quoted on all correspondence and invoices.',
    ];
    for (const line of noteLines) {
      const wrapped = doc.splitTextToSize(line, MW - 6);
      for (const w of wrapped) { doc.text(w, LM + 3, y); y += 5; }
      y += 1.5;
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
        await base44.asServiceRole.entities.Claim.update(claim.id, {
          file_urls: [...currentFileUrls, file_url],
        });
      }
    } catch (uploadError) {
      console.error('Failed to upload PO PDF:', uploadError);
      return Response.json({ error: 'Failed to upload PDF: ' + uploadError.message }, { status: 500 });
    }

    return Response.json({ file_url, filename, poNumber, authorityFigure });
  } catch (error) {
    console.error('PO PDF generation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
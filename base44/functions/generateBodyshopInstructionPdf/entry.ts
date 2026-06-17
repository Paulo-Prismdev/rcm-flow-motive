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

    const { claimId } = await req.json();

    if (!claimId) {
      return Response.json({ error: 'Missing claimId' }, { status: 400 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    const doc = new jsPDF();
    const leftMargin = 15;
    const rightMargin = 195;
    const pageWidth = 210;
    const maxWidth = rightMargin - leftMargin;

    // ── Helpers ──
    const formatBoolean = (v) => (v ? 'Yes' : 'No');
    const today = new Date().toLocaleDateString('en-GB');

    const clientAddress = [
      claim.client_address_line_1,
      claim.client_address_line_2,
      claim.client_town,
      claim.client_county,
      claim.client_postcode
    ].filter(Boolean).join(', ') || 'N/A';

    const fieldMap = {
      instruction_date: today,
      claim_type: claim.claim_type || 'N/A',
      repairer: claim.bodyshop || 'N/A',
      client_name: claim.client_name || 'N/A',
      client_address: clientAddress,
      driver_contact_name: claim.driver_contact_name || claim.client_name || 'N/A',
      client_email: claim.client_email || 'N/A',
      client_phone: claim.client_phone || 'N/A',
      client_vat_status: claim.client_vat_status || 'N/A',
      make_model: claim.make_model || 'N/A',
      reg: claim.reg || 'N/A',
      vehicle_location: claim.vehicle_location || 'N/A',
      vehicle_damage: claim.vehicle_damage || 'N/A',
      recovery_required: formatBoolean(claim.recovery_required),
      unroadworthy: formatBoolean(claim.unroadworthy),
      courtesy_car_required: formatBoolean(claim.courtesy_car_required),
      insurer: claim.insurer || 'N/A',
      claim_ref: claim.claim_ref || 'N/A',
      policy_number: claim.policy_number || 'N/A',
      send_estimate_email: claim.send_estimate_email || 'N/A',
      audatex_code: claim.audatex_code || 'N/A',
      policy_excess: claim.policy_excess ? Number(claim.policy_excess).toFixed(2) : 'N/A'
    };

    // ── Draw a two-column table row ──
    const drawTableRow = (label, value, y, colWidth, labelWidth) => {
      const lw = labelWidth || 70;
      const vw = colWidth - lw - 2;

      doc.setDrawColor(180, 180, 180);
      doc.rect(leftMargin, y, colWidth, 8);
      doc.rect(leftMargin, y, lw, 8);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(label, leftMargin + 2, y + 5.5);

      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(String(value), vw - 2);
      doc.text(lines[0] || '', leftMargin + lw + 2, y + 5.5);

      return y + 8 * Math.max(lines.length, 1);
    };

    // ── HEADER ──
    // ── HEADER ──
    doc.setFillColor(19, 29, 71); // RCM navy
    doc.rect(leftMargin, 10, maxWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('RCM Automotive', leftMargin + 4, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Repairer Instruction', rightMargin - 2, 20, { align: 'right' });

    // Claim reference bar
    doc.setFillColor(240, 240, 240);
    doc.rect(leftMargin, 25, maxWidth, 8, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`RCM Claim Reference: ${claim.job_number || 'N/A'}`, leftMargin + 4, 30.5);

    let yPos = 38;

    // ── SECTION 1: Client & Repairer Details ──
    doc.setFillColor(19, 29, 71);
    doc.rect(leftMargin, yPos, maxWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Client & Repairer Details', leftMargin + 3, yPos + 5);
    yPos += 7;

    doc.setTextColor(0, 0, 0);
    const clientRows = [
      ['Instruction Date', fieldMap.instruction_date],
      ['Claim Type', fieldMap.claim_type],
      ['Repairer', fieldMap.repairer],
      ['Client', fieldMap.client_name],
      ['Client Address', fieldMap.client_address],
      ['Contact Name', fieldMap.driver_contact_name],
      ['Email Address', fieldMap.client_email],
      ['Contact Number', fieldMap.client_phone],
      ['Clients VAT Status', fieldMap.client_vat_status]
    ];

    for (const [label, value] of clientRows) {
      if (yPos > 270) { doc.addPage(); yPos = 15; }
      yPos = drawTableRow(label, value, yPos, maxWidth, 55);
    }

    yPos += 5;

    // ── SECTION 2: Vehicle Details ──
    doc.setFillColor(19, 29, 71);
    doc.rect(leftMargin, yPos, maxWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Vehicle Details', leftMargin + 3, yPos + 5);
    yPos += 7;

    doc.setTextColor(0, 0, 0);
    const vehicleRows = [
      ['Vehicle Make & Model', fieldMap.make_model],
      ['Vehicle Registration Number', fieldMap.reg],
      ['Vehicle Location', fieldMap.vehicle_location],
      ['Vehicle Damage', fieldMap.vehicle_damage]
    ];

    for (const [label, value] of vehicleRows) {
      if (yPos > 270) { doc.addPage(); yPos = 15; }
      yPos = drawTableRow(label, value, yPos, maxWidth, 65);
    }

    yPos += 5;

    // ── SECTION 3: Recovery / Courtesy ──
    doc.setFillColor(19, 29, 71);
    doc.rect(leftMargin, yPos, maxWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Recovery & Courtesy Details', leftMargin + 3, yPos + 5);
    yPos += 7;

    doc.setTextColor(0, 0, 0);
    const recoveryRows = [
      ['Urgent Recovery Required?', fieldMap.recovery_required],
      ['Vehicle Unroadworthy', fieldMap.unroadworthy],
      ['Courtesy Car Required?', fieldMap.courtesy_car_required]
    ];

    for (const [label, value] of recoveryRows) {
      if (yPos > 270) { doc.addPage(); yPos = 15; }
      yPos = drawTableRow(label, value, yPos, maxWidth, 65);
    }

    yPos += 5;

    // ── SECTION 4: Insurance Details ──
    doc.setFillColor(19, 29, 71);
    doc.rect(leftMargin, yPos, maxWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Insurance Details', leftMargin + 3, yPos + 5);
    yPos += 7;

    doc.setTextColor(0, 0, 0);
    const insuranceRows = [
      ['Insurer', fieldMap.insurer],
      ['Claim Number', fieldMap.claim_ref],
      ['Policy Number', fieldMap.policy_number],
      ['Email Estimate to', fieldMap.send_estimate_email],
      ['Audatex Code', fieldMap.audatex_code],
      ['Excess (GBP)', fieldMap.policy_excess]
    ];

    for (const [label, value] of insuranceRows) {
      if (yPos > 270) { doc.addPage(); yPos = 15; }
      yPos = drawTableRow(label, value, yPos, maxWidth, 55);
    }

    yPos += 8;

    // ── INVOICING SECTION ──
    if (yPos > 220) { doc.addPage(); yPos = 15; }

    doc.setFillColor(19, 29, 71);
    doc.rect(leftMargin, yPos, maxWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoicing', leftMargin + 3, yPos + 5);
    yPos += 10;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Deductions box on left, Payment Terms on right
    const deductionsBoxW = 55;
    const paymentBoxW = maxWidth - deductionsBoxW;
    const boxStartY = yPos;

    // Left box: Invoice Deductions
    doc.setDrawColor(150, 150, 150);
    doc.rect(leftMargin, boxStartY, deductionsBoxW, 7, 'S');
    doc.setFillColor(220, 220, 220);
    doc.rect(leftMargin, boxStartY, deductionsBoxW, 7, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Invoice Deductions', leftMargin + 2, boxStartY + 5);

    const percentToReferrer = (claim.percent_to_referrer != null) ? `${claim.percent_to_referrer}%` : 'N/A';
    const repairerReferralFee = (claim.referral_fee_repairer != null) ? `${claim.referral_fee_repairer}%` : null;
    const estFee = claim.est_fee ? `GBP ${Number(claim.est_fee).toFixed(2)}` : null;

    const deductionItems = [`- ${percentToReferrer} Bottom Line Discount`];
    if (repairerReferralFee) deductionItems.push(`- Rep. Referral Fee ${repairerReferralFee}`);
    if (estFee) deductionItems.push(`- Estimate Fee ${estFee}`);

    doc.setFont('helvetica', 'normal');
    let dedY = boxStartY + 13;
    for (const item of deductionItems) {
      doc.text(item, leftMargin + 3, dedY);
      dedY += 7;
    }

    // Right box: Payment Terms + Invoicing & Payment text
    const payX = leftMargin + deductionsBoxW;
    doc.setDrawColor(150, 150, 150);
    doc.rect(payX, boxStartY, paymentBoxW, 7, 'S');
    doc.setFillColor(220, 220, 220);
    doc.rect(payX, boxStartY, paymentBoxW, 7, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Payment Terms', payX + 3, boxStartY + 5);

    let ptY = boxStartY + 13;
    const payWidth = paymentBoxW - 5;

    // Payment terms bullet
    doc.setFont('helvetica', 'normal');
    doc.text('- Payment within 7 days of invoice', payX + 3, ptY);
    ptY += 8;

    // INVOICING & PAYMENT heading
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICING & PAYMENT', payX + 3, ptY);
    ptY += 6;

    const paymentTextLines = [
      { text: 'Your invoice ', bold: false },
      { text: 'MUST', bold: true },
      { text: ' be addressed to the authorising party, as instructed on written authority.', bold: false }
    ];

    doc.setFont('helvetica', 'normal');
    const line1 = 'Your invoice MUST be addressed to the authorising party, as instructed on written authority.';
    const line1Wrapped = doc.splitTextToSize(line1, payWidth);
    doc.text(line1Wrapped, payX + 3, ptY);
    ptY += 6 * line1Wrapped.length;

    const line2 = 'The invoice pack MUST include - Main Invoice, final authority & a signed satisfaction note.';
    const line2Wrapped = doc.splitTextToSize(line2, payWidth);
    doc.text(line2Wrapped, payX + 3, ptY);
    ptY += 6 * line2Wrapped.length;

    const line3 = 'Invoice pack MUST be sent to - invoices@rcmautomotive.co.uk';
    const line3Wrapped = doc.splitTextToSize(line3, payWidth);
    doc.text(line3Wrapped, payX + 3, ptY);
    ptY += 6 * line3Wrapped.length;

    doc.setFont('helvetica', 'bold');
    const line4 = 'VAT and EXCESS MUST be made out and sent to RCM Automotive Ltd, who will invoice the client directly for this payment.';
    const line4Wrapped = doc.splitTextToSize(line4, payWidth);
    doc.text(line4Wrapped, payX + 3, ptY);
    ptY += 6 * line4Wrapped.length + 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Critical Notice:', payX + 3, ptY);
    ptY += 6;

    doc.setFont('helvetica', 'normal');
    const criticalLines = [
      'Failure to submit your complete invoice pack to us as per our instructions, constitutes a breach of our Service Level Agreement.',
      '',
      'In accordance with our terms, this will result in:',
      '  - A financial penalty of GBP 1,000.00 being added to our standard referral fee',
      '  - Delayed payment processing',
      '  - Potential suspension from future allocations',
      '',
      'The Repairer agrees to comply with all invoicing procedures as detailed in this agreement. Should the Repairer rectify the breach within 48 hours of written notification, this penalty will be waived in full.',
      '',
      'Repeated non-compliance may result in further action or removal from the network.'
    ];

    for (const line of criticalLines) {
      if (!line) { ptY += 3; continue; }
      const wrapped = doc.splitTextToSize(line, payWidth);
      if (ptY > 265) { doc.addPage(); ptY = 15; }
      doc.text(wrapped, payX + 3, ptY);
      ptY += 6 * wrapped.length;
    }

    // Draw the left deductions box border to match height of right box
    const boxEndY = Math.max(dedY, ptY) + 5;
    doc.setDrawColor(150, 150, 150);
    doc.rect(leftMargin, boxStartY, deductionsBoxW, boxEndY - boxStartY, 'S');
    doc.rect(payX, boxStartY, paymentBoxW, boxEndY - boxStartY, 'S');

    yPos = boxEndY + 8;

    // PLEASE DO NOT SEND warning
    if (yPos > 270) { doc.addPage(); yPos = 15; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(200, 0, 0);
    doc.text('PLEASE DO NOT SEND TO ANY OTHER PARTY WITHOUT PRIOR CONSENT', 105, yPos, { align: 'center' });
    yPos += 8;

    // ── DISCLAIMER ──
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const disclaimer = '*By accepting this repair instruction, you agree to the T&Cs within the supplied SLA provided with this instruction.';
    const disclaimerLines = doc.splitTextToSize(disclaimer, maxWidth);
    doc.text(disclaimerLines, 105, yPos, { align: 'center' });

    // ── FOOTER on all pages ──
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(19, 29, 71);
      doc.rect(0, 282, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('RCM Automotive Ltd', 105, 288, { align: 'center' });
      doc.text('www.rcmautomotive.co.uk | info@rcmautomotive.co.uk', 105, 293, { align: 'center' });
    }

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
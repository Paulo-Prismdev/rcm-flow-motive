import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@2.5.1';

// Form version — stored on the claim and printed on the PDF so we can prove
// which wording the customer agreed to at the time of signing.
const FORM_VERSION = 'DON-V1.0';

// Public endpoint: receives a client's signed Declaration of Need – Replacement Vehicle.
// Security: two layers —
//   1. _form_secret must match PUBLIC_FORM_SECRET (prevents arbitrary external calls)
//   2. declaration_of_need_token must match a claim's stored token (binds to one claim)
// No user auth — service role is used to look up and update the claim.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { declaration_of_need_token, formData, signatureDataUrl } = body;
    if (!declaration_of_need_token) {
      return Response.json({ error: 'Missing declaration of need token' }, { status: 400 });
    }
    if (!formData) {
      return Response.json({ error: 'Missing form data' }, { status: 400 });
    }
    if (!signatureDataUrl) {
      return Response.json({ error: 'Signature is required' }, { status: 400 });
    }

    // Look up the claim by its unique declaration of need token (service role).
    const claims = await base44.asServiceRole.entities.Claim.filter({ declaration_of_need_token });
    if (!claims || claims.length === 0) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
    }
    const claim = claims[0];

    // ── Generate the Declaration of Need PDF ──
    const doc = new jsPDF();
    const LM = 20;
    const RM = 190;
    const MW = RM - LM;
    let y = 25;
    const RCM_BLUE = [19, 29, 71];
    const RCM_GREEN = [1, 242, 5];

    const logoUrl = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';
    try {
      doc.addImage(logoUrl, 'JPEG', LM, 10, 50, 22);
    } catch (e) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(RCM_BLUE[0], RCM_BLUE[1], RCM_BLUE[2]);
      doc.text('RCM Automotive', LM, 22);
    }

    // Title
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(RCM_BLUE[0], RCM_BLUE[1], RCM_BLUE[2]);
    doc.text('DECLARATION OF NEED – REPLACEMENT VEHICLE', 105, y, { align: 'center' });
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Claim: ${claim.job_number || '—'}    Reg: ${(claim.reg || '—').toUpperCase()}    Ref: ${claim.claim_ref || '—'}`, 105, y, { align: 'center' });
    y += 4;
    doc.text(`Form Version: ${FORM_VERSION}    Signed: ${new Date().toLocaleString('en-GB')}`, 105, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(RCM_GREEN[0], RCM_GREEN[1], RCM_GREEN[2]);
    doc.setLineWidth(1);
    doc.line(LM, y, RM, y);
    y += 8;

    const ensureSpace = (needed) => {
      if (y + needed > 270) { doc.addPage(); y = 20; }
    };

    const addPara = (text, size = 9, style = 'normal', gap = 5) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(text, MW);
      ensureSpace(lines.length * gap);
      doc.text(lines, LM, y);
      y += lines.length * gap + 1;
    };

    const addSectionTitle = (title) => {
      y += 3;
      ensureSpace(12);
      doc.setFillColor(245, 246, 250);
      doc.rect(LM, y, MW, 8, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(RCM_BLUE[0], RCM_BLUE[1], RCM_BLUE[2]);
      doc.text(title, LM + 3, y + 5.5);
      y += 11;
    };

    const addField = (label, value) => {
      ensureSpace(6);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      const labelText = `${label}:`;
      doc.text(labelText, LM, y);
      const valueX = LM + Math.max(45, doc.getTextWidth(labelText) + 3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const valStr = String(value || '—');
      const lines = doc.splitTextToSize(valStr, RM - valueX);
      doc.text(lines, valueX, y);
      y += Math.max(6, lines.length * 5 + 1);
    };

    const addTickItem = (text, ticked) => {
      ensureSpace(6);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const mark = ticked ? '[X]' : '[  ]';
      const lines = doc.splitTextToSize(`${mark}  ${text}`, MW);
      doc.text(lines, LM, y);
      y += lines.length * 5 + 1;
    };

    const f = formData;

    // ── Section 1: Company Details ──
    addSectionTitle('Section 1 – Company Details');
    addField('Registered Company Name', f.company?.registered_name);
    addField('Company Number', f.company?.company_number);
    addField('Registered Address', f.company?.registered_address);
    addField('Person Completing Form', f.company?.person_name);
    addField('Position / Job Title', f.company?.position);
    addField('Email', f.company?.email);
    addField('Telephone', f.company?.telephone);

    // ── Section 2: Damaged Vehicle ──
    addSectionTitle('Section 2 – Damaged Vehicle');
    addField('Registration', (f.vehicle?.registration || claim.reg || '').toUpperCase());
    addField('Make / Model', f.vehicle?.make_model || claim.make_model);
    addField('Vehicle Type', f.vehicle?.vehicle_type);
    addField('Driver Normally Assigned', f.vehicle?.driver_assigned);
    addField('Currently Roadworthy?', f.vehicle?.roadworthy);
    addField('Main Business Use', f.vehicle?.main_business_use);

    // ── Section 3: Fleet Availability ──
    addSectionTitle('Section 3 – Fleet Availability');
    addField('Total Vehicles Operated', f.fleet?.total_vehicles);
    addField('Vehicles Off Road (excl. damaged)', f.fleet?.off_road_count);

    addPara('Fleet List:', 9, 'bold', 5);
    y += 1;
    if (f.fleet?.vehicles && f.fleet.vehicles.length > 0) {
      // Table header
      ensureSpace(8);
      doc.setFillColor(230, 232, 238);
      doc.rect(LM, y, MW, 6, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Reg', LM + 2, y + 4);
      doc.text('Make/Model', LM + 28, y + 4);
      doc.text('Type', LM + 75, y + 4);
      doc.text('Assigned To', LM + 100, y + 4);
      doc.text('Available?', LM + 150, y + 4);
      y += 7;
      f.fleet.vehicles.forEach((v, idx) => {
        ensureSpace(6);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const reg = String(v.registration || '').toUpperCase();
        const mm = String(v.make_model || '');
        const ty = String(v.type || '');
        const at = String(v.assigned_to || '');
        const av = v.available === 'Y' ? 'Yes' : v.available === 'N' ? 'No' : '—';
        doc.text(reg, LM + 2, y);
        doc.text(doc.splitTextToSize(mm, 42), LM + 28, y);
        doc.text(doc.splitTextToSize(ty, 22), LM + 75, y);
        doc.text(doc.splitTextToSize(at, 45), LM + 100, y);
        doc.text(av, LM + 150, y);
        y += 6;
        if (idx < f.fleet.vehicles.length - 1) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.2);
          doc.line(LM, y - 1, RM, y - 1);
        }
      });
      y += 2;
    } else {
      addPara('No fleet vehicles listed.', 9, 'normal', 5);
    }

    addPara('I confirm on behalf of the company that, at the date of the incident and for the expected repair period:', 9, 'normal', 5);
    addTickItem('Every vehicle in the company fleet is permanently assigned to, and in daily use by, a named member of staff for business purposes.', f.fleet?.confirmations?.all_assigned);
    addTickItem('The company has no spare, pool, reserve or unassigned vehicles available.', f.fleet?.confirmations?.no_spare);
    addTickItem('No vehicle could be reallocated to the driver of the damaged vehicle without taking another vehicle off essential business operations.', f.fleet?.confirmations?.no_reallocation);
    addTickItem("The company's lease, contract hire, maintenance or insurance arrangements do not include a replacement or courtesy vehicle for this incident.", f.fleet?.confirmations?.no_replacement);
    addTickItem('No suitable replacement vehicle was available from any other source at no cost to the company.', f.fleet?.confirmations?.no_other_source);
    if (f.fleet?.exception_explanation) {
      addPara('Explanation (where a confirmation could not be ticked or a vehicle was marked available):', 9, 'bold', 5);
      addPara(f.fleet.exception_explanation, 9, 'normal', 5);
    }

    // ── Section 4: Like-for-Like Vehicle ──
    addSectionTitle('Section 4 – Requirement for a Like-for-Like Vehicle');
    addPara('The replacement vehicle must be equivalent to the damaged vehicle for the following business reasons:', 9, 'normal', 5);
    const reasonOptions = [
      'Load volume / payload capacity',
      'Towing capability',
      'Racking, shelving or fitted equipment',
      'Seating / crew capacity',
      '4x4 / off-road capability',
      'Refrigeration / specialist conversion',
      'Security requirements for tools, stock or equipment',
      'Contractual or customer requirements',
    ];
    reasonOptions.forEach(opt => addTickItem(opt, f.like_for_like?.reasons?.includes(opt)));
    if (f.like_for_like?.other_detail) {
      addTickItem('Other', true);
      addPara(`Other detail: ${f.like_for_like.other_detail}`, 9, 'normal', 5);
    } else {
      addTickItem('Other', false);
    }
    addPara('Describe the vehicle\'s daily business use and why a smaller or lower-specification vehicle would not be suitable:', 9, 'bold', 5);
    addPara(f.like_for_like?.daily_use_description || '—', 9, 'normal', 5);

    // ── Section 5: Consequences ──
    addSectionTitle('Section 5 – Consequences of Being Without a Vehicle');
    addPara('Without a replacement vehicle the company would be unable to:', 9, 'normal', 5);
    const impactOptions = [
      'Attend customer jobs / appointments',
      'Transport tools, stock or equipment',
      'Meet contractual obligations',
      'Keep the driver productively employed',
    ];
    impactOptions.forEach(opt => addTickItem(opt, f.consequences?.impacts?.includes(opt)));
    if (f.consequences?.estimated_impact) {
      addPara('Estimated impact:', 9, 'bold', 5);
      addPara(f.consequences.estimated_impact, 9, 'normal', 5);
    }

    // ── Section 6: Mitigation and Undertakings ──
    addSectionTitle('Section 6 – Mitigation and Undertakings');
    addPara('The company confirms that it will:', 9, 'normal', 5);
    addPara(
      'use the replacement vehicle only for the purposes it would have used the damaged vehicle for; tell RCM Automotive Ltd straight away if any fleet vehicle becomes available, or if the damaged vehicle is repaired, replaced or declared a total loss; return the replacement vehicle promptly when it is no longer needed; and cooperate with any reasonable request for supporting evidence, such as fleet lists, lease agreements or job records.',
      9, 'normal', 5
    );
    addTickItem('I agree to the above undertakings on behalf of the company.', f.mitigation?.agreed);

    // ── Section 7: Declaration and Statement of Truth ──
    addSectionTitle('Section 7 – Declaration and Statement of Truth');
    addTickItem('I confirm that I am authorised to make this declaration on behalf of the company named above.', f.declaration?.authorised);
    addPara(
      'I believe that the facts stated in this declaration are true and complete. I understand that this declaration may be relied on by RCM Automotive Ltd, its credit hire and repair partners, insurers and, if necessary, the courts in support of a claim for the cost of a replacement vehicle. I understand that making a false or misleading statement may cause the claim to fail and may result in legal action against the company and/or me personally.',
      9, 'normal', 5
    );
    addTickItem('I accept the above statement of truth.', f.declaration?.statement_of_truth_accepted);

    // Signature block
    y += 4;
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Signed:', LM, y);
    y += 4;
    if (signatureDataUrl && String(signatureDataUrl).startsWith('data:image')) {
      try {
        doc.addImage(signatureDataUrl, 'PNG', LM, y, 80, 25);
        y += 28;
      } catch (e) {
        y += 20;
      }
    } else {
      y += 20;
    }
    doc.setDrawColor(180, 180, 180);
    doc.line(LM, y - 2, LM + 80, y - 2);
    doc.setFont('helvetica', 'normal');
    doc.text(`Full Name: ${f.declaration?.full_name || '—'}`, LM, y + 6);
    doc.text(`Position: ${f.declaration?.position || '—'}`, LM, y + 12);
    doc.text(`Date: ${f.declaration?.date || new Date().toLocaleDateString('en-GB')}`, LM, y + 18);

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFillColor(RCM_BLUE[0], RCM_BLUE[1], RCM_BLUE[2]);
      doc.rect(0, 280, 210, 17, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('RCM Automotive', 105, 287, { align: 'center' });
      doc.setTextColor(RCM_GREEN[0], RCM_GREEN[1], RCM_GREEN[2]);
      doc.text('www.rcmautomotive.co.uk | info@rcmautomotive.co.uk', 105, 292, { align: 'center' });
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(7);
      doc.text(`Form Version: ${FORM_VERSION}    Page ${p} of ${pageCount}`, 105, 296, { align: 'center' });
    }

    // Upload PDF
    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const filename = `${claim.job_number || 'claim'}-declaration-of-need-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
    const pdfUrl = uploadResult.file_url;

    // Attach PDF to claim's file_urls and record signature metadata
    const existingFiles = Array.isArray(claim.file_urls) ? claim.file_urls : [];
    const update = {
      declaration_of_need_signed: true,
      declaration_of_need_signed_at: new Date().toISOString(),
      declaration_of_need_pdf_url: pdfUrl,
      declaration_of_need_client_name: f.declaration?.full_name || f.company?.person_name || '',
      declaration_of_need_form_version: FORM_VERSION,
      file_urls: [...existingFiles, pdfUrl],
    };
    await base44.asServiceRole.entities.Claim.update(claim.id, update);

    // Notify the team via a ClaimUpdate so it appears in the claim's update feed.
    try {
      await base44.asServiceRole.entities.ClaimUpdate.create({
        claim_id: claim.id,
        update_type: 'Client Communication',
        description: `Client signed the Declaration of Need – Replacement Vehicle (${f.declaration?.full_name || 'client'}). A signed PDF (Form Version ${FORM_VERSION}) has been saved to the claim documents.`,
      });
    } catch (e) {
      console.warn('Could not create claim update notification:', e.message);
    }

    return Response.json({ success: true, claim_id: claim.id, pdf_url: pdfUrl });
  } catch (error) {
    console.error('submitDeclarationOfNeedForm error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
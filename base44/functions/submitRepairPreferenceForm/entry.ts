import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@2.5.1';

// Public endpoint: receives a client's signed Statement of Repair Preference.
// Security: two layers —
//   1. _form_secret must match PUBLIC_FORM_SECRET (prevents arbitrary external calls)
//   2. repair_preference_token must match a claim's stored token (binds to one claim)
// No user auth — service role is used to look up and update the claim.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { repair_preference_token, clientName, signatureDataUrl } = body;
    if (!repair_preference_token) {
      return Response.json({ error: 'Missing repair preference token' }, { status: 400 });
    }
    if (!clientName || !String(clientName).trim()) {
      return Response.json({ error: 'Your name is required' }, { status: 400 });
    }
    if (!signatureDataUrl) {
      return Response.json({ error: 'Signature is required' }, { status: 400 });
    }

    // Look up the claim by its unique repair preference token (service role).
    const claims = await base44.asServiceRole.entities.Claim.filter({ repair_preference_token });
    if (!claims || claims.length === 0) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
    }
    const claim = claims[0];

    // ── Generate the Statement of Repair Preference PDF ──
    const doc = new jsPDF();
    const LM = 20;
    const RM = 190;
    const MW = RM - LM;
    let y = 25;
    const RCM_BLUE = [19, 29, 71];
    const RCM_GREEN = [1, 242, 5];

    // Logo
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
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(RCM_BLUE[0], RCM_BLUE[1], RCM_BLUE[2]);
    doc.text('STATEMENT OF REPAIR PREFERENCE', 105, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Claim: ${claim.job_number || '—'}    Reg: ${(claim.reg || '—').toUpperCase()}    Date: ${new Date().toLocaleDateString('en-GB')}`, 105, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(RCM_GREEN[0], RCM_GREEN[1], RCM_GREEN[2]);
    doc.setLineWidth(1);
    doc.line(LM, y, RM, y);
    y += 10;

    const addPara = (text, size = 10, style = 'normal', gap = 7) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(text, MW);
      if (y + lines.length * gap > 270) { doc.addPage(); y = 20; }
      doc.text(lines, LM, y);
      y += lines.length * gap + 2;
    };

    // Declaration opening
    addPara(`I, ${String(clientName).trim()}, the legal owner of:`, 10, 'normal', 7);

    // Vehicle details box
    y += 2;
    doc.setFillColor(245, 246, 250);
    doc.rect(LM, y, MW, 18, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Make:', LM + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${claim.vehicle_make || claim.make_model || '—'}`, LM + 30, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.text('Model:', LM + 4, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.text(`${claim.vehicle_model || '—'}`, LM + 30, y + 13);
    doc.setFont('helvetica', 'bold');
    doc.text('Registration:', LM + 100, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${(claim.reg || '—').toUpperCase()}`, LM + 135, y + 7);
    y += 22;

    addPara('hereby declare that:', 10, 'normal', 7);

    addPara(
      'In the event that the repair costs for my vehicle approach or exceed its market value, I wish to exercise my legal right to request that the insurer considers authorising repairs up to 100% of the current market value of my vehicle, rather than deeming it a total loss at anything less.',
      10, 'normal', 6
    );
    addPara(
      'I understand that while this is my preference, any repairs remain subject to the insurer\u2019s approval and authorisation.',
      10, 'normal', 6
    );
    addPara(
      'I am making this statement proactively to ensure my wishes are clear from the outset of the claims process.',
      10, 'normal', 6
    );

    // Declaration
    y += 2;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Declaration', LM, y);
    y += 6;
    addPara('This statement represents my preferences regarding the repair of my vehicle.', 10, 'normal', 6);

    // Signature
    y += 6;
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
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
    doc.text(`Print Name: ${String(clientName).trim()}`, LM, y + 6);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, LM, y + 12);

    // Footer
    doc.setFillColor(RCM_BLUE[0], RCM_BLUE[1], RCM_BLUE[2]);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('RCM Automotive', 105, 287, { align: 'center' });
    doc.setTextColor(RCM_GREEN[0], RCM_GREEN[1], RCM_GREEN[2]);
    doc.text('www.rcmautomotive.co.uk | info@rcmautomotive.co.uk', 105, 292, { align: 'center' });

    // Upload PDF
    const pdfBytes = doc.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const filename = `${claim.job_number || 'claim'}-repair-preference-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });
    const pdfUrl = uploadResult.file_url;

    // Attach PDF to claim's file_urls and record signature metadata
    const existingFiles = Array.isArray(claim.file_urls) ? claim.file_urls : [];
    const update = {
      repair_preference_signed: true,
      repair_preference_signed_at: new Date().toISOString(),
      repair_preference_pdf_url: pdfUrl,
      repair_preference_client_name: String(clientName).trim(),
      file_urls: [...existingFiles, pdfUrl],
    };
    await base44.asServiceRole.entities.Claim.update(claim.id, update);

    // Notify the team via a ClaimUpdate so it appears in the claim's update feed.
    try {
      await base44.asServiceRole.entities.ClaimUpdate.create({
        claim_id: claim.id,
        update_type: 'Client Communication',
        description: `Client signed the Statement of Repair Preference (${String(clientName).trim()}). A signed PDF has been saved to the claim documents.`,
      });
    } catch (e) {
      console.warn('Could not create claim update notification:', e.message);
    }

    return Response.json({ success: true, claim_id: claim.id, pdf_url: pdfUrl });
  } catch (error) {
    console.error('submitRepairPreferenceForm error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
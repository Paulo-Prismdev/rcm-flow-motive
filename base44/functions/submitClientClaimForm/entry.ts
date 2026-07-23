import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { formData, signatureDataUrl, photoUrls } = body;

    if (!formData) {
      return Response.json({ error: 'Missing form data' }, { status: 400 });
    }
    if (!formData.client_name) {
      return Response.json({ error: 'Client name is required' }, { status: 400 });
    }
    if (!formData.reg) {
      return Response.json({ error: 'Vehicle registration is required' }, { status: 400 });
    }
    if (!signatureDataUrl) {
      return Response.json({ error: 'Signature is required' }, { status: 400 });
    }

    // Generate job number
    const allClaims = await base44.asServiceRole.entities.Claim.list('-created_date', 10000);
    let highestNumber = 0;
    for (const record of allClaims) {
      if (record.job_number && record.job_number.startsWith('CLM-')) {
        const num = parseInt(record.job_number.split('-')[1]);
        if (!isNaN(num) && num > highestNumber) highestNumber = num;
      }
    }
    const jobNumber = `CLM-${String(highestNumber + 1).padStart(4, '0')}`;

    // Build claim record
    const claimRecord = {
      job_number: jobNumber,
      reg: (formData.reg || '').toUpperCase(),
      claim_type: formData.claim_type || 'Credit Repair',
      circumstances: formData.circumstances || '',
      loss_date: formData.loss_date || '',
      loss_time: formData.loss_time || '',
      incident_location: formData.incident_location || '',
      vehicle_use: formData.vehicle_use || '',
      courtesy_car_required: !!formData.courtesy_car_required,
      client_name: formData.client_name || '',
      client_phone: formData.client_phone || '',
      client_email: formData.client_email || '',
      client_address_line_1: formData.client_address_line_1 || '',
      client_address_line_2: formData.client_address_line_2 || '',
      client_town: formData.client_town || '',
      client_county: formData.client_county || '',
      client_postcode: formData.client_postcode || '',
      make_model: formData.make_model || '',
      vehicle_colour: formData.vehicle_colour || '',
      vehicle_damage: formData.vehicle_damage || '',
      vehicle_type: formData.vehicle_type || 'Car',
      unroadworthy: !!formData.unroadworthy,
      recovery_required: !!formData.recovery_required,
      insurer: formData.insurer || '',
      claim_ref: formData.claim_ref || '',
      policy_number: formData.policy_number || '',
      has_third_party: !!formData.has_third_party,
      tp_name: formData.tp_name || '',
      tp_phone: formData.tp_phone || '',
      tp_reg: formData.tp_reg || '',
      tp_insurer: formData.tp_insurer || '',
      tp_vehicle_damage: formData.tp_vehicle_damage || '',
      job_statuses: ['New'],
      secondary_status: 'New',
      date_received: new Date().toISOString().split('T')[0],
      file_urls: [],
      image_urls: photoUrls || [],
    };

    // Create the claim
    const newClaim = await base44.asServiceRole.entities.Claim.create(claimRecord);

    // Generate Statement of Truth PDF
    const doc = new jsPDF();
    const leftMargin = 20;
    const rightMargin = 190;
    const maxWidth = rightMargin - leftMargin;
    let yPos = 20;
    const lh = 7;

    // RCM Branding colours
    const RCM_GREEN = [1, 242, 5];   // #01f205
    const RCM_BLUE = [19, 29, 71];   // #131d47

    // Header with logo
    const logoUrl = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';
    try {
      // Add logo (top left)
      doc.addImage(logoUrl, 'JPEG', leftMargin, yPos - 5, 50, 25);
    } catch (e) {
      // Fallback if image fails to load
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(RCM_DARK[0], RCM_DARK[1], RCM_DARK[2]);
      doc.text('RCM Automotive', leftMargin, yPos);
    }

    // Title (centered)
    yPos += 10;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(RCM_BLUE[0], RCM_BLUE[1], RCM_BLUE[2]);
    doc.text('STATEMENT OF TRUTH', 105, yPos, { align: 'center' });

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Claim Reference: ${jobNumber}  |  Date: ${new Date().toLocaleDateString('en-GB')}`, 105, yPos, { align: 'center' });

    yPos += 3;
    // Green accent line
    doc.setDrawColor(RCM_GREEN[0], RCM_GREEN[1], RCM_GREEN[2]);
    doc.setLineWidth(1.2);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 8;

    // Section helper with RCM branding
    const addSection = (title) => {
      if (yPos > 255) { doc.addPage(); yPos = 20; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(RCM_BLUE[0], RCM_BLUE[1], RCM_BLUE[2]);
      doc.setFillColor(RCM_GREEN[0], RCM_GREEN[1], RCM_GREEN[2]);
      doc.rect(leftMargin, yPos - 4, maxWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(title, leftMargin + 2, yPos + 1);
      yPos += 9;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
    };

    const addRow = (label, value) => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(String(value || 'N/A'), maxWidth - 65);
      doc.text(lines, leftMargin + 65, yPos);
      yPos += lh * Math.max(lines.length, 1);
    };

    // Client details
    addSection('1. Client Details');
    addRow('Full Name', claimRecord.client_name);
    addRow('Phone', claimRecord.client_phone);
    addRow('Email', claimRecord.client_email);
    addRow('Address', [claimRecord.client_address_line_1, claimRecord.client_address_line_2, claimRecord.client_town, claimRecord.client_county, claimRecord.client_postcode].filter(Boolean).join(', '));
    yPos += 3;

    // Incident details
    addSection('2. Incident Details');
    addRow('Claim Type', claimRecord.claim_type);
    addRow('Date of Loss', claimRecord.loss_date || 'N/A');
    addRow('Time of Loss', claimRecord.loss_time || 'N/A');
    addRow('Location', claimRecord.incident_location || 'N/A');
    addRow('Vehicle Use', claimRecord.vehicle_use || 'N/A');
    addRow('Circumstances', claimRecord.circumstances || 'N/A');
    yPos += 3;

    // Vehicle details
    addSection('3. Vehicle Details');
    addRow('Registration', claimRecord.reg);
    addRow('Make & Model', claimRecord.make_model || 'N/A');
    addRow('Colour', claimRecord.vehicle_colour || 'N/A');
    addRow('Vehicle Type', claimRecord.vehicle_type);
    addRow('Damage Description', claimRecord.vehicle_damage || 'N/A');
    addRow('Unroadworthy', claimRecord.unroadworthy ? 'Yes' : 'No');
    addRow('Recovery Required', claimRecord.recovery_required ? 'Yes' : 'No');
    addRow('Courtesy Car Required', claimRecord.courtesy_car_required ? 'Yes' : 'No');
    yPos += 3;

    // Insurance
    addSection('4. Insurance Details');
    addRow('Insurer', claimRecord.insurer || 'N/A');
    addRow('Claim Reference', claimRecord.claim_ref || 'N/A');
    addRow('Policy Number', claimRecord.policy_number || 'N/A');
    yPos += 3;

    // Third party (if applicable)
    if (claimRecord.has_third_party) {
      addSection('5. Third Party Details');
      addRow('Third Party Name', claimRecord.tp_name || 'N/A');
      addRow('Third Party Phone', claimRecord.tp_phone || 'N/A');
      addRow('Third Party Reg', claimRecord.tp_reg || 'N/A');
      addRow('Third Party Insurer', claimRecord.tp_insurer || 'N/A');
      addRow('Third Party Damage', claimRecord.tp_vehicle_damage || 'N/A');
      yPos += 3;
    }

    // Statement of truth text
    if (yPos > 220) { doc.addPage(); yPos = 20; }
    yPos += 5;
    doc.setDrawColor(212, 175, 55);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT OF TRUTH', leftMargin, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    const statementText = 'I believe that the facts stated in this form are true and accurate to the best of my knowledge and belief. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.';
    const statementLines = doc.splitTextToSize(statementText, maxWidth);
    doc.text(statementLines, leftMargin, yPos);
    yPos += 7 * statementLines.length + 5;

    // Signature area
    if (yPos > 220) { doc.addPage(); yPos = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text('Signed:', leftMargin, yPos);
    yPos += 5;

    // Embed signature image
    if (signatureDataUrl && signatureDataUrl.startsWith('data:image')) {
      doc.addImage(signatureDataUrl, 'PNG', leftMargin, yPos, 80, 25);
      yPos += 28;
    }

    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${claimRecord.client_name}`, leftMargin, yPos);
    yPos += 7;
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, leftMargin, yPos);

    // Footer with RCM branding
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
    const filename = `${jobNumber}-statement-of-truth-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

    // Attach PDF to claim
    await base44.asServiceRole.entities.Claim.update(newClaim.id, {
      file_urls: [uploadResult.file_url],
    });

    return Response.json({
      success: true,
      claim_id: newClaim.id,
      job_number: jobNumber,
      pdf_url: uploadResult.file_url,
    });

  } catch (error) {
    console.error('submitClientClaimForm error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
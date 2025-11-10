import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { claimId, templateType, templateConfigId } = await req.json();

    if (!claimId || !templateType) {
      return Response.json({ error: 'Missing claimId or templateType' }, { status: 400 });
    }

    // Fetch claim data
    const claim = await base44.entities.Claim.get(claimId);

    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Fetch custom template config if provided
    let templateConfig = null;
    if (templateConfigId) {
      try {
        templateConfig = await base44.asServiceRole.entities.PdfTemplateConfig.get(templateConfigId);
      } catch (error) {
        console.log('Template config not found, using defaults');
      }
    }

    // Default sections configuration
    const defaultSections = [
      {
        section_id: 'repairer',
        section_name: 'Repairer & Client Details',
        enabled: true,
        order: 1,
        fields: [
          { field_id: 'bodyshop', field_label: 'Appointed Repairer', enabled: true },
          { field_id: 'client_name', field_label: 'Client Name', enabled: true },
          { field_id: 'client_address', field_label: 'Client Address', enabled: true },
          { field_id: 'driver_contact_name', field_label: 'Contact Name', enabled: true },
          { field_id: 'client_email', field_label: 'Email Address', enabled: true },
          { field_id: 'client_phone', field_label: 'Contact Number', enabled: true },
          { field_id: 'client_vat_status', field_label: 'Clients VAT Status', enabled: true }
        ]
      },
      {
        section_id: 'vehicle',
        section_name: 'Vehicle Details',
        enabled: true,
        order: 2,
        fields: [
          { field_id: 'make_model', field_label: 'Vehicle Make & Model', enabled: true },
          { field_id: 'reg', field_label: 'Vehicle Registration', enabled: true },
          { field_id: 'vehicle_location', field_label: 'Vehicle Location', enabled: true },
          { field_id: 'vehicle_damage', field_label: 'Vehicle Damage', enabled: true },
          { field_id: 'recovery_required', field_label: 'Urgent Recovery Required?', enabled: true },
          { field_id: 'unroadworthy', field_label: 'Vehicle Unroadworthy', enabled: true },
          { field_id: 'courtesy_car_required', field_label: 'Courtesy Car Required?', enabled: true }
        ]
      },
      {
        section_id: 'insurance',
        section_name: 'Insurance Details',
        enabled: true,
        order: 3,
        fields: [
          { field_id: 'insurer', field_label: 'Insurer', enabled: true },
          { field_id: 'claim_ref', field_label: 'Claim Number', enabled: true },
          { field_id: 'policy_number', field_label: 'Policy Number', enabled: true },
          { field_id: 'send_estimate_email', field_label: 'Email Estimate to', enabled: true },
          { field_id: 'audatex_code', field_label: 'Audatex Code', enabled: true },
          { field_id: 'policy_excess', field_label: 'Excess', enabled: true }
        ]
      }
    ];

    // Use custom sections if available, otherwise use defaults
    const sectionsConfig = templateConfig?.sections_config || defaultSections;

    // Create PDF
    const doc = new jsPDF();
    doc.setFont('times', 'normal'); // Closest to Palatino

    // Define margins
    const leftMargin = 20;
    const rightMargin = 190;
    const maxWidth = rightMargin - leftMargin;

    // Helper function to format boolean to Yes/No
    const formatBoolean = (value) => value ? 'Yes' : 'No';

    // Get field value from claim
    const getFieldValue = (fieldId) => {
      if (fieldId === 'client_address') {
        return [
          claim.client_address_line_1,
          claim.client_address_line_2,
          claim.client_town,
          claim.client_postcode
        ].filter(Boolean).join(', ') || 'N/A';
      }
      
      const value = claim[fieldId];
      
      if (typeof value === 'boolean') {
        return formatBoolean(value);
      }
      
      if (fieldId === 'policy_excess' && value) {
        return `GBP ${Number(value).toFixed(2)}`;
      }
      
      return value || 'N/A';
    };

    // Header configuration
    const headerConfig = templateConfig?.header_config || { show_logo: true, show_claim_type: true };
    
    // Clean ARTURA logo matching app header style
    if (headerConfig.show_logo) {
      doc.setFontSize(28);
      doc.setFont('times', 'normal');
      
      // Position for centered alignment of the word
      let xPos = leftMargin;
      
      // A - gold
      doc.setTextColor(212, 175, 55);
      doc.text('A', xPos, 20);
      xPos += doc.getTextWidth('A');
      
      // RTUR - black
      doc.setTextColor(0, 0, 0);
      doc.text('RTUR', xPos, 20);
      xPos += doc.getTextWidth('RTUR');
      
      // A - gold
      doc.setTextColor(212, 175, 55);
      doc.text('A', xPos, 20);
      
      console.log('✓ ARTURA logo added (matching app header style)');
    }

    // Add claim type header if enabled
    if (headerConfig.show_claim_type) {
      doc.setFontSize(18);
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      const headerText = headerConfig.custom_text || `---${claim.claim_type || 'Claim'}---`;
      doc.text(headerText, 105, 45, { align: 'center' });
    }

    // Claim Reference
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Artura Claim Reference - ${claim.job_number || 'N/A'}`, leftMargin, 55);

    // Render sections based on configuration
    let yPos = 65;
    const lineHeight = 7;

    // Sort sections by order
    const sortedSections = [...sectionsConfig].sort((a, b) => a.order - b.order);

    for (const section of sortedSections) {
      if (!section.enabled) continue;

      // Add section spacing
      if (yPos > 65) {
        yPos += 5;
      }

      doc.setFontSize(10);

      // Render fields in this section
      for (const field of section.fields) {
        if (!field.enabled) continue;

        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const label = field.custom_label || field.field_label;
        const value = getFieldValue(field.field_id);

        doc.setFont('helvetica', 'bold');
        doc.text(`${label} -`, leftMargin, yPos);
        doc.setFont('helvetica', 'normal');

        // Handle multiline text
        const valueLines = doc.splitTextToSize(value, maxWidth - 50);
        doc.text(valueLines, leftMargin + 50, yPos);
        yPos += lineHeight * Math.max(valueLines.length, 1);

        // Add template-specific notes for certain fields
        if (field.field_id === 'client_vat_status' || field.field_id === 'policy_excess') {
          if (templateType === 'driversure') {
            const note = 'HOWEVER, YOU MUST NOT TAKE OR DISCUSS THIS WITH THE DRIVER. THIS NEEDS TO BE INVOICED TO DRIVERSURE UK LIMITED & SENT TO DRIVERSURE FOR PAYMENT';
            const noteLines = doc.splitTextToSize(note, maxWidth - 50);
            doc.text(noteLines, leftMargin + 50, yPos);
            yPos += lineHeight * noteLines.length;
          } else if (templateType === 'orkin') {
            const note = 'DO NOT APPROACH THE DRIVER - MUST BE INVOICED TO ARTURA SOLUTIONS LTD';
            const noteLines = doc.splitTextToSize(note, maxWidth - 50);
            doc.text(noteLines, leftMargin + 50, yPos);
            yPos += lineHeight * noteLines.length;
          }
        }
      }
    }

    // Add new page for invoice details
    doc.addPage();
    yPos = 20;

    // Invoice Deductions (if enabled)
    const invoiceConfig = templateConfig?.invoice_deductions || { show_section: true };
    if (invoiceConfig.show_section) {
      doc.setFillColor(245, 245, 245);
      doc.rect(leftMargin, yPos, 80, 50, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(leftMargin, yPos, 80, 50, 'S');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Deductions', leftMargin + 5, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      if (invoiceConfig.custom_deductions && invoiceConfig.custom_deductions.length > 0) {
        let deductionY = yPos + 18;
        for (const deduction of invoiceConfig.custom_deductions) {
          doc.text(`- ${deduction.label}: ${deduction.value}`, leftMargin + 5, deductionY);
          deductionY += 10;
        }
      } else {
        doc.text(`- ${claim.referral_fee_repairer || 0}% Bottom Line Discount`, leftMargin + 5, yPos + 18);
        doc.text('- Estimate Fee GBP 45', leftMargin + 5, yPos + 28);
      }
    }

    // Payment Terms (if enabled)
    const paymentConfig = templateConfig?.payment_terms || { show_section: true };
    if (paymentConfig.show_section) {
      doc.setFillColor(245, 245, 245);
      doc.rect(110, yPos, 80, 50, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(110, yPos, 80, 50, 'S');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Terms', 115, yPos + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 255, 0);
      doc.rect(115, yPos + 12, 65, 8, 'F');
      doc.setFont('helvetica', 'bold');
      const paymentText = paymentConfig.terms_text || '24 HOUR PAYMENT via ACG';
      doc.text(paymentText, 115, yPos + 18);
      doc.setFont('helvetica', 'normal');
    }

    yPos += 60;

    // Invoicing & Payment Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICING & PAYMENT', leftMargin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const line1 = doc.splitTextToSize('Your invoice MUST be addressed to the authorising party, as instructed on written authority.', maxWidth);
    doc.text(line1, leftMargin, yPos);
    yPos += 6 * line1.length;

    const line2 = doc.splitTextToSize('The invoice pack MUST include- Main Invoice, final authority & a signed satisfaction note.', maxWidth);
    doc.text(line2, leftMargin, yPos);
    yPos += 6 * line2.length;

    const line3 = doc.splitTextToSize('Artura will process the invoice pack via ACG who will deduct both the BLD & Estimate Fee from the payment to you.', maxWidth);
    doc.text(line3, leftMargin, yPos);
    yPos += 6 * line3.length;

    yPos += 3;

    doc.setFont('helvetica', 'bold');
    doc.text('Invoice pack MUST be sent to -', leftMargin, yPos);
    yPos += 7;

    doc.setTextColor(0, 0, 255);
    doc.textWithLink('invoices@artura.uk', leftMargin, yPos, { url: 'mailto:invoices@artura.uk' });
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    const warningLines = doc.splitTextToSize('PLEASE DO NOT SEND TO ANY OTHER PARTY WITHOUT PRIOR CONSENT', maxWidth);
    doc.text(warningLines, leftMargin, yPos);
    yPos += 7 * warningLines.length;

    yPos += 5;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    const disclaimerLines = doc.splitTextToSize('*By accepting this repair instruction, you agree to the T&Cs within the supplied SLA provided with this instruction.', maxWidth);
    doc.text(disclaimerLines, leftMargin, yPos);

    // Footer (if enabled)
    const footerConfig = templateConfig?.footer_config || { show_footer: true };
    if (footerConfig.show_footer) {
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 280, 210, 17, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      const address = footerConfig.address || 'Artura, The Nexus, Systematic Business Park, Old Ipswich Rd, Ardleigh, Colchester CO7 7QL';
      const contact = footerConfig.contact_info || 'www.artura.uk | info@artura.uk';
      
      doc.text(address, 105, 287, { align: 'center' });
      doc.text(contact, 105, 292, { align: 'center' });
    }

    console.log('PDF generation complete');

    // Get PDF as ArrayBuffer
    const pdfBytes = doc.output('arraybuffer');

    // Upload PDF to storage and save to claim's file_urls
    try {
      console.log('Uploading PDF to storage...');
      
      // Create a Blob from the ArrayBuffer
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Create a File object with a proper filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${claim.job_number || 'instruction'}-${templateType}-${timestamp}.pdf`;
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      
      // Upload using the Core integration
      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
        file: pdfFile
      });
      
      console.log('PDF uploaded:', uploadResult.file_url);
      
      // Add to claim's file_urls
      const currentFileUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
      const updatedFileUrls = [...currentFileUrls, uploadResult.file_url];
      
      await base44.asServiceRole.entities.Claim.update(claim.id, {
        file_urls: updatedFileUrls
      });
      
      console.log('✓ PDF saved to claim documents');
    } catch (uploadError) {
      console.error('Failed to upload PDF to storage:', uploadError);
      // Continue anyway - still return the PDF to the user
    }

    // Return PDF as blob
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${claim.job_number || 'instruction'}-${templateType}.pdf"`
      }
    });

  } catch (error) {
    console.error('=== FATAL PDF GENERATION ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
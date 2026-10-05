import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { PDF_CONST, PDF_COLORS, createPdfHelpers } from '../../shared/instructionPdfHelpers.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.user_type !== 'internal') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { claimId, saveToClaim = false, contact = null, includeSections = null } = await req.json();
    if (!claimId) return Response.json({ error: 'Missing claimId' }, { status: 400 });

    // Default all sections to included unless explicitly toggled off
    const sections = {
      client: includeSections?.client !== false,
      driver: includeSections?.driver !== false,
      vehicle: includeSections?.vehicle !== false,
      bodyshop: includeSections?.bodyshop !== false,
      incident: includeSections?.incident !== false,
      third_party: includeSections?.third_party === true,
    };

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    // ── Resolve credit repair company details: prefer claim fields, then lookup ──
    let cr = {
      name: claim.credit_repair_company_name || '',
      contact_name: claim.credit_repair_company_contact_name || '',
      phone: claim.credit_repair_company_phone || '',
      email: claim.credit_repair_company_email || '',
      account_ref: claim.credit_repair_company_account_ref || '',
    };
    if (!cr.name && claim.credit_repair_company_id) {
      try {
        const company = await base44.asServiceRole.entities.CreditRepairCompany.get(claim.credit_repair_company_id);
        if (company) {
          cr.name = company.name || '';
          cr.contact_name = company.contact_name || '';
          cr.phone = company.phone || '';
          cr.email = company.email || '';
          cr.account_ref = company.account_reference || '';
        }
      } catch (_) { /* ignore — fall back to N/A */ }
    }

    // ── Resolve bodyshop (repairer) details: prefer claim fields, then lookup ──
    let bs = {
      name: claim.bodyshop || '',
      contact_name: '',
      phone: '',
      email: claim.bodyshop_email || '',
      address: '',
    };
    if (claim.bodyshop_id) {
      try {
        const bodyshop = await base44.asServiceRole.entities.Bodyshop.get(claim.bodyshop_id);
        if (bodyshop) {
          bs.name = bs.name || bodyshop.name || '';
          bs.contact_name = bodyshop.contact_name || '';
          bs.phone = bodyshop.phone || bodyshop.mobile_phone || '';
          bs.email = bs.email || bodyshop.email || '';
          bs.address = [
            bodyshop.address_line_1, bodyshop.address_line_2,
            bodyshop.town, bodyshop.county, bodyshop.postcode
          ].filter(Boolean).join(', ') || '';
        }
      } catch (_) { /* ignore — fall back to N/A */ }
    }

    const doc = new jsPDF();
    const { LM, MW, PAD_X, TX, PW, TOP } = PDF_CONST;
    const { NAVY, WHITE, DARK_TEXT } = PDF_COLORS;

    let yPos = TOP;
    const { drawHeader, drawRow, drawParagraph, ensureSpace, estimateSection, finishSection, drawAllFooters } =
      createPdfHelpers(doc, { get: () => yPos, set: (v) => { yPos = v; } });

    const today = new Date().toLocaleDateString('en-GB');
    const fmt = (v) => (v === null || v === undefined || v === '') ? 'N/A' : String(v);
    const fmtDate = (v) => {
      if (!v) return 'N/A';
      try { return new Date(v).toLocaleDateString('en-GB'); } catch { return 'N/A'; }
    };
    const clientAddress = [
      claim.client_address_line_1, claim.client_address_line_2,
      claim.client_town, claim.client_county, claim.client_postcode
    ].filter(Boolean).join(', ') || 'N/A';

    // ═══ Document header ═══
    doc.setFillColor(...NAVY);
    doc.rect(LM, 12, MW, 12, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RCM Automotive', TX, 20.5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Credit Repair Instruction', PW - LM - PAD_X, 20.5, { align: 'right' });
    doc.setFillColor(240, 240, 240);
    doc.rect(LM, 25, MW, 7, 'F');
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`RCM Claim Reference: ${claim.job_number || 'N/A'}`, TX, 29.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Instruction Date: ${today}`, PW - LM - PAD_X, 29.5, { align: 'right' });
    yPos = 37;

    // ═══ Section 1 — Credit Repair Company ═══
    {
      const rows = [
        ['Company Name', fmt(cr.name)],
        ['Contact Name', fmt(cr.contact_name)],
        ['Phone', fmt(cr.phone)],
        ['Email', fmt(cr.email)],
        ['Account Reference', fmt(cr.account_ref)],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Credit Repair Company');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
    }

    // ═══ Section 2 — Client (Business) Details ═══
    if (sections.client) {
      const rows = [
        ['Client Name', fmt(claim.client_name)],
        ['Client Address', clientAddress],
        ['VAT Status', fmt(claim.client_vat_status)],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Client (Business)');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
    }

    // ═══ Section — Contact (person dealing with the claim) ═══
    {
      const cName = contact?.name || claim.client_name || '';
      const cPosition = contact?.position || '';
      const cPhone = contact?.phone || claim.client_phone || '';
      const cEmail = contact?.email || claim.client_email || '';
      const rows = [
        ['Contact Name', fmt(cName)],
        ['Position', fmt(cPosition)],
        ['Phone', fmt(cPhone)],
        ['Email', fmt(cEmail)],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Contact for this Claim');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
    }

    // ═══ Section 3 — Driver Details ═══
    if (sections.driver) {
      const driverAddress = claim.driver_same_as_client
        ? clientAddress
        : [claim.driver_contact_address_line_1, claim.driver_contact_address_line_2,
            claim.driver_contact_town, claim.driver_contact_county, claim.driver_contact_postcode]
            .filter(Boolean).join(', ') || 'N/A';
      const driverName = claim.driver_same_as_client ? claim.client_name : (claim.driver_contact_name || claim.driver_name);
      const driverPhone = claim.driver_same_as_client ? claim.client_phone : (claim.driver_contact_phone || claim.driver_phone);
      const driverEmail = claim.driver_same_as_client ? claim.client_email : (claim.driver_contact_email || claim.driver_email);
      const driverRows = [
        ['Same as Client', claim.driver_same_as_client ? 'Yes' : 'No'],
        ['Driver Name', fmt(driverName)],
        ['Phone', fmt(driverPhone)],
        ['Email', fmt(driverEmail)],
        ['Address', driverAddress],
      ];
      ensureSpace(estimateSection(driverRows));
      drawHeader('Driver Details');
      for (const [label, value] of driverRows) drawRow(label, value);
      finishSection();
    }

    // ═══ Section 4 — Vehicle Details ═══
    if (sections.vehicle) {
      const rows = [
        ['Make & Model', fmt(claim.make_model)],
        ['Registration', fmt(claim.reg)],
        ['Vehicle Location', fmt(claim.vehicle_location)],
        ['Vehicle Damage', fmt(claim.vehicle_damage)],
        ['Unroadworthy', claim.unroadworthy ? 'Yes' : 'No'],
        ['Recovery Required', claim.recovery_required ? 'Yes' : 'No'],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Vehicle Details');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
    }

    // ═══ Section — Bodyshop Details ═══
    if (sections.bodyshop) {
      const rows = [
        ['Bodyshop Name', fmt(bs.name)],
        ['Contact Name', fmt(bs.contact_name)],
        ['Phone', fmt(bs.phone)],
        ['Email', fmt(bs.email)],
        ['Address', fmt(bs.address)],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Bodyshop Details');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
    }

    // ═══ Section 5 — Incident Details ═══
    if (sections.incident) {
      const rows = [
        ['Date of Loss', fmtDate(claim.loss_date)],
        ['Time of Loss', fmt(claim.loss_time)],
        ['Incident Location', fmt(claim.incident_location)],
        ['Use of Vehicle', fmt(claim.vehicle_use)],
        ['Claim Type', fmt(claim.claim_type)],
      ];
      ensureSpace(estimateSection(rows));
      drawHeader('Incident Details');
      for (const [label, value] of rows) drawRow(label, value);
      finishSection();
      if (claim.circumstances) {
        drawParagraph('Circumstances: ' + claim.circumstances);
      }
    }

    // ═══ Section — Third Party Details ═══
    if (sections.third_party) {
      const tpAddress = [
        claim.tp_address_line_1, claim.tp_address_line_2,
        claim.tp_town, claim.tp_county, claim.tp_postcode
      ].filter(Boolean).join(', ') || 'N/A';
      const tpRows = [
        ['TP Name', fmt(claim.tp_name)],
        ['TP Driver Contact', fmt(claim.tp_driver_contact)],
        ['Phone', fmt(claim.tp_phone)],
        ['Email', fmt(claim.tp_email)],
        ['Address', tpAddress],
        ['TP Insurer', fmt(claim.tp_insurer)],
        ['TP Policy Number', fmt(claim.tp_policy_number)],
        ['TP Claim Ref', fmt(claim.tp_claim_ref)],
        ['TP Vehicle', fmt(claim.tp_make_model)],
        ['TP Registration', fmt(claim.tp_reg)],
        ['TP Vehicle Type', fmt(claim.tp_vehicle_type)],
        ['TP Vehicle Location', fmt(claim.tp_vehicle_location)],
        ['TP Vehicle Damage', fmt(claim.tp_vehicle_damage)],
        ['TP Unroadworthy', claim.tp_unroadworthy ? 'Yes' : 'No'],
        ['TP Recovery Required', claim.tp_recovery_required ? 'Yes' : 'No'],
      ];
      ensureSpace(estimateSection(tpRows));
      drawHeader('Third Party Details');
      for (const [label, value] of tpRows) drawRow(label, value);
      finishSection();
    }

    // ═══ Section 6 — Instruction ═══
    {
      ensureSpace(34);
      drawHeader('Instruction');
      drawParagraph(
        'Please accept this instruction to deal with the above claim on our behalf. The client and vehicle details are provided above for your reference. Kindly proceed with the credit repair process and liaise with RCM Automotive regarding any further information required.'
      );
      drawParagraph(
        'Please confirm receipt of this instruction and contact us at info@rcmautomotive.co.uk should you need any additional details.'
      );
    }

    drawAllFooters();

    const pdfBytes = doc.output('arraybuffer');
    const filename = `${claim.reg || claim.job_number || 'Credit Repair'} - Credit Repair Instruction.pdf`;

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
      console.error('Failed to upload PDF:', uploadError);
      return Response.json({ error: 'Failed to upload PDF: ' + uploadError.message }, { status: 500 });
    }

    return Response.json({ file_url, filename });
  } catch (error) {
    console.error('Credit repair PDF generation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
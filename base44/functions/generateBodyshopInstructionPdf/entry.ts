import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.user_type !== 'internal') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { claimId, contactOverrides } = await req.json();
    if (!claimId) return Response.json({ error: 'Missing claimId' }, { status: 400 });

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });

    // ── Field helpers ──────────────────────────────────────────────────────
    const today = new Date().toLocaleDateString('en-GB');
    const na = (v) => v || 'TBA';
    const bool = (v) => v ? 'Yes' : 'No';

    const clientAddress = [
      claim.client_address_line_1,
      claim.client_address_line_2,
      claim.client_town,
      claim.client_county,
      claim.client_postcode
    ].filter(Boolean).join(', ') || 'TBA';

    const f = {
      job_number:           na(claim.job_number),
      instruction_date:     today,
      claim_type:           na(claim.claim_type),
      repairer:             na(claim.bodyshop),
      client_name:          na(claim.client_name),
      client_address:       clientAddress,
      contact_name:         na(contactOverrides?.name || claim.driver_contact_name || claim.client_name),
      email_address:        na(contactOverrides?.email || claim.driver_contact_email || claim.client_email),
      contact_number:       na(contactOverrides?.phone || claim.client_phone),
      client_vat_status:    na(claim.client_vat_status),
      make_model:           na(claim.make_model),
      reg:                  na(claim.reg),
      vehicle_location:     na(claim.vehicle_location),
      vehicle_damage:       na(claim.vehicle_damage),
      recovery_required:    bool(claim.recovery_required),
      unroadworthy:         bool(claim.unroadworthy),
      courtesy_car:         bool(claim.courtesy_car_required),
      insurer:              na(claim.insurer),
      claim_ref:            na(claim.claim_ref),
      policy_number:        na(claim.policy_number),
      estimate_email:       na(claim.send_estimate_email),
      audatex_code:         na(claim.audatex_code),
      excess:               claim.policy_excess ? `£${Number(claim.policy_excess).toFixed(2)}` : 'N/A',
      referral_fee:         claim.referral_fee_repairer != null ? `${claim.referral_fee_repairer}%` : '0%',
    };

    // ── HTML Template ──────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    color: #222;
    background: white;
  }

  /* ── Page setup ── */
  @page {
    size: A4;
    margin: 18mm 18mm 22mm 18mm;
  }

  @page :first {
    margin-top: 14mm;
  }

  /* ── Page break ── */
  .page-break {
    page-break-after: always;
  }

  /* ── Header bar (page 1) ── */
  .doc-header {
    background: #141D48;
    color: white;
    padding: 7px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0;
  }
  .doc-header .title { font-size: 13pt; font-weight: bold; }
  .doc-header .subtitle { font-size: 9pt; opacity: 0.85; }

  /* ── Claim ref bar ── */
  .claim-ref-bar {
    background: #f0f0f0;
    padding: 4px 10px;
    font-size: 9pt;
    font-weight: bold;
    color: #222;
    margin-bottom: 10px;
    border-bottom: 1px solid #ddd;
  }

  /* ── Section header ── */
  .section-header {
    background: #141D48;
    color: white;
    font-size: 10pt;
    font-weight: bold;
    padding: 4px 8px;
    margin-top: 10px;
    margin-bottom: 0;
  }

  /* ── Data rows ── */
  .data-table {
    width: 100%;
    border-collapse: collapse;
  }
  .data-table tr {
    border-bottom: 1px solid #e0e0e0;
  }
  .data-table td {
    padding: 3.5px 8px;
    font-size: 8.5pt;
    vertical-align: top;
  }
  .data-table td.label {
    width: 38%;
    font-weight: bold;
    background: #f5f6f9;
    color: #333;
  }
  .data-table td.value {
    width: 62%;
    color: #222;
  }

  /* ── Footer ── */
  .footer {
    position: fixed;
    bottom: 8mm;
    left: 18mm;
    right: 18mm;
    border-top: 1px solid #ccc;
    padding-top: 3px;
    font-size: 7.5pt;
    color: #555;
    text-align: center;
  }

  /* ── Page 2 styles ── */
  .p2-section-header {
    background: #141D48;
    color: white;
    font-size: 10pt;
    font-weight: bold;
    padding: 4px 8px;
    margin-top: 0;
    margin-bottom: 8px;
  }

  .p2-body {
    font-size: 8.5pt;
    line-height: 1.45;
    color: #222;
    margin-bottom: 6px;
  }

  .supplier-box {
    background: #f5f6f9;
    border: 1px solid #c0c4d0;
    border-radius: 3px;
    padding: 7px 10px;
    margin: 6px 0 8px 0;
    font-size: 8.5pt;
  }
  .supplier-box .supplier-name {
    font-weight: bold;
    font-size: 9.5pt;
    margin-bottom: 2px;
  }

  .warning-box {
    background: #fff8e6;
    border: 1px solid #e6b41e;
    border-left: 4px solid #e6b41e;
    border-radius: 2px;
    padding: 6px 10px;
    margin: 5px 0;
    font-size: 8.5pt;
  }
  .warning-box .warn-label {
    font-weight: bold;
    color: #c00;
    margin-bottom: 1px;
  }

  .deductions-bar {
    background: #ddd;
    border: 1px solid #bbb;
    padding: 3px 8px;
    font-weight: bold;
    font-size: 9pt;
    margin-bottom: 0;
  }
  .deductions-value {
    padding: 4px 8px;
    font-size: 8.5pt;
    border: 1px solid #bbb;
    border-top: none;
    margin-bottom: 8px;
  }

  .payments-heading {
    font-weight: bold;
    font-size: 9pt;
    margin: 8px 0 5px 0;
  }

  .never-invoice {
    font-weight: bold;
    color: #c00;
    font-size: 8.5pt;
    text-align: center;
    margin: 6px 0;
  }

  .important-heading {
    font-weight: bold;
    color: #c00;
    font-size: 9pt;
    margin: 6px 0 3px 0;
  }

  .consent-line {
    font-weight: bold;
    color: #c00;
    font-size: 8.5pt;
    text-align: center;
    margin: 8px 0 3px 0;
  }

  .disclaimer {
    font-style: italic;
    font-size: 8pt;
    color: #555;
    text-align: center;
    margin-top: 2px;
  }

  .spacer { margin-bottom: 6px; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════ -->
<!-- FOOTER (renders on every page)             -->
<!-- ═══════════════════════════════════════════ -->
<div class="footer">
  RCM Automotive Ltd &nbsp;|&nbsp; www.rcmautomotive.co.uk &nbsp;|&nbsp; info@rcmautomotive.co.uk
</div>

<!-- ═══════════════════════════════════════════ -->
<!-- PAGE 1                                     -->
<!-- ═══════════════════════════════════════════ -->

<div class="doc-header">
  <span class="title">RCM Automotive</span>
  <span class="subtitle">Repairer Instruction</span>
</div>

<div class="claim-ref-bar">
  RCM Claim Reference: ${f.job_number}
</div>

<!-- Client & Repairer Details -->
<div class="section-header">Client &amp; Repairer Details</div>
<table class="data-table">
  <tr><td class="label">Instruction Date</td><td class="value">${f.instruction_date}</td></tr>
  <tr><td class="label">Claim Type</td><td class="value">${f.claim_type}</td></tr>
  <tr><td class="label">Repairer</td><td class="value">${f.repairer}</td></tr>
  <tr><td class="label">Client</td><td class="value">${f.client_name}</td></tr>
  <tr><td class="label">Client Address</td><td class="value">${f.client_address}</td></tr>
  <tr><td class="label">Contact Name</td><td class="value">${f.contact_name}</td></tr>
  <tr><td class="label">Email Address</td><td class="value">${f.email_address}</td></tr>
  <tr><td class="label">Contact Number</td><td class="value">${f.contact_number}</td></tr>
  <tr><td class="label">Client VAT Status</td><td class="value">${f.client_vat_status}</td></tr>
</table>

<!-- Vehicle Details -->
<div class="section-header">Vehicle Details</div>
<table class="data-table">
  <tr><td class="label">Vehicle Make &amp; Model</td><td class="value">${f.make_model}</td></tr>
  <tr><td class="label">Vehicle Registration</td><td class="value">${f.reg}</td></tr>
  <tr><td class="label">Vehicle Location</td><td class="value">${f.vehicle_location}</td></tr>
  <tr><td class="label">Vehicle Damage</td><td class="value">${f.vehicle_damage}</td></tr>
</table>

<!-- Recovery & Courtesy Details -->
<div class="section-header">Recovery &amp; Courtesy Details</div>
<table class="data-table">
  <tr><td class="label">Urgent Recovery Required?</td><td class="value">${f.recovery_required}</td></tr>
  <tr><td class="label">Vehicle Unroadworthy</td><td class="value">${f.unroadworthy}</td></tr>
  <tr><td class="label">Courtesy Car Required?</td><td class="value">${f.courtesy_car}</td></tr>
</table>

<!-- Insurance Details -->
<div class="section-header">Insurance Details</div>
<table class="data-table">
  <tr><td class="label">Insurer</td><td class="value">${f.insurer}</td></tr>
  <tr><td class="label">Claim Number</td><td class="value">${f.claim_ref}</td></tr>
  <tr><td class="label">Policy Number</td><td class="value">${f.policy_number}</td></tr>
  <tr><td class="label">Email Estimate to</td><td class="value">${f.estimate_email}</td></tr>
  <tr><td class="label">Audatex Code</td><td class="value">${f.audatex_code}</td></tr>
  <tr><td class="label">Excess (GBP)</td><td class="value">${f.excess}</td></tr>
</table>

<!-- Force page 2 -->
<div class="page-break"></div>

<!-- ═══════════════════════════════════════════ -->
<!-- PAGE 2 — STATIC CONTENT                    -->
<!-- ═══════════════════════════════════════════ -->

<div class="p2-section-header">Branded Decals &amp; Signage</div>

<p class="p2-body">All repairers MUST use the RCM Automotive approved decal supplier for any branded vehicle decals or signage.</p>
<p class="p2-body">Where a vehicle requires decals, these MUST be ordered as soon as the repair is authorised — if the vehicle is already on site, this should be done immediately. If the vehicle has not yet arrived, decals MUST be ordered prior to the vehicle coming on site.</p>
<p class="p2-body">Please contact John or Michael Welch at our approved supplier, quoting <strong>Orkin</strong> as the client and providing the vehicle registration number:</p>

<div class="supplier-box">
  <div class="supplier-name">Signs Plus</div>
  <div>147 Main Road, Biggin Hill, Kent, TN16 3JP</div>
  <div>Email: enquiries@signsplus.uk</div>
  <div>Phone: 01959 571 074</div>
</div>

<div class="warning-box">
  <div class="warn-label">WARNING:</div>
  Use of any other supplier for RCM Automotive branded decals is not permitted without prior written approval.
</div>

<div class="warning-box">
  <div class="warn-label">WARNING:</div>
  Any repair delayed as a result of the mismanagement of a decal order — including failure to order on time — will result in a charge of £100 per day for each day of delay attributable to the repairer. This will be deducted from any outstanding VAT and excess payments due.
</div>

<div class="spacer"></div>

<div class="p2-section-header">Invoicing</div>

<div class="deductions-bar">Invoice Deductions</div>
<div class="deductions-value">Rep. Referral Fee: ${f.referral_fee}</div>

<div class="payments-heading">INVOICING &amp; PAYMENTS</div>

<p class="p2-body">Your invoice for the insurer's element of the repair should be addressed and sent to the authorising party, as instructed on the authority and as per your usual practice.</p>
<p class="p2-body">Your full invoice pack MUST also be sent to invoices@rcmautomotive.co.uk and MUST include: main invoice, any excess or VAT invoices, final authority, and a signed satisfaction note.</p>
<p class="p2-body">Your invoice pack MUST be submitted within 48 hours of vehicle completion approval or final authority being issued — whichever applies.</p>
<p class="p2-body">VAT and excess invoices MUST be made out to RCM Automotive Ltd — payment will be made within 14 days.</p>
<p class="p2-body">Upon receipt of your invoice pack, you will receive an invoice from RCM Automotive for our referral fee, which will be payable within 7 days of invoice.</p>

<div class="never-invoice">***** NEVER INVOICE THE CLIENT DIRECTLY FOR VAT OR EXCESS *****</div>

<div class="important-heading">IMPORTANT — FAILURE TO COMPLY</div>
<p class="p2-body">Failure to submit your invoice pack within 48 hours will result in delays to your VAT and excess payment, and an admin charge of £150 will be added to your referral fee invoice.</p>
<p class="p2-body">Failure to pay your referral fee within 7 days will result in an additional admin charge of £150 and removal from the RCM Automotive network.</p>

<div class="consent-line">PLEASE DO NOT SEND TO ANY OTHER PARTY WITHOUT PRIOR CONSENT</div>
<div class="disclaimer">*By accepting this repair instruction, you agree to the T&amp;Cs within the supplied SLA provided with this instruction.</div>

</body>
</html>`;

    // ── Convert HTML to PDF via Base44 ─────────────────────────────────────
    const pdfResult = await base44.asServiceRole.integrations.Core.HtmlToPdf({
      html,
      options: {
        format: 'A4',
        printBackground: true,
        margin: { top: '14mm', right: '18mm', bottom: '22mm', left: '18mm' }
      }
    });

    const pdfBytes = pdfResult.pdf;

    // ── Upload & save to claim ─────────────────────────────────────────────
    try {
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${claim.job_number || 'instruction'}-${timestamp}.pdf`;
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

      const currentFileUrls = Array.isArray(claim.file_urls) ? claim.file_urls : [];
      await base44.asServiceRole.entities.Claim.update(claim.id, {
        file_urls: [...currentFileUrls, uploadResult.file_url],
        instruction_pdf_url: uploadResult.file_url
      });
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
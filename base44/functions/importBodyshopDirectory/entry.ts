import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.user_type !== 'internal' && user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const body = await req.json();
    const fileUrl = body.file_url;
    if (!fileUrl) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Fetch and parse the Excel file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return Response.json({ error: `Failed to fetch file: ${fileResponse.status}` }, { status: 500 });
    }
    const arrayBuffer = await fileResponse.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Map spreadsheet columns to entity fields
    const mapped = rows.map(row => {
      const val = (key) => {
        const v = row[key];
        if (v === null || v === undefined) return null;
        const s = String(v).trim();
        return s === '' || s === 'NA' || s === 'N/A' ? null : s;
      };

      const fullAddress = val('Address');

      // Try to extract UK postcode from full address
      let postcode = null;
      if (fullAddress) {
        const match = fullAddress.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i);
        if (match) postcode = match[1].toUpperCase();
      }

      return {
        name: val('Name'),
        full_address: fullAddress,
        postcode,
        contact_name: val('Main Contact'),
        phone: val('Phone (Landline)'),
        mobile_phone: val('Phone (Mobile)'),
        email: val('Main Email'),
        acg_signed_up: val('Signed up to ACG'),
        tier: val('Tier'),
        group_name: val('GROUP'),
        bodyshop_manager: val('Bodyshop Manager'),
        bs_manager_email: val('BS Manager Email'),
        referral_email: val('Referral Email'),
        accounts_contact: val('Accounts Contact'),
        accounts_email: val('Accounts Email'),
        web_address: val('Web Address'),
        company_registration_number: val('Company Registration Number'),
        company_directors: val('Company Director(s):'),
        radius_covered: val('Radius Covered (Miles):'),
        audatex_code: val('Audatex Code'),
        bs10125_certified: val('Do you have BS10125?'),
        bs10125_number: val('If yes - please provide Number'),
        ico_number: val('ICO number'),
        vat_number: val('VAT Number'),
        largest_vehicle_repairable: val('What is the largest vehicle you are able to repair?'),
        bodyshop_management_system: val('What Bodyshop Management System do you use?'),
        wheel_alignment: val('Wheel Alignement'),
        adas: val('ADAS'),
        jig: val('JIG'),
        manufacturer_approvals: val('Manufacturer Approvals'),
        insurer_approvals: val('Insurer Approvals')
      };
    }).filter(b => b.name);

    // Get existing bodyshops to match by name (avoid duplicates)
    const existing = await base44.asServiceRole.entities.Bodyshop.list('-created_date', 1000);
    const existingByName = {};
    existing.forEach(b => {
      if (b.name) existingByName[b.name.toLowerCase().trim()] = b;
    });

    const toCreate = [];
    const toUpdate = [];

    for (const b of mapped) {
      const key = b.name.toLowerCase().trim();
      if (existingByName[key]) {
        toUpdate.push({ id: existingByName[key].id, ...b });
      } else {
        toCreate.push(b);
      }
    }

    // Bulk create new records (max 500 per call)
    let created = 0;
    if (toCreate.length > 0) {
      const result = await base44.asServiceRole.entities.Bodyshop.bulkCreate(toCreate);
      created = toCreate.length;
    }

    // Update existing records
    let updated = 0;
    if (toUpdate.length > 0) {
      await base44.asServiceRole.entities.Bodyshop.bulkUpdate(toUpdate);
      updated = toUpdate.length;
    }

    return Response.json({
      total_in_file: rows.length,
      mapped: mapped.length,
      created,
      updated,
      skipped_no_name: rows.length - mapped.length
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
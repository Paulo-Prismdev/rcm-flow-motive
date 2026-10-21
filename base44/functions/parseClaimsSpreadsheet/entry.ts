import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';
import { requireInternalUser } from '../../shared/internalAccess.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Internal-only: reading an uploaded claims spreadsheet.
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Fetch the uploaded file
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) {
      return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });

    // Use the first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to array of objects with header row
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    });

    return Response.json({ rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
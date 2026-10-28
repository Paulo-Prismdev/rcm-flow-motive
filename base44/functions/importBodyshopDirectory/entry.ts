import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as XLSX from 'npm:xlsx@0.18.5';
import { requireInternalUser } from '../../shared/internalAccess.ts';
import {
  FIELD_LABELS,
  detectColumns,
  buildImportPlan,
  diffForUpdate,
  postcodeKey,
} from '../../shared/bodyshopImport.ts';

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

// ── spreadsheet ───────────────────────────────────────────────────────────

function readSheet(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
  if (matrix.length === 0) return { headers: [], rows: [] };

  const seen = new Map();
  const headers = (matrix[0] || []).map((cell, i) => {
    let name = String(cell === null || cell === undefined ? '' : cell).trim() || `Column ${i + 1}`;
    const count = (seen.get(name) || 0) + 1;
    seen.set(name, count);
    if (count > 1) name = `${name} ${count}`;
    return name;
  });

  const rows = matrix.slice(1).map((cells) => {
    const row = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] === null || cells[i] === undefined ? '' : cells[i];
    });
    return row;
  });

  return { headers, rows };
}

// ── map location ──────────────────────────────────────────────────────────

async function geocode(address) {
  if (!GOOGLE_API_KEY || !address) return null;
  try {
    const params = new URLSearchParams({ address, components: 'country:gb', key: GOOGLE_API_KEY });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const location = data.results && data.results[0] && data.results[0].geometry
      ? data.results[0].geometry.location
      : null;
    if (!location) return null;
    return { latitude: location.lat, longitude: location.lng };
  } catch (error) {
    console.error('Geocode failed for', address, error.message);
    return null;
  }
}

function geoAddress(values) {
  if (values.postcode) return `${values.postcode}, United Kingdom`;
  const parts = [values.name, values.full_address, values.town].filter(Boolean);
  if (parts.length === 0) return '';
  return `${parts.join(', ')}, United Kingdom`;
}

/** Geocode every distinct address, a handful at a time. */
async function geocodeAll(addresses) {
  const list = [];
  addresses.forEach((address) => {
    if (address && list.indexOf(address) === -1) list.push(address);
  });

  const results = new Map();
  let cursor = 0;
  const worker = async () => {
    while (cursor < list.length) {
      const address = list[cursor];
      cursor += 1;
      results.set(address, await geocode(address));
    }
  };
  const size = Math.min(5, list.length);
  await Promise.all(Array.from({ length: size }, () => worker()));
  return results;
}

// ── apply ─────────────────────────────────────────────────────────────────

const ALLOWED_FIELDS = new Set(Object.keys(FIELD_LABELS));

/** Only real values ever reach a record: blank cells are dropped here too. */
function sanitise(fields) {
  const out = {};
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (!ALLOWED_FIELDS.has(key)) return;
    if (value === null || value === undefined) return;
    if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = value;
      return;
    }
    const text = String(value).trim();
    if (text) out[key] = text;
  });
  return out;
}

async function applyPlan(base44, apply) {
  const items = Array.isArray(apply) ? apply : [];
  const toCreate = [];
  const toUpdate = [];

  items.forEach((item) => {
    const fields = sanitise(item && item.fields);
    if (item && item.action === 'create') {
      if (fields.name) toCreate.push(fields);
      return;
    }
    if (item && item.action === 'update' && item.id && Object.keys(fields).length > 0) {
      toUpdate.push({ id: item.id, ...fields });
    }
  });

  let created = 0;
  let updated = 0;
  const errors = [];

  for (let i = 0; i < toCreate.length; i += 200) {
    const chunk = toCreate.slice(i, i + 200);
    try {
      await base44.asServiceRole.entities.Bodyshop.bulkCreate(chunk);
      created += chunk.length;
    } catch (error) {
      errors.push(`Creating repairers failed: ${error.message}`);
    }
  }

  for (let i = 0; i < toUpdate.length; i += 200) {
    const chunk = toUpdate.slice(i, i + 200);
    try {
      await base44.asServiceRole.entities.Bodyshop.bulkUpdate(chunk);
      updated += chunk.length;
    } catch (error) {
      errors.push(`Updating repairers failed: ${error.message}`);
    }
  }

  return Response.json({ created, updated, errors });
}

// ── preview ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Internal-only: bulk directory import.
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;

    const body = await req.json();
    if (body.mode === 'apply') return await applyPlan(base44, body.apply);

    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return Response.json({ error: `Failed to fetch file: ${fileResponse.status}` }, { status: 500 });
    }

    const { headers, rows } = readSheet(await fileResponse.arrayBuffer());
    const columns = detectColumns(headers);
    if (!columns.name) {
      return Response.json(
        { error: 'No name column found — add a column headed Name, Repairer or Bodyshop.' },
        { status: 400 },
      );
    }

    const existing = await base44.asServiceRole.entities.Bodyshop.list('-created_date', 2000);
    const existingById = new Map(existing.map((record) => [record.id, record]));
    const { planned, skipped } = buildImportPlan({ rows, columns, existing });

    // Work out which rows need a map location, then geocode them in one pass.
    const prepared = planned.map((plan) => {
      if (plan.action === 'create') {
        return { plan, address: geoAddress(plan.values) };
      }

      const record = existingById.get(plan.match.id);
      const diff = diffForUpdate(record, plan.values);
      const postcodeMoved = !!plan.values.postcode
        && postcodeKey(plan.values.postcode) !== postcodeKey(record && record.postcode);
      const missingPin = !record || !record.latitude || !record.longitude;
      const postcode = plan.values.postcode || (record && record.postcode);
      const address = postcodeMoved || missingPin
        ? (postcode ? `${postcode}, United Kingdom` : geoAddress({ ...record, ...plan.values }))
        : '';

      return { plan, changes: diff.changes, fields: diff.fields, record, address };
    });

    const coords = await geocodeAll(prepared.map((entry) => entry.address));

    const create = [];
    const update = [];
    const possible = [];
    let unchanged = 0;

    prepared.forEach((entry) => {
      const plan = entry.plan;
      const pin = entry.address ? coords.get(entry.address) : null;

      if (plan.action === 'create') {
        create.push({
          row: plan.row,
          name: plan.values.name,
          town: plan.values.town || '',
          postcode: plan.values.postcode || '',
          group_name: plan.values.group_name || '',
          map_group: plan.values.map_group || '',
          fields: { ...plan.values, ...(pin || {}) },
          map_ok: !!pin,
        });
        return;
      }

      if (plan.action === 'update') {
        const fields = { ...entry.fields, ...(pin || {}) };
        if (Object.keys(fields).length === 0) {
          unchanged += 1;
          return;
        }
        update.push({
          row: plan.row,
          id: plan.match.id,
          name: plan.values.name,
          existing_name: plan.match.name,
          postcode: plan.values.postcode || (entry.record && entry.record.postcode) || '',
          changes: entry.changes || [],
          fields,
          map_updated: !!pin,
          map_failed: !!entry.address && !pin,
        });
        return;
      }

      possible.push({
        row: plan.row,
        name: plan.values.name,
        town: plan.values.town || '',
        postcode: plan.values.postcode || '',
        candidate: plan.match,
        reason: plan.reason,
        confidence: Math.round((plan.confidence || 0) * 100),
        changes: entry.changes || [],
        create_fields: { ...plan.values, ...(pin || {}) },
        update_fields: { ...entry.fields, ...(pin || {}) },
        map_ok: !!pin,
      });
    });

    const usedColumns = Object.entries(columns).map(([field, header]) => ({
      field,
      label: FIELD_LABELS[field] || field,
      header,
    }));

    return Response.json({
      totals: {
        rows: rows.length,
        skipped,
        create: create.length,
        update: update.length,
        possible: possible.length,
        unchanged,
      },
      columns: usedColumns,
      create,
      update,
      possible,
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
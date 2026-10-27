import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireInternalUser } from '../../shared/internalAccess.ts';

/**
 * Record the purchase orders that were generated on private-paying claims before
 * orders were tracked on the claim.
 *
 * The order itself is still in the claim's files — a PDF named as a purchase order —
 * but the claim carries no record of it, so Financials shows "Not issued yet" even
 * though the repairer has held the order all along. This reads those files, takes
 * each order's number, date and amount off the document, and writes the record onto
 * the claim exactly as the generator does: the newest order is the Final Purchase
 * Order, the ones before it are kept marked superseded.
 *
 * A file that is a purchase order but whose number or total cannot be read is
 * reported back rather than recorded at a guessed figure, so it can be regenerated
 * from Financials.
 */

const PRIVATE_TYPES = ['Paying Privately', '3rd Party Paying Privately'];

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const fileNameFromUrl = (url: string) => {
  const raw = String(url || '').split('?')[0].split('/').pop() || '';
  const decoded = decodeURIComponent(raw).replace(/^[0-9a-f]{6,}_/i, '');
  return decoded || raw;
};

/** A file whose name says it is a purchase order (not every PDF on the claim). */
const looksLikePurchaseOrder = (url: string) => {
  const name = fileNameFromUrl(url);
  return /purchase[\s_-]*order/i.test(name) || /(^|[^a-z])po[-_ ]?\d*/i.test(name);
};

const toNum = (v: any) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) && n !== 0 ? round2(n) : null;
};

const EXTRACTION_PROMPT = `You are reading ONE document filed against an automotive repair claim.

1. Decide whether the document is a PURCHASE ORDER: the order that authorises a repair where the customer is paying privately (it carries a purchase order number, an issue date and an order total). It is NOT a purchase order if it is an estimate, an insurer authority, a repairer's invoice, a collection/salvage note or anything else.

2. If it is a purchase order, read:
   - number: the purchase order number exactly as printed (e.g. CLM-0046-PO1).
   - date: the date the order was issued, as YYYY-MM-DD.
   - net: the amount excluding VAT, as digits only.
   - vat: the VAT amount, as digits only.
   - total: the total INCLUDING VAT, as digits only.

Never guess. If a figure cannot be read from the document, leave that field blank. Amounts are plain numbers with no currency symbol, no thousands separators and no wording.`;

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    is_purchase_order: { type: 'boolean' },
    number: { type: 'string' },
    date: { type: 'string' },
    net: { type: 'string' },
    vat: { type: 'string' },
    total: { type: 'string' },
  },
  required: ['is_purchase_order'],
};

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;
    const user = gate.user;

    const body = await req.json().catch(() => ({}));
    const claimIds: string[] = Array.isArray(body?.claim_ids) ? body.claim_ids : [];
    const dryRun = body?.dry_run === true;

    // Every private-paying claim, including archived ones: an archived job still has
    // its order in the files, and its invoice pack still has to match it.
    const query = claimIds.length > 0
      ? { id: { $in: claimIds } }
      : { claim_type: { $in: PRIVATE_TYPES } };

    const claims: any[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 40; page += 1) {
      const res: any = await base44.asServiceRole.entities.Claim.filter(query, {
        limit: 200,
        ...(cursor ? { cursor } : {}),
      });
      const items = Array.isArray(res) ? res : res?.items || [];
      claims.push(...items);
      cursor = Array.isArray(res) ? undefined : res?.next_cursor;
      if (!cursor || items.length === 0) break;
    }

    const recorded: any[] = [];
    const duplicates: any[] = [];
    const unreadable: any[] = [];
    let claimsTouched = 0;

    for (const claim of claims) {
      const existing: any[] = Array.isArray(claim?.invoice_tracker?.purchase_orders)
        ? claim.invoice_tracker.purchase_orders.filter((po: any) => po && po.number)
        : [];
      const alreadyFiled = new Set(existing.map((po: any) => po.file_url).filter(Boolean));

      const files: string[] = Array.isArray(claim?.file_urls) ? claim.file_urls : [];
      const candidates = files.filter((url) => looksLikePurchaseOrder(url) && !alreadyFiled.has(url));
      if (candidates.length === 0) continue;

      const found: any[] = [];
      for (let i = 0; i < candidates.length; i += 3) {
        const batch = candidates.slice(i, i + 3);
        const results = await Promise.allSettled(
          batch.map((url) =>
            base44.asServiceRole.integrations.Core.InvokeLLM({
              prompt: `${EXTRACTION_PROMPT}\n\nThe document to read is attached.`,
              file_urls: [url],
              response_json_schema: EXTRACTION_SCHEMA,
            })
          )
        );

        results.forEach((result: any, idx: number) => {
          const url = batch[idx];
          const fileName = fileNameFromUrl(url);
          if (result.status === 'rejected') {
            unreadable.push({
              job_number: claim.job_number,
              file_name: fileName,
              file_url: url,
              reason: `Could not be read (${result.reason?.message || 'document read failed'})`,
            });
            return;
          }
          const data = result.value || {};
          const number = String(data.number || '').trim();
          const total = toNum(data.total);
          if (data.is_purchase_order !== true) {
            unreadable.push({
              job_number: claim.job_number,
              file_name: fileName,
              file_url: url,
              reason: 'Not readable as a purchase order',
            });
            return;
          }
          if (!number || total === null) {
            unreadable.push({
              job_number: claim.job_number,
              file_name: fileName,
              file_url: url,
              reason: !number ? 'No purchase order number on the document' : 'No order total on the document',
            });
            return;
          }
          found.push({
            number,
            date: String(data.date || '').slice(0, 10),
            net: toNum(data.net),
            vat: toNum(data.vat),
            total,
            file_url: url,
            file_name: fileName,
            superseded: false,
            generated_at: new Date().toISOString(),
            by: user?.email || '',
            recorded_from: 'backfill',
          });
        });
      }

      if (found.length === 0) continue;

      // The same order filed twice (a re-download, a second upload) is one order.
      const seen = new Set<string>();
      const fresh: any[] = [];
      for (const po of found) {
        const key = `${po.number}|${po.total}|${po.date}`;
        if (seen.has(key)) {
          duplicates.push({ job_number: claim.job_number, file_name: po.file_name, number: po.number, total: po.total });
          continue;
        }
        seen.add(key);
        fresh.push(po);
      }

      if (fresh.length === 0) continue;

      const ordered = [...existing, ...fresh].sort((a: any, b: any) =>
        String(a.date || '').localeCompare(String(b.date || ''))
      );
      const tracker = {
        ...(claim.invoice_tracker || {}),
        purchase_orders: ordered.map((po: any, idx: number) => ({ ...po, superseded: idx < ordered.length - 1 })),
      };

      if (!dryRun) {
        await base44.asServiceRole.entities.Claim.update(claim.id, { invoice_tracker: tracker });
      }
      claimsTouched += 1;
      fresh.forEach((po) => recorded.push({
        job_number: claim.job_number,
        number: po.number,
        date: po.date,
        total: po.total,
        file_name: po.file_name,
      }));
    }

    return Response.json({
      dry_run: dryRun,
      claims_checked: claims.length,
      claims_touched: claimsTouched,
      recorded,
      duplicates,
      unreadable,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
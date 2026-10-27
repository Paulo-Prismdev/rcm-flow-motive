/**
 * The purchase orders generated for a claim.
 *
 * On a job the customer is paying for privately there is no insurer and so no
 * authority: we authorise the repair with a purchase order issued from the system,
 * and that order is what the repairer's invoice is measured against — the role the
 * Final Authority plays on an insurer claim.
 *
 * Every order generated is kept on the claim, with its own number (the job number
 * with PO1, PO2 …), the date it was issued and its amount split into ex VAT, VAT and
 * total inc VAT. A revised order replaces the one before it: the newest is the Final
 * Purchase Order, and the ones it replaced stay on the claim marked superseded, for
 * the record.
 *
 *   invoice_tracker.purchase_orders = [
 *     { number, date, net, vat, total, file_url, file_name, superseded, generated_at, by }
 *   ]
 */

export const PO_KEY = 'purchase_orders';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Every purchase order generated on the claim, oldest first. */
export const purchaseOrders = (claim) => {
  const list = claim?.invoice_tracker?.[PO_KEY];
  return Array.isArray(list) ? list.filter((po) => po && po.number) : [];
};

/** The latest purchase order — the one the repairer's invoice is measured against. */
export const finalPurchaseOrder = (claim) => {
  const list = purchaseOrders(claim);
  return list.length > 0 ? list[list.length - 1] : null;
};

/** The number the next order generated on this claim takes: CLM-0046-PO1, PO2 … */
export const nextPurchaseOrderNumber = (claim) =>
  `${claim?.job_number || 'PO'}-PO${purchaseOrders(claim).length + 1}`;

/** A purchase order's three figures, read as money. */
export const purchaseOrderFigures = (po) => {
  const total = toNum(po?.total);
  const net = toNum(po?.net);
  const vat = toNum(po?.vat);
  if (total === null) return null;
  const resolvedNet = net !== null ? round2(net) : round2(total / 1.2);
  return {
    net: resolvedNet,
    vat: vat !== null ? round2(vat) : round2(total - resolvedNet),
    total: round2(total),
  };
};

/**
 * The whole of an order's amount worked out from a single figure: the total inc VAT
 * is what we hold, and the ex-VAT and VAT parts are its own split of it.
 */
export const splitPurchaseOrderTotal = (total) => {
  const inc = round2(toNum(total) ?? 0);
  const net = round2(inc / 1.2);
  return { net, vat: round2(inc - net), total: inc };
};

/**
 * The figure a new order is issued at: the latest authorised amount — the
 * supplementary authority where there is one, otherwise the initial authority — and
 * failing any authority, the latest estimate the same way. A supplementary figure is a
 * revised total that replaces the one before it, never an amount added to it.
 *
 * Returns the figure and which document it came from, so the amount is shown to the
 * user with its source before an order is issued at it.
 */
export function purchaseOrderFigureSource(claim) {
  const records = claim?.invoice_tracker?.documents || {};
  const num = (...values) => {
    for (const value of values) {
      const n = toNum(value);
      if (n !== null && n !== 0) return round2(n);
    }
    return null;
  };

  const supplementaryAuthority = num(
    records.supplementary_authority?.gross,
    claim?.supplementary_authority_cost_gross
  );
  if (supplementaryAuthority) return { total: supplementaryAuthority, source: 'Supplementary Authority' };

  const initialAuthority = num(claim?.authority_cost_gross, records.initial_authority?.gross);
  if (initialAuthority) return { total: initialAuthority, source: 'Initial Authority' };

  const supplementaryEstimate = num(
    records.supplementary_estimate?.gross,
    claim?.supplementary_estimate_cost_gross
  );
  if (supplementaryEstimate) return { total: supplementaryEstimate, source: 'Supplementary Estimate' };

  const initialEstimate = num(claim?.estimate_cost_gross);
  if (initialEstimate) return { total: initialEstimate, source: 'Initial Estimate' };

  return { total: 0, source: null };
}

/**
 * The repairer's invoice set against the Final Purchase Order: the ordered amount is
 * the whole of the repair, so the invoice total is measured against it as it stands —
 * no insurer's share, no excess, nothing to split.
 */
export const purchaseOrderExpectation = (claim) => {
  const po = finalPurchaseOrder(claim);
  if (!po) return null;
  const figures = purchaseOrderFigures(po);
  if (!figures || figures.total <= 0) return null;
  return {
    purchaseOrder: po,
    gross: figures.total,
    net: figures.net,
    vat: figures.vat,
    vatRegistered: false,
    vatStatusKnown: true,
    excess: 0,
    excessTbc: false,
    contributions: 0,
    // The whole repair is what was ordered, with nothing beside it: no excess, no
    // insurer's share, no VAT of the customer's to take off, so the invoice is held
    // against the order's total itself.
    expected: figures.total,
    customerShare: 0,
  };
};
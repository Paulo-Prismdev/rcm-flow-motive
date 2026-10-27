/**
 * The invoice items a claim can carry, and the rules that read them.
 *
 * - kind 'document' → close-out paperwork. It is only ever received/sent (with a
 *   date and a file): no amount, no paid tick, and nothing in the owed totals.
 * - setsRepairCost → the total read off this document is offered as the claim's
 *   final repair cost.
 * - direction 'in'  → an invoice we receive and pay (money we owe)
 * - direction 'out' → an invoice we send and get paid for (money owed to us)
 * - requires       → visibility gate on the claim / client
 * - amountSource   → the amount is worked out from the job figures
 * - party          → who the invoice is to or from
 * - bindings       → claim fields that ARE the single source of truth for that value
 * - status_field   → existing invoice_status-style field kept in sync with "paid"
 * - readFigures    → when set, only these figures are read off the document
 * - extraFigures   → further figures read off it besides the standard ones
 *
 * A total loss job carries its own close-out papers in place of the Final Insurer
 * Invoice and the Final Authority (see ./totalLoss), so those items are gated on
 * `total_loss` / `not_total_loss` rather than on the claim type alone.
 *
 * A job the customer is paying for privately carries the repairer's own invoice for
 * the whole repair — on these items the Final Repair Invoice — as an invoice we pay
 * rather than paperwork we collect, with our invoice to the customer beside it for
 * the same total (see `privatePaying` on the item and `client_invoice_out`). There is
 * no insurer on such a job, so no Final Authority and no VAT & excess invoices apply
 * to it. Where the third party rather than our client is paying, that invoice to the
 * customer goes to the third party instead (see `thirdParty` on `client_invoice_out`).
 */

export const INVOICE_FILE_PREFIX = 'inv_';

export const invoiceDocKey = (itemKey) => `${INVOICE_FILE_PREFIX}${itemKey}`;

export const isInvoiceDocKey = (key) =>
  typeof key === 'string' && key.startsWith(INVOICE_FILE_PREFIX);

export const INVOICE_SECTIONS = [
  { key: 'in', label: 'Invoices In', hint: 'Invoices we receive and pay' },
  { key: 'out', label: 'Invoices Out', hint: 'Invoices we send and get paid for' },
  { key: 'closeout', label: 'Close-out', hint: "The job's final step" },
];

export const INVOICE_ITEMS = [
  {
    key: 'final_invoice',
    label: 'Final Insurer Invoice',
    section: 'closeout',
    // The repairer's Final Insurer Invoice to the insurer: we keep a copy on file
    // and the repair cost is read off it — the whole of it on a job where the
    // client's VAT and excess are not handled by us, otherwise the part the
    // insurer pays, with the VAT & excess invoice beside it — but we are not
    // paid on it ourselves, so it is close-out paperwork like the Final
    // Authority: green on a copy, with no paid step.
    kind: 'document',
    // Still 'out': the invoice itself is addressed to the insurer (or, on a credit
    // repair job, to the partner), which is who the party check and the "To" on its
    // sheet read. Only a copy of it reaches us, so its date is the date it was
    // received and it reads Received like every other paper in the close-out step.
    direction: 'out',
    dateLabel: 'Received',
    // Every repaired job carries it, a credit repair job included: there the same
    // invoice is the repairer's, addressed to the credit repair company rather than
    // to an insurer — see `creditRepair` below, and `privatePaying` for the job the
    // customer is paying for themselves, where we settle that invoice ourselves.
    requires: ['not_total_loss'],
    party: 'authorising_party',
    // How the item reads on a credit repair job: the partner is who it goes to and
    // who pays, so that is the name and the party the check is made against. Only
    // those two change — the key, the figures read off it and the final repair cost
    // it sets are the same everywhere.
    creditRepair: { label: 'Final Repair Invoice', party: 'credit_repair' },
    // How the item reads on a job the customer is paying for privately: the repairer's
    // own invoice for the whole repair, addressed to us. We settle it in full and
    // recover it from the customer, so it is not paperwork we collect but an invoice
    // we pay — it counts in what we owe and is marked paid with the rest — and it is
    // never set against an insurer authority, because there is none on the job.
    // Everything that reads off its key is unchanged: it is still the repairer's
    // final invoice, still read for its total, and that total is still where the
    // claim's final repair cost comes from.
    privatePaying: {
      label: 'Final Repair Invoice',
      // An invoice rather than close-out paperwork: the money is ours to pay.
      kind: null,
      direction: 'in',
      dateLabel: 'Received',
      // From the repairer, checked against them as any invoice that comes in is.
      party: 'repairer',
      // Its date is its own, recorded against it: it is not the date our own invoice
      // went out, and receiving it never marks the claim Invoiced.
      bindings: null,
      date_status_field: null,
      date_status_value: null,
    },
    // Its date is the date printed on the invoice itself, never the upload date.
    bindings: { date: 'invoice_sent_date' },
    // The job is invoiced once the Final Insurer Invoice itself is on file.
    date_status_field: 'invoice_status',
    date_status_value: 'Invoiced',
    setsRepairCost: true,
    // The whole repair, split on the document between who pays what: many repairers
    // print the full total and then an "amount payable by" line for the insurer and
    // another for the customer. Those two shares are read beside the total and kept
    // apart (see ./invoiceAuthorityCheck), so the invoice is checked as the two
    // payments it really is rather than as one amount that looks over the insurer's
    // share. An invoice that prints a single amount leaves both empty and is read
    // exactly as it always was: that amount is what the insurer is billed.
    extraFigures: [
      {
        key: 'payable_insurer',
        label: 'Payable by the insurer',
        type: 'number',
        split: true,
        prompt: 'where the invoice splits its total between who pays what, the amount it says is payable by the insurer — the "amount payable by" line naming the insurer or their claim. Read it on its own: never added to another figure, and never taken as the invoice total. Leave it empty where the document prints one amount only',
      },
      {
        key: 'payable_customer',
        label: 'Payable by the customer',
        type: 'number',
        split: true,
        prompt: 'where the invoice splits its total between who pays what, the amount it says is payable by the customer, client, owner or policyholder — the "amount payable by" line naming them (often beside a named excess or the VAT). Read it on its own: never added to another figure, and never taken as the invoice total. Leave it empty where the document prints one amount only',
      },
    ],
  },
  {
    // Where we handle a client's VAT and excess, the repairer bills us for the
    // VAT content of their repair plus the excess they collected. That invoice
    // arrives with their Final Insurer Invoice, so it is filed on the close-out step
    // beside it — named from the repairer, and checked the same way as any other
    // invoice that comes in. It is still an invoice we pay: it keeps its own
    // received date and its paid step alongside the rest of them.
    key: 'vat_excess_invoice_in',
    label: 'VAT & Excess Invoice In',
    section: 'closeout',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'vat_excess',
    party: 'repairer',
    amountSource: 'vat_excess',
    bindings: {
      paid: 'excess_contribution_paid',
      paid_date: 'excess_contribution_paid_date',
    },
    date_flag: 'excess_contribution_invoice_received',
    varianceReason: 'Repair cost, excess or VAT status changed',
  },
  {
    key: 'final_authority',
    label: 'Final Authority',
    section: 'closeout',
    kind: 'document',
    direction: 'in',
    dateLabel: 'Received',
    // A job the customer is paying for privately has no insurer on it, so there is
    // no authority to collect and nothing for the repairer's invoice to be measured
    // against.
    requires: ['not_total_loss', 'not_private_paying'],
    // Its own date: "Authority Received" is the initial authority, which belongs
    // to the Initial Authority document, not to this one.
    bindings: { date: 'final_authority_received' },
    // Its own short read: the registration it covers, the amount the repair was
    // authorised at and the excess it shows. None of the invoice's own checks
    // apply to it.
    readsAuthority: true,
  },
  {
    key: 'collection_note',
    label: 'Collection Note',
    section: 'closeout',
    kind: 'document',
    // A copy of it comes in to us with the rest of the close-out paperwork, so it
    // reads Received however it was asked for.
    direction: 'out',
    dateLabel: 'Received',
    requires: ['not_total_loss'],
    // Recommended, not required: a copy is encouraged and nudged in amber until
    // it is filed, but the job's invoicing finishes without one. "Not available"
    // records why there won't be one, and stops the nudge.
    recommended: true,
    // On a job the customer is paying for privately it is asked for in earnest: the
    // note is what we hold the customer to on the whole of the repair, so it is
    // required there — counted in the step, chased, and never finished without.
    privatePaying: { recommended: false },
    // Nothing is read off it and it carries no figures: uploading it stores the
    // copy, and that is the whole of it.
    storeOnly: true,
  },
  // Total loss close-out papers, standing where the Final Insurer Invoice and the
  // Final Authority stand on a repaired job.
  {
    // The salvage agent bills the repairer for the storage the vehicle ran up while
    // it sat there, plus their own admin charges. It is not an invoice we pay: we
    // keep the copy as close-out paperwork, and read two figures off it — the
    // storage charge and the admin charges, kept apart, because only the storage
    // drives the fee we invoice the repairer for. Nothing is read off it beyond
    // what the invoice itself prints.
    key: 'salvage_invoice_in',
    label: 'Salvage Agent Invoice',
    section: 'closeout',
    kind: 'document',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'total_loss',
    extraFigures: [
      {
        key: 'storage_charge_ex_vat',
        label: 'Storage charge ex VAT',
        type: 'number',
        // The storage fee invoice is worked out from this figure, so it has to be
        // there before the salvage invoice can be filed.
        required: true,
        prompt: 'the storage charge excluding VAT, read on its own, exactly as the invoice shows it — never added together with the admin charges',
      },
      {
        key: 'admin_charges',
        label: 'Admin charges',
        type: 'number',
        prompt: 'the salvage agent\'s admin, handling or recovery charges excluding VAT, read on their own and kept apart from the storage charge',
      },
    ],
  },
  {
    // The Total Loss Confirmation replaces the Final Authority: there is no repair
    // to authorise, only the registration it confirms and the date it came in.
    key: 'total_loss_confirmation',
    label: 'Total Loss Confirmation',
    section: 'closeout',
    kind: 'document',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'total_loss',
    // Only these two are read off it, and the registration is checked against the
    // claim's own the same way an invoice's is.
    readFigures: ['invoice_date', 'reg'],
  },
  // The referrer's own invoice to us for their fee. It comes in rather than going
  // out, but we chase it ourselves: `requestFrom` names the party a direct request
  // goes to, which is what "Request invoice from referrer" reads.
  {
    key: 'referrer_invoice_in',
    label: 'Referrer Invoice In',
    section: 'in',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'referrer',
    party: 'referrer',
    requestFrom: 'referrer',
    amountSource: 'referrer_fee',
    varianceReason: 'Referrer fee or repair cost changed',
  },
  {
    key: 'second_referrer_invoice_in',
    label: 'Second Referrer Invoice In',
    section: 'in',
    direction: 'in',
    dateLabel: 'Received',
    requires: 'second_referrer',
    party: 'second_referrer',
    requestFrom: 'second_referrer',
    amountSource: 'second_referrer_fee',
    varianceReason: 'Second referrer fee or repair cost changed',
  },
  {
    // A job the customer is paying for privately: we settle the repairer's own
    // invoice for the whole repair and recover the whole of it from whoever is paying
    // for it, so our invoice to them is that invoice's total, VAT included. It is
    // raised like any other invoice we send — asked for from accounts, locked at the
    // figure it went out at and marked paid here — but it waits for the Final Repair
    // Invoice to be saved, because that invoice's total is the figure it bills.
    key: 'client_invoice_out',
    label: 'Client Invoice Out',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: ['private_paying', 'not_total_loss'],
    party: 'client',
    amountSource: 'client_invoice',
    varianceReason: 'The Final Repair Invoice total changed',
    // Where the third party is the one paying for the repair, the invoice goes to
    // them rather than to our client: their name and address are what it carries, and
    // a copy is checked as addressed to them. Only those two change — the key, the
    // amount it bills and the invoice it waits for are the same on both jobs.
    thirdParty: { label: 'Third Party Invoice Out', party: 'third_party' },
  },
  {
    key: 'referral_invoice_out',
    label: 'Referral Invoice Out',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: ['not_credit_repair', 'repairer_referral', 'not_total_loss'],
    party: 'repairer',
    amountSource: 'repairer_referral_fee',
    varianceReason: 'Referral fee or repair cost changed',
  },
  {
    // Total loss: we invoice the repairer our share of the storage charge the
    // salvage agent billed them for — storage only, never the admin charges, plus
    // VAT. It replaces the Referral Invoice Out on a total loss job, and carries
    // the same accounts request, amount lock, paid date and checks as any invoice
    // we send.
    key: 'storage_fee_invoice_out',
    label: 'Storage Fee Invoice Out',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: ['total_loss', 'has_repairer'],
    party: 'repairer',
    amountSource: 'storage_fee',
    varianceReason: 'Storage charge or our share of it changed',
  },
  {
    key: 'vat_excess_invoice_out',
    label: 'VAT & Excess Invoice Out',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'vat_excess',
    party: 'client',
    amountSource: 'vat_excess',
    varianceReason: 'Repair cost, excess or VAT status changed',
  },
  // Credit repair claims: we invoice the credit repair company for our cut, from
  // two separate invoices. Both amounts are derived (hire category rate and
  // commission on the final repair cost), so they are never hand-entered here.
  {
    key: 'cr_hire_fee',
    label: 'Upfront Hire Fee',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'credit_repair',
    party: 'credit_repair',
    amountSource: 'credit_repair_hire_fee',
    varianceReason: 'Hire category or hire fee changed',
  },
  {
    key: 'cr_repair_commission',
    label: 'Repair Commission',
    section: 'out',
    direction: 'out',
    dateLabel: 'Sent',
    requires: 'credit_repair',
    party: 'credit_repair',
    amountSource: 'credit_repair_commission',
    varianceReason: 'Final repair cost or commission rate changed',
  },
];

export const isInvoiceDocument = (item) => item?.kind === 'document';

/**
 * What happens when a document is uploaded:
 * - 'store'     → the copy is stored and nothing is read off it (Collection Note)
 * - 'authority' → its own short read: registration, authorised amount, excess
 * - 'invoice'   → the full invoice read
 */
export const invoiceDocumentKind = (item) =>
  item?.storeOnly ? 'store' : item?.readsAuthority ? 'authority' : 'invoice';

/**
 * Recommended items are encouraged but never required: while one is missing its
 * card is amber rather than red, it is left out of the job's progress, and it
 * never leaves the job looking incomplete.
 */
export const isRecommendedItem = (item) => item?.recommended === true;

/** The invoices we raise, which "Request from accounts" applies to. */
export const canRequestInvoice = (item) =>
  !!item && !isInvoiceDocument(item) && item.direction === 'out' && item.section === 'out';

/**
 * The invoices a party sends us that we ask them for directly — a referrer's own
 * invoice for their fee — which "Request invoice from referrer" applies to. Asked
 * for by the same rule as an accounts request: the job figures have to be confirmed
 * first, because the amount asked for is worked out from them.
 */
export const canRequestFromReferrer = (item) => !!item?.requestFrom;
import { fmtGBP } from '@/components/shared/creditRepairRates';

/**
 * The pre-filled accounts request for one invoice: the job, who to invoice with
 * the details we hold, what it is for, the amount split out, and how it was
 * worked out. Everything here is editable before it is sent.
 */
export function buildInvoiceRequestEmail({ claim, item, state, party, user }) {
  const subject = `Invoice required — Job ${claim.job_number || '—'} | ${claim.reg || '—'} | ${item.label}`;

  // An invoice we receive — the share of the hire the client or repairer is owed, or a
  // repairer's final invoice on a job the customer pays for — is asked for the other
  // way round: accounts get it in from them and settle it.
  const inbound = item.direction === 'in';

  const partyLines = [
    `${inbound ? 'Invoice from' : 'Invoice to'}:   ${party?.name || 'Not set'}`,
    ...(party?.addressLines || []).map((line) => `                ${line}`),
    ...(party?.contact ? [`Contact:        ${party.contact}`] : []),
  ];

  const lines = [
    'Hi Accounts,',
    '',
    inbound
      ? 'Please get the following invoice in from them and settle it on our behalf.'
      : 'Please raise the following invoice on our behalf.',
    '',
    `Job number:     ${claim.job_number || '—'}`,
    `Vehicle Reg:    ${claim.reg || '—'}`,
    `Job type:       ${claim.claim_type || '—'}`,
    `Invoice:        ${item.label}`,
    ...partyLines,
    '',
    "What it's for:",
    `  ${state.hint || item.label}`,
    '',
    'Amount:',
    `  Ex VAT:         ${fmtGBP(state.ex)}`,
    `  VAT (20%):      ${fmtGBP(state.vat)}`,
    `  Total inc VAT:  ${fmtGBP(state.total)}`,
    '',
    'How it was calculated:',
    ...state.workings.map((row) => `  ${row.label}: ${row.value}`),
    '',
    inbound
      ? 'Please get this invoice in and settled at your earliest convenience.'
      : 'Please raise this invoice at your earliest convenience.',
    '',
    'Thanks',
    user?.full_name ? `${user.full_name}` : '',
    claim.job_number ? `Job ${claim.job_number}` : '',
  ];

  return { subject, body: lines.filter((line) => line !== undefined).join('\n') };
}
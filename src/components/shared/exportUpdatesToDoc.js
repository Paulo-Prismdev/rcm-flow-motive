import { format } from 'date-fns';

const esc = (s) => (s ?? '').toString()
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

/**
 * Exports a claim's updates trail as a chronological timeline into a
 * Word-compatible document (.doc) that opens natively in Microsoft Word.
 */
export function exportUpdatesToDoc({ claim, updates }) {
  const sorted = [...updates].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const topLevel = sorted.filter((u) => !u.parent_update_id);
  const repliesByParent = {};
  sorted.filter((u) => u.parent_update_id).forEach((u) => {
    (repliesByParent[u.parent_update_id] = repliesByParent[u.parent_update_id] || []).push(u);
  });

  const rows = topLevel.map((u) => {
    const replies = (repliesByParent[u.id] || []).map((r) => `
      <div style="margin-left:24px;border-left:2px solid #ccc;padding-left:10px;margin-top:8px;">
        <div style="font-size:11px;color:#555;">${esc(format(new Date(r.created_date), 'dd/MM/yyyy HH:mm'))} &mdash; ${esc(r.update_type)} &mdash; ${esc(r.created_by)}</div>
        <div style="margin-top:4px;">${esc(r.description)}</div>
      </div>`).join('');

    return `
      <div style="margin-bottom:18px;border-bottom:1px solid #eee;padding-bottom:14px;">
        <div style="font-size:12px;color:#444;margin-bottom:6px;">
          <strong>${esc(format(new Date(u.created_date), 'dd/MM/yyyy HH:mm'))}</strong>
          &nbsp;|&nbsp; <span style="background:#eee;padding:2px 6px;border-radius:3px;">${esc(u.update_type)}</span>
          ${u.direction ? `&nbsp;|&nbsp; ${esc(u.direction)}` : ''}
          &nbsp;|&nbsp; ${esc(u.created_by)}
        </div>
        <div style="margin:4px 0;">${esc(u.description)}</div>
        ${u.next_steps ? `<div style="margin-top:8px;font-size:12px;color:#555;"><em>Next steps:</em> ${esc(u.next_steps)}</div>` : ''}
        ${u.due_date_for_next_action ? `<div style="font-size:11px;color:#888;margin-top:4px;">Due: ${esc(format(new Date(u.due_date_for_next_action), 'dd/MM/yyyy'))}</div>` : ''}
        ${replies}
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Claim Updates Timeline</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; color: #222; }
  h1 { font-size: 18pt; margin-bottom: 4px; }
  .meta { color: #555; font-size: 11pt; margin-bottom: 18px; }
  .meta div { margin-bottom: 2px; }
</style></head>
<body>
  <h1>Claim Updates Timeline</h1>
  <div class="meta">
    <div><strong>Job No:</strong> ${esc(claim?.job_number || '-')}</div>
    <div><strong>Reg:</strong> ${esc(claim?.reg || '-')}</div>
    <div><strong>Client:</strong> ${esc(claim?.client_name || '-')}</div>
    <div><strong>Vehicle:</strong> ${esc(claim?.make_model || '-')}</div>
    <div><strong>Status:</strong> ${esc(claim?.job_status || '-')}</div>
    <div><strong>Generated:</strong> ${esc(format(new Date(), 'dd/MM/yyyy HH:mm'))}</div>
  </div>
  ${rows || '<p>No updates recorded.</p>'}
</body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Updates_${claim?.job_number || claim?.reg || 'claim'}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
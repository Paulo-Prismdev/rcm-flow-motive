/**
 * The branded RCM email wrapper and the send behind it, so the markup and the
 * delivery live in one place. Delivery goes through Base44's own email service.
 */

export const LOGO_URL = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Split a comma-separated address list into the valid addresses in it. */
export function parseEmails(value: string): string[] {
  return String(value || '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => EMAIL_RE.test(e));
}

export function isHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildBrandedHtml(content: string, footerNote?: string): string {
  const isHtmlBody = isHtml(content);
  const innerHtml = isHtmlBody
    ? content
    : content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2563eb;text-decoration:underline;">click here</a>')
      .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f5fa;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5fa;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr>
          <td style="background-color:#131d47;padding:24px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="RCM Automotive" style="max-height:48px;width:auto;display:inline-block;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#1B2A3B;font-size:15px;line-height:1.6;">
            ${innerHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color:#131d47;padding:20px 32px;text-align:center;">
            <p style="margin:0 0 4px;color:#ffffff;font-size:14px;font-weight:600;">RCM Automotive</p>
            <p style="margin:0;color:#9aa7c7;font-size:12px;line-height:1.5;">
              info@rcmautomotive.co.uk &nbsp;|&nbsp; www.rcmautomotive.co.uk
            </p>
            ${footerNote ? `<p style="margin:8px 0 0;color:#5d6b8c;font-size:11px;">${footerNote}</p>` : ''}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Delivery. When RESEND_API_KEY and EMAIL_FROM_ADDRESS are set (EMAIL_FROM_ADDRESS
 * being an address on a domain verified in Resend, e.g. notifications@rcmautomotive.co.uk),
 * email goes out through Resend: one message with real To/CC, a Reply-To, any address
 * at all, and optional attachments. Without them it falls back to Base44's own email
 * service, which mails one recipient at a time and can't reply-to or attach.
 */
const RESEND_URL = 'https://api.resend.com/emails';

export type EmailAttachment = { filename: string; path: string };

export function emailProvider(): 'resend' | 'base44' {
  return Deno.env.get('RESEND_API_KEY') && EMAIL_RE.test(Deno.env.get('EMAIL_FROM_ADDRESS') || '') ? 'resend' : 'base44';
}

const cleanName = (n: string) => String(n || 'RCM Automotive').replace(/["<>\r\n]/g, '').slice(0, 100);

/**
 * Send one email (already-built HTML) to one or more people. Returns { ok, error,
 * provider } rather than throwing, so the caller decides how to report a failure.
 */
export async function deliverEmail({ base44, to, cc, subject, html, text, fromName, replyTo, attachments }: {
  base44: any; to: string | string[]; cc?: string | string[]; subject: string; html: string; text?: string;
  fromName?: string; replyTo?: string; attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; error?: string; provider: string }> {
  const list = (v: any) => (Array.isArray(v) ? parseEmails(v.join(',')) : parseEmails(v || ''));
  const toList = [...new Set(list(to))];
  const ccList = [...new Set(list(cc))].filter((e) => !toList.includes(e));
  const provider = emailProvider();
  if (toList.length === 0 && ccList.length === 0) return { ok: false, error: 'No valid recipient email address', provider };
  const safeSubject = String(subject || '').replace(/[\r\n]+/g, ' ').slice(0, 250);

  // A short trace in the function logs (never the content): which service sent it,
  // to how many people, and Resend's message id, so delivery can be checked.
  const trace = (msg: string) => console.log(`email: ${msg} | to ${toList.length} cc ${ccList.length} | "${safeSubject.slice(0, 40)}"`);

  if (provider === 'resend') {
    const payload: Record<string, unknown> = {
      from: `${cleanName(fromName || 'RCM Automotive')} <${Deno.env.get('EMAIL_FROM_ADDRESS')}>`,
      to: toList.length ? toList : ccList,
      subject: safeSubject,
      html,
      text: text || htmlToPlain(html),
    };
    if (toList.length && ccList.length) payload.cc = ccList;
    const reply = parseEmails(replyTo || '')[0] || parseEmails(Deno.env.get('EMAIL_REPLY_TO') || '')[0];
    if (reply) payload.reply_to = reply;
    const files = (attachments || []).filter((a) => a?.filename && /^https:\/\//.test(a?.path || '')).slice(0, 10);
    if (files.length) payload.attachments = files.map((a) => ({ filename: String(a.filename).slice(0, 150), path: a.path }));
    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const detail = await res.json().catch(() => ({} as any));
      if (res.ok) {
        trace(`sent via Resend id ${detail?.id || '?'}`);
        return { ok: true, provider };
      }
      // Resend refused it (key wrong, domain not verified yet...): fall back to Base44's
      // email below, so a set-up problem never stops a sign-in code or an invoice request.
      console.error(`email: Resend refused (${res.status}) ${detail?.message || ''} - falling back to Base44`);
    } catch (error: any) {
      console.error(`email: Resend unreachable (${error?.message || error}) - falling back to Base44`);
    }
  }

  // Base44 mails one recipient per email, so each address gets its own copy.
  for (const recipient of [...toList, ...ccList]) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipient,
        subject: safeSubject,
        // Exactly the fields that were delivering before Round 6 (html + text). Sending
        // `body` as well stopped the sign-in codes arriving.
        html,
        text: text || htmlToPlain(html),
        from_name: cleanName(fromName || 'RCM Automotive'),
      });
    } catch (error: any) {
      return { ok: false, error: `Base44 email error: ${error?.message || error}`, provider: 'base44' };
    }
  }
  trace('sent via Base44');
  return { ok: true, provider: 'base44' };
}

/** Send one branded email. Returns { ok, error } rather than throwing. */
export async function sendBrandedEmail({ base44, to, cc, subject, content, footerNote, fromName, replyTo, attachments }: {
  base44: any; to: string; cc?: string; subject: string; content: string; footerNote?: string;
  fromName?: string; replyTo?: string; attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; error?: string; provider?: string }> {
  const plain = String(content);
  const html = buildBrandedHtml(plain, footerNote);
  const text = isHtml(plain) ? htmlToPlain(plain) : plain;
  return deliverEmail({ base44, to, cc, subject, html, text, fromName, replyTo, attachments });
}

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
 * Delivery, in this order:
 *   1. SendGrid, when SENDGRID_API_KEY is set (already saved on the app). Sends from
 *      notifications@updates.rcmautomotive.co.uk (the domain set up in SendGrid), or
 *      EMAIL_FROM_ADDRESS if that secret is added later.
 *   2. Resend, if RESEND_API_KEY is set instead.
 *   3. Base44's own email service.
 * SendGrid/Resend send one message with real To and CC, a Reply-To, to any address, and
 * can attach files. If either refuses a message (bad key, domain not verified...), it
 * goes through Base44 instead, so a set-up problem never stops a sign-in code or an
 * invoice request.
 */
const RESEND_URL = 'https://api.resend.com/emails';
const SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send';
const DEFAULT_FROM = 'notifications@updates.rcmautomotive.co.uk';
const DEFAULT_REPLY_TO = 'info@rcmautomotive.co.uk';

export type EmailAttachment = { filename: string; path: string };

export function emailProvider(): 'sendgrid' | 'resend' | 'base44' {
  if (Deno.env.get('SENDGRID_API_KEY')) return 'sendgrid';
  if (Deno.env.get('RESEND_API_KEY')) return 'resend';
  return 'base44';
}

const fromAddress = () => {
  const v = (Deno.env.get('EMAIL_FROM_ADDRESS') || '').trim();
  return EMAIL_RE.test(v) ? v : DEFAULT_FROM;
};

const cleanName = (n: string) => String(n || 'RCM Automotive').replace(/["<>\r\n]/g, '').slice(0, 100);

// Files to attach, fetched and base64-encoded (SendGrid needs the bytes). Capped at
// 10 files and about 15 MB in all; anything that can't be fetched is left out.
async function encodeAttachments(attachments: EmailAttachment[] = []) {
  const out: { filename: string; content: string; type: string }[] = [];
  let total = 0;
  for (const a of attachments.filter((x) => x?.filename && /^https:\/\//.test(x?.path || '')).slice(0, 10)) {
    try {
      const res = await fetch(a.path);
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      total += buf.length;
      if (total > 15 * 1024 * 1024) break;
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      out.push({ filename: String(a.filename).slice(0, 150), content: btoa(bin), type: res.headers.get('content-type') || 'application/octet-stream' });
    } catch { /* leave this one out */ }
  }
  return out;
}

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
  const plain = text || htmlToPlain(html);
  const name = cleanName(fromName || 'RCM Automotive');
  const reply = parseEmails(replyTo || '')[0] || parseEmails(Deno.env.get('EMAIL_REPLY_TO') || '')[0] || DEFAULT_REPLY_TO;
  const primary = toList.length ? toList : ccList;
  const copies = toList.length ? ccList : [];

  // A short trace in the function logs (never the content): which service sent it,
  // to how many people, and the service's message id, so delivery can be checked.
  const trace = (msg: string) => console.log(`email: ${msg} | to ${toList.length} cc ${ccList.length} | "${safeSubject.slice(0, 40)}"`);

  if (provider === 'sendgrid') {
    const personalization: Record<string, unknown> = { to: primary.map((email) => ({ email })) };
    if (copies.length) personalization.cc = copies.map((email) => ({ email }));
    const payload: Record<string, unknown> = {
      personalizations: [personalization],
      from: { email: fromAddress(), name },
      reply_to: { email: reply },
      subject: safeSubject,
      content: [{ type: 'text/plain', value: plain }, { type: 'text/html', value: html }],
      // Links stay exactly as written: click tracking would rewrite the signed form links.
      tracking_settings: { click_tracking: { enable: false, enable_text: false }, open_tracking: { enable: false } },
    };
    const files = await encodeAttachments(attachments);
    if (files.length) payload.attachments = files;
    try {
      const res = await fetch(SENDGRID_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        trace(`sent via SendGrid id ${res.headers.get('x-message-id') || '?'} from ${fromAddress()}`);
        return { ok: true, provider };
      }
      const detail = await res.json().catch(() => ({} as any));
      console.error(`email: SendGrid refused (${res.status}) ${detail?.errors?.[0]?.message || ''} - falling back to Base44`);
    } catch (error: any) {
      console.error(`email: SendGrid unreachable (${error?.message || error}) - falling back to Base44`);
    }
  } else if (provider === 'resend') {
    const payload: Record<string, unknown> = {
      from: `${name} <${fromAddress()}>`,
      to: primary,
      subject: safeSubject,
      html,
      text: plain,
      reply_to: reply,
    };
    if (copies.length) payload.cc = copies;
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
        trace(`sent via Resend id ${detail?.id || '?'} from ${fromAddress()}`);
        return { ok: true, provider };
      }
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

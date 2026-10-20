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
 * Send one branded email through Base44's own email service. Base44 mails a
 * single recipient per email, so the primary address is sent the message and
 * every CC address then receives its own copy of it. Returns { ok, error }
 * rather than throwing, so the caller decides how to report a failure.
 */
export async function sendBrandedEmail({ base44, to, cc, subject, content, footerNote, fromName }): Promise<{ ok: boolean; error?: string }> {
  const recipients = [...new Set([...parseEmails(to), ...parseEmails(cc || '')])];
  if (recipients.length === 0) return { ok: false, error: 'No valid recipient email address' };

  const plain = String(content);
  const html = buildBrandedHtml(plain, footerNote);
  const text = isHtml(plain) ? htmlToPlain(plain) : plain;

  for (const recipient of recipients) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipient,
        subject,
        html,
        text,
        from_name: fromName || 'RCM Automotive',
      });
    } catch (error) {
      return { ok: false, error: `Base44 email error: ${error?.message || error}` };
    }
  }

  return { ok: true };
}
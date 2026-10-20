/**
 * The branded RCM email wrapper and SendGrid send used by the app's backend
 * functions, so the markup and the send live in one place.
 */

export const LOGO_URL = 'https://media.base44.com/images/public/68ee39fb8915b1b539e13c59/b2cb057e2_RCMAutomotiveLogoGreenAutomotivewithHLights.jpg';
export const FROM_EMAIL = 'info@rcmautomotive.co.uk';

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

export function buildBrandedHtml(content: string): string {
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
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Send one branded email through SendGrid. Returns { ok, error } rather than
 * throwing, so the caller decides how to report a failure.
 */
export async function sendBrandedEmail({ apiKey, to, cc, subject, content, fromName }): Promise<{ ok: boolean; error?: string }> {
  const personalization: any = { to: [{ email: to }] };
  if (cc) {
    const ccList = String(cc)
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean)
      .map((e: string) => ({ email: e }));
    if (ccList.length) personalization.cc = ccList;
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [personalization],
      from: { email: FROM_EMAIL, name: fromName || 'RCM Automotive' },
      subject,
      content: [
        { type: 'text/plain', value: isHtml(content) ? htmlToPlain(content) : String(content) },
        { type: 'text/html', value: buildBrandedHtml(String(content)) },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `SendGrid API error (${res.status}): ${errText}` };
  }
  return { ok: true };
}
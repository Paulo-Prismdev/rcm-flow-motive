import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireInternalUser } from '../../shared/internalAccess.ts';
import { appPublicUrl, signClaimLink } from '../../shared/publicLinks.ts';
import { REPAIRER_DETAILS_LINK_DAYS } from '../../shared/repairerDetails.ts';
import { parseEmails, sendBrandedEmail } from '../../shared/brandedEmail.ts';

const escapeHtml = (text: string) => String(text ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Staff only: a signed link to the repairer details questionnaire for one repairer.
 * It opens that repairer's form only and runs out after REPAIRER_DETAILS_LINK_DAYS.
 * With `send_to`, it also emails the link to the repairer.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;

    const { bodyshop_id, send_to, onboarding } = await req.json().catch(() => ({}));
    if (!bodyshop_id || typeof bodyshop_id !== 'string') {
      return Response.json({ error: 'bodyshop_id is required' }, { status: 400 });
    }
    const bodyshop = await base44.asServiceRole.entities.Bodyshop.get(bodyshop_id).catch(() => null);
    if (!bodyshop) return Response.json({ error: 'Repairer not found' }, { status: 404 });

    const token = await signClaimLink('repairer_details', bodyshop.id, REPAIRER_DETAILS_LINK_DAYS);
    const expiresAt = new Date(Date.now() + REPAIRER_DETAILS_LINK_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const url = `${appPublicUrl(req)}/repairer-details?token=${encodeURIComponent(token)}`;

    let sentTo: string[] = [];
    if (send_to) {
      sentTo = parseEmails(String(send_to)).slice(0, 5);
      if (!sentTo.length) return Response.json({ error: 'Please enter a valid email address' }, { status: 400 });
      const name = escapeHtml(bodyshop.name || 'your business');
      const intro = onboarding
        ? `<p>Welcome to the RCM Automotive repairer network. To get <strong>${name}</strong> set up on our system, please fill in your company details using the secure link below.</p>`
        : `<p>We're making sure the details we hold for <strong>${name}</strong> are up to date. Please check and update them using the secure link below — anything we already have is filled in for you.</p>`;
      const result = await sendBrandedEmail({
        base44,
        to: sentTo.join(','),
        subject: onboarding ? `Your repairer details — ${bodyshop.name || 'RCM Automotive'}` : `Please check your details — ${bodyshop.name || 'RCM Automotive'}`,
        content: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <p>Hello${bodyshop.contact_name ? ` ${escapeHtml(String(bodyshop.contact_name).split(' ')[0])}` : ''},</p>
            ${intro}
            <p>It takes about 5 minutes: contacts, address and coverage, accreditations and repair capabilities.</p>
            <p style="margin:24px 0;"><a href="${url}" style="background:#131d47;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">Update our details</a></p>
            <p style="color:#666;font-size:13px;">The link works for ${REPAIRER_DETAILS_LINK_DAYS} days. If you have any questions, just reply to this email.</p>
            <p>Thank you,<br>RCM Automotive</p>
          </div>`,
      });
      if (!result.ok) return Response.json({ error: result.error || 'The email could not be sent' }, { status: 502 });
      await base44.asServiceRole.entities.Bodyshop.update(bodyshop.id, {
        details_form_sent_at: new Date().toISOString(),
        details_form_sent_to: sentTo.join(', '),
      }).catch(() => {});
    }

    return Response.json({ token, url, expires_at: expiresAt, sent_to: sentTo });
  } catch (error: any) {
    console.error('issueRepairerDetailsLink error:', error?.message);
    return Response.json({ error: 'Could not create the link' }, { status: 500 });
  }
});

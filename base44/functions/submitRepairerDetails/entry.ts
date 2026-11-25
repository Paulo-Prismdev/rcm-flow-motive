import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { LINK_MESSAGES, appPublicUrl, clip, verifyClaimLink } from '../../shared/publicLinks.ts';
import { changedDetails, cleanDetails } from '../../shared/repairerDetails.ts';
import { STAFF_ALERTS_EMAIL, buildBrandedHtml, deliverEmail, parseEmails } from '../../shared/brandedEmail.ts';

const escapeHtml = (text: string) => String(text ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Public endpoint: a repairer's answers to the details questionnaire.
// Security: signed link for this repairer and this form (shared/publicLinks.ts).
// Nothing is written to the repairer's record directly: the changes wait on the
// record (pending_details_update) until a member of staff reviews and accepts them.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const link = await verifyClaimLink(body?.token, 'repairer_details');
    if (!link.claimId) {
      return Response.json({ error: LINK_MESSAGES[link.error || 'invalid'], reason: link.error }, { status: 404 });
    }
    const bodyshop = await base44.asServiceRole.entities.Bodyshop.get(link.claimId).catch(() => null);
    if (!bodyshop) return Response.json({ error: LINK_MESSAGES.invalid, reason: 'invalid' }, { status: 404 });

    const byName = clip(body?.completed_by_name, 120);
    const byRole = clip(body?.completed_by_role, 120);
    const byEmail = parseEmails(clip(body?.completed_by_email, 200))[0] || '';
    if (!byName) return Response.json({ error: 'Please tell us who is completing the form' }, { status: 400 });
    if (body?.confirmed !== true) return Response.json({ error: 'Please confirm the details are correct' }, { status: 400 });

    const answers = cleanDetails(body?.details || {});
    if (!answers.name) return Response.json({ error: 'Please enter the business name' }, { status: 400 });
    const changes = changedDetails(bodyshop, answers);
    const now = new Date().toISOString();

    await base44.asServiceRole.entities.Bodyshop.update(bodyshop.id, {
      pending_details_update: {
        submitted_at: now,
        submitted_by_name: byName,
        submitted_by_role: byRole,
        submitted_by_email: byEmail,
        changes,
        notes: clip(body?.notes, 2000),
      },
      details_last_confirmed_at: now,
    });

    // Tell the office: an in-app notification for staff, and one email to the inbox.
    try {
      const count = Object.keys(changes).length;
      const title = `${bodyshop.name || 'A repairer'} sent their details`;
      const message = count ? `${count} change${count === 1 ? '' : 's'} to review` : 'Confirmed everything we hold is correct';
      const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
      for (const u of users) {
        if (u.user_type !== 'internal' || !u.email) continue;
        await base44.asServiceRole.entities.Notification.create({
          user_email: u.email,
          title,
          message,
          type: 'repairer_details_received',
          related_item_type: 'Bodyshop',
          related_item_id: bodyshop.id,
          link: `/RepairerDirectory?bodyshop_id=${bodyshop.id}`,
          is_read: false,
        }).catch(() => {});
      }
      const url = `${appPublicUrl()}/RepairerDirectory?bodyshop_id=${encodeURIComponent(bodyshop.id)}`;
      await deliverEmail({
        base44,
        to: STAFF_ALERTS_EMAIL,
        replyTo: byEmail || bodyshop.email || undefined,
        subject: title,
        html: buildBrandedHtml(`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#131d47;">Repairer details received</h2>
            <p><strong>Repairer:</strong> ${escapeHtml(bodyshop.name || '')}</p>
            <p><strong>Completed by:</strong> ${escapeHtml(byName)}${byRole ? ` (${escapeHtml(byRole)})` : ''}${byEmail ? ` — ${escapeHtml(byEmail)}` : ''}</p>
            <p><strong>${escapeHtml(message)}</strong></p>
            <p><a href="${url}" style="background:#131d47;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Review in the directory</a></p>
          </div>`),
      });
    } catch (e: any) {
      console.error('submitRepairerDetails notify failed:', e?.message);
    }

    return Response.json({ success: true, changes: Object.keys(changes).length });
  } catch (error: any) {
    console.error('submitRepairerDetails error:', error?.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});

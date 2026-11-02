import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { isCancelledClaim } from '../../shared/claimOutcome.ts';
import { clip } from '../../shared/publicLinks.ts';
import { claimForPortal, currentUser, ownsClaim, portalScope } from '../../shared/portalAccess.ts';

/**
 * The few things a portal user can change on a claim of their own. Claims are
 * internal-only, so these are the only portal writes, and each one sets exactly the
 * fields it is for:
 *
 *   accept_job     repairer   accepts a job sent to them
 *   reject_job     repairer   turns a job down, with a reason (the job returns to staff)
 *   set_client_ref referrer / client   their own reference for the claim
 *   post_update    any portal  adds a message to the claim's shared update feed
 */
const day = () => new Date().toISOString().split('T')[0];
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

const UPDATE_TYPE_BY_KIND: Record<string, string> = {
  bodyshop: 'Bodyshop Communication',
  referrer: 'Referrer Communication',
  client: 'Referrer Communication',
};

async function notifyStaff(base44: any, claim: any, title: string, message: string) {
  try {
    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const staff = (users || []).filter((u: any) => u.user_type === 'internal' && u.email);
    await Promise.all(staff.map((u: any) => base44.asServiceRole.entities.Notification.create({
      user_email: u.email,
      title,
      message: message.slice(0, 300),
      type: 'portal_update',
      related_item_type: 'Claim',
      related_item_id: claim.id,
      link: `/Claims?id=${claim.id}`,
      is_read: false,
    }).catch(() => {})));
  } catch (e: any) {
    console.warn('portalClaimAction: staff notification failed', e?.message);
  }
}

const who = (user: any) => user.display_name || user.full_name || user.email || 'Portal user';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { claim_id, action } = body || {};
    if (!claim_id || typeof claim_id !== 'string') {
      return Response.json({ error: 'claim_id is required' }, { status: 400 });
    }

    const scope = portalScope(user);
    const claim = await base44.asServiceRole.entities.Claim.get(claim_id).catch(() => null);
    if (!scope || scope.kind === 'internal' || !claim || !ownsClaim(scope, claim)) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }
    const reg = claim.reg ? ` [${claim.reg}]` : '';

    switch (action) {
      case 'accept_job': {
        if (scope.kind !== 'bodyshop') break;
        if (claim.repairer_accepted) return Response.json({ claim: claimForPortal(claim) });
        await base44.asServiceRole.entities.Claim.update(claim.id, {
          repairer_accepted: true,
          repairer_accepted_date: day(),
        });
        const latest = await base44.asServiceRole.entities.Claim.get(claim.id);
        await notifyStaff(base44, claim, `Job accepted by ${claim.bodyshop || 'repairer'}${reg}`,
          `Job ${claim.job_number || ''} was accepted by ${who(user)}.`);
        return Response.json({ claim: claimForPortal(latest) });
      }

      case 'reject_job': {
        if (scope.kind !== 'bodyshop') break;
        if (claim.repairer_accepted) {
          return Response.json({ error: 'This job has already been accepted.' }, { status: 409 });
        }
        const reason = clip(body.reason, 1000);
        if (!reason) return Response.json({ error: 'Please give a reason.' }, { status: 400 });
        const bodyshopName = claim.bodyshop || 'Repairer';
        await base44.asServiceRole.entities.Claim.update(claim.id, {
          bodyshop_id: null,
          bodyshop: null,
          bodyshop_email: null,
          bs_instructed: null,
          latest_update: `Job rejected by ${bodyshopName}. Reason: ${reason}`,
        });
        await base44.asServiceRole.entities.ClaimUpdate.create({
          claim_id: claim.id,
          update_type: 'Bodyshop Communication',
          direction: 'Incoming',
          description: `Job rejected by ${bodyshopName} (${who(user)}). Reason: ${reason}`,
        }).catch(() => {});
        await notifyStaff(base44, claim, `Job rejected by ${bodyshopName}${reg}`, `Reason: ${reason}`);
        return Response.json({ success: true });
      }

      case 'set_client_ref': {
        if (scope.kind !== 'referrer' && scope.kind !== 'client') break;
        const value = clip(body.value, 100);
        await base44.asServiceRole.entities.Claim.update(claim.id, { client_ref: value });
        return Response.json({ success: true, client_ref: value });
      }

      case 'post_update': {
        const description = clip(body.description, 5000);
        if (!description) return Response.json({ error: 'Please write your update.' }, { status: 400 });
        const created = await base44.asServiceRole.entities.ClaimUpdate.create({
          claim_id: claim.id,
          update_type: UPDATE_TYPE_BY_KIND[scope.kind] || 'Other',
          direction: 'Incoming',
          platform: 'E-Mail',
          description: `${description}\n\n— ${who(user)}`,
        });
        // An incoming update means the claim is no longer waiting on an update, as with
        // the repairer update form: push the 48-hour timer on.
        const closed = isCancelledClaim(claim) || ['Invoiced', 'Invoice Paid'].includes(claim.invoice_status);
        const now = new Date();
        await base44.asServiceRole.entities.Claim.update(claim.id, {
          last_updated_at: now.toISOString(),
          next_update_due_at: new Date(now.getTime() + FORTY_EIGHT_HOURS).toISOString(),
          update_status_flag: closed ? 'Gray' : 'Green',
          ...(scope.kind === 'bodyshop' ? { unread_bodyshop_update: true } : {}),
        });
        await notifyStaff(base44, claim, `Update from ${who(user)}${reg}`, description);
        const { tagged_user_ids, liked_by, starred, ...shared } = created || {};
        return Response.json({ update: shared });
      }
    }

    return Response.json({ error: 'That action is not available.' }, { status: 403 });
  } catch (error: any) {
    console.error('portalClaimAction error:', error?.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});

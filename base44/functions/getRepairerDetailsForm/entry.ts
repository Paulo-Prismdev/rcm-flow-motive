import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { LINK_MESSAGES, verifyClaimLink } from '../../shared/publicLinks.ts';
import { currentDetails } from '../../shared/repairerDetails.ts';

// Public endpoint: the details the repairer questionnaire opens with.
// Security: the link token is signed by the server for this repairer and this form
// (see shared/publicLinks.ts). It returns only the questionnaire's own fields.
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

    return Response.json({
      success: true,
      // What we hold, with any answers they've sent that we haven't reviewed yet on top.
      details: { ...currentDetails(bodyshop), ...(bodyshop.pending_details_update?.changes || {}) },
      // Already sent answers that are still waiting for us to review.
      pending: bodyshop.pending_details_update?.submitted_at ? {
        submitted_at: bodyshop.pending_details_update.submitted_at,
        submitted_by_name: bodyshop.pending_details_update.submitted_by_name || '',
      } : null,
    });
  } catch (error: any) {
    console.error('getRepairerDetailsForm error:', error?.message);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});

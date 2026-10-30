import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { LINK_MESSAGES, verifyClaimLink } from '../../shared/publicLinks.ts';

// Public endpoint: the claim details the repairer update form shows.
// Security: the link token is signed by the server for this claim and this form,
// and runs out after 14 days (see shared/publicLinks.ts). No sign-in.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const link = await verifyClaimLink(body?.token, 'bodyshop_update');
    if (!link.claimId) {
      return Response.json({ error: LINK_MESSAGES[link.error || 'invalid'], reason: link.error }, { status: 404 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(link.claimId).catch(() => null);
    if (!claim) {
      return Response.json({ error: LINK_MESSAGES.invalid, reason: 'invalid' }, { status: 404 });
    }

    return Response.json({
      success: true,
      claim: {
        job_number: claim.job_number || '',
        reg: claim.reg || '',
        make_model: claim.make_model || '',
        bodyshop: claim.bodyshop || '',
        client_name: claim.client_name || '',
        ecd: claim.ecd || '',
      },
    });
  } catch (error: any) {
    console.error('getBodyshopUpdateForm error:', error?.message, error?.stack);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});

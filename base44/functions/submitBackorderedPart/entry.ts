import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { LINK_MESSAGES, clip, verifyClaimLink } from '../../shared/publicLinks.ts';

// Public endpoint: a repairer reports backordered parts on one claim, from the link
// staff copy out of the claim's Backordered Parts panel.
// Security: the link token is signed by the server for this claim and this form,
// and runs out after 14 days (see shared/publicLinks.ts). No sign-in.
//
// `check_only: true` just confirms the link is good and returns the job number and
// registration, so the form can say which vehicle it is for before anything is typed.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const data = await req.json().catch(() => ({}));

    const link = await verifyClaimLink(data?.token, 'backorder');
    if (!link.claimId) {
      return Response.json({ error: LINK_MESSAGES[link.error || 'invalid'], reason: link.error }, { status: 404 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(link.claimId).catch(() => null);
    if (!claim) {
      return Response.json({ error: LINK_MESSAGES.invalid, reason: 'invalid' }, { status: 404 });
    }

    if (data?.check_only === true) {
      return Response.json({ valid: true, job_number: claim.job_number || '', reg: claim.reg || '' });
    }

    const parts = Array.isArray(data?.parts) ? data.parts.slice(0, 20) : [];
    const valid = parts
      .filter((p: any) => p && clip(p.part_description, 500))
      .map((p: any) => ({
        part_description: clip(p.part_description, 500),
        part_number: clip(p.part_number, 100),
        supplier_name: clip(p.supplier_name, 200),
        expected_arrival_date: clip(p.expected_arrival_date, 40),
        additional_notes: clip(p.additional_notes, 1000),
      }));
    if (valid.length === 0) {
      return Response.json({ error: 'Please enter at least one part description.' }, { status: 400 });
    }

    for (const part of valid) {
      await base44.asServiceRole.entities.BackorderedPart.create({
        claim_id: claim.id,
        claim_job_number: claim.job_number || '',
        claim_reg: claim.reg || '',
        ...part,
        submitted_by_name: clip(data?.submitted_by_name, 200),
        submitted_by_phone: clip(data?.submitted_by_phone, 50),
        received_by_repairer: false,
      });
    }

    return Response.json({ success: true, count: valid.length });
  } catch (error: any) {
    console.error('submitBackorderedPart error:', error?.message, error?.stack);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});

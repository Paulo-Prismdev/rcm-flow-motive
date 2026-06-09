import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { claimId, job_status, secondary_status } = await req.json();

    if (!claimId) {
      return Response.json({ error: 'claimId is required' }, { status: 400 });
    }

    const updateData = {};
    if (job_status !== undefined) updateData.job_status = job_status;
    if (secondary_status !== undefined) updateData.secondary_status = secondary_status;

    await base44.asServiceRole.entities.Claim.update(claimId, updateData);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
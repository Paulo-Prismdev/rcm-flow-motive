import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Generates a secure indemnity form link for a specific claim.
// Authenticated: internal staff only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.user_type !== 'internal' && user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { claimId } = body;
    if (!claimId) {
      return Response.json({ error: 'claimId is required' }, { status: 400 });
    }

    // Fetch the claim
    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Generate a cryptographically random token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store token + timestamp on the claim
    await base44.asServiceRole.entities.Claim.update(claimId, {
      indemnity_token: token,
      indemnity_link_sent_at: new Date().toISOString(),
      indemnity_completed_at: null,
    });

    // Build the public URL
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
    const link = `${origin}/indemnity-form?claimId=${claimId}&token=${token}`;

    return Response.json({ success: true, link, token });
  } catch (error) {
    console.error('generateIndemnityLink error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
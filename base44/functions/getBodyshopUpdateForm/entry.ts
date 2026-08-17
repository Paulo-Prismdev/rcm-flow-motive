import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Public endpoint: returns claim details for the bodyshop update form.
// Security: _form_secret must match PUBLIC_FORM_SECRET, and the token must
// verify against the claim ID (stateless HMAC-style token).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = body;
    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    // Verify token and extract claim ID
    const claimId = await verifyBodyshopToken(token, secret);
    if (!claimId) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      claim: {
        job_number: claim.job_number || '',
        reg: claim.reg || '',
        make_model: claim.make_model || '',
        bodyshop: claim.bodyshop || '',
        client_name: claim.client_name || '',
        ecd: claim.ecd || ''
      }
    });
  } catch (error: any) {
    console.error('getBodyshopUpdateForm error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function verifyBodyshopToken(token: string, secret: string): Promise<string | null> {
  try {
    const [encodedId, hash] = token.split('.');
    if (!encodedId || !hash) return null;
    const claimId = atob(encodedId);
    const encoder = new TextEncoder();
    const data = encoder.encode(claimId + ':' + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const expectedHash = hashHex.substring(0, 24);
    return hash === expectedHash ? claimId : null;
  } catch {
    return null;
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Public endpoint: receives a bodyshop's update submission via the chaser email link.
// Security: _form_secret + token verification (same as getBodyshopUpdateForm).
// Creates an Incoming Bodyshop Communication ClaimUpdate, which resets the 48h timer.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token, description, next_steps, ecd, backordered_parts } = body;
    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return Response.json({ error: 'Please provide an update description' }, { status: 400 });
    }

    const claimId = await verifyBodyshopToken(token, secret);
    if (!claimId) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Update the ECD on the claim if a value was provided
    if (ecd && ecd.trim()) {
      await base44.asServiceRole.entities.Claim.update(claimId, { ecd: ecd.trim() });
    }

    // Build the update description, noting the ECD if it changed
    let updateDescription = description.trim();
    if (ecd && ecd.trim() && ecd.trim() !== (claim.ecd || '')) {
      updateDescription += `\n\nUpdated ECD: ${ecd.trim()}`;
    }

    // ── Create backordered part records if any were reported ──
    if (backordered_parts && Array.isArray(backordered_parts) && backordered_parts.length > 0) {
      const validParts = backordered_parts.filter((p: any) => p.part_description && p.part_description.trim());
      if (validParts.length > 0) {
        for (const part of validParts) {
          await base44.asServiceRole.entities.BackorderedPart.create({
            claim_id: claimId,
            claim_job_number: claim.job_number || '',
            claim_reg: claim.reg || '',
            part_description: part.part_description.trim(),
            part_number: (part.part_number || '').trim(),
            supplier_name: (part.supplier_name || '').trim(),
            expected_arrival_date: part.expected_arrival_date || '',
            additional_notes: (part.additional_notes || '').trim(),
            submitted_by_name: claim.bodyshop || '',
            submitted_by_phone: '',
            received_by_repairer: false,
          });
        }
        const partsSummary = validParts.map((p: any) =>
          `${p.part_description.trim()}${p.part_number ? ` (Part #: ${p.part_number.trim()})` : ''}`
        ).join('; ');
        updateDescription += `\n\nBackordered Parts: ${partsSummary}`;
      }
    }

    // Create the incoming update — this resets the 48h chaser timer
    await base44.asServiceRole.entities.ClaimUpdate.create({
      claim_id: claimId,
      update_type: 'Bodyshop Communication',
      direction: 'Incoming',
      platform: 'E-Mail',
      description: updateDescription,
      next_steps: (next_steps || '').trim()
    });

    console.log(`✅ Bodyshop update logged for claim ${claim.job_number}`);

    return Response.json({ success: true, claim_id: claimId });
  } catch (error: any) {
    console.error('submitBodyshopUpdate error:', error.message, error.stack);
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
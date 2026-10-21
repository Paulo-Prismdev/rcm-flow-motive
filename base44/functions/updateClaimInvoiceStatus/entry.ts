import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireInternalUser } from '../../shared/internalAccess.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const gate = await requireInternalUser(base44);
        if (gate.response) return gate.response;

        const { claim_id, updates } = await req.json();
        
        if (!claim_id || !updates) {
            return Response.json({ error: 'Missing claim_id or updates' }, { status: 400 });
        }

        // Use service role to bypass RLS
        await base44.asServiceRole.entities.Claim.update(claim_id, updates);
        
        return Response.json({ success: true });
    } catch (error) {
        console.error('Failed to update claim invoice status:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
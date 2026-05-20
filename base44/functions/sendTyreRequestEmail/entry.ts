import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { claimId, tyreMake, tyreSize, requestType } = await req.json();

        if (!claimId || !tyreMake || !tyreSize || !requestType) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch the claim
        const claim = await base44.entities.Claim.get(claimId);
        if (!claim) {
            return Response.json({ error: 'Claim not found' }, { status: 404 });
        }

        // Fetch the repairer (bodyshop) details
        let bodyshop = null;
        if (user.linked_bodyshop_id) {
            bodyshop = await base44.entities.Bodyshop.get(user.linked_bodyshop_id);
        }

        const vehicleReg = claim.reg || 'N/A';
        const vehicleMake = claim.vehicle_make || 'N/A';
        const vehicleModel = claim.vehicle_model || 'N/A';
        
        const repairerName = bodyshop?.name || user.full_name || 'N/A';
        const repairerContactName = bodyshop?.contact_name || user.full_name || 'N/A';
        const repairerPhone = bodyshop?.phone || 'N/A';
        const repairerEmail = bodyshop?.email || user.email || 'N/A';

        // Create TyreRequest record in database
        await base44.entities.TyreRequest.create({
            claim_id: claimId,
            claim_job_number: claim.job_number,
            claim_reg: vehicleReg,
            request_type: requestType,
            tyre_make: tyreMake,
            tyre_size: tyreSize,
            repairer_name: repairerName,
            repairer_contact_name: repairerContactName,
            repairer_phone: repairerPhone,
            repairer_email: repairerEmail,
            status: 'Pending'
        });

        return Response.json({ success: true, message: 'Tyre request submitted successfully' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
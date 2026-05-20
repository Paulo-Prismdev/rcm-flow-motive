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

        const emailSubject = `${requestType === 'price' ? 'Price Request' : 'Order'} - Tyre for ${vehicleReg}`;
        
        const emailBody = `
TYRE ${requestType === 'price' ? 'PRICE REQUEST' : 'ORDER'}

Vehicle Details:
- Registration: ${vehicleReg}
- Make: ${vehicleMake}
- Model: ${vehicleModel}

Tyre Details:
- Tyre Make/Model: ${tyreMake}
- Tyre Size: ${tyreSize}

Repairer Details:
- Company: ${repairerName}
- Contact Name: ${repairerContactName}
- Phone: ${repairerPhone}
- Email: ${repairerEmail}

Request Type: ${requestType === 'price' ? 'Price Request' : 'Order'}
`;

        // Send email to dedicated tyre email address
        await base44.integrations.Core.SendEmail({
            to: 'tyres@rcmautomotive.com',
            subject: emailSubject,
            body: emailBody
        });

        return Response.json({ success: true, message: 'Tyre request sent successfully' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
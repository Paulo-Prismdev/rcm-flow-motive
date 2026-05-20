import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            requestType,
            tyreMake,
            tyreSize,
            tyreQuantity,
            vehicleReg,
            vehicleMake,
            vehicleModel,
            customerName,
            customerPhone,
            customerEmail,
            companyName,
            notes
        } = await req.json();

        if (!requestType || !tyreMake || !tyreSize || !customerName || !customerPhone || !customerEmail) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch the repairer (bodyshop) details if logged in
        let bodyshop = null;
        if (user.linked_bodyshop_id) {
            bodyshop = await base44.entities.Bodyshop.get(user.linked_bodyshop_id);
        }

        // Create TyreRequest record in database
        await base44.entities.TyreRequest.create({
            request_type: requestType,
            tyre_make: tyreMake,
            tyre_size: tyreSize,
            tyre_quantity: tyreQuantity || 1,
            vehicle_reg: vehicleReg || '',
            vehicle_make: vehicleMake || '',
            vehicle_model: vehicleModel || '',
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            company_name: companyName || bodyshop?.name || '',
            notes: notes || '',
            status: 'Pending'
        });

        return Response.json({ success: true, message: 'Tyre request submitted successfully' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
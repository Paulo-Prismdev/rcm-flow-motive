import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !['admin', 'super_admin', 'company_admin'].includes(user.role)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { user_id, full_name } = await req.json();

        if (!user_id || !full_name?.trim()) {
            return Response.json({ error: 'user_id and full_name are required' }, { status: 400 });
        }

        await base44.asServiceRole.entities.User.update(user_id, { full_name: full_name.trim() });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
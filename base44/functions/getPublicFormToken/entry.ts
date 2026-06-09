import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns the public form secret token to authenticated app-origin requests.
// This is intentionally a low-sensitivity token — it prevents arbitrary external
// HTTP calls to public form endpoints but is not a high-security credential.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Only internal staff and admins can retrieve the public form token
    if (user.user_type !== 'internal' && user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    return Response.json({ token: Deno.env.get('PUBLIC_FORM_SECRET') });
  } catch (error) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
});
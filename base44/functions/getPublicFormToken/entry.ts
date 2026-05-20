import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns the public form secret token to authenticated app-origin requests.
// This is intentionally a low-sensitivity token — it prevents arbitrary external
// HTTP calls to public form endpoints but is not a high-security credential.
Deno.serve(async (req) => {
  try {
    // createClientFromRequest validates the request comes from the Base44 app
    createClientFromRequest(req);
    return Response.json({ token: Deno.env.get('PUBLIC_FORM_SECRET') });
  } catch (error) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
});
// Returns the public form secret token for anonymous, public-facing form pages.
// This token is intentionally low-sensitivity — it prevents arbitrary external
// HTTP calls to public form endpoints but is not a high-security credential.
Deno.serve(async (req) => {
  try {
    return Response.json({ token: Deno.env.get('PUBLIC_FORM_SECRET') });
  } catch (error) {
    return Response.json({ error: 'Failed to retrieve token' }, { status: 500 });
  }
});
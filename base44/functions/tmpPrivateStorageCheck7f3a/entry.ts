import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// TEMPORARY self-test of private storage (uploads a tiny text file, signs it, reads it
// back). Takes no input and returns no data. Deleted straight after use.
Deno.serve(async (req) => {
  const out: Record<string, unknown> = {};
  try {
    const base44 = createClientFromRequest(req);
    const file = new File([new Blob(['private storage check'], { type: 'text/plain' })], 'check.txt', { type: 'text/plain' });
    const up = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    out.uploaded = !!up?.file_uri;
    out.uri_shape = String(up?.file_uri || '').replace(/[A-Za-z0-9]/g, 'x').slice(0, 80);
    out.uri_ends_with_name = String(up?.file_uri || '').endsWith('check.txt');
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: up.file_uri, expires_in: 60 });
    out.signed = !!signed_url;
    out.signed_host = signed_url ? new URL(signed_url).host : null;
    const res = await fetch(signed_url);
    out.fetch_status = res.status;
    out.content_ok = (await res.text()) === 'private storage check';
    out.cors = res.headers.get('access-control-allow-origin');
  } catch (e: any) {
    out.error = e?.message;
  }
  return Response.json(out);
});

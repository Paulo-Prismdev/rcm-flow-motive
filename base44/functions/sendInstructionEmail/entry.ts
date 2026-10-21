import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { sendBrandedEmail } from '../../shared/brandedEmail.ts';
import { requireInternalUser } from '../../shared/internalAccess.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Internal-only: instruction emails go out from the internal instruction flow.
    const gate = await requireInternalUser(base44);
    if (gate.response) return gate.response;
    const user = gate.user;

    const body = await req.json();
    const { to, cc, subject, email_body, claim_id } = body || {};

    if (!to || !subject || !email_body) {
      return Response.json({ error: 'Missing required fields: to, subject, email_body' }, { status: 400 });
    }

    const fromName = user.full_name ? `${user.full_name} — RCM Automotive` : 'RCM Automotive';
    const sent = await sendBrandedEmail({ base44, to, cc, subject, content: email_body, fromName });
    if (!sent.ok) return Response.json({ error: sent.error }, { status: 502 });

    // Log the instruction email as a ClaimUpdate for traceability
    if (claim_id) {
      try {
        await base44.asServiceRole.entities.ClaimUpdate.create({
          claim_id,
          update_type: 'Bodyshop Communication',
          direction: 'Outgoing',
          platform: 'E-Mail',
          description: `Instruction email sent to ${to}${cc ? ` (CC: ${cc})` : ''}:\n\nSubject: ${subject}\n\n${email_body}`
        });
      } catch (logErr) {
        console.error('Failed to log instruction email update:', logErr.message);
      }
    }

    return Response.json({ success: true, message: 'Instruction email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
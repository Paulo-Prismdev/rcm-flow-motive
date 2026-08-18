import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Public endpoint: receives a bodyshop's update submission via the chaser email link.
// Security: _form_secret + token verification (same as getBodyshopUpdateForm).
// Creates an Incoming Bodyshop Communication ClaimUpdate, which resets the 48h timer.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const secret = body._form_secret;
    if (!secret || secret !== Deno.env.get('PUBLIC_FORM_SECRET')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token, description, next_steps, ecd, backordered_parts } = body;
    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return Response.json({ error: 'Please provide an update description' }, { status: 400 });
    }

    const claimId = await verifyBodyshopToken(token, secret);
    if (!claimId) {
      return Response.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Update the ECD on the claim if a value was provided
    if (ecd && ecd.trim()) {
      await base44.asServiceRole.entities.Claim.update(claimId, { ecd: ecd.trim() });
    }

    // Mark the claim as having an unread bodyshop update so internal users see a notification bubble
    await base44.asServiceRole.entities.Claim.update(claimId, { unread_bodyshop_update: true });

    // Build the update description, noting the ECD if it changed
    let updateDescription = description.trim();
    if (ecd && ecd.trim() && ecd.trim() !== (claim.ecd || '')) {
      updateDescription += `\n\nUpdated ECD: ${ecd.trim()}`;
    }

    // ── Create backordered part records if any were reported ──
    if (backordered_parts && Array.isArray(backordered_parts) && backordered_parts.length > 0) {
      const validParts = backordered_parts.filter((p: any) => p.part_description && p.part_description.trim());
      if (validParts.length > 0) {
        for (const part of validParts) {
          await base44.asServiceRole.entities.BackorderedPart.create({
            claim_id: claimId,
            claim_job_number: claim.job_number || '',
            claim_reg: claim.reg || '',
            part_description: part.part_description.trim(),
            part_number: (part.part_number || '').trim(),
            supplier_name: (part.supplier_name || '').trim(),
            expected_arrival_date: part.expected_arrival_date || '',
            additional_notes: (part.additional_notes || '').trim(),
            submitted_by_name: claim.bodyshop || '',
            submitted_by_phone: '',
            received_by_repairer: false,
          });
        }
        const partsSummary = validParts.map((p: any) =>
          `${p.part_description.trim()}${p.part_number ? ` (Part #: ${p.part_number.trim()})` : ''}`
        ).join('; ');
        updateDescription += `\n\nBackordered Parts: ${partsSummary}`;
      }
    }

    // Create the incoming update — this resets the 48h chaser timer
    await base44.asServiceRole.entities.ClaimUpdate.create({
      claim_id: claimId,
      update_type: 'Bodyshop Communication',
      direction: 'Incoming',
      platform: 'E-Mail',
      description: updateDescription,
      next_steps: (next_steps || '').trim()
    });

    // ── Notify internal users who have the "Repair Update Received" preference enabled ──
    try {
      const internalUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
      const regPart = claim.reg ? ` [${claim.reg}]` : '';
      const notifTitle = `Repair update received from ${claim.bodyshop || 'bodyshop'}${regPart}`;
      const notifMessage = `Job ${claim.job_number || 'Unknown'}: ${updateDescription.slice(0, 200)}${updateDescription.length > 200 ? '...' : ''}`;
      const notifLink = `/claims?id=${claimId}`;

      const recipients = internalUsers.filter((u: any) => {
        const prefs = u.notification_preferences || {};
        return prefs.repair_update_received !== false; // default ON
      });

      for (const user of recipients) {
        if (!user.email) continue;
        await base44.asServiceRole.entities.Notification.create({
          user_email: user.email,
          title: notifTitle,
          message: notifMessage,
          type: 'repair_update_received',
          related_item_type: 'Claim',
          related_item_id: claimId,
          link: notifLink,
          is_read: false,
        }).catch(() => {});

        // Send email if the user has the email pref enabled
        const prefs = user.notification_preferences || {};
        if (prefs.email_repair_update_received) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            subject: notifTitle,
            body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#131d47;">Repair Update Received</h2>
              <p><strong>Job:</strong> ${claim.job_number || 'Unknown'}</p>
              <p><strong>Vehicle:</strong> ${claim.reg || 'N/A'}</p>
              <p><strong>Bodyshop:</strong> ${claim.bodyshop || 'N/A'}</p>
              <p><strong>Update:</strong></p>
              <p style="background:#f5f6fa;padding:12px;border-radius:8px;white-space:pre-wrap;">${updateDescription.replace(/\n/g, '<br>')}</p>
              <p><a href="https://app.base44.com/claims?id=${claimId}" style="background:#131d47;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">View Claim</a></p>
            </div>`,
          }).catch(() => {});
        }
      }
    } catch (notifErr: any) {
      console.error('Failed to send repair update notifications:', notifErr.message);
    }

    console.log(`✅ Bodyshop update logged for claim ${claim.job_number}`);

    return Response.json({ success: true, claim_id: claimId });
  } catch (error: any) {
    console.error('submitBodyshopUpdate error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function verifyBodyshopToken(token: string, secret: string): Promise<string | null> {
  try {
    const [encodedId, hash] = token.split('.');
    if (!encodedId || !hash) return null;
    const claimId = atob(encodedId);
    const encoder = new TextEncoder();
    const data = encoder.encode(claimId + ':' + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const expectedHash = hashHex.substring(0, 24);
    return hash === expectedHash ? claimId : null;
  } catch {
    return null;
  }
}
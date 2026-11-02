import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { currentUser, portalScope } from '../../shared/portalAccess.ts';

/**
 * Tells staff a repairer has sent an estimate or parts request from their portal.
 * Portal users cannot list users or write other people's notifications, so the
 * message is written here, from the record itself, and only for a record that
 * belongs to the caller's own bodyshop.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = portalScope(user);
    if (!scope || scope.kind !== 'bodyshop') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { kind, record_id } = await req.json().catch(() => ({}));
    if (!record_id || (kind !== 'estimate' && kind !== 'part')) {
      return Response.json({ error: 'kind and record_id are required' }, { status: 400 });
    }

    const entity = kind === 'estimate' ? 'Estimate' : 'Part';
    const record = await base44.asServiceRole.entities[entity].get(record_id).catch(() => null);
    const mine = record && (record.created_by_id === user.id
      || record.bodyshop_company_id === scope.bodyshopId || record.bodyshop_id === scope.bodyshopId);
    if (!mine) return Response.json({ error: 'Not found' }, { status: 404 });

    const bodyshop = await base44.asServiceRole.entities.Bodyshop.get(scope.bodyshopId).catch(() => null);
    const from = bodyshop?.name || 'A repairer';
    const note = kind === 'estimate'
      ? {
        title: 'New Estimate Request',
        message: `${from} has requested an estimate for ${record.vehicle_reg || ''} - ${record.make_model || ''}`,
        type: 'estimate_request',
        related_item_type: 'Estimate',
        link: `/estimating?id=${record.id}`,
      }
      : {
        title: 'New Parts Request',
        message: `${from} has requested parts support for ${record.vehicle_ref || ''} - ${record.part_description || ''}`,
        type: 'parts_update',
        related_item_type: 'Part',
        link: `/parts?id=${record.id}`,
      };

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const staff = (users || []).filter((u: any) => u.user_type === 'internal' && u.email);
    await Promise.all(staff.map((u: any) => base44.asServiceRole.entities.Notification.create({
      user_email: u.email,
      ...note,
      message: note.message.slice(0, 300),
      related_item_id: record.id,
      is_read: false,
    }).catch(() => {})));

    return Response.json({ success: true, notified: staff.length });
  } catch (error: any) {
    console.error('notifyStaffOfPortalRequest error:', error?.message);
    return Response.json({ error: 'Could not notify the team' }, { status: 500 });
  }
});

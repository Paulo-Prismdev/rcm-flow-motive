import { base44 } from '@/api/base44Client';
import { isUpdateTrackingClosed } from './claimStatusUpdate';

// Recompute the claim's 48-hour update & client-communication timers from the
// remaining ClaimUpdate records. Called after an update is deleted so the
// tracking badges reflect the new most-recent qualifying update instead of
// the deleted one.
//
// General timer  → most recent Incoming update (any type)
// Client comm    → most recent Outgoing "Client Communication" update
export async function recomputeUpdateTimers(claimId) {
  if (!claimId) return null;

  const [claim, updates] = await Promise.all([
    base44.entities.Claim.get(claimId),
    base44.entities.ClaimUpdate.filter({ claim_id: claimId }, '-created_date', 500),
  ]);

  const closed = isUpdateTrackingClosed(claim);
  const fortyEight = 48 * 60 * 60 * 1000;
  const updateData = {};

  if (closed) {
    updateData.update_status_flag = 'Gray';
    updateData.client_comm_status_flag = 'Gray';
  } else {
    // General timer — latest Incoming update
    const latestIncoming = updates.find((u) => u.direction === 'Incoming');
    if (latestIncoming) {
      const ts = new Date(latestIncoming.created_date);
      updateData.last_updated_at = ts.toISOString();
      updateData.next_update_due_at = new Date(ts.getTime() + fortyEight).toISOString();
      updateData.update_status_flag = 'Green';
    } else {
      updateData.last_updated_at = null;
      updateData.next_update_due_at = null;
      updateData.update_status_flag = 'Red';
    }

    // Client comm timer — latest Outgoing Client Communication
    const latestClientComm = updates.find(
      (u) => u.update_type === 'Client Communication' && u.direction === 'Outgoing'
    );
    if (latestClientComm) {
      const ts = new Date(latestClientComm.created_date);
      updateData.last_client_comm_at = ts.toISOString();
      updateData.next_client_comm_due_at = new Date(ts.getTime() + fortyEight).toISOString();
      updateData.client_comm_status_flag = 'Green';
    } else {
      updateData.last_client_comm_at = null;
      updateData.next_client_comm_due_at = null;
      updateData.client_comm_status_flag = 'Red';
    }
  }

  await base44.entities.Claim.update(claimId, updateData);
  return updateData;
}
// Shared backend helpers for the claim document checklist.
// Mirrors the frontend logic in src/components/shared/docChecklist.js.

export const DOC_ITEMS = [
  { key: 'instruction_from_referrer', label: 'Instruction from referrer', required: true },
  { key: 'instruction_to_repairer', label: 'Instruction to repairer', required: true },
  { key: 'initial_estimate', label: 'Initial estimate', required: true },
  { key: 'initial_authority', label: 'Initial authority', required: true },
  { key: 'supplementary_estimate', label: 'Supplementary estimate', required: false },
  { key: 'supplementary_authority', label: 'Supplementary authority', required: false },
];

function getItemStatus(item, files, statusMap) {
  const hasFiles = files.some((f) => f.item_key === item.key);
  if (hasFiles) return 'received';
  const stored = statusMap?.[item.key];
  if (stored === 'not_applicable') return 'not_applicable';
  if (stored === 'outstanding') return 'outstanding';
  if (stored === 'not_required') return 'not_required';
  return item.required ? 'outstanding' : 'not_required';
}

export function computeChecklistCounts(files, statusMap) {
  const items = DOC_ITEMS.map((item) => ({ item, status: getItemStatus(item, files, statusMap) }));
  const counted = items.filter(({ status }) => status === 'received' || status === 'outstanding');
  const received = items.filter(({ status }) => status === 'received').length;
  return { received, total: counted.length };
}

/**
 * File an instruction PDF against the "Instruction to repairer" checklist item
 * and refresh the claim's denormalized document counts.
 * Called after a successful PDF upload + save.
 */
export async function fileInstructionDocument(base44, claimId, fileUrl, fileName, user) {
  try {
    const existing = await base44.asServiceRole.entities.ClaimDocument.filter({
      claim_id: claimId,
      item_key: 'instruction_to_repairer',
      file_url: fileUrl,
    });
    if (!existing || existing.length === 0) {
      await base44.asServiceRole.entities.ClaimDocument.create({
        claim_id: claimId,
        item_key: 'instruction_to_repairer',
        file_url: fileUrl,
        file_name: fileName,
        uploaded_by_email: user?.email || 'system',
        uploaded_by_name: user?.full_name || 'System',
        uploaded_at: new Date().toISOString(),
        source: 'instruction_pdf',
      });
    }

    // Recompute denormalized counts from all documents for this claim.
    const allDocs = await base44.asServiceRole.entities.ClaimDocument.filter({ claim_id: claimId });
    const claim = await base44.asServiceRole.entities.Claim.get(claimId);
    const statusMap = claim.doc_checklist_status || {};
    const counts = computeChecklistCounts(allDocs, statusMap);
    await base44.asServiceRole.entities.Claim.update(claimId, {
      doc_checklist_received: counts.received,
      doc_checklist_total: counts.total,
    });
  } catch (e) {
    console.error('fileInstructionDocument failed:', e);
  }
}
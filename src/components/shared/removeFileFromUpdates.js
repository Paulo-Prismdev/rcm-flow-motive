import { base44 } from '@/api/base44Client';

/**
 * Takes one file out of a claim's Internal Updates: any note carrying it has that
 * copy dropped, and a note left holding nothing at all is removed — it only ever
 * existed to carry the file.
 *
 * Never throws: the file has already gone from the claim by the time this runs,
 * and a copy left behind in the update feed must not undo that.
 */
export async function removeFileFromUpdates(claimId, fileUrl) {
  if (!claimId || !fileUrl) return 0;
  try {
    const page = await base44.entities.Note.filter(
      { parent_id: claimId, parent_type: 'Claim' },
      { limit: 200 }
    );

    let changed = 0;
    for (const note of page.items || []) {
      const urls = Array.isArray(note.file_urls) ? note.file_urls : [];
      if (!urls.includes(fileUrl)) continue;
      const remaining = urls.filter((url) => url !== fileUrl);
      if (remaining.length) await base44.entities.Note.update(note.id, { file_urls: remaining });
      else await base44.entities.Note.delete(note.id);
      changed += 1;
    }
    return changed;
  } catch (error) {
    console.error('Could not take the file out of Internal Updates', error);
    return 0;
  }
}
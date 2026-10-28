import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DOC_ITEMS } from '@/components/shared/docChecklist';

const GENERAL_LABEL = 'General Document';
const LEGACY_LABEL = 'Legacy file';

const itemLabel = (doc) =>
  doc.label || DOC_ITEMS.find((i) => i.key === doc.item_key)?.label || GENERAL_LABEL;

function fileBaseName(url) {
  try {
    return decodeURIComponent(String(url).split('?')[0].split('/').pop() || 'File');
  } catch {
    return 'File';
  }
}

// Uploads keep their storage prefix in the stored name; it means nothing to a reader.
const tidyName = (name) => String(name || '').replace(/^[0-9a-f]{6,12}[_-]/i, '');

const displayName = (doc) => tidyName(doc.file_name) || fileBaseName(doc.file_url);

const isImageUrl = (url) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(String(url || ''));

function formatDay(value) {
  if (!value) return '';
  try {
    return format(new Date(value), 'dd/MM/yyyy');
  } catch {
    return '';
  }
}

function DocRow({ name, type, date, url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:bg-surface-hover transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {type}
            {date ? ` · ${date}` : ''}
          </p>
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

function Group({ title, rows }) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground-muted">{title}</p>
      {rows.map((r) => (
        <DocRow key={r.key} {...r} />
      ))}
    </div>
  );
}

/**
 * The claim's Documents panel, as a referrer sees it: the checklist documents
 * (claim form, instruction to repairer, estimates, authorities) and the general
 * documents, then any legacy files still on the claim. Read through the protected
 * lookup, so nothing from Financials or our internal notes is ever included.
 *
 * Other portal users keep the plain legacy list they have today.
 */
export default function ReferrerDocumentsSection({ claim, legacyDocuments = [], updateFiles = [] }) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
  });
  const isReferrer = currentUser?.user_type === 'referrer';

  const { data, isLoading } = useQuery({
    queryKey: ['referrerClaimDocuments', claim?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getReferrerClaimDocuments', { claim_id: claim.id });
      const payload = res?.data ?? res;
      return payload?.documents ? payload : { documents: [], legacy_files: [] };
    },
    enabled: isReferrer && !!claim?.id,
  });

  if (!isReferrer) {
    return (
      <div className="neomorph-flat p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-gold" />
          <h3 className="font-bold">Documents</h3>
        </div>
        {legacyDocuments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No documents attached to this claim.</p>
        ) : (
          <div className="space-y-2">
            {legacyDocuments.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-surface-hover transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-primary group-hover:text-primary/80 flex-shrink-0" />
                  <span className="text-sm font-medium truncate max-w-[200px] md:max-w-md">{fileBaseName(url)}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  const docs = data?.documents || [];
  // Claim-level files nobody has filed against a checklist item, plus whatever
  // was attached to a claim update (both were already visible to the referrer).
  const legacy = [...(data?.legacy_files || []), ...updateFiles]
    .filter((u) => u && !isImageUrl(u))
    .filter((u, i, arr) => arr.indexOf(u) === i);

  // Checklist documents first, in checklist order, then everything else (general).
  const checklistRows = DOC_ITEMS.flatMap((item) =>
    docs
      .filter((d) => d.item_key === item.key)
      .map((d) => ({
        key: d.id,
        name: displayName(d),
        type: item.label,
        date: formatDay(d.uploaded_at),
        url: d.file_url,
      }))
  );

  const generalRows = docs
    .filter((d) => !DOC_ITEMS.some((i) => i.key === d.item_key))
    .map((d) => ({
      key: d.id,
      name: displayName(d),
      type: itemLabel(d),
      date: formatDay(d.uploaded_at),
      url: d.file_url,
    }));

  const legacyRows = legacy.map((url) => ({
    key: url,
    name: tidyName(fileBaseName(url)),
    type: LEGACY_LABEL,
    date: '',
    url,
  }));

  const total = checklistRows.length + generalRows.length + legacyRows.length;

  return (
    <div className="neomorph-flat p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-5 h-5 text-gold" />
        <h3 className="font-bold">Documents</h3>
        {total > 0 && <span className="text-xs text-muted-foreground">({total})</span>}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading documents…
        </div>
      ) : total === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">No documents attached to this claim.</p>
      ) : (
        <div className="space-y-5">
          <Group title="Claim documents" rows={checklistRows} />
          <Group title="General documents" rows={generalRows} />
          <Group title="Legacy files" rows={legacyRows} />
        </div>
      )}
    </div>
  );
}
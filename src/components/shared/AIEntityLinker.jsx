import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Link, X, Check, AlertCircle, ChevronRight, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * AIEntityLinker — shown after AI extraction, before AIExtractConfirmDialog.
 * For fields that map to DB entities (client, referrer, bodyshop),
 * it finds the best fuzzy match and lets the user confirm or override.
 */

function fuzzyScore(extracted, candidate) {
  if (!extracted || !candidate) return 0;
  const a = extracted.toLowerCase().trim();
  const b = candidate.toLowerCase().trim();
  if (b === a) return 1;
  if (b.includes(a) || a.includes(b)) return 0.8;
  // word overlap
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  const overlap = aWords.filter(w => bWords.some(bw => bw.includes(w) || w.includes(bw))).length;
  return overlap / Math.max(aWords.length, bWords.length);
}

function EntityLinkRow({ label, icon: Icon, extractedName, candidates, nameKey, onLink, onSkip, linked }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const sorted = [...candidates]
    .map(c => ({ ...c, score: fuzzyScore(extractedName, c[nameKey]) }))
    .sort((a, b) => b.score - a.score);

  const topMatch = sorted[0]?.score >= 0.5 ? sorted[0] : null;

  const filtered = search
    ? sorted.filter(c => c[nameKey]?.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  if (linked) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{linked[nameKey]}</p>
        </div>
        <button onClick={onSkip} className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Unlink
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">AI found: "<span className="text-purple-600 dark:text-purple-400">{extractedName}</span>"</p>
        </div>
      </div>

      {/* Top match suggestion */}
      {topMatch && !open && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-2">Best match found:</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{topMatch[nameKey]}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">{Math.round(topMatch.score * 100)}% match</p>
            </div>
            <Button type="button" size="sm" onClick={() => onLink(topMatch)} className="bg-green-600 hover:bg-green-700 text-white gap-1">
              <Check className="w-3.5 h-3.5" /> Link
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            Choose different <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Skip — use as plain text
          </button>
        </div>
      )}

      {/* No match found */}
      {!topMatch && !open && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">No close match found in the database</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            Search manually <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 block"
          >
            <X className="w-3 h-3" /> Skip — use as plain text
          </button>
        </div>
      )}

      {/* Search/browse list */}
      {open && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mb-2"
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filtered.slice(0, 20).map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onLink(c); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-800 dark:text-gray-200 flex items-center gap-2 transition-colors"
              >
                <Check className="w-3.5 h-3.5 text-transparent group-hover:text-purple-600" />
                {c[nameKey]}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 px-2 py-2">No results found</p>
            )}
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Skip — use as plain text
          </button>
        </div>
      )}
    </div>
  );
}

export default function AIEntityLinker({ isOpen, onClose, extractedData, onConfirm }) {
  const [links, setLinks] = useState({ client: null, referrer: null, bodyshop: null });
  const [skipped, setSkipped] = useState({ client: false, referrer: false, bodyshop: false });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
    enabled: isOpen && !!extractedData?.client_name,
  });

  const { data: referrers = [] } = useQuery({
    queryKey: ['companies', 'referrer'],
    queryFn: () => base44.entities.Company.filter({ company_type: 'referrer' }),
    enabled: isOpen && !!extractedData?.referrer,
  });

  const { data: bodyshops = [] } = useQuery({
    queryKey: ['bodyshops'],
    queryFn: () => base44.entities.Bodyshop.list(),
    enabled: isOpen && !!extractedData?.bodyshop,
  });

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setLinks({ client: null, referrer: null, bodyshop: null });
      setSkipped({ client: false, referrer: false, bodyshop: false });
    }
  }, [isOpen]);

  if (!isOpen || !extractedData) return null;

  const hasClient = !!extractedData.client_name;
  const hasReferrer = !!extractedData.referrer;
  const hasBodyshop = !!extractedData.bodyshop;

  const linkableFields = [hasClient, hasReferrer, hasBodyshop].filter(Boolean).length;

  if (linkableFields === 0) {
    // Nothing to link, pass through
    onConfirm(extractedData, []);
    return null;
  }

  const handleConfirm = () => {
    const enriched = { ...extractedData };
    const linkedTypes = [];

    if (links.client) {
      linkedTypes.push('client');
      enriched.client_name = links.client.name;
      enriched.client_id = links.client.id;
      enriched.client_phone = links.client.phone || enriched.client_phone || '';
      enriched.client_email = links.client.email || enriched.client_email || '';
      enriched.client_address_line_1 = links.client.address_line_1 || enriched.client_address_line_1 || '';
      enriched.client_address_line_2 = links.client.address_line_2 || enriched.client_address_line_2 || '';
      enriched.client_town = links.client.town || enriched.client_town || '';
      enriched.client_county = links.client.county || enriched.client_county || '';
      enriched.client_postcode = links.client.postcode || enriched.client_postcode || '';
    }

    if (links.referrer) {
      linkedTypes.push('referrer');
      enriched.referrer = links.referrer.name;
      enriched.referrer_id = links.referrer.id;
      enriched.referrer_email = links.referrer.contact_email || enriched.referrer_email || '';
    }

    if (links.bodyshop) {
      linkedTypes.push('bodyshop');
      enriched.bodyshop = links.bodyshop.name;
      enriched.bodyshop_id = links.bodyshop.id;
      enriched.bodyshop_email = links.bodyshop.email || enriched.bodyshop_email || '';
    }

    onConfirm(enriched, linkedTypes);
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
            <Link className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Link to Existing Records</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              AI extracted these names — link them to your database to avoid duplicates
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Entity rows */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {hasClient && !skipped.client && (
            <EntityLinkRow
              label="Client"
              icon={User}
              extractedName={extractedData.client_name}
              candidates={clients}
              nameKey="name"
              linked={links.client}
              onLink={c => setLinks(prev => ({ ...prev, client: c }))}
              onSkip={() => { setLinks(prev => ({ ...prev, client: null })); setSkipped(prev => ({ ...prev, client: true })); }}
            />
          )}
          {hasClient && skipped.client && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <X className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Client — using as plain text</span>
              <button type="button" onClick={() => setSkipped(prev => ({ ...prev, client: false }))} className="ml-auto text-xs text-blue-600 hover:underline">Undo</button>
            </div>
          )}

          {hasReferrer && !skipped.referrer && (
            <EntityLinkRow
              label="Referrer"
              icon={Building2}
              extractedName={extractedData.referrer}
              candidates={referrers}
              nameKey="name"
              linked={links.referrer}
              onLink={r => setLinks(prev => ({ ...prev, referrer: r }))}
              onSkip={() => { setLinks(prev => ({ ...prev, referrer: null })); setSkipped(prev => ({ ...prev, referrer: true })); }}
            />
          )}
          {hasReferrer && skipped.referrer && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <X className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Referrer — using as plain text</span>
              <button type="button" onClick={() => setSkipped(prev => ({ ...prev, referrer: false }))} className="ml-auto text-xs text-blue-600 hover:underline">Undo</button>
            </div>
          )}

          {hasBodyshop && !skipped.bodyshop && (
            <EntityLinkRow
              label="Bodyshop"
              icon={Building2}
              extractedName={extractedData.bodyshop}
              candidates={bodyshops}
              nameKey="name"
              linked={links.bodyshop}
              onLink={b => setLinks(prev => ({ ...prev, bodyshop: b }))}
              onSkip={() => { setLinks(prev => ({ ...prev, bodyshop: null })); setSkipped(prev => ({ ...prev, bodyshop: true })); }}
            />
          )}
          {hasBodyshop && skipped.bodyshop && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <X className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Bodyshop — using as plain text</span>
              <button type="button" onClick={() => setSkipped(prev => ({ ...prev, bodyshop: false }))} className="ml-auto text-xs text-blue-600 hover:underline">Undo</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-5 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Continue to Review
          </Button>
        </div>
      </div>
    </div>
  );
}
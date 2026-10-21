import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, Check, Link2, Plus, User } from 'lucide-react';
import { bestMatch } from './directoryMatch';
import AddInsurerModal from '@/components/shared/AddInsurerModal';
import AddThirdPartyModal from '@/components/shared/AddThirdPartyModal';
import AddBodyshopModal from '@/components/shared/AddBodyshopModal';

/**
 * Matching what the instruction named to our directories: the client, referrer,
 * bodyshop, the insurer and the third party's insurer, and the third party
 * itself. Where nothing matches, the record can be added from here with the name
 * already filled in.
 */
export default function IntakeDirectoryLinks({ values = {}, onChange }) {
  const [links, setLinks] = useState({});
  const [adding, setAdding] = useState(null);
  const reportedRef = useRef(false);

  const { data: referrers = [] } = useQuery({ queryKey: ['companies', 'referrer'], queryFn: () => base44.entities.Company.filter({ company_type: 'referrer' }) });
  const { data: bodyshops = [] } = useQuery({ queryKey: ['bodyshops'], queryFn: () => base44.entities.Bodyshop.list() });
  const { data: insurers = [] } = useQuery({ queryKey: ['insurers'], queryFn: () => base44.entities.Insurer.list('name', 500) });
  const { data: thirdParties = [] } = useQuery({ queryKey: ['thirdParties'], queryFn: () => base44.entities.ThirdParty.list('name', 500) });

  // The client is decided in the review screen's own client section — a directory
  // client, a new one, or the driver — so only the other parties are matched here.
  const rows = useMemo(() => [
    { key: 'referrer', label: 'Referrer', value: values.referrer, match: bestMatch(values.referrer, referrers), icon: Building2, directory: 'referrer directory', addLabel: null },
    { key: 'bodyshop', label: 'Bodyshop', value: values.bodyshop, match: bestMatch(values.bodyshop, bodyshops), icon: Building2, directory: 'repairer directory', addLabel: 'Add repairer' },
    { key: 'insurer', label: 'Insurer', value: values.insurer, match: bestMatch(values.insurer, insurers), icon: Building2, directory: 'insurer directory', addLabel: 'Add insurer' },
    { key: 'tpInsurer', label: "Third party's insurer", value: values.tp_insurer, match: bestMatch(values.tp_insurer, insurers), icon: Building2, directory: 'insurer directory', addLabel: 'Add insurer' },
    { key: 'thirdParty', label: 'Third party', value: values.tp_name, match: bestMatch(values.tp_name, thirdParties), icon: User, directory: 'third party list', addLabel: 'Add third party' },
  ].filter((row) => row.value), [values, referrers, bodyshops, insurers, thirdParties]);

  // The match found is the starting point: a directory spelling of a name beats
  // the spelling read off the paper.
  useEffect(() => {
    if (reportedRef.current || !rows.length) return;
    const listsLoaded = referrers.length || bodyshops.length || insurers.length || thirdParties.length;
    if (!listsLoaded) return;
    reportedRef.current = true;
    setLinks(Object.fromEntries(rows.map((row) => [row.key, row.match ? { mode: 'directory', record: row.match.record } : { mode: 'raw' }])));
  }, [rows, referrers, bodyshops, insurers, thirdParties]);

  useEffect(() => { onChange(links); }, [links, onChange]);

  const setLink = (key, link) => setLinks((prev) => ({ ...prev, [key]: link }));

  const added = (key, record) => setLink(key, { mode: 'directory', record });
  const addModalProps = {
    isOpen: !!adding,
    onClose: () => setAdding(null),
    initialName: adding ? adding.value : '',
  };

  if (!rows.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Link2 className="w-3.5 h-3.5" /> Link to our directories
      </p>

      {rows.map((row) => {
        const link = links[row.key] || { mode: 'raw' };
        const Icon = row.icon;
        return (
          <div key={row.key} className="rounded-lg border border-border px-2.5 py-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[104px] flex-shrink-0">{row.label}</span>
              <span className="text-xs font-medium text-foreground truncate max-w-[220px]">{row.match ? row.match.record.name : row.value}</span>

              {row.match ? (
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => setLink(row.key, { mode: 'directory', record: row.match.record })}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold ${link.mode === 'directory' ? 'bg-green-600 text-white' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'}`}
                  >
                    <Check className="w-3 h-3" /> Use {row.match.record.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLink(row.key, { mode: 'raw' })}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium ${link.mode === 'raw' ? 'bg-muted text-foreground border border-border' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    Keep “{row.value}”
                  </button>
                  <span className="text-[10px] text-muted-foreground">{Math.round(row.match.score * 100)}% match</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[10px] text-muted-foreground">Not in the {row.directory}</span>
                  {row.addLabel && (
                    <button
                      type="button"
                      onClick={() => setAdding(row)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                    >
                      <Plus className="w-3 h-3" /> {row.addLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
            {link.mode === 'directory' && link.record && link.record.name !== row.value && (
              <p className="text-[10px] text-muted-foreground mt-1 ml-[104px]">The claim will use “{link.record.name}” from the directory.</p>
            )}
          </div>
        );
      })}

      {(adding?.key === 'insurer' || adding?.key === 'tpInsurer') && (
        <AddInsurerModal {...addModalProps} onSuccess={(record) => added(adding.key, record)} />
      )}
      {adding?.key === 'thirdParty' && (
        <AddThirdPartyModal {...addModalProps} onSuccess={(record) => added('thirdParty', record)} />
      )}
      {adding?.key === 'bodyshop' && (
        <AddBodyshopModal {...addModalProps} onSuccess={(record) => added('bodyshop', record)} />
      )}
    </div>
  );
}
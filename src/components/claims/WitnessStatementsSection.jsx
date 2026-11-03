import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Copy, Check, Download, Loader, Mail, Plus, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { askConfirm, notify, notifyError } from '@/lib/dialogs';
import { openFileInNewTab } from '@/lib/privateFiles';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const call = async (payload) => {
  const res = await base44.functions.invoke('witnessStatementManage', payload);
  if (res?.data?.error) throw new Error(res.data.error);
  return res.data;
};

/**
 * Witness statements on a claim: send a witness a link, and once they've signed, open the
 * signed PDF to pass to the insurer. A claim can have several witnesses. Witness details
 * are internal only (portals never see them).
 */
export default function WitnessStatementsSection({ claim }) {
  const qc = useQueryClient();
  const key = ['witnessStatements', claim.id];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ witness_name: '', witness_email: '', witness_phone: '' });
  const [copiedId, setCopiedId] = useState(null);

  const { data: statements = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await call({ action: 'list', claim_id: claim.id })).statements || [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: () => call({ action: 'create', claim_id: claim.id, ...form }),
    onSuccess: (data) => {
      qc.setQueryData(key, data.statements || []);
      setAdding(false);
      setForm({ witness_name: '', witness_email: '', witness_phone: '' });
      notify('Witness link created', 'Email it, or copy the link and send it by text or WhatsApp.');
    },
    onError: (e) => notifyError('Could not create the witness link', e),
  });
  const act = useMutation({
    mutationFn: (payload) => call(payload),
    onSuccess: (_d, payload) => {
      refresh();
      if (payload.action === 'send_email') notify('Link emailed to the witness');
      if (payload.action === 'regenerate') notify('New link created', 'The old link no longer works.');
    },
    onError: (e) => notifyError('That didn’t work', e),
  });

  const copy = (s) => {
    navigator.clipboard.writeText(s.link);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  const remove = async (s) => {
    if (await askConfirm({ title: `Remove the request for ${s.witness_name}?`, message: 'The link stops working.', confirmLabel: 'Remove', destructive: true })) {
      act.mutate({ action: 'remove', id: s.id });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Send a witness a secure link to describe what they saw and sign a statement of truth. The signed PDF is saved here, ready for the insurer. Links last 14 days and can be signed once.
      </p>

      {isLoading && <div className="py-4 flex justify-center"><Loader className="w-5 h-5 animate-spin text-muted-foreground" /></div>}

      {statements.map((s) => (
        <div key={s.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserRound className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.witness_name}</p>
                <p className="text-xs text-muted-foreground truncate">{[s.witness_email, s.witness_phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
              </div>
            </div>
            {s.status === 'Signed'
              ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-900/20 rounded-full px-2 py-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Signed {fmt(s.signed_at)}</span>
              : <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${s.link_expired ? 'text-red-700 bg-red-50' : 'text-amber-700 bg-amber-50'}`}>{s.link_expired ? 'Link expired' : `Waiting${s.link_emailed_at ? ` · emailed ${fmt(s.link_emailed_at)}` : ''}`}</span>}
          </div>

          {s.status === 'Signed' ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openFileInNewTab(s.pdf_ref, { claimId: claim.id, log: true }).catch((e) => notifyError('Could not open the PDF', e))}>
              <Download className="w-3.5 h-3.5" /> Open signed statement{s.signer_name && s.signer_name !== s.witness_name ? ` (signed as ${s.signer_name})` : ''}
            </Button>
          ) : (
            <>
              {!s.link_expired && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input readOnly value={s.link} className="flex-1 text-xs" onClick={(e) => e.target.select()} aria-label={`Link for ${s.witness_name}`} />
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copy(s)}>
                    {copiedId === s.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}{copiedId === s.id ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {s.witness_email && (
                  <Button size="sm" className="gap-1.5" disabled={act.isPending} onClick={() => act.mutate({ action: 'send_email', id: s.id })}>
                    <Mail className="w-3.5 h-3.5" /> {s.link_emailed_at ? 'Email again' : 'Email the link'}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" disabled={act.isPending} onClick={() => act.mutate({ action: 'regenerate', id: s.id })}>
                  <RefreshCw className="w-3.5 h-3.5" /> New link
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-red-600 hover:text-red-700" disabled={act.isPending} onClick={() => remove(s)}>
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>
            </>
          )}
        </div>
      ))}

      {adding ? (
        <form
          className="rounded-lg border border-border p-3 space-y-2"
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        >
          <Input placeholder="Witness name *" value={form.witness_name} onChange={(e) => setForm({ ...form, witness_name: e.target.value })} aria-label="Witness name" autoFocus />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input type="email" placeholder="Email (to send the link)" value={form.witness_email} onChange={(e) => setForm({ ...form, witness_email: e.target.value })} aria-label="Witness email" />
            <Input type="tel" placeholder="Phone (optional)" value={form.witness_phone} onChange={(e) => setForm({ ...form, witness_phone: e.target.value })} aria-label="Witness phone" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={create.isPending || !form.witness_name.trim()} className="gap-1.5">
              {create.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create link
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" /> Add a witness
        </Button>
      )}
    </div>
  );
}

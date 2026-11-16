import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, ExternalLink, Search, CheckCircle2 } from 'lucide-react';

import useEscapeToClose from '@/hooks/useEscapeToClose';
export default function ChaserTestEmailModal({ rule, onClose }) {
  useEscapeToClose(onClose);
  const [search, setSearch] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const { data: claims = [] } = useQuery({
    queryKey: ['claimsForChaserTest'],
    queryFn: () => base44.entities.Claim.filter({ archived: false }, '-created_date', 200),
    staleTime: 60000,
  });

  const filtered = useMemo(() => {
    if (!claims.length) return [];
    if (!search.trim()) return claims.slice(0, 20);
    const q = search.toLowerCase();
    return claims
      .filter((c) =>
        (c.job_number || '').toLowerCase().includes(q) ||
        (c.reg || '').toLowerCase().includes(q) ||
        (c.client_name || '').toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [claims, search]);

  const handleSend = async () => {
    if (!email.trim() || !selectedClaim) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const res = await base44.functions.invoke('processChaserEmails', {
        test_email: email.trim(),
        rule_id: rule.id,
        test_claim_id: selectedClaim.id,
      });
      const d = res.data || {};
      if (d.success === false) {
        setError(d.error || 'Unknown error');
      } else {
        setResult(d);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-overlay-dismiss className="fixed inset-0 z-window fm-scrim flex items-center justify-center p-4" onClick={onClose} data-mobile-full-modal="true">
      <div
        className="fm-glass-window rounded-2xl text-foreground w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-purple-600" />
            <h2 className="text-base font-semibold text-foreground">Send Test Email</h2>
          </div>
          <button aria-label="Close" onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          <div className="text-xs text-muted-foreground">
            Rule: <span className="font-medium text-foreground">{rule?.rule_name}</span> · Recipient type: {rule?.recipient_type}
          </div>

          {/* Claim search */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Select Job to populate tags</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job number, reg, or client name..."
                className="pl-8"
              />
            </div>
            {selectedClaim && (
              <div className="mt-2 flex items-center gap-2 text-xs bg-success-bg border border-success/30 rounded-md px-2.5 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success-fg flex-shrink-0" />
                <span className="text-success-fg font-medium">
                  {selectedClaim.job_number || '—'} · {selectedClaim.reg || '—'} · {selectedClaim.client_name || '—'}
                </span>
              </div>
            )}
            <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="text-center py-3 text-xs text-muted-foreground">No matching jobs</div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClaim(c)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted transition-colors ${
                      selectedClaim?.id === c.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                  >
                    <span className="font-medium text-foreground">{c.job_number || '—'}</span>
                    <span className="text-muted-foreground ml-2">{c.reg || '—'}</span>
                    <span className="text-muted-foreground ml-2 truncate">{c.client_name || ''}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Send test to (email)</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>

          {error && (
            <div className="text-xs text-danger-fg bg-danger-bg border border-danger/30 rounded-md p-2">
              {error}
            </div>
          )}

          {result && (
            <div className="text-xs space-y-2 bg-success-bg border border-success/30 rounded-md p-3">
              <div className="flex items-center gap-1.5 text-success-fg font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Sent to {result.test_email}
              </div>
              {result.claim_used && (
                <div className="text-muted-foreground">
                  Rendered with job <span className="font-medium">{result.claim_used.job_number}</span> ({result.claim_used.reg})
                </div>
              )}
              {result.bodyshop_update_link && (
                <div className="space-y-1">
                  <div className="text-muted-foreground">Bodyshop update link in the email:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-card border border-border rounded px-1.5 py-1 truncate text-foreground">
                      {result.bodyshop_update_link}
                    </code>
                    <a
                      href={result.bodyshop_update_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium px-2 py-1 rounded border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                  </div>
                </div>
              )}
              <div className="text-muted-foreground mt-1 pt-2 border-t border-success/30">
                <span className="font-medium">Subject:</span> {result.email_subject}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{result ? 'Done' : 'Cancel'}</Button>
          {!result && (
            <Button
              onClick={handleSend}
              disabled={sending || !email.trim() || !selectedClaim}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {sending ? 'Sending...' : 'Send Test Email'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, ExternalLink, Search, CheckCircle2 } from 'lucide-react';

export default function ChaserTestEmailModal({ rule, onClose }) {
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
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-purple-600" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Send Test Email</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Rule: <span className="font-medium text-gray-900 dark:text-white">{rule?.rule_name}</span> · Recipient type: {rule?.recipient_type}
          </div>

          {/* Claim search */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Select Job to populate tags</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job number, reg, or client name..."
                className="pl-8"
              />
            </div>
            {selectedClaim && (
              <div className="mt-2 flex items-center gap-2 text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md px-2.5 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="text-green-800 dark:text-green-300 font-medium">
                  {selectedClaim.job_number || '—'} · {selectedClaim.reg || '—'} · {selectedClaim.client_name || '—'}
                </span>
              </div>
            )}
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-md divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <div className="text-center py-3 text-xs text-gray-400">No matching jobs</div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClaim(c)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedClaim?.id === c.id ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{c.job_number || '—'}</span>
                    <span className="text-gray-500 ml-2">{c.reg || '—'}</span>
                    <span className="text-gray-400 ml-2 truncate">{c.client_name || ''}</span>
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
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
              {error}
            </div>
          )}

          {result && (
            <div className="text-xs space-y-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Sent to {result.test_email}
              </div>
              {result.claim_used && (
                <div className="text-gray-600 dark:text-gray-400">
                  Rendered with job <span className="font-medium">{result.claim_used.job_number}</span> ({result.claim_used.reg})
                </div>
              )}
              {result.bodyshop_update_link && (
                <div className="space-y-1">
                  <div className="text-gray-600 dark:text-gray-400">Bodyshop update link in the email:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-1 truncate text-gray-700 dark:text-gray-300">
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
              <div className="text-gray-500 dark:text-gray-400 mt-1 pt-2 border-t border-green-200 dark:border-green-800">
                <span className="font-medium">Subject:</span> {result.email_subject}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
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
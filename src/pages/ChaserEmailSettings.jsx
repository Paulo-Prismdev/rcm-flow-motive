import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Play, History, Power, PowerOff, Eye, X, Send } from 'lucide-react';
import { JOURNEY_STATUSES } from '@/components/shared/claimStatusV2';
import ChaserTestEmailModal from '@/components/settings/ChaserTestEmailModal';

export default function ChaserEmailSettings() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [runningRuleId, setRunningRuleId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewingRuleId, setPreviewingRuleId] = useState(null);
  const [testModalRule, setTestModalRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['chaserEmailRules'],
    queryFn: () => base44.entities.ChaserEmailRule.list('sort_order'),
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['chaserEmailLogs'],
    queryFn: () => base44.entities.ChaserEmailLog.list('-sent_at', 50),
    enabled: showLogs,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChaserEmailRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chaserEmailRules'] });
      setShowForm(false);
      setEditingRule(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChaserEmailRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chaserEmailRules'] });
      setShowForm(false);
      setEditingRule(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChaserEmailRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chaserEmailRules'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.ChaserEmailRule.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chaserEmailRules'] });
    },
  });

  const handleRunNow = async (rule) => {
    setRunningRuleId(rule.id);
    try {
      const result = await base44.functions.invoke('processChaserEmails', { rule_id: rule.id });
      alert(`"${rule.rule_name}" processed!\n\nSent: ${result.data.emails_sent}\nSkipped: ${result.data.emails_skipped}\nFailed: ${result.data.errors}`);
      queryClient.invalidateQueries({ queryKey: ['chaserEmailLogs'] });
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setRunningRuleId(null);
    }
  };

  const handlePreview = async (rule) => {
    setPreviewingRuleId(rule.id);
    try {
      const result = await base44.functions.invoke('processChaserEmails', { dry_run: true, rule_id: rule.id });
      setPreviewData({ ...result.data, rule_name: rule.rule_name });
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setPreviewingRuleId(null);
    }
  };

  const handleDelete = (rule) => {
    if (window.confirm(`Are you sure you want to delete the rule "${rule.rule_name}"?`)) {
      deleteMutation.mutate(rule.id);
    }
  };

  const handleToggleActive = (rule) => {
    toggleActiveMutation.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  const handleSendTest = (rule) => {
    setTestModalRule(rule);
  };

  if (showForm || editingRule) {
    return (
      <ChaserEmailRuleForm
        rule={editingRule}
        onSubmit={(data) => {
          if (editingRule) {
            updateMutation.mutate({ id: editingRule.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        onCancel={() => {
          setShowForm(false);
          setEditingRule(null);
        }}
      />
    );
  }

  if (showLogs) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Chaser Email Logs</h1>
          <button onClick={() => setShowLogs(false)} className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Back
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {recentLogs.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">
              No logs found
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{log.rule_name}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                      log.status === 'Sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      log.status === 'Failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div><span className="text-gray-500 dark:text-gray-500">To:</span> {log.recipient_email}</div>
                    <div><span className="text-gray-500 dark:text-gray-500">Type:</span> {log.recipient_type}</div>
                    <div><span className="text-gray-500 dark:text-gray-500">Sent:</span> {new Date(log.sent_at).toLocaleString().split(', ')[1]}</div>
                    <div><span className="text-gray-500 dark:text-gray-500">Status:</span> {log.claim_status_at_send}</div>
                  </div>
                  {log.error_message && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      Error: {log.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Automated Chaser Emails</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rules run daily automatically</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowLogs(true)}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logs</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-[#131d47] hover:bg-[#1a2660] rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs text-blue-900 dark:text-blue-300">
          <strong>How it works:</strong> Each rule is fully configurable — choose which Journey Statuses to chase, which 48-hour
          update timer (Case 48hrs / Client 48hrs / Either / Both) must be overdue, and how many hours after the timer goes Red to
          wait before sending. The first chaser sends when the timer is overdue by your chosen threshold; repeat chasers follow the
          Send Frequency up to the Max Sends limit. Bodyshop chasers include a secure update link and are logged in the claim's
          update history. Closed/invoiced claims are always skipped. Use <strong>Preview</strong> to see exactly who would be
          emailed without sending anything.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="text-center py-6 text-sm text-gray-400">Loading...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400">
            No rules configured
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className={`bg-white dark:bg-gray-900 rounded-lg border-2 p-3 pl-4 transition-all ${
                rule.is_active
                  ? 'border-l-green-500 border-l-4 border-t-gray-200 border-r-gray-200 border-b-gray-200 dark:border-t-gray-800 dark:border-r-gray-800 dark:border-b-gray-800'
                  : 'border-gray-300 dark:border-gray-700 border-l-4 border-l-gray-400 dark:border-l-gray-600 opacity-60'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{rule.rule_name}</h3>
                      {rule.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white flex-shrink-0 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-400 text-white flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>PAUSED
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Timer:</span> <span className="font-medium text-gray-900 dark:text-white">{rule.trigger_timer || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Wait:</span> <span className="font-medium text-gray-900 dark:text-white">{rule.hours_overdue_before_send || 0}h overdue</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">To:</span> <span className="font-medium text-gray-900 dark:text-white">{rule.recipient_type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Freq:</span> <span className="font-medium text-gray-900 dark:text-white">{rule.send_frequency}</span>
                      </div>
                    </div>
                    {rule.trigger_journey_statuses && rule.trigger_journey_statuses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rule.trigger_journey_statuses.map((s) => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{s}</span>
                        ))}
                      </div>
                    )}
                    {rule.total_loss_handling && rule.total_loss_handling !== 'Include' && (
                      <div className="mb-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          rule.total_loss_handling === 'Only'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}>
                          {rule.total_loss_handling === 'Only' ? 'Total Loss Only' : 'Excludes Total Loss'}
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                      Subject: {rule.email_subject_template}
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleSendTest(rule)}
                      className="p-1.5 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded transition-colors"
                      title="Send a real test email now (bypasses 48h wait)"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handlePreview(rule)}
                      disabled={previewingRuleId === rule.id}
                      className="p-1.5 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded transition-colors disabled:opacity-50"
                      title="Preview who would be emailed"
                    >
                      {previewingRuleId === rule.id ? <span className="text-[10px] px-1">...</span> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleRunNow(rule)}
                      disabled={runningRuleId === rule.id}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                      title="Run this rule now"
                    >
                      {runningRuleId === rule.id ? <span className="text-[10px] px-1">...</span> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`p-1.5 rounded transition-colors ${
                        rule.is_active
                          ? 'text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40'
                          : 'text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                      title={rule.is_active ? 'Deactivate (currently ACTIVE)' : 'Activate (currently PAUSED)'}
                    >
                      {rule.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewData && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewData(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-600" />
                  Dry Run Preview{previewData.rule_name ? ` · ${previewData.rule_name}` : ''}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {previewData.emails_sent} claim(s) would be emailed · {previewData.emails_skipped} skipped · {previewData.claims_evaluated} evaluated
                </p>
              </div>
              <button onClick={() => setPreviewData(null)} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              {previewData.preview && previewData.preview.length > 0 ? (
                <div className="space-y-2">
                  {previewData.preview.map((p, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{p.job_number}</span>
                          <span className="text-xs text-gray-500">{p.reg}</span>
                          {p.is_total_loss && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">Total Loss</span>
                          )}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">{p.journey_status || p.job_status}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <div><span className="text-gray-500">Rule:</span> {p.rule_name}</div>
                        <div><span className="text-gray-500">To:</span> {p.recipient_type} &lt;{p.recipient_email}&gt;</div>
                        <div><span className="text-gray-500">Client:</span> {p.client_name || '—'}</div>
                        <div><span className="text-gray-500">Timer:</span> {p.trigger_timer} · {p.hours_overdue}h overdue</div>
                        <div className="truncate text-gray-400 mt-1 italic">{p.email_subject}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  No claims would be emailed right now.
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreviewData(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {testModalRule && (
        <ChaserTestEmailModal rule={testModalRule} onClose={() => setTestModalRule(null)} />
      )}
    </div>
  );
}

function ChaserEmailRuleForm({ rule, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(rule || {
    rule_name: '',
    is_active: true,
    recipient_type: 'Bodyshop',
    custom_email: '',
    trigger_journey_statuses: [],
    total_loss_handling: 'Include',
    trigger_timer: 'Case 48hrs',
    hours_overdue_before_send: 0,
    email_subject_template: '',
    email_body_template: '',
    send_frequency: 'Daily',
    max_sends: 3,
    cc_emails: '',
    sort_order: 0,
  });

  const journeyStatuses = JOURNEY_STATUSES.map((s) => s.name);

  const toggleJourneyStatus = (status) => {
    const current = formData.trigger_journey_statuses || [];
    if (current.includes(status)) {
      setFormData({ ...formData, trigger_journey_statuses: current.filter((s) => s !== status) });
    } else {
      setFormData({ ...formData, trigger_journey_statuses: [...current, status] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const insertPlaceholder = (field, placeholder) => {
    const currentValue = formData[field] || '';
    setFormData({ ...formData, [field]: currentValue + placeholder });
  };

  const placeholders = [
    '{{claim.job_number}}',
    '{{claim.reg}}',
    '{{claim.client_name}}',
    '{{claim.make_model}}',
    '{{claim.insurer}}',
    '{{claim.referrer}}',
    '{{claim.claim_ref}}',
    '{{claim.bodyshop_update_link}}'
  ];

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="neomorph p-6 flex-shrink-0">
        <h1 className="text-2xl font-bold">{rule ? 'Edit' : 'New'} Chaser Email Rule</h1>
        <p className="text-sm text-gray-500 mt-1">Configure when and how chaser emails are sent</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="neomorph p-6 space-y-4">
            <h3 className="font-bold text-lg mb-4">Basic Settings</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Rule Name *</label>
              <Input
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                placeholder="e.g., Authority Reminder - 3 Days"
                required
                className="neomorph-inset"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Trigger Journey Statuses</label>
              <p className="text-xs text-gray-500 mb-2">Only chase claims in these Journey Statuses. Leave empty to chase all.</p>
              <div className="flex flex-wrap gap-2 neomorph-inset p-3">
                {journeyStatuses.map((status) => {
                  const selected = (formData.trigger_journey_statuses || []).includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleJourneyStatus(status)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        selected
                          ? 'bg-[#131d47] text-white border-[#131d47]'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Total Loss Handling</label>
              <p className="text-xs text-gray-500 mb-2">Control whether this rule applies to claims marked as total loss.</p>
              <select
                value={formData.total_loss_handling || 'Include'}
                onChange={(e) => setFormData({ ...formData, total_loss_handling: e.target.value })}
                className="neomorph-inset w-full px-4 py-3 border-0 rounded-xl"
              >
                <option value="Include">Include — fire for all matching claims (ignore total loss)</option>
                <option value="Exclude">Exclude — skip claims marked as total loss</option>
                <option value="Only">Only — fire only for claims marked as total loss</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Set repair-update chasers to "Exclude" and total-loss-specific chasers to "Only" to avoid overlap.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Trigger Timer *</label>
                <select
                  value={formData.trigger_timer}
                  onChange={(e) => setFormData({ ...formData, trigger_timer: e.target.value })}
                  className="neomorph-inset w-full px-4 py-3 border-0 rounded-xl"
                  required
                >
                  <option value="Case 48hrs">Case 48hrs (file update)</option>
                  <option value="Client 48hrs">Client 48hrs (client communication)</option>
                  <option value="Either">Either timer overdue</option>
                  <option value="Both">Both timers overdue</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Which 48-hour update timer must be overdue</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hours Overdue Before Send *</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.hours_overdue_before_send}
                  onChange={(e) => setFormData({ ...formData, hours_overdue_before_send: parseInt(e.target.value) || 0 })}
                  required
                  className="neomorph-inset"
                />
                <p className="text-xs text-gray-500 mt-1">Wait this many hours after the timer goes Red before sending (0 = immediately)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Send To *</label>
                <select
                  value={formData.recipient_type}
                  onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value })}
                  className="neomorph-inset w-full px-4 py-3 border-0 rounded-xl"
                  required
                >
                  <option value="Client">Client</option>
                  <option value="Referrer">Referrer</option>
                  <option value="Bodyshop">Bodyshop</option>
                  <option value="Insurer">Insurer</option>
                  <option value="File Handler">File Handler</option>
                  <option value="Custom Email">Custom Email</option>
                </select>
              </div>

              {formData.recipient_type === 'Custom Email' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Custom Email *</label>
                  <Input
                    type="email"
                    value={formData.custom_email}
                    onChange={(e) => setFormData({ ...formData, custom_email: e.target.value })}
                    placeholder="email@example.com"
                    required
                    className="neomorph-inset"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Send Frequency</label>
                <select
                  value={formData.send_frequency}
                  onChange={(e) => setFormData({ ...formData, send_frequency: e.target.value })}
                  className="neomorph-inset w-full px-4 py-3 border-0 rounded-xl"
                >
                  <option value="Once">Once Only</option>
                  <option value="Daily">Daily</option>
                  <option value="Every 3 Days">Every 3 Days</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Maximum Sends</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.max_sends}
                  onChange={(e) => setFormData({ ...formData, max_sends: parseInt(e.target.value) })}
                  className="neomorph-inset"
                />
                <p className="text-xs text-gray-500 mt-1">Limit number of chasers per claim</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CC Emails (optional)</label>
              <Input
                value={formData.cc_emails}
                onChange={(e) => setFormData({ ...formData, cc_emails: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                className="neomorph-inset"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
            </div>
          </div>

          <div className="neomorph p-6 space-y-4">
            <h3 className="font-bold text-lg mb-4">Email Content</h3>
            
            <div className="neomorph-inset p-4 bg-purple-50 mb-4">
              <p className="text-sm text-purple-800 mb-2">
                <strong>Available Placeholders:</strong> Click to insert
              </p>
              <p className="text-xs text-purple-600 mb-2">
                Tip: For Bodyshop recipients, use <code className="bg-purple-100 px-1 rounded">{'{{claim.bodyshop_update_link}}'}</code> to insert a secure, job-specific link the repairer can use to log their update directly into the system.
              </p>
              <div className="flex flex-wrap gap-2">
                {placeholders.map(placeholder => (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => {
                      const lastFocused = document.activeElement;
                      if (lastFocused?.name === 'email_subject_template') {
                        insertPlaceholder('email_subject_template', placeholder);
                      } else {
                        insertPlaceholder('email_body_template', placeholder);
                      }
                    }}
                    className="px-2 py-1 text-xs bg-purple-200 hover:bg-purple-300 rounded"
                  >
                    {placeholder}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Subject *</label>
              <Input
                name="email_subject_template"
                value={formData.email_subject_template}
                onChange={(e) => setFormData({ ...formData, email_subject_template: e.target.value })}
                placeholder="e.g., Reminder: Claim {{claim.job_number}} requires action"
                required
                className="neomorph-inset"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Body *</label>
              <Textarea
                name="email_body_template"
                value={formData.email_body_template}
                onChange={(e) => setFormData({ ...formData, email_body_template: e.target.value })}
                placeholder="Dear Team,&#10;&#10;This is a reminder regarding claim {{claim.job_number}} for {{claim.client_name}}.&#10;&#10;The claim has been in '{{claim.job_status}}' status for several days and requires your attention.&#10;&#10;Best regards,&#10;Artura Claims Team"
                required
                className="neomorph-inset h-48"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pb-4">
            <Button type="button" onClick={onCancel} className="neomorph-flat">
              Cancel
            </Button>
            <Button type="submit" className="neomorph-flat bg-accent/10 text-accent">
              {rule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
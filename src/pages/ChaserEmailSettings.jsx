import LoadingRows from '@/components/shared/LoadingRows';
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Play, History, Power, PowerOff, Eye, X, Send } from 'lucide-react';
import ChaserTestEmailModal from '@/components/settings/ChaserTestEmailModal';
import ChaserConditionBuilder, { migrateLegacyConditions, summarizeConditions } from '@/components/settings/ChaserConditionBuilder';
import { askConfirm, notify, warn } from '@/lib/dialogs';

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
      notify(`"${rule.rule_name}" processed`, `Sent ${result.data.emails_sent} · skipped ${result.data.emails_skipped} · failed ${result.data.errors}`);
      queryClient.invalidateQueries({ queryKey: ['chaserEmailLogs'] });
    } catch (error) {
      warn(`Error: ${error.message}`);
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
      warn(`Error: ${error.message}`);
    } finally {
      setPreviewingRuleId(null);
    }
  };

  const handleDelete = async (rule) => {
    if (await askConfirm(`Are you sure you want to delete the rule "${rule.rule_name}"?`)) {
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
          <h1 className="text-[15px] font-semibold text-foreground">Chaser email log</h1>
          <button onClick={() => setShowLogs(false)} className="px-3 py-1.5 text-sm font-medium text-muted-foreground bg-card border border-border hover:bg-muted rounded-lg transition-colors">
            Back
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {recentLogs.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No logs found
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="bg-card rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-medium text-foreground truncate">{log.rule_name}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      log.status === 'Sent' ? 'bg-success-bg text-success-fg' :
                      log.status === 'Failed' ? 'bg-danger-bg text-danger-fg' :
                      'bg-muted text-foreground'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div><span className="text-muted-foreground">To:</span> {log.recipient_email}</div>
                    <div><span className="text-muted-foreground">Type:</span> {log.recipient_type}</div>
                    <div><span className="text-muted-foreground">Sent:</span> {new Date(log.sent_at).toLocaleString().split(', ')[1]}</div>
                    <div><span className="text-muted-foreground">Status:</span> {log.claim_status_at_send}</div>
                  </div>
                  {log.error_message && (
                    <div className="mt-2 text-xs text-danger-fg">
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
          <h1 className="text-[15px] font-semibold text-foreground">Automatic chaser emails</h1>
          <p className="text-xs text-muted-foreground mt-1">Rules run daily automatically</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowLogs(true)}
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground bg-card border border-border hover:bg-muted rounded-lg flex items-center gap-2 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logs</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      <div className="bg-info-bg border border-info/30 rounded-lg p-3">
        <p className="text-xs text-info-fg">
          <strong>How it works:</strong> Each rule is fully programmable — set <strong>Fire only if</strong> conditions (all must
          be true) and <strong>Skip if</strong> conditions (any true skips the claim), choose which 48-hour update timer must be
          overdue, and how long to wait after it goes Red. Conditions are evaluated against the claim's real state (on-site and
          total loss are derived from dates, not just status labels), so they stay accurate even when statuses lag behind. Repeat
          chasers follow the Send Frequency up to the Max Sends limit. Bodyshop chasers include a secure update link and are logged
          in the claim's update history. Closed/invoiced claims are always skipped. Use <strong>Preview</strong> to see exactly
          who would be emailed without sending anything.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <LoadingRows label="Loading chaser emails" />
        ) : rules.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No rules configured
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className={`bg-card rounded-lg border-2 p-3 pl-4 transition-all ${
                rule.is_active
                  ? 'border-l-green-500 border-l-4 border-t-border border-r-border border-b-border'
                  : 'border-border border-l-4 border-l-muted-foreground/40 opacity-60'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">{rule.rule_name}</h3>
                      {rule.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-success text-on-solid flex-shrink-0 shadow-card">
                          <span className="w-1.5 h-1.5 rounded-full bg-card animate-pulse"></span>ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-card"></span>PAUSED
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-muted-foreground">Timer:</span> <span className="font-medium text-foreground">{rule.trigger_timer || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Wait:</span> <span className="font-medium text-foreground">{rule.hours_overdue_before_send || 0}h overdue</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To:</span> <span className="font-medium text-foreground">{rule.recipient_type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Freq:</span> <span className="font-medium text-foreground">{rule.send_frequency}</span>
                      </div>
                    </div>
                    {(() => {
                      const { include_conditions, exclude_conditions } = migrateLegacyConditions(rule);
                      const incSum = summarizeConditions(include_conditions);
                      const excSum = summarizeConditions(exclude_conditions);
                      if (!incSum.length && !excSum.length) return null;
                      return (
                        <div className="flex flex-col gap-1 mb-2">
                          {incSum.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-xs font-semibold text-muted-foreground">Fire:</span>
                              {incSum.map((s, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-info-bg text-info-fg">{s}</span>
                              ))}
                            </div>
                          )}
                          {excSum.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-xs font-semibold text-muted-foreground">Skip:</span>
                              {excSum.map((s, i) => (
                                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-danger-bg text-danger-fg">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="text-xs text-muted-foreground line-clamp-1">
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
                      className="p-1.5 text-warning-fg hover:bg-warning-bg rounded transition-colors disabled:opacity-50"
                      title="Preview who would be emailed"
                    >
                      {previewingRuleId === rule.id ? <span className="text-xs px-1">...</span> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleRunNow(rule)}
                      disabled={runningRuleId === rule.id}
                      className="p-1.5 text-info-fg hover:bg-info-bg rounded transition-colors disabled:opacity-50"
                      title="Run this rule now"
                    >
                      {runningRuleId === rule.id ? <span className="text-xs px-1">...</span> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`p-1.5 rounded transition-colors ${
                        rule.is_active
                          ? 'text-success-fg bg-success-bg hover:bg-success-bg'
                          : 'text-muted-foreground bg-muted hover:bg-accent'
                      }`}
                      title={rule.is_active ? 'Deactivate (currently ACTIVE)' : 'Activate (currently PAUSED)'}
                    >
                      {rule.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule)}
                      className="p-1.5 text-muted-foreground hover:text-danger-fg hover:bg-danger-bg rounded transition-colors"
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
        <div data-overlay-dismiss className="fixed inset-0 z-window fm-scrim flex items-center justify-center p-4" onClick={() => setPreviewData(null)} data-mobile-full-modal="true">
          <div className="fm-glass-window rounded-2xl text-foreground w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-warning-fg" />
                  Dry Run Preview{previewData.rule_name ? ` · ${previewData.rule_name}` : ''}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {previewData.emails_sent} claim(s) would be emailed · {previewData.emails_skipped} skipped · {previewData.claims_evaluated} evaluated
                </p>
              </div>
              <button onClick={() => setPreviewData(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              {previewData.preview && previewData.preview.length > 0 ? (
                <div className="space-y-2">
                  {previewData.preview.map((p, i) => (
                    <div key={i} className="bg-muted rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{p.job_number}</span>
                          <span className="text-xs text-muted-foreground">{p.reg}</span>
                          {p.is_total_loss && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-warning-bg text-warning-fg font-medium">Total Loss</span>
                          )}
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-info-bg text-info-fg flex-shrink-0">{p.journey_status || p.job_status}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div><span className="text-muted-foreground">Rule:</span> {p.rule_name}</div>
                        <div><span className="text-muted-foreground">To:</span> {p.recipient_type} &lt;{p.recipient_email}&gt;</div>
                        <div><span className="text-muted-foreground">Client:</span> {p.client_name || '—'}</div>
                        <div><span className="text-muted-foreground">Timer:</span> {p.trigger_timer} · {p.hours_overdue}h overdue</div>
                        <div className="truncate text-muted-foreground mt-1 italic">{p.email_subject}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No claims would be emailed right now.
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
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
  const [formData, setFormData] = useState(() => {
    if (rule) {
      // Migrate legacy journey-status / total-loss fields into the new
      // condition model on first edit, then clear the legacy fields so the
      // backend doesn't double-apply them.
      const { include_conditions, exclude_conditions } = migrateLegacyConditions(rule);
      return {
        ...rule,
        include_conditions,
        exclude_conditions,
        trigger_journey_statuses: [],
        total_loss_handling: 'Include',
      };
    }
    return {
      rule_name: '',
      is_active: true,
      recipient_type: 'Bodyshop',
      custom_email: '',
      include_conditions: [],
      exclude_conditions: [],
      trigger_timer: 'Case 48hrs',
      hours_overdue_before_send: 0,
      email_subject_template: '',
      email_body_template: '',
      send_frequency: 'Daily',
      max_sends: 3,
      cc_emails: '',
      sort_order: 0,
    };
  });

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
        <h1 className="text-[17px] font-semibold">{rule ? 'Edit' : 'New'} chaser email rule</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure when and how chaser emails are sent</p>
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

            <div className="neomorph-inset p-4 rounded-xl space-y-4">
              <p className="text-xs text-muted-foreground">
                Build the eligibility logic for this rule. Conditions are evaluated against the claim's real state
                (e.g. on-site is derived from dates, not just the status label), so they stay accurate even when
                statuses lag behind.
              </p>
              <ChaserConditionBuilder
                conditions={formData.include_conditions}
                onChange={(c) => setFormData({ ...formData, include_conditions: c })}
                mode="include"
              />
              <div className="border-t border-border pt-4">
                <ChaserConditionBuilder
                  conditions={formData.exclude_conditions}
                  onChange={(c) => setFormData({ ...formData, exclude_conditions: c })}
                  mode="exclude"
                />
              </div>
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
                <p className="text-xs text-muted-foreground mt-1">Which 48-hour update timer must be overdue</p>
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
                <p className="text-xs text-muted-foreground mt-1">Wait this many hours after the timer goes Red before sending (0 = immediately)</p>
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
                <p className="text-xs text-muted-foreground mt-1">Limit number of chasers per claim</p>
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
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
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
            <Button type="submit" className="neomorph-flat bg-primary/10 text-primary">
              {rule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
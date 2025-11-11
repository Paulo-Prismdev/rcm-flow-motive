import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Play, History, Power, PowerOff } from 'lucide-react';

export default function ChaserEmailSettings() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
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

  const handleRunNow = async () => {
    setIsRunning(true);
    try {
      const result = await base44.functions.invoke('processChaserEmails');
      alert(`Chaser emails processed!\n\nSent: ${result.data.emails_sent}\nSkipped: ${result.data.emails_skipped}\nFailed: ${result.data.emails_failed}`);
      queryClient.invalidateQueries({ queryKey: ['chaserEmailLogs'] });
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
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
      <div className="h-full flex flex-col gap-4">
        <div className="neomorph p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Chaser Email Logs</h1>
              <p className="text-sm text-gray-500 mt-1">Recent chaser email activity</p>
            </div>
            <Button onClick={() => setShowLogs(false)} className="neomorph-flat">
              Back to Rules
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="space-y-2">
            {recentLogs.length === 0 ? (
              <div className="neomorph p-12 text-center text-gray-500">
                No logs found yet
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="neomorph p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold">{log.rule_name}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${
                          log.status === 'Sent' ? 'bg-green-100 text-green-700' :
                          log.status === 'Failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">To:</span> {log.recipient_email}
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span> {log.recipient_type}
                        </div>
                        <div>
                          <span className="text-gray-500">Sent:</span> {new Date(log.sent_at).toLocaleString()}
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span> {log.claim_status_at_send} ({log.days_in_status_at_send} days)
                        </div>
                      </div>
                      {log.error_message && (
                        <div className="mt-2 text-sm text-red-600">
                          Error: {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="neomorph p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Automated Chaser Emails</h1>
            <p className="text-sm text-gray-500 mt-1">Configure automatic email reminders for claims in specific statuses</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowLogs(true)}
              className="neomorph-flat flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              View Logs
            </Button>
            <Button
              onClick={handleRunNow}
              disabled={isRunning}
              className="neomorph-flat flex items-center gap-2 bg-blue-50"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run Now'}
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="neomorph-flat bg-accent/10 text-accent flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </Button>
          </div>
        </div>

        <div className="neomorph-inset p-4 bg-blue-50">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> These rules run automatically once per day. When a claim stays in a specific status for the configured number of days, an email is automatically sent to the specified recipient. You can also run the checker manually using the "Run Now" button above.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        <div className="space-y-2">
          {isLoading ? (
            <div className="neomorph p-12 text-center text-gray-500">Loading rules...</div>
          ) : rules.length === 0 ? (
            <div className="neomorph p-12 text-center">
              <p className="text-gray-500 mb-4">No chaser email rules configured yet</p>
              <Button onClick={() => setShowForm(true)} className="neomorph-flat">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Rule
              </Button>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className={`neomorph p-4 ${!rule.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{rule.rule_name}</h3>
                      {rule.is_active ? (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Inactive</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Trigger:</span> <strong>{rule.trigger_status}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">After:</span> <strong>{rule.days_in_status} days</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">Send to:</span> <strong>{rule.recipient_type}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">Frequency:</span> <strong>{rule.send_frequency}</strong>
                      </div>
                    </div>

                    <div className="neomorph-inset p-3 text-sm">
                      <div className="mb-2">
                        <span className="text-gray-500">Subject:</span> <span className="ml-2">{rule.email_subject_template}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Body:</span>
                        <div className="ml-2 mt-1 text-gray-600 whitespace-pre-wrap line-clamp-2">
                          {rule.email_body_template}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleToggleActive(rule)}
                      className="neomorph-flat p-2"
                      title={rule.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {rule.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={() => setEditingRule(rule)}
                      className="neomorph-flat p-2"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(rule)}
                      className="neomorph-flat p-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ChaserEmailRuleForm({ rule, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(rule || {
    rule_name: '',
    is_active: true,
    trigger_status: 'Awaiting Authority',
    days_in_status: 3,
    recipient_type: 'Client',
    custom_email: '',
    email_subject_template: '',
    email_body_template: '',
    send_frequency: 'Once',
    max_sends: 3,
    cc_emails: '',
    sort_order: 0,
  });

  const { data: customStatuses = [] } = useQuery({
    queryKey: ['ClaimStatusConfig'],
    queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'),
  });

  const availableStatuses = React.useMemo(() => {
    const active = customStatuses
      .filter(s => s.is_active)
      .map(s => s.status_name);
    if (!active.includes('New')) {
      return ['New', ...active];
    }
    return active;
  }, [customStatuses]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const insertPlaceholder = (field, placeholder) => {
    const currentValue = formData[field] || '';
    setFormData({ ...formData, [field]: currentValue + placeholder });
  };

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Trigger Status *</label>
                <select
                  value={formData.trigger_status}
                  onChange={(e) => setFormData({ ...formData, trigger_status: e.target.value })}
                  className="neomorph-inset w-full px-4 py-3 border-0 rounded-xl"
                  required
                >
                  {availableStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Claims in this status will trigger the rule</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Days in Status *</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.days_in_status}
                  onChange={(e) => setFormData({ ...formData, days_in_status: parseInt(e.target.value) })}
                  required
                  className="neomorph-inset"
                />
                <p className="text-xs text-gray-500 mt-1">Send email after this many days</p>
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
              <div className="flex flex-wrap gap-2">
                {['{{claim.job_number}}', '{{claim.reg}}', '{{claim.client_name}}', '{{claim.make_model}}', '{{claim.insurer}}', '{{claim.referrer}}', '{{claim.claim_ref}}''].map(placeholder => (
                  <button
                    key={placeholder}
                    type="button"
                    onClick={() => {
                      // Insert into subject or body based on which field was last focused
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
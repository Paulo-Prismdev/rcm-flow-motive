import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X, Clock, User, Calendar, Mail } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UPDATE_TYPES = [
  "Status Change",
  "Client Communication",
  "Bodyshop Communication",
  "Insurer Communication",
  "Action Taken",
  "Awaiting Information",
  "Documentation Received",
  "Parts Update",
  "Repair Progress",
  "Quality Check",
  "Other"
];

const UPDATE_TYPE_COLORS = {
  "Status Change": "bg-purple-500",
  "Client Communication": "bg-blue-500",
  "Bodyshop Communication": "bg-green-500",
  "Insurer Communication": "bg-orange-500",
  "Action Taken": "bg-indigo-500",
  "Awaiting Information": "bg-yellow-500",
  "Documentation Received": "bg-teal-500",
  "Parts Update": "bg-pink-500",
  "Repair Progress": "bg-cyan-500",
  "Quality Check": "bg-emerald-500",
  "Other": "bg-gray-500"
};

export default function ClaimUpdatesModal({ claimId, currentStatus, isOpen, onClose, onUpdateCreated }) {
  const [newUpdate, setNewUpdate] = useState({
    update_type: 'Other',
    description: '',
    next_steps: '',
    due_date_for_next_action: '',
    new_status: currentStatus || ''
  });
  const [sendEmail, setSendEmail] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);

  const queryClient = useQueryClient();

  // Fetch custom claim statuses
  const { data: customStatuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['ClaimStatusConfig'],
    queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'),
    staleTime: 5 * 60 * 1000,
  });

  // Get active statuses sorted by sort_order
  const activeStatuses = React.useMemo(() => {
    return customStatuses
      .filter(s => s.is_active)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(s => s.status_name);
  }, [customStatuses]);

  const { data: claim } = useQuery({
    queryKey: ['claim', claimId],
    queryFn: async () => {
      const allClaims = await base44.entities.Claim.list();
      return allClaims.find(c => c.id === claimId);
    },
    enabled: isOpen && !!claimId,
  });

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['claimUpdates', claimId],
    queryFn: async () => {
      const allUpdates = await base44.entities.ClaimUpdate.list('-created_date', 1000);
      return allUpdates.filter(u => u.claim_id === claimId);
    },
    enabled: isOpen && !!claimId,
  });

  const createUpdateMutation = useMutation({
    mutationFn: (updateData) => base44.entities.ClaimUpdate.create({
      ...updateData,
      claim_id: claimId
    }),
    onSuccess: (newUpdateRecord) => {
      queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] });
      
      // If status was changed, notify parent with the new status
      if (newUpdate.update_type === 'Status Change' && newUpdate.new_status) {
        if (onUpdateCreated) {
          onUpdateCreated(newUpdate.new_status);
        }
      } else {
        // Otherwise just notify of update
        if (onUpdateCreated) {
          onUpdateCreated();
        }
      }
      
      setNewUpdate({
        update_type: 'Other',
        description: '',
        next_steps: '',
        due_date_for_next_action: '',
        new_status: currentStatus || ''
      });
      setSendEmail(false);
      setSelectedEmails([]);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newUpdate.description.trim()) return;

    let finalDescription = newUpdate.description;

    // If send email is checked and emails are selected, open mailto link
    if (sendEmail && selectedEmails.length > 0) {
      // Prepare email content
      const emailSubject = `Claim Update: ${claim?.reg || 'Unknown Vehicle'} - ${newUpdate.update_type}`;
      const emailBody = `
This is an update for claim: ${claim?.reg || 'Unknown Vehicle'}

Update Type: ${newUpdate.update_type}
${newUpdate.update_type === 'Status Change' ? `New Status: ${newUpdate.new_status}\n` : ''}

Update Details:
${newUpdate.description}

${newUpdate.next_steps ? `Next Steps:\n${newUpdate.next_steps}\n` : ''}
${newUpdate.due_date_for_next_action ? `Due Date: ${format(new Date(newUpdate.due_date_for_next_action), 'dd/MM/yyyy')}\n` : ''}

---
This update was sent from ART-TEC One Claims Management System
      `.trim();

      // Create mailto link
      const mailtoLink = `mailto:${selectedEmails.join(',')}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open in Outlook/default email client
      window.location.href = mailtoLink;

      // Get email labels for the description
      const availableEmails = getAvailableEmails();
      const emailLabels = selectedEmails.map(email => {
        const emailInfo = availableEmails.find(e => e.email === email);
        return emailInfo ? emailInfo.label : email;
      });

      // Add email info to description
      finalDescription = `${newUpdate.description}\n\n[Emailed to: ${emailLabels.join(', ')}]`;
    }
    
    // Remove new_status from the update data as it's not part of ClaimUpdate entity
    const { new_status, ...updateDataToSave } = newUpdate;
    
    // Use the final description with email info
    updateDataToSave.description = finalDescription;
    
    createUpdateMutation.mutate(updateDataToSave);
  };

  // Update new_status when currentStatus changes
  React.useEffect(() => {
    setNewUpdate(prev => ({ ...prev, new_status: currentStatus || '' }));
  }, [currentStatus]);

  // Get available email addresses from the claim
  const getAvailableEmails = () => {
    if (!claim) return [];
    
    const emails = [];
    
    if (claim.client_email) {
      emails.push({ label: `Client: ${claim.client_name || 'Unknown'}`, email: claim.client_email });
    }
    
    if (claim.referrer_email) {
      emails.push({ label: `Referrer: ${claim.referrer || 'Unknown'}`, email: claim.referrer_email });
    }
    
    if (claim.bodyshop_email) {
      emails.push({ label: `Bodyshop: ${claim.bodyshop || 'Unknown'}`, email: claim.bodyshop_email });
    }
    
    return emails;
  };

  const availableEmails = getAvailableEmails();

  const toggleEmailSelection = (email) => {
    setSelectedEmails(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-elevated max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Official Updates - Activity Log
          </DialogTitle>
          <p className="text-xs text-foreground-muted mt-1">
            These updates reset the 48-hour tracking timer and create an audit trail
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* New Update Form */}
          <div className="glass-elevated p-4 border-l-4 border-accent">
            <h3 className="font-semibold mb-3 text-sm">Add New Update</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Update Type *</label>
                <select
                  value={newUpdate.update_type}
                  onChange={(e) => setNewUpdate({ ...newUpdate, update_type: e.target.value })}
                  className="glass-inset w-full px-3 py-2 text-sm border-0 rounded-lg"
                  required
                >
                  {UPDATE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Show status dropdown when Status Change is selected */}
              {newUpdate.update_type === 'Status Change' && (
                <div>
                  <label className="block text-xs text-foreground-muted mb-1">New Status *</label>
                  {isLoadingStatuses ? (
                    <div className="glass-inset px-3 py-2 text-sm text-foreground-muted">
                      Loading statuses...
                    </div>
                  ) : activeStatuses.length === 0 ? (
                    <div className="glass-inset px-3 py-2 text-sm text-foreground-muted">
                      No statuses configured. Please add statuses in Settings.
                    </div>
                  ) : (
                    <select
                      value={newUpdate.new_status}
                      onChange={(e) => setNewUpdate({ ...newUpdate, new_status: e.target.value })}
                      className="glass-inset w-full px-3 py-2 text-sm border-0 rounded-lg"
                      required
                    >
                      <option value="">Select status...</option>
                      {activeStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-foreground-subtle mt-1">
                    Current status: <span className="font-medium">{currentStatus || 'Not set'}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs text-foreground-muted mb-1">What was done? *</label>
                <Textarea
                  value={newUpdate.description}
                  onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                  placeholder="Describe the action taken, communication made, or status change..."
                  className="glass-inset px-3 py-2 text-sm border-0 h-24"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-foreground-muted mb-1">Next Steps (Optional)</label>
                <Textarea
                  value={newUpdate.next_steps}
                  onChange={(e) => setNewUpdate({ ...newUpdate, next_steps: e.target.value })}
                  placeholder="What needs to happen next..."
                  className="glass-inset px-3 py-2 text-sm border-0 h-20"
                />
              </div>

              <div>
                <label className="block text-xs text-foreground-muted mb-1">Due Date for Next Action (Optional)</label>
                <Input
                  type="date"
                  value={newUpdate.due_date_for_next_action}
                  onChange={(e) => setNewUpdate({ ...newUpdate, due_date_for_next_action: e.target.value })}
                  className="glass-inset px-3 py-2 text-sm border-0"
                />
              </div>

              {/* Email Section */}
              {availableEmails.length > 0 && (
                <div className="glass-inset p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="send_email"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="send_email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-accent" />
                      Open email to send this update
                    </label>
                  </div>

                  {sendEmail && (
                    <div className="space-y-2 pl-6">
                      <p className="text-xs text-foreground-muted">Select recipients (will open in Outlook):</p>
                      {availableEmails.map(({ label, email }) => (
                        <div key={email} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`email_${email}`}
                            checked={selectedEmails.includes(email)}
                            onChange={() => toggleEmailSelection(email)}
                            className="w-4 h-4"
                          />
                          <label htmlFor={`email_${email}`} className="text-xs">
                            {label} ({email})
                          </label>
                        </div>
                      ))}
                      <p className="text-[10px] text-foreground-subtle mt-2 italic">
                        Note: This will open your default email client with a pre-filled message. You can review and edit before sending.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setNewUpdate({
                      update_type: 'Other',
                      description: '',
                      next_steps: '',
                      due_date_for_next_action: '',
                      new_status: currentStatus || ''
                    });
                    setSendEmail(false);
                    setSelectedEmails([]);
                  }}
                  className="glass-button px-4 py-2 text-xs"
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  disabled={createUpdateMutation.isLoading || !newUpdate.description.trim()}
                  className="glass-button px-4 py-2 text-xs text-accent"
                >
                  {createUpdateMutation.isLoading ? 'Adding...' : 'Add Update'}
                </Button>
              </div>
            </form>
          </div>

          {/* Updates Timeline */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Update History</h3>
            {isLoading ? (
              <div className="glass-inset p-4 text-center text-sm text-foreground-muted">
                Loading updates...
              </div>
            ) : updates.length === 0 ? (
              <div className="glass-inset p-4 text-center text-sm text-foreground-muted">
                No updates yet. Add the first official update above.
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="glass-elevated p-4 border-l-4"
                    style={{ borderLeftColor: UPDATE_TYPE_COLORS[update.update_type] || '#6B7280' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-medium text-white ${UPDATE_TYPE_COLORS[update.update_type] || 'bg-gray-500'}`}
                        >
                          {update.update_type}
                        </span>
                        <span className="text-[10px] text-foreground-subtle flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(update.created_date), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm mb-2">
                      <p className="font-medium mb-1">Update:</p>
                      <p className="text-foreground-muted whitespace-pre-wrap">{update.description}</p>
                    </div>

                    {update.next_steps && (
                      <div className="text-sm mb-2">
                        <p className="font-medium mb-1">Next Steps:</p>
                        <p className="text-foreground-muted whitespace-pre-wrap">{update.next_steps}</p>
                      </div>
                    )}

                    {update.due_date_for_next_action && (
                      <div className="text-xs text-foreground-subtle flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3" />
                        Due: {format(new Date(update.due_date_for_next_action), 'dd/MM/yyyy')}
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-2 text-[10px] text-foreground-subtle">
                      <User className="w-3 h-3" />
                      {update.created_by}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose} className="glass-button px-4 py-2">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
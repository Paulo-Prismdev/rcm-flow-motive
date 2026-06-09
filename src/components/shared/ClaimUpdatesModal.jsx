import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X, Clock, User, Calendar, Mail, Plus } from 'lucide-react';
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
  "Referrer Response",
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
  "Referrer Response": "bg-amber-500",
  "Action Taken": "bg-indigo-500",
  "Awaiting Information": "bg-yellow-500",
  "Documentation Received": "bg-teal-500",
  "Parts Update": "bg-pink-500",
  "Repair Progress": "bg-cyan-500",
  "Quality Check": "bg-emerald-500",
  "Other": "bg-gray-500"
};

export default function ClaimUpdatesModal({ claimId, currentStatus, isOpen, onClose, onUpdateCreated }) {
   const [showForm, setShowForm] = useState(false);
   const [newUpdate, setNewUpdate] = useState({
     update_type: 'Other',
     description: '',
     next_steps: '',
     due_date_for_next_action: '',
     new_status: currentStatus || '',
     new_secondary_status: ''
   });
   const [sendEmail, setSendEmail] = useState(false);
   const [selectedEmails, setSelectedEmails] = useState([]);
   const [submitError, setSubmitError] = useState('');

   const queryClient = useQueryClient();

   // Fetch custom claim statuses
   const { data: customStatuses = [], isLoading: isLoadingStatuses } = useQuery({
     queryKey: ['ClaimStatusConfig'],
     queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'),
     staleTime: 5 * 60 * 1000,
   });

   // Fetch claim data - use get instead of list+filter
   const { data: claim } = useQuery({
     queryKey: ['claim', claimId],
     queryFn: () => base44.entities.Claim.get(claimId),
     enabled: isOpen && !!claimId,
     staleTime: 30000,
   });

   // Get active statuses sorted by sort_order
   const activeStatuses = useMemo(() => {
     return customStatuses
       .filter(s => s.is_active)
       .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
       .map(s => s.status_name);
   }, [customStatuses]);



  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['claimUpdates', claimId],
    queryFn: () => base44.entities.ClaimUpdate.filter({ claim_id: claimId }, '-created_date', 500),
    enabled: isOpen && !!claimId,
    staleTime: 0,
  });

  const updateClaimMutation = useMutation({
    mutationFn: (claimData) => base44.entities.Claim.update(claimId, claimData),
  });

  const createUpdateMutation = useMutation({
    mutationFn: (updateData) => base44.entities.ClaimUpdate.create({
      ...updateData,
      claim_id: claimId
    }),
    onSuccess: (newUpdateRecord) => {
      queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] });
      
      // If status was changed, notify parent with the new status and secondary status
      if (newUpdate.update_type === 'Status Change' && newUpdate.new_status) {
        if (onUpdateCreated) {
          onUpdateCreated(newUpdate.new_status, newUpdate.new_secondary_status || null);
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
        new_status: currentStatus || '',
        new_secondary_status: ''
      });
      setSendEmail(false);
      setSelectedEmails([]);
      setShowForm(false);
    },
    onError: (error) => {
      console.error('Failed to create update:', error);
      setSubmitError(error?.message || 'Failed to create update. Please try again.');
    },
  });

  const handleSubmit = async (e) => {
    console.log('[ClaimUpdatesModal] handleSubmit fired', { update_type: newUpdate.update_type, description: newUpdate.description });
    e.preventDefault();
    setSubmitError('');
    
    try {

    if (!newUpdate.description.trim()) {
      setSubmitError('Please enter a description for the update.');
      return;
    }

    let finalDescription = newUpdate.description;

    // If send email is checked and emails are selected, open mailto link
    if (sendEmail && selectedEmails.length > 0) {
      // Prepare email content
      const emailSubject = `Claim Update: ${claim?.reg || 'Unknown Vehicle'} - ${newUpdate.update_type}`;
      const emailBody = `
This is an update for claim: ${claim?.reg || 'Unknown Vehicle'}

Update Type: ${newUpdate.update_type}
${newUpdate.update_type === 'Status Change' ? `New Primary Status: ${newUpdate.new_status}${newUpdate.new_secondary_status ? `\nNew Secondary Status: ${newUpdate.new_secondary_status}` : ''}` : ''}

Update Details:
${newUpdate.description}

${newUpdate.next_steps ? `Next Steps:\n${newUpdate.next_steps}\n` : ''}
${newUpdate.due_date_for_next_action ? `Due Date: ${format(new Date(newUpdate.due_date_for_next_action), 'dd/MM/yyyy')}\n` : ''}

---
This update was sent from ART-TEC One Claims Management System
      `.trim();

      // Create mailto link
      const mailtoLink = `mailto:${selectedEmails.join(',')}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open in Outlook/default email client (use open to avoid navigating away)
      window.open(mailtoLink, '_blank');

      // Get email labels for the description
      const availableEmails = getAvailableEmails();
      const emailLabels = selectedEmails.map(email => {
        const emailInfo = availableEmails.find(e => e.email === email);
        return emailInfo ? emailInfo.label : email;
      });

      // Add email info to description
      finalDescription = `${newUpdate.description}\n\n[Emailed to: ${emailLabels.join(', ')}]`;
    }
    
    // Remove new_status and new_secondary_status from the update data as they're not part of ClaimUpdate entity
    const { new_status, new_secondary_status, ...updateDataToSave } = newUpdate;
    
    // Use the final description with email info
    updateDataToSave.description = finalDescription;

    // Prepend status change info to description if not already present
    if (newUpdate.update_type === 'Status Change' && new_status) {
      const secondaryNote = new_secondary_status ? ` | Secondary: "${new_secondary_status}"` : (claim?.secondary_status ? ` | Secondary status cleared` : '');
      const statusLine = `Status changed to "${new_status}"${secondaryNote}`;
      updateDataToSave.description = `${statusLine}\n\n${updateDataToSave.description}`.trim();
    }
    
    // If this is a status change, update the claim's status fields
    if (newUpdate.update_type === 'Status Change' && new_status) {
      updateClaimMutation.mutate(
        { 
          job_status: new_status,
          secondary_status: new_secondary_status || null
        },
        {
          onSuccess: () => {
            // After claim is updated, create the update record
            createUpdateMutation.mutate(updateDataToSave);
          }
        }
      );
    } else {
      createUpdateMutation.mutate(updateDataToSave);
    }

    } catch (err) {
      console.error('[ClaimUpdatesModal] handleSubmit crashed:', err);
      setSubmitError(err?.message || 'An unexpected error occurred. Check the console for details.');
    }
  };

  // Update new_status when currentStatus changes
  useEffect(() => {
    setNewUpdate(prev => ({ 
      ...prev, 
      new_status: currentStatus || '',
      new_secondary_status: claim?.secondary_status || ''
    }));
  }, [currentStatus, claim?.secondary_status]);

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

  // Validate claimId exists
  if (!claimId) {
    console.error('ClaimUpdatesModal: claimId is missing');
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Clock className="w-5 h-5 text-primary" />
            Official Updates - Activity Log
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            These updates reset the 48-hour tracking timer and create an audit trail
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Add Update Button or Form */}
           {!showForm ? (
             <div className="pb-4">
               <Button
                 onClick={() => setShowForm(true)}
                 className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2"
               >
                 <Plus className="w-4 h-4" />
                 Add New Update
               </Button>
             </div>
           ) : (
           <div className="bg-muted/30 border border-border rounded-lg p-4 border-l-4 border-l-primary">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-foreground">Add New Update</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                    setShowForm(false);
                    setSubmitError('');
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
                  className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Update Type *</label>
                <select
                  value={newUpdate.update_type}
                  onChange={(e) => setNewUpdate({ ...newUpdate, update_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                  required
                >
                  {UPDATE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Show status dropdowns when Status Change is selected */}
              {newUpdate.update_type === 'Status Change' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">New Primary Status *</label>
                    {isLoadingStatuses ? (
                      <div className="bg-muted/30 px-3 py-2 text-sm text-muted-foreground rounded-lg border border-border">
                        Loading statuses...
                      </div>
                    ) : activeStatuses.length === 0 ? (
                      <div className="bg-muted/30 px-3 py-2 text-sm text-muted-foreground rounded-lg border border-border">
                        No statuses configured. Please add statuses in Settings.
                      </div>
                    ) : (
                      <select
                        value={newUpdate.new_status}
                        onChange={(e) => setNewUpdate({ ...newUpdate, new_status: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                        required
                      >
                        <option value="">Select status...</option>
                        {activeStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Current primary status: <span className="font-medium">{currentStatus || 'Not set'}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">New Secondary Status (Optional)</label>
                    <select
                      value={newUpdate.new_secondary_status}
                      onChange={(e) => setNewUpdate({ ...newUpdate, new_secondary_status: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
                    >
                      <option value="">No secondary status</option>
                      {activeStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use secondary status for additional tracking (e.g., "Awaiting Parts", "At Repairer")
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-muted-foreground mb-1">What was done? *</label>
                <Textarea
                  value={newUpdate.description}
                  onChange={(e) => setNewUpdate({ ...newUpdate, description: e.target.value })}
                  placeholder="Describe the action taken, communication made, or status change..."
                  className="px-3 py-2 text-sm bg-background border border-border h-24"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Next Steps (Optional)</label>
                <Textarea
                  value={newUpdate.next_steps}
                  onChange={(e) => setNewUpdate({ ...newUpdate, next_steps: e.target.value })}
                  placeholder="What needs to happen next..."
                  className="px-3 py-2 text-sm bg-background border border-border h-20"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Due Date for Next Action (Optional)</label>
                <Input
                  type="date"
                  value={newUpdate.due_date_for_next_action}
                  onChange={(e) => setNewUpdate({ ...newUpdate, due_date_for_next_action: e.target.value })}
                  className="px-3 py-2 text-sm bg-background border border-border"
                />
              </div>

              {/* Email Section */}
              {availableEmails.length > 0 && (
                <div className="bg-muted/30 p-3 space-y-3 border border-border rounded-lg">
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

              {submitError && (
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  {submitError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                 <Button
                   type="button"
                   onClick={() => {
                     setShowForm(false);
                     setSubmitError('');
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
                  variant="outline"
                  className="px-4 py-2 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createUpdateMutation.isPending || !newUpdate.description.trim()}
                  className="px-4 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {createUpdateMutation.isPending ? 'Adding...' : 'Add Update'}
                </Button>
              </div>
            </form>
          </div>
          )}

          {/* Updates Timeline */}
          <div>
            <h3 className="font-semibold mb-3 text-sm text-foreground">Update History</h3>
            {isLoading ? (
              <div className="bg-muted/30 border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
                Loading updates...
              </div>
            ) : updates.length === 0 ? (
              <div className="bg-muted/30 border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
                No updates yet. Add the first official update above.
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="bg-muted/30 border border-border rounded-lg p-4 border-l-4"
                    style={{ borderLeftColor: UPDATE_TYPE_COLORS[update.update_type] || '#6B7280' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-medium text-white ${UPDATE_TYPE_COLORS[update.update_type] || 'bg-gray-500'}`}
                        >
                          {update.update_type}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(update.created_date), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm mb-2">
                      <p className="font-medium mb-1 text-foreground">Update:</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{update.description}</p>
                    </div>

                    {update.next_steps && (
                      <div className="text-sm mb-2">
                        <p className="font-medium mb-1 text-foreground">Next Steps:</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">{update.next_steps}</p>
                      </div>
                    )}

                    {update.due_date_for_next_action && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3" />
                        Due: {format(new Date(update.due_date_for_next_action), 'dd/MM/yyyy')}
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
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
          <Button onClick={onClose} variant="outline" className="px-4 py-2">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
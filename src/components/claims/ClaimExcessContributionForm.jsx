import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { COVERED_BY_OPTIONS } from '@/components/shared/excessContribution';

/**
 * Our contribution towards the client's excess, and how it reaches them. Its payment
 * is tracked in Financials, never here: paid to the client directly it is the
 * "Excess Contribution to Client" payment; via the repairer, our share comes off the
 * referral fee invoice. (The paid / invoice-received fields that used to sit on this
 * form belong to the VAT & Excess Invoice In and are left alone.)
 */
export default function ClaimExcessContributionForm({ claim, onSave, onCancel }) {
  const isApplicable = claim.excess_contribution_method === 'Direct to Client' || claim.excess_contribution_method === 'Via Repairer';

  const [formData, setFormData] = useState({
    excess_contribution_amount: claim.excess_contribution_amount || 0,
    excess_contribution_method: isApplicable ? claim.excess_contribution_method : 'Direct to Client',
    excess_contribution_covered_by: claim.excess_contribution_covered_by || '',
    excess_contribution_rcm_amount: claim.excess_contribution_rcm_amount ?? '',
    excess_contribution_payee_name: claim.excess_contribution_payee_name || claim.client_name || '',
    excess_contribution_sort_code: claim.excess_contribution_sort_code || '',
    excess_contribution_account_number: claim.excess_contribution_account_number || '',
    excess_contribution_payment_reference: claim.excess_contribution_payment_reference || claim.job_number || '',
    excess_contribution_notes: claim.excess_contribution_notes || '',
  });
  const [applicable, setApplicable] = useState(isApplicable);
  const [error, setError] = useState('');

  const set = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  const amount = Number(formData.excess_contribution_amount) || 0;
  const viaRepairer = formData.excess_contribution_method === 'Via Repairer';
  const direct = formData.excess_contribution_method === 'Direct to Client';

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!applicable) {
      onSave({
        excess_contribution_method: 'None',
        excess_contribution_amount: 0,
        excess_contribution_covered_by: null,
        excess_contribution_rcm_amount: null,
        excess_contribution_notes: formData.excess_contribution_notes || '',
      });
      return;
    }
    if (!(amount > 0)) { setError('Enter the contribution amount.'); return; }
    if (viaRepairer && !formData.excess_contribution_covered_by) { setError('Choose who covers the contribution.'); return; }
    let rcmShare = null;
    if (viaRepairer && formData.excess_contribution_covered_by === 'Split') {
      rcmShare = Number(formData.excess_contribution_rcm_amount);
      if (!(rcmShare > 0) || rcmShare >= amount) {
        setError(`Enter our share — more than £0 and less than the £${amount.toFixed(2)} contribution.`);
        return;
      }
    }
    onSave({
      excess_contribution_method: formData.excess_contribution_method,
      excess_contribution_amount: amount,
      excess_contribution_covered_by: viaRepairer ? formData.excess_contribution_covered_by : null,
      excess_contribution_rcm_amount: rcmShare,
      excess_contribution_payee_name: formData.excess_contribution_payee_name.trim(),
      excess_contribution_sort_code: formData.excess_contribution_sort_code.trim(),
      excess_contribution_account_number: formData.excess_contribution_account_number.trim(),
      excess_contribution_payment_reference: formData.excess_contribution_payment_reference.trim(),
      excess_contribution_notes: formData.excess_contribution_notes,
    });
  };

  const field = 'neomorph-inset px-4 py-3 text-foreground border-0';
  const radio = (on) => `flex items-start gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${on ? 'bg-info-bg border-info/30' : 'bg-card border-border hover:bg-muted'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <label className="block text-sm font-medium text-foreground mb-3">Are we contributing towards the client's excess?</label>
        <div className="flex gap-3">
          <label className={radio(!applicable)}>
            <input type="radio" name="applicable" checked={!applicable} onChange={() => setApplicable(false)} className="w-4 h-4 mt-0.5" />
            <span className="text-sm font-medium">No</span>
          </label>
          <label className={radio(applicable)}>
            <input type="radio" name="applicable" checked={applicable} onChange={() => setApplicable(true)} className="w-4 h-4 mt-0.5" />
            <span className="text-sm font-medium">Yes</span>
          </label>
        </div>
      </div>

      {applicable && (
        <>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Contribution amount (£)</label>
            <Input type="number" step="0.01" min="0" value={formData.excess_contribution_amount}
              onChange={(e) => set('excess_contribution_amount', e.target.value)} className={field} />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">How does it reach the client?</label>
            <div className="grid gap-2">
              <label className={radio(direct)}>
                <input type="radio" name="method" checked={direct} onChange={() => set('excess_contribution_method', 'Direct to Client')} className="w-4 h-4 mt-0.5" />
                <span className="text-sm"><span className="font-medium">We pay the client directly</span><br /><span className="text-muted-foreground">The client pays the repairer their full excess and we pay them the contribution.</span></span>
              </label>
              <label className={radio(viaRepairer)}>
                <input type="radio" name="method" checked={viaRepairer} onChange={() => set('excess_contribution_method', 'Via Repairer')} className="w-4 h-4 mt-0.5" />
                <span className="text-sm"><span className="font-medium">The repairer takes less excess from the client</span><br /><span className="text-muted-foreground">The client pays the repairer their excess less the contribution.</span></span>
              </label>
            </div>
          </div>

          {viaRepairer && (
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Who covers the contribution?</label>
              <div className="grid gap-2">
                {COVERED_BY_OPTIONS.map((o) => (
                  <label key={o.value} className={radio(formData.excess_contribution_covered_by === o.value)}>
                    <input type="radio" name="covered_by" checked={formData.excess_contribution_covered_by === o.value}
                      onChange={() => set('excess_contribution_covered_by', o.value)} className="w-4 h-4 mt-0.5" />
                    <span className="text-sm font-medium">{o.label}</span>
                  </label>
                ))}
              </div>
              {formData.excess_contribution_covered_by === 'Split' && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Our share (£)</label>
                    <Input type="number" step="0.01" min="0" value={formData.excess_contribution_rcm_amount}
                      onChange={(e) => set('excess_contribution_rcm_amount', e.target.value)} className={field} />
                  </div>
                  <div className="text-sm text-muted-foreground self-end pb-3">
                    Repairer covers £{Math.max(0, amount - (Number(formData.excess_contribution_rcm_amount) || 0)).toFixed(2)}
                  </div>
                </div>
              )}
              {['RCM', 'Split'].includes(formData.excess_contribution_covered_by) && (
                <p className="mt-2 text-xs text-muted-foreground">Our share comes off the referral fee invoice to the repairer, after VAT — the VAT on the fee is unchanged.</p>
              )}
            </div>
          )}

          {direct && (
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <p className="text-sm font-medium text-foreground">Client's bank details for the payment</p>
              <p className="text-xs text-muted-foreground">Optional now — Financials reminds you if they're missing when it's time to pay. A receipt or remittance can be uploaded against the payment there.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Account name</label>
                  <Input value={formData.excess_contribution_payee_name} onChange={(e) => set('excess_contribution_payee_name', e.target.value)} className={field} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Payment reference</label>
                  <Input value={formData.excess_contribution_payment_reference} onChange={(e) => set('excess_contribution_payment_reference', e.target.value)} className={field} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Sort code</label>
                  <Input inputMode="numeric" placeholder="00-00-00" value={formData.excess_contribution_sort_code} onChange={(e) => set('excess_contribution_sort_code', e.target.value)} className={field} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Account number</label>
                  <Input inputMode="numeric" value={formData.excess_contribution_account_number} onChange={(e) => set('excess_contribution_account_number', e.target.value)} className={field} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <label className="block text-sm text-muted-foreground mb-2">Notes</label>
        <Textarea value={formData.excess_contribution_notes} onChange={(e) => set('excess_contribution_notes', e.target.value)}
          className={`${field} h-20`} placeholder="Any notes about the excess contribution..." />
      </div>

      {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}

      <div className="flex justify-end gap-4 pt-2">
        <Button type="button" onClick={onCancel} className="neomorph-flat px-6 py-3">Cancel</Button>
        <Button type="submit" className="neomorph-flat px-6 py-3 text-info-fg">Save Changes</Button>
      </div>
    </form>
  );
}

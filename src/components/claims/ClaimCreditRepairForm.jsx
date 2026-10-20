import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Pencil, RotateCcw, Lock } from 'lucide-react';
import CreditRepairCombobox from '../shared/CreditRepairCombobox';
import {
    COMMISSION_BASES,
    HIRE_CATEGORIES,
    buildLockedRates,
    creditRepairCommission,
    creditRepairHireFee,
    fmtGBP,
    missingPartnerRates,
} from '../shared/creditRepairRates';

const SELECT_CLASS = 'neomorph-inset w-full h-11 lg:h-9 px-3 rounded-xl text-sm bg-transparent border border-border';

const CONTACT_FIELDS = [
    'credit_repair_company_contact_name',
    'credit_repair_company_phone',
    'credit_repair_company_email',
    'credit_repair_company_account_ref',
];

export default function ClaimCreditRepairForm({ claim, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        credit_repair_company_id: claim.credit_repair_company_id || '',
        credit_repair_company_name: claim.credit_repair_company_name || '',
        credit_repair_company_contact_name: claim.credit_repair_company_contact_name || '',
        credit_repair_company_phone: claim.credit_repair_company_phone || '',
        credit_repair_company_email: claim.credit_repair_company_email || '',
        credit_repair_company_account_ref: claim.credit_repair_company_account_ref || '',
        hire_category: claim.hire_category || '',
        credit_repair_rates_locked: claim.credit_repair_rates_locked || null,
        credit_repair_rates_overridden: claim.credit_repair_rates_overridden === true,
    });
    const [company, setCompany] = useState(null);
    const [adjusting, setAdjusting] = useState(claim.credit_repair_rates_overridden === true);

    // The partner's agreed rates come from their directory entry: the one just
    // picked, or the one already on the claim.
    useEffect(() => {
        if (!claim.credit_repair_company_id) return undefined;
        let cancelled = false;
        base44.entities.CreditRepairCompany.get(claim.credit_repair_company_id)
            .then((record) => { if (!cancelled) setCompany(record); })
            .catch(() => { if (!cancelled) setCompany(null); });
        return () => { cancelled = true; };
    }, [claim.credit_repair_company_id]);

    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const lockFor = (category, comp) => (category && comp ? buildLockedRates(comp, category) : null);

    const handleCreditRepairSelect = (selected) => {
        setCompany(selected || null);
        setAdjusting(false);
        setFormData(prev => {
            const next = { ...prev };
            next.credit_repair_company_id = selected?.id || '';
            next.credit_repair_company_name = selected?.name || '';
            next.credit_repair_company_contact_name = selected?.contact_name || '';
            next.credit_repair_company_phone = selected?.phone || '';
            next.credit_repair_company_email = selected?.email || '';
            next.credit_repair_company_account_ref = selected?.account_reference || '';
            const locked = lockFor(prev.hire_category, selected);
            if (locked) {
                next.credit_repair_rates_locked = locked;
                next.credit_repair_rates_overridden = false;
            }
            return next;
        });
    };

    // Setting the partner and hire category is what locks the rates onto the claim.
    const handleCategoryChange = (category) => {
        setAdjusting(false);
        setFormData(prev => {
            const next = { ...prev, hire_category: category };
            if (!category) {
                next.credit_repair_rates_locked = null;
                next.credit_repair_rates_overridden = false;
                return next;
            }
            const locked = lockFor(category, company);
            if (locked) {
                next.credit_repair_rates_locked = locked;
                next.credit_repair_rates_overridden = false;
            }
            return next;
        });
    };

    const setLockedRate = (field, raw) => {
        setFormData(prev => {
            const locked = { ...(prev.credit_repair_rates_locked || {}) };
            locked[field] = raw === '' ? null : Number(raw);
            return { ...prev, credit_repair_rates_locked: locked, credit_repair_rates_overridden: true };
        });
    };

    const resetToPartnerRates = () => {
        const locked = lockFor(formData.hire_category, company);
        if (!locked) return;
        setFormData(prev => ({ ...prev, credit_repair_rates_locked: locked, credit_repair_rates_overridden: false }));
        setAdjusting(false);
    };

    const locked = formData.credit_repair_rates_locked;
    const isOverridden = formData.credit_repair_rates_overridden === true;
    const missing = company ? missingPartnerRates(company) : [];
    const previewClaim = { ...claim, ...formData };
    const hireFee = creditRepairHireFee(previewClaim);
    const commission = creditRepairCommission(previewClaim);

    return (
        <div className="space-y-4 pt-4">
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Credit Repair Claim</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                    This claim is handled via a credit repair company. The company details below will be passed to the repairer on the instruction instead of the client's insurer.
                </p>
            </div>
            <div>
                <label className="text-sm text-gray-500">Credit Repair Company</label>
                <CreditRepairCombobox
                    value={formData.credit_repair_company_name}
                    onChange={handleCreditRepairSelect}
                    placeholder="Select credit repair company..."
                />
            </div>
            <div>
                <label className="text-sm text-gray-500">Credit Repair Contact Name</label>
                <Input value={formData.credit_repair_company_contact_name} onChange={e => set('credit_repair_company_contact_name', e.target.value)} className="neomorph-inset" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-sm text-gray-500">Credit Repair Phone</label>
                    <Input value={formData.credit_repair_company_phone} onChange={e => set('credit_repair_company_phone', e.target.value)} className="neomorph-inset" />
                </div>
                <div>
                    <label className="text-sm text-gray-500">Credit Repair Email</label>
                    <Input value={formData.credit_repair_company_email} onChange={e => set('credit_repair_company_email', e.target.value)} className="neomorph-inset" />
                </div>
            </div>
            <div>
                <label className="text-sm text-gray-500">Credit Repair Account Ref</label>
                <Input value={formData.credit_repair_company_account_ref} onChange={e => set('credit_repair_company_account_ref', e.target.value)} className="neomorph-inset" />
            </div>

            {/* Hire category locks this partner's rates onto the claim */}
            <div className="rounded-[10px] border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-900/10 p-3 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300">Hire Category &amp; Rates</h4>
                    {isOverridden && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                            Adjusted on this claim
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm text-gray-500">Hire Category</label>
                        <select
                            className={SELECT_CLASS}
                            value={formData.hire_category}
                            onChange={e => handleCategoryChange(e.target.value)}
                        >
                            <option value="">Not set</option>
                            {HIRE_CATEGORIES.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-card/60 border border-border p-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hire Fee Due</p>
                            <p className="text-sm font-bold tabular-nums">{hireFee.awaiting ? '—' : fmtGBP(hireFee.amount)}</p>
                        </div>
                        <div className="rounded-lg bg-card/60 border border-border p-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Commission</p>
                            <p className="text-sm font-bold tabular-nums">
                                {commission.awaiting ? '—' : `${locked?.commission_percent ?? 0}%`}
                            </p>
                        </div>
                    </div>
                </div>

                {!locked && (
                    <p className="text-xs text-muted-foreground">
                        Select a credit repair company and a hire category to lock their agreed rates onto this claim.
                    </p>
                )}

                {locked && !adjusting && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                            {locked.category} — {locked.hire_fee === null || locked.hire_fee === undefined ? 'no' : fmtGBP(locked.hire_fee)} hire fee, {locked.commission_percent ?? 0}% of the {locked.commission_basis} final repair cost.
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={() => setAdjusting(true)} className="gap-1.5">
                            <Pencil className="w-3.5 h-3.5" /> Adjust for this claim
                        </Button>
                    </div>
                )}

                {locked && adjusting && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-muted-foreground">Hire Fee (£)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={locked.hire_fee ?? ''}
                                    onChange={e => setLockedRate('hire_fee', e.target.value)}
                                    className="neomorph-inset"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Commission (%)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={locked.commission_percent ?? ''}
                                    onChange={e => setLockedRate('commission_percent', e.target.value)}
                                    className="neomorph-inset"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Commission calculated on</label>
                                <select
                                    className={SELECT_CLASS}
                                    value={locked.commission_basis || COMMISSION_BASES[1]}
                                    onChange={e => setLockedRate('commission_basis', e.target.value)}
                                >
                                    {COMMISSION_BASES.map(basis => (
                                        <option key={basis} value={basis}>{basis}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button type="button" variant="outline" size="sm" onClick={resetToPartnerRates} className="gap-1.5">
                                <RotateCcw className="w-3.5 h-3.5" /> Reset to partner rates
                            </Button>
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                Adjusted rates apply to this claim only.
                            </span>
                        </div>
                    </div>
                )}

                {company && missing.length > 0 && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{company.name}'s rates aren't fully set ({missing.join(', ')}). Add them in the credit repair directory.</span>
                    </p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button onClick={onCancel} variant="outline">Cancel</Button>
                <Button onClick={() => onSave(formData)} className="bg-primary text-primary-foreground">Save Changes</Button>
            </div>
        </div>
    );
}
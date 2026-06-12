import React, { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Calculator } from "lucide-react";

const VAT_RATE = 0.20;

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

function CalcRow({ label, value, highlight = false }) {
    return (
        <div className={`flex items-center justify-between py-2 px-3 rounded-[8px] ${highlight ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/40'}`}>
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={`text-sm tabular-nums font-medium ${highlight ? 'text-primary' : 'text-foreground'}`}>{fmt(value)}</span>
        </div>
    );
}

function SectionBlock({ title, color = 'blue', children }) {
    const colors = {
        blue: 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10',
        amber: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10',
        green: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10',
        purple: 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10',
    };
    const headings = {
        blue: 'text-blue-700 dark:text-blue-300',
        amber: 'text-amber-700 dark:text-amber-300',
        green: 'text-green-700 dark:text-green-300',
        purple: 'text-purple-700 dark:text-purple-300',
    };
    return (
        <div className={`rounded-[10px] border p-3 space-y-1 ${colors[color]}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${headings[color]}`}>{title}</p>
            {children}
        </div>
    );
}

export default function FinancialCalculator({ claim }) {
    const [repairTotalIncVat, setRepairTotalIncVat] = useState(
        claim.final_repair_cost ? String(claim.final_repair_cost) : ''
    );

    const calc = useMemo(() => {
        const totalInc = parseFloat(repairTotalIncVat) || 0;
        const totalEx = totalInc / (1 + VAT_RATE);
        const vatContent = totalInc - totalEx;

        const excess = parseFloat(claim.policy_excess) || 0;
        const isVatReg = claim.client_vat_status === 'VAT Registered';
        const clientLiability = isVatReg ? excess + vatContent : excess;

        // Referrer payment — % of repair ex. VAT
        const referrerPct = parseFloat(claim.percent_to_referrer) || 0;
        const referrerNet = totalEx * (referrerPct / 100);
        const referrerVat = referrerNet * VAT_RATE;
        const referrerGross = referrerNet + referrerVat;

        // Repairer charge — % of repair ex. VAT
        const repairerPct = parseFloat(claim.referral_fee_repairer) || 0;
        const repairerNet = totalEx * (repairerPct / 100);
        const repairerVat = repairerNet * VAT_RATE;
        const repairerGross = repairerNet + repairerVat;

        return {
            totalEx, vatContent, totalInc,
            excess, isVatReg, clientLiability,
            referrerPct, referrerNet, referrerVat, referrerGross,
            repairerPct, repairerNet, repairerVat, repairerGross,
        };
    }, [repairTotalIncVat, claim.policy_excess, claim.client_vat_status, claim.percent_to_referrer, claim.referral_fee_repairer]);

    const hasInput = parseFloat(repairTotalIncVat) > 0;

    return (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
            <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial Calculator</h4>
            </div>

            {/* Input */}
            <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Repair Total <span className="font-bold">Inc. VAT</span> (£)
                </label>
                <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={repairTotalIncVat}
                    onChange={e => setRepairTotalIncVat(e.target.value)}
                    placeholder="Enter repair total inc. VAT..."
                    className="neomorph-inset text-base font-semibold"
                />
                <p className="text-xs text-muted-foreground mt-1">All figures below are calculated automatically from this value.</p>
            </div>

            {hasInput && (
                <div className="space-y-3">
                    {/* Repair Breakdown */}
                    <SectionBlock title="Repair Breakdown" color="blue">
                        <CalcRow label="Repair Total Ex. VAT" value={calc.totalEx} />
                        <CalcRow label="VAT Content (20%)" value={calc.vatContent} />
                        <CalcRow label="Repair Total Inc. VAT" value={calc.totalInc} highlight />
                    </SectionBlock>

                    {/* Client Liability */}
                    <SectionBlock title={`Client Liability (${calc.isVatReg ? 'VAT Registered' : 'Non-VAT'})`} color="amber">
                        <CalcRow label="Policy Excess" value={calc.excess} />
                        {calc.isVatReg && <CalcRow label="+ VAT Content of Repair" value={calc.vatContent} />}
                        <CalcRow
                            label={calc.isVatReg ? 'Total Owed to Repairer (Excess + VAT)' : 'Total Owed to Repairer (Excess Only)'}
                            value={calc.clientLiability}
                            highlight
                        />
                        {!claim.client_vat_status && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 pt-1 px-1">⚠ VAT status not set on client — using non-VAT calculation.</p>
                        )}
                    </SectionBlock>

                    {/* Referrer Payment */}
                    <SectionBlock title={`Referrer Payment (${calc.referrerPct}% of Ex. VAT)`} color="green">
                        {!calc.referrerPct && (
                            <p className="text-xs text-green-700 dark:text-green-300 px-1 pb-1">⚠ No referrer % set on this claim.</p>
                        )}
                        <CalcRow label="Net Amount" value={calc.referrerNet} />
                        <CalcRow label="VAT on That" value={calc.referrerVat} />
                        <CalcRow label="Gross Total Inc. VAT" value={calc.referrerGross} highlight />
                    </SectionBlock>

                    {/* Repairer Charge */}
                    <SectionBlock title={`Repairer Charge (${calc.repairerPct}% of Ex. VAT)`} color="purple">
                        {!calc.repairerPct && (
                            <p className="text-xs text-purple-700 dark:text-purple-300 px-1 pb-1">⚠ No repairer referral fee % set on this claim.</p>
                        )}
                        <CalcRow label="Net Amount" value={calc.repairerNet} />
                        <CalcRow label="VAT on That" value={calc.repairerVat} />
                        <CalcRow label="Gross Total Inc. VAT" value={calc.repairerGross} highlight />
                    </SectionBlock>
                </div>
            )}
        </div>
    );
}
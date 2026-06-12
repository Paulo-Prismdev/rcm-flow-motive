import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import FinancialCalculator from './FinancialCalculator';

const VAT_RATE = 0.20;

function fmt(n) {
    return typeof n === 'number' && !isNaN(n) ? `£${n.toFixed(2)}` : '—';
}

function SummaryCard({ label, value, color }) {
    const styles = {
        blue:   { card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',   label: 'text-blue-600 dark:text-blue-400',   value: 'text-blue-800 dark:text-blue-200' },
        yellow: { card: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700', label: 'text-amber-600 dark:text-amber-400', value: 'text-amber-800 dark:text-amber-200' },
        green:  { card: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700', label: 'text-green-600 dark:text-green-400', value: 'text-green-800 dark:text-green-200' },
        purple: { card: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700', label: 'text-purple-600 dark:text-purple-400', value: 'text-purple-800 dark:text-purple-200' },
    };
    const s = styles[color];
    return (
        <div className={`rounded-[10px] border p-3 flex flex-col gap-1 ${s.card}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${s.label}`}>{label}</p>
            <p className={`text-xl font-bold tabular-nums leading-tight ${s.value}`}>{value}</p>
        </div>
    );
}

function CheckItem({ label, value, ok }) {
    return (
        <div className="flex items-center gap-2.5 py-1.5">
            {ok
                ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            }
            <span className={`text-sm flex-1 ${ok ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}`}>{label}</span>
            {value && <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>}
        </div>
    );
}

export default function FinancialSummary({ claim }) {
    const [showBreakdown, setShowBreakdown] = useState(false);

    const calc = useMemo(() => {
        const totalInc = parseFloat(claim.final_repair_cost) || 0;
        const totalEx = totalInc / (1 + VAT_RATE);
        const vatContent = totalInc - totalEx;
        const excess = parseFloat(claim.policy_excess) || 0;
        const isVatReg = claim.client_vat_status === 'VAT Registered';
        const clientLiability = isVatReg ? excess + vatContent : excess;
        const referrerPct = parseFloat(claim.percent_to_referrer) || 0;
        const referrerGross = (totalEx * (referrerPct / 100)) * (1 + VAT_RATE);
        const repairerPct = parseFloat(claim.referral_fee_repairer) || 0;
        const repairerGross = (totalEx * (repairerPct / 100)) * (1 + VAT_RATE);
        return { totalInc, clientLiability, referrerGross, repairerGross };
    }, [claim.final_repair_cost, claim.policy_excess, claim.client_vat_status, claim.percent_to_referrer, claim.referral_fee_repairer]);

    const checks = [
        { label: 'Final repair cost entered', value: claim.final_repair_cost > 0 ? fmt(claim.final_repair_cost) : null, ok: !!claim.final_repair_cost && claim.final_repair_cost > 0 },
        { label: 'VAT status confirmed', value: claim.client_vat_status || null, ok: !!claim.client_vat_status },
        { label: 'Policy excess entered', value: (claim.policy_excess !== null && claim.policy_excess !== undefined && claim.policy_excess !== '') ? fmt(parseFloat(claim.policy_excess)) : null, ok: claim.policy_excess !== null && claim.policy_excess !== undefined && claim.policy_excess !== '' },
        { label: `Referrer fee %${claim.referrer ? ` (${claim.referrer})` : ''}`, value: claim.percent_to_referrer > 0 ? `${claim.percent_to_referrer}%` : null, ok: !!claim.percent_to_referrer && claim.percent_to_referrer > 0 },
        { label: 'Repairer referral fee %', value: claim.referral_fee_repairer > 0 ? `${claim.referral_fee_repairer}%` : null, ok: !!claim.referral_fee_repairer && claim.referral_fee_repairer > 0 },
    ];

    const allReady = checks.every(c => c.ok);

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <SummaryCard label="Final Repair Cost" value={fmt(calc.totalInc)} color="blue" />
                <SummaryCard label="Client Liability" value={fmt(calc.clientLiability)} color="yellow" />
                <SummaryCard label="Referrer Payment" value={fmt(calc.referrerGross)} color="green" />
                <SummaryCard label="Repairer Charge" value={fmt(calc.repairerGross)} color="purple" />
            </div>

            {/* Referrer Highlight */}
            {claim.referrer && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-700 dark:text-indigo-300 text-xs font-bold">{claim.referrer.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Referrer</p>
                        <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 truncate">{claim.referrer}</p>
                    </div>
                    {claim.referrer_ref && (
                        <div className="text-right flex-shrink-0">
                            <p className="text-[11px] text-indigo-400">Ref</p>
                            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{claim.referrer_ref}</p>
                        </div>
                    )}
                    {claim.percent_to_referrer > 0 && (
                        <div className="px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm font-bold flex-shrink-0">
                            {claim.percent_to_referrer}%
                        </div>
                    )}
                </div>
            )}

        {/* Invoice Readiness */}
            <div className={`rounded-[10px] border p-3 ${allReady ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'}`}>
                <div className="flex items-center gap-2 mb-2">
                    {allReady
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <AlertTriangle className="w-4 h-4 text-amber-600" />
                    }
                    <span className={`text-sm font-semibold ${allReady ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        Invoice Readiness — {allReady ? 'Ready to Invoice' : 'Action Required'}
                    </span>
                </div>
                <div className="divide-y divide-border/40">
                    {checks.map((c, i) => <CheckItem key={i} label={c.label} value={c.value} ok={c.ok} />)}
                </div>
            </div>

            {/* Collapsible breakdown */}
            <div>
                <button
                    onClick={() => setShowBreakdown(v => !v)}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1"
                >
                    {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showBreakdown ? 'Hide Full Breakdown' : 'View Full Breakdown'}
                </button>
                {showBreakdown && <FinancialCalculator claim={claim} />}
            </div>
        </div>
    );
}
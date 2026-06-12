import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import FinancialCalculator from './FinancialCalculator';

const VAT_RATE = 0.20;

function fmt(n) {
    return typeof n === 'number' && !isNaN(n) ? `£${n.toFixed(2)}` : '—';
}

function SummaryCard({ label, value, sub, color }) {
    const styles = {
        blue:   { card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',   label: 'text-blue-600 dark:text-blue-400',   value: 'text-blue-800 dark:text-blue-200',   sub: 'text-blue-500 dark:text-blue-400' },
        yellow: { card: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700', label: 'text-amber-600 dark:text-amber-400', value: 'text-amber-800 dark:text-amber-200', sub: 'text-amber-500 dark:text-amber-400' },
        green:  { card: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700', label: 'text-green-600 dark:text-green-400', value: 'text-green-800 dark:text-green-200', sub: 'text-green-500 dark:text-green-400' },
        purple: { card: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700', label: 'text-purple-600 dark:text-purple-400', value: 'text-purple-800 dark:text-purple-200', sub: 'text-purple-500 dark:text-purple-400' },
    };
    const s = styles[color];
    return (
        <div className={`rounded-[10px] border p-3 flex flex-col gap-1 ${s.card}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${s.label}`}>{label}</p>
            <p className={`text-xl font-bold tabular-nums leading-tight ${s.value}`}>{value}</p>
            {sub && <p className={`text-[11px] tabular-nums ${s.sub}`}>{sub}</p>}
        </div>
    );
}

function PartyCard({ role, name, subtitle, label, gross, ex, vat, color, note }) {
    const styles = {
        yellow: { card: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700', role: 'text-amber-500 dark:text-amber-400', name: 'text-amber-900 dark:text-amber-100', amount: 'text-amber-800 dark:text-amber-200', sub: 'text-amber-600 dark:text-amber-400', row: 'text-amber-700 dark:text-amber-300' },
        indigo: { card: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700', role: 'text-indigo-500 dark:text-indigo-400', name: 'text-indigo-900 dark:text-indigo-100', amount: 'text-indigo-800 dark:text-indigo-200', sub: 'text-indigo-500 dark:text-indigo-400', row: 'text-indigo-700 dark:text-indigo-300' },
        purple: { card: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700', role: 'text-purple-500 dark:text-purple-400', name: 'text-purple-900 dark:text-purple-100', amount: 'text-purple-800 dark:text-purple-200', sub: 'text-purple-500 dark:text-purple-400', row: 'text-purple-700 dark:text-purple-300' },
    };
    const s = styles[color];
    return (
        <div className={`rounded-[10px] border p-3 space-y-2 ${s.card}`}>
            <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${s.role}`}>{role}</p>
                <p className={`text-sm font-bold truncate ${name ? s.name : 'text-muted-foreground italic'}`}>{name || 'Not assigned'}</p>
                {subtitle && <p className={`text-xs ${s.sub}`}>{subtitle}</p>}
                {note && <p className={`text-xs ${s.sub}`}>{note}</p>}
            </div>
            <div className={`border-t pt-2 space-y-1 border-current opacity-20`} style={{ borderColor: 'currentColor' }} />
            <div className="space-y-1">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${s.role}`}>{label}</p>
                <p className={`text-lg font-bold tabular-nums leading-tight ${s.amount}`}>{fmt(gross)}</p>
                <div className={`text-xs space-y-0.5 ${s.row}`}>
                    <div className="flex justify-between"><span>Ex VAT</span><span className="font-medium tabular-nums">{fmt(ex)}</span></div>
                    <div className="flex justify-between"><span>VAT (20%)</span><span className="font-medium tabular-nums">{fmt(vat)}</span></div>
                </div>
            </div>
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
        const clientEx = isVatReg ? excess : excess;
        const clientVat = isVatReg ? vatContent : 0;

        const referrerPct = parseFloat(claim.percent_to_referrer) || 0;
        const referrerEx = totalEx * (referrerPct / 100);
        const referrerVat = referrerEx * VAT_RATE;
        const referrerGross = referrerEx + referrerVat;

        const repairerPct = parseFloat(claim.referral_fee_repairer) || 0;
        const repairerEx = totalEx * (repairerPct / 100);
        const repairerVat = repairerEx * VAT_RATE;
        const repairerGross = repairerEx + repairerVat;

        return { totalInc, totalEx, vatContent, clientLiability, clientEx, clientVat, referrerEx, referrerVat, referrerGross, repairerEx, repairerVat, repairerGross };
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
            {/* Summary Card — Final Repair only */}
            <SummaryCard label="Final Repair (inc. VAT)" value={fmt(calc.totalInc)} sub={`Ex VAT: ${fmt(calc.totalEx)} | VAT: ${fmt(calc.vatContent)}`} color="blue" />

            {/* Party Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Client */}
                <PartyCard
                    role="Client"
                    name={claim.client_name}
                    subtitle={claim.client_vat_status}
                    label="Owes (Excess)"
                    gross={calc.clientLiability}
                    ex={calc.clientEx}
                    vat={calc.clientVat}
                    color="yellow"
                    note={claim.policy_excess > 0 ? `Excess: ${fmt(parseFloat(claim.policy_excess))}` : null}
                />
                {/* Referrer */}
                <PartyCard
                    role="Referrer"
                    name={claim.referrer}
                    subtitle={claim.referrer_ref ? `Ref: ${claim.referrer_ref}` : null}
                    label={`To Pay (${claim.percent_to_referrer || 0}%)`}
                    gross={calc.referrerGross}
                    ex={calc.referrerEx}
                    vat={calc.referrerVat}
                    color="indigo"
                />
                {/* Repairer */}
                <PartyCard
                    role="Repairer"
                    name={claim.bodyshop}
                    subtitle={null}
                    label={`Referral Fee (${claim.referral_fee_repairer || 0}%)`}
                    gross={calc.repairerGross}
                    ex={calc.repairerEx}
                    vat={calc.repairerVat}
                    color="purple"
                />
            </div>

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
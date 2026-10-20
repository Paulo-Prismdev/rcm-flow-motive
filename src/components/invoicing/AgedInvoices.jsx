import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatInvoiceDay, today } from '@/components/shared/invoiceChecklist';
import {
  agedFilterOptions,
  buildAgedCsv,
  downloadCsv,
  filterAgedRows,
  groupAgedRows,
} from '@/components/shared/invoicingQueue';
import AgedSummary from './AgedSummary';
import AgedPartyRow from './AgedPartyRow';
import InvoicingFilters from './InvoicingFilters';

const NO_FILTERS = { party: 'all', claimType: 'all', division: 'all' };

const TAB_LABELS = { out: 'Owed to us', in: 'We owe' };

/**
 * The two books of outstanding money — what parties owe us and what we owe them —
 * each aged from its own invoice date, grouped by party, with the tab's own summary
 * above, the filters on one line, and the current view exportable.
 */
export default function AgedInvoices({ owedToUs = [], weOwe = [], onOpen }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('out');
  const [filters, setFilters] = useState(NO_FILTERS);

  const rows = tab === 'out' ? owedToUs : weOwe;
  const options = useMemo(() => agedFilterOptions(rows), [rows]);
  const filtered = useMemo(() => filterAgedRows(rows, filters), [rows, filters]);
  const groups = useMemo(() => groupAgedRows(filtered), [filtered]);

  const switchTab = (next) => {
    setTab(next);
    setFilters(NO_FILTERS);
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast({ title: 'Nothing to export', description: 'No invoices in this view.' });
      return;
    }
    downloadCsv(
      `aged-invoices-${tab === 'out' ? 'owed-to-us' : 'we-owe'}-${formatInvoiceDay(today()).replace(/\s+/g, '-')}.csv`,
      buildAgedCsv(filtered),
    );
    toast({ title: 'Spreadsheet exported', description: `${filtered.length} invoices` });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-border bg-muted p-1">
        {['out', 'in'].map((key) => {
          const count = key === 'out' ? owedToUs.length : weOwe.length;
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => switchTab(key)}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {TAB_LABELS[key]}
              <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      <AgedSummary rows={rows} />

      <div className="flex flex-wrap items-center gap-2">
        <InvoicingFilters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(NO_FILTERS)}
          options={options}
        />
        <Button variant="outline" size="sm" onClick={exportCsv} className="h-8 ml-auto">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      <div className="bg-card border border-border rounded-[10px] overflow-hidden">
        {groups.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            {rows.length === 0
              ? `Nothing outstanding and unpaid ${tab === 'out' ? 'to us' : 'by us'}.`
              : 'No invoices match these filters.'}
          </p>
        ) : (
          groups.map((group) => <AgedPartyRow key={group.party} group={group} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}
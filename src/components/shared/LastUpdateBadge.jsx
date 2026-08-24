import React from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Small pill badge showing when the last update was logged on a claim.
 * Unlike the 48-hour trackers, this is purely informational (no flag logic).
 */
export default function LastUpdateBadge({ claim, small = false }) {
  if (!claim?.last_updated_at) return null;
  let date;
  try { date = new Date(claim.last_updated_at); } catch { return null; }
  if (isNaN(date.getTime())) return null;

  const fullText = format(date, 'dd/MM/yyyy HH:mm');
  const classes = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

  if (small) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${classes}`} title={`Last update: ${fullText}`}>
        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="opacity-60 font-normal">Last Update:</span>
        {format(date, 'dd/MM/yy')}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${classes}`} title={`Last update: ${fullText}`}>
      <Clock className="w-3.5 h-3.5" />
      <span className="opacity-60 font-normal">Last Update:</span>
      {fullText}
    </span>
  );
}
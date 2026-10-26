import React from 'react';
import { cn } from '@/lib/utils';
import { lightText } from '@/components/shared/trafficLight';
import StepGlyph from './StepGlyph';

/**
 * The source list: Overview, then the five steps in order, each with its own state
 * and the two figures that say how far along it is. The selected row carries the
 * navy highlight, and every row's icon is drawn in its own traffic-light colour —
 * red while something in the step is still to be uploaded, amber while it waits to
 * be paid, green once the step is done, grey where it holds nothing to do.
 */
export default function FinancialsSidebar({ items, selected, onSelect, footer }) {
  return (
    <aside className="w-full flex-shrink-0 border-b border-mac-line bg-mac-sidebar p-2 md:w-[240px] md:border-b-0 md:border-r">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.key === selected;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                className={cn(
                  'flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors duration-150',
                  active ? 'bg-mac-navy text-white' : 'hover:bg-foreground/5'
                )}
              >
                <StepGlyph
                  state={item.glyph}
                  className={active && item.light === 'grey' ? 'text-white/60' : lightText(item.light)}
                />
                <span className="min-w-0 flex-1 truncate text-[13px]">{item.title}</span>
                {item.count && (
                  <span className={cn('text-[11px] tabular-nums', active ? 'text-white/80' : 'text-mac-muted')}>
                    {item.count}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {footer}
    </aside>
  );
}
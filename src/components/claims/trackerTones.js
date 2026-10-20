/**
 * Shared look for the tracker buttons in the Docs panel and the Invoicing
 * tracker. Each status is a light card with a coloured left edge and a soft glow
 * in the same colour, so a status still reads at a glance without turning the
 * list into a wall of solid colour. Class strings are written out in full so the
 * Tailwind build keeps them.
 */
export const TRACKER_TONES = {
  positive: {
    card: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 border-l-green-500 shadow-[0_0_14px_-4px_rgba(34,197,94,0.55)] hover:bg-green-100/70 dark:hover:bg-green-950/50',
    iconWrap: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    menu: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  },
  warning: {
    card: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 border-l-amber-500 shadow-[0_0_14px_-4px_rgba(245,158,11,0.55)] hover:bg-amber-100/70 dark:hover:bg-amber-950/50',
    iconWrap: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    menu: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  },
  negative: {
    card: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 border-l-red-500 shadow-[0_0_14px_-4px_rgba(239,68,68,0.5)] hover:bg-red-100/70 dark:hover:bg-red-950/50',
    iconWrap: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    menu: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  },
  neutral: {
    card: 'bg-muted/40 border-border border-l-muted-foreground/30 hover:bg-muted/60',
    iconWrap: 'bg-muted-foreground/15 text-muted-foreground',
    menu: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  },
  faded: {
    card: 'bg-muted/20 border-border border-l-transparent hover:bg-muted/40 opacity-70 hover:opacity-90',
    iconWrap: 'bg-muted-foreground/10 text-muted-foreground/70',
    menu: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  },
};
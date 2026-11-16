import { useEffect, useState } from 'react';

/**
 * Chart libraries draw SVG with colour attributes, which can't read CSS variables.
 * This reads the current theme's tokens as real colours and re-reads them when the
 * theme flips (the `dark` class on <html>), so charts follow light and dark.
 */
const read = () => {
  if (typeof window === 'undefined') return null;
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => {
    const raw = css.getPropertyValue(name).trim();
    return raw ? `hsl(${raw})` : fallback;
  };
  return {
    grid: v('--border', '#e5e7eb'),
    axis: v('--muted-foreground', '#6b7280'),
    text: v('--foreground', '#111827'),
    surface: v('--popover', '#ffffff'),
    primary: v('--primary', '#131D47'),
    // One categorical order for every chart: blue, green, amber, red, then quieter hues.
    series: [
      v('--fm-info', '#2563eb'),
      v('--fm-brand-green', '#13925a'),
      v('--fm-warning', '#e08a00'),
      v('--fm-danger', '#d93025'),
      '#8b5cf6',
      '#db2777',
      '#0d9488',
      '#ea580c',
    ],
  };
};

export default function useThemeColors() {
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const update = () => setColors(read());
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, []);
  return colors;
}

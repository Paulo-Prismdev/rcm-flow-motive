// Sort items alphabetically with numeric-leading names first.
// Pass an array of strings, or an array of objects + a field name or getter.
export function sortAlphaNumeric(items, field) {
  if (!Array.isArray(items)) return [];
  const get = typeof field === 'function'
    ? field
    : (field ? (item) => item?.[field] : (item) => item);
  return [...items].sort((a, b) => {
    const av = String(get(a) ?? '').trim().toLowerCase();
    const bv = String(get(b) ?? '').trim().toLowerCase();
    const aNum = /^\d/.test(av);
    const bNum = /^\d/.test(bv);
    if (aNum && !bNum) return -1;
    if (!aNum && bNum) return 1;
    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
  });
}
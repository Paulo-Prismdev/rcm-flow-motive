/**
 * For rows and cards that open something when clicked but aren't real buttons:
 * Enter or Space does the same as a click, so they work from the keyboard too.
 * Use with role="button" tabIndex={0}.
 */
export function activateOnKey(e) {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.currentTarget.click();
  }
}

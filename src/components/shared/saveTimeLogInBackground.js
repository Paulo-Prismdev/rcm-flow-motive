import { base44 } from '@/api/base44Client';

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2000;

/**
 * Saves a time log without the screen waiting for it.
 *
 * The screen that started the timer can close before the write has left the
 * device, so the log is handed over here and written in the background — one
 * retry covers a slow mobile connection.
 *
 * The log carries a `log_key`, so a repeat save (a second tap, a second exit
 * route, or the retry above) updates the same log instead of adding another one.
 */
export function saveTimeLogInBackground(log) {
  (async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await base44.entities.TimeLog.upsert([log], { key: 'log_key' });
        return;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) {
          console.error('Failed to save time log:', error);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  })();
}
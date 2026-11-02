import { base44 } from '@/api/base44Client';

/**
 * Signs the person out everywhere: ends the second sign-in step on the server (which
 * also records the sign-out), forgets this browser's sign-in markers, then signs out
 * of Base44 and returns to the sign-in page.
 */
export async function signOut(reason) {
  try {
    await Promise.race([
      base44.functions.invoke('twofaManage', { action: 'clear', reason }),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch { /* signing out must never fail */ }
  try {
    localStorage.removeItem('twofa_login_token');
    localStorage.removeItem('last_activity_at');
  } catch { /* storage unavailable */ }
  base44.auth.logout(`${window.location.origin}/login`);
}

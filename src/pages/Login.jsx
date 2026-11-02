import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthNotice from '@/components/auth/AuthNotice';
import PasswordField from '@/components/auth/PasswordField';
import { authErrorMessage } from '@/components/auth/authErrors';
import { markPasswordLogin } from '@/lib/passwordPolicy';

/** Where to go after signing in: the page they were sent here from, on this site only. */
function returnPath() {
  const from = new URLSearchParams(window.location.search).get('from');
  if (!from) return '/';
  try {
    const url = new URL(from, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith('/login')) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.7V6.6H1.3a12 12 0 0 0 0 10.9l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

/**
 * RCM's own sign-in page (the same as Agile v2): email and password, or Google. After
 * signing in, staff are asked for the code we email them before anything opens.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      markPasswordLogin(email);
      window.location.href = returnPath();
    } catch (err) {
      setError(authErrorMessage(err, "We couldn't sign you in. Please try again."));
      setPassword('');
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider('google', returnPath());
  };

  return (
    <AuthLayout icon={LogIn} title="Sign in" subtitle="RCM Flowmotive">
      <Button type="button" variant="outline" className="w-full h-12 text-sm font-medium mb-6 bg-white text-gray-900 hover:bg-gray-50 dark:bg-[#2c2c2e] dark:text-gray-100" onClick={handleGoogle} disabled={loading}>
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6" role="separator" aria-label="or">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-[#1c1c1e] px-3 text-gray-500">or</span>
        </div>
      </div>

      {error && <AuthNotice>{error}</AuthNotice>}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 bg-white text-gray-900 dark:bg-[#2c2c2e] dark:text-gray-100"
            />
          </div>
        </div>
        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          aside={<Link to="/forgot-password" className="text-xs text-blue-700 dark:text-blue-300 hover:underline py-2">Forgot password?</Link>}
        />
        <Button type="submit" className="w-full h-12 font-medium bg-[#151d44] hover:bg-[#1f2a5c] text-white" disabled={loading}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Signing in</>) : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}

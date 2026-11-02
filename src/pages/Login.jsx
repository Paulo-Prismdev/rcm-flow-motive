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

/**
 * RCM's own sign-in page: email and password only. After signing in, staff are asked
 * for the code we email them before anything opens.
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

  return (
    <AuthLayout icon={LogIn} title="Sign in" subtitle="RCM Flowmotive">
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

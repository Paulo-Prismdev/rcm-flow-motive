import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthNotice from '@/components/auth/AuthNotice';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim()) {
      setError('Enter the email address you sign in with.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email.trim());
    } catch {
      // The same message shows whether or not an account exists, so this page never reveals who has one.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one"
      footer={
        <Link to="/login" className="inline-flex h-11 items-center font-medium text-white hover:underline md:h-auto">
          <ArrowLeft className="w-3 h-3 mr-1" aria-hidden="true" />Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <AuthNotice tone="success" className="mb-0 text-left">
            If there is an account for {email.trim()}, a reset link is on its way. It can take a few minutes, so check your junk folder too.
          </AuthNotice>
          <button type="button" onClick={() => setSent(false)} className="h-11 text-sm text-blue-700 dark:text-blue-300 font-medium hover:underline md:h-9">
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && <AuthNotice>{error}</AuthNotice>}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
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
          <Button type="submit" className="w-full h-12 font-medium bg-[#151d44] hover:bg-[#1f2a5c] text-white" disabled={loading}>
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Sending</>) : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Invalid credentials');
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
// ✅ Save user timezone automatically (one-time)
const timezone =
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'

  await supabase
  .from('profiles')
  .update({ timezone })
  .eq('id', user.id)
  .is('timezone', null)

      // Stamp daily login date in auth metadata (UTC)
      const today = new Date().toISOString().slice(0, 10);
      const { error: updateError } = await supabase.auth.updateUser({
        data: { last_login_date: today },
      });
      if (updateError) {
        setError(updateError.message || 'Failed to update login metadata');
        setLoading(false);
        return;
      }

      // Refresh session so the new metadata is reflected in the JWT used by middleware.
      await supabase.auth.refreshSession();

      // Check user status and profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, role, full_name, department, position, phone, hire_date, joining_date, dob, avatar_url')
        .eq('id', user.id)
        .single();

      if (!profile) {
        router.push('/profile-completion');
        return;
      }

      // Check status
      if (profile.status === 'rejected') {
        setError('Your account has been rejected. Please contact admin.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (profile.status === 'pending') {
        router.push('/pending-approval');
        return;
      }

      // Status is 'active' - check if profile is complete
      const requiredFields = ['full_name', 'department', 'position', 'phone', 'hire_date', 'joining_date', 'dob'] as const
      const isProfileIncomplete = requiredFields.some(field => !profile[field]) || !profile.avatar_url
      if (isProfileIncomplete) {
        router.push('/profile-completion');
        return;
      }

      // Redirect to dashboard (role-based routing handled there)
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }, [supabase, router, email, password]);

  return (
    <div className="min-h-screen flex flex-col min-h-[100dvh]" style={{ background: '#f1f5f9' }}>
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
          <Image src="/image/logobg.png" alt="Maverix HRM Solutions" width={200} height={200} />
        </h1>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm space-y-5 sm:space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-center text-gray-900 dark:text-gray-100">
              Log in
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400">
              Sign in with your email and password
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 sm:py-2 text-base sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px] sm:min-h-0"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-3 sm:py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[44px] touch-manipulation"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            New user?{' '}
            <Link
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sign up / Create account
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

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
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    setError(null);
    setResetMessage(null);

    if (!email) {
      setError('Please enter your email first.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setResetMessage('Password reset link sent. Please check your email.');
  };


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

      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

      await supabase
        .from('profiles')
        .update({ timezone })
        .eq('id', user.id)
        .is('timezone', null);

      const today = new Date().toISOString().slice(0, 10);
      await supabase.auth.updateUser({
        data: { last_login_date: today },
      });

      await supabase.auth.refreshSession();

      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'status, role, full_name, department, position, phone, hire_date, joining_date, dob, avatar_url'
        )
        .eq('id', user.id)
        .single();

      if (!profile) {
        router.push('/profile-completion');
        return;
      }

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

      const requiredFields = [
        'full_name',
        'department',
        'position',
        'phone',
        'hire_date',
        'joining_date',
        'dob',
      ] as const;

      const isProfileIncomplete =
        requiredFields.some(field => !profile[field]) || !profile.avatar_url;

      if (isProfileIncomplete) {
        router.push('/profile-completion');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }, [supabase, router, email, password]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100">
      {/* LEFT IMAGE SECTION */}
      <div className="relative hidden md:block md:w-3/5">
        <Image
          src="/image/loginpagebg.png" // 👉 your background image
          alt="Login background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* RIGHT LOGIN SECTION */}
      <div className="relative flex-1 flex items-center justify-center " style={{ background: '#f1f5f9' }}>
        {/* Mobile background image */}
        <div className="absolute inset-0 md:hidden">
          <Image
            src="/image/loginpagebg.png"
            alt="Login background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[#f1f5f9]/55" />
        </div>

        {/* CONTENT */}
        <div className="relative z-10 w-full max-w-sm px-6 py-10">
          {/* Logo */}
          <div className="mb-8 text-center md:text-left">
            <div className="mb-12 flex justify-center">
              <Image
                src="/image/logobg.png"
                alt="Maverix HRM Solutions"
                width={260}
                height={80}
                className="mx-auto drop-shadow-lg"
                priority
              />
            </div>

          </div>

          {/* Card */}
          <div className="bg-white/95 md:bg-white rounded-2xl shadow-xl p-6 sm:p-8 mt-4">
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-1">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Sign in to continue
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2563eb]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30 outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2563eb]">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30 outline-none"
                />
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm font-medium text-[#2563eb] hover:underline"
                >
                  Forgot password?
                </button>
              </div>


              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              
              {resetMessage && (
                <p className="text-sm text-green-600">{resetMessage}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              New user?{' '}
              <Link
                href="/signup"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

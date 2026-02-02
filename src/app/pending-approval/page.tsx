'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PendingApprovalPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        setEmail(user.email ?? null);

        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', user.id)
          .single();

        if (profile?.status === 'active') {
          router.replace('/dashboard/employee');
          return;
        }

        if (profile?.status === 'rejected') {
          router.replace('/login');
          return;
        }
      } catch (err) {
        console.error('Error checking status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();

    // Poll for status changes every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [router, supabase]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Approval</h1>
        </div>

        <p className="text-gray-600 mb-2">
          Your account is awaiting admin approval.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Email: <strong>{email}</strong>
        </p>

        <p className="text-gray-600 mb-6">
          We&apos;ll notify you once your account has been approved. This typically takes 1-2 business days.
        </p>

        <button
          onClick={handleLogout}
          className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

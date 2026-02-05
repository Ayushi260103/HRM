'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '@/components/Sidebar';

interface PayrollRecord {
  full_name: string;
  position: string;
  salary: number | null;
  joining_date: string;
  years_of_experience: number;
}

export default function EmployeePayrollPage() {
  const router = useRouter();
  const supabase = createClient();
  const [record, setRecord] = useState<PayrollRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }

        setEmail(user.email ?? null);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name, avatar_url, position, salary, joining_date, years_of_experience')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'employee') {
          router.replace('/dashboard');
          return;
        }

        setUserName(profile.full_name ?? null);
        setAvatarUrl(profile.avatar_url ?? null);
        setUserRole(profile.role ?? null);
        setRecord({
          full_name: profile.full_name ?? '—',
          position: profile.position ?? '—',
          salary: profile.salary,
          joining_date: profile.joining_date ?? '',
          years_of_experience: profile.years_of_experience ?? 0,
        });
      } catch (err) {
        console.error('Error loading payroll:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, supabase]);

  const formatCurrency = (v: number | null) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
  const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading payroll...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role={userRole} />

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Payroll</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              View your payroll details
            </p>
          </div>

          {record && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Employee Name
                  </p>
                  <p className="text-lg font-semibold text-gray-900">{record.full_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Designation
                  </p>
                  <p className="text-lg font-semibold text-gray-900">{record.position}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Salary
                  </p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(record.salary)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Joining Date
                  </p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(record.joining_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Years of Experience
                  </p>
                  <p className="text-lg font-semibold text-gray-900">{record.years_of_experience}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

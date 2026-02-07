'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/hooks/useSupabase';
import Image from 'next/image';
import { capitalizeName } from '@/lib/utils/string';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';

interface Employee {
  id: string;
  full_name: string | null;
  email_id: string | null;
  department: string | null;
  position: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const supabase = useSupabase();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setEmail(user.email ?? null);
      // setUserId(user.id);
      const { data: profile } = await supabase.from('profiles').select('role, full_name, avatar_url').eq('id', user.id).single();
      if (profile?.role !== 'hr') {
        router.replace('/dashboard/hr/home');
        return;
      }
      setUserName(profile?.full_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);

      const { data: emp } = await supabase
        .from('profiles')
        .select('id, full_name, email_id, department, position, phone, avatar_url, role')
        .eq('id', id)
        .in('role', ['employee', 'hr'])
        .single();
      setEmployee(emp ?? null);
      setLoading(false);
    };
    load();
  }, [id, router, supabase]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center employee-detail-page"
        style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
      >
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div
        className="min-h-screen flex flex-col employee-detail-page"
        style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
      >
        <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="hr" />
        <main className="admin-main flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg">Employee not found</p>
            <Link
              href="/dashboard/hr/employees"
              className="mt-4 inline-block px-4 py-2 rounded-lg btn-primary"
            >
              Back to All Employees
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col employee-detail-page"
      style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
    >
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="hr" />
      <main className="admin-main">
        <div className="w-full max-w-4xl mx-auto">
          <PageHeader
            title={capitalizeName(employee.full_name) || 'Employee'}
            subtitle={employee.position ? `(${employee.position})` : undefined}
            actions={
              <Link
                href="/dashboard/hr/employees"
                className="px-4 py-2 rounded-lg text-sm font-medium border btn-outline"
              >
                Back to All Employees
              </Link>
            }
          />
          <div className="card card-body rounded-xl p-6 mt-4 employee-detail-card">
            <div className="flex flex-col sm:flex-row gap-6">
              {employee.avatar_url ? (
                <Image src={employee.avatar_url} alt={employee.full_name || ''} width={120} height={120} className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                  {employee.full_name?.[0]?.toUpperCase() ?? '--'}
                </div>
              )}
              <div className="flex-1 space-y-2">
                <p><span className="font-semibold text-slate-500">Email:</span> <span>{employee.email_id || '--'}</span></p>
                <p><span className="font-semibold text-slate-500">Department:</span> <span>{employee.department || '--'}</span></p>
                <p><span className="font-semibold text-slate-500">Position:</span> <span>{employee.position || '--'}</span></p>
                <p><span className="font-semibold text-slate-500">Phone:</span> <span>{employee.phone || '--'}</span></p>
                <p><span className="font-semibold text-slate-500">Role:</span> <span className="capitalize">{employee.role || '--'}</span></p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

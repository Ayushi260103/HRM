'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { getCurrentYear } from '@/lib/utils/date';
import Sidebar from '@/components/Sidebar';
import PayrollNav from '@/components/PayrollNav';

import { 
  Calendar, 
  Award, 
  Wallet,
  Info,
  CreditCard
} from 'lucide-react';

interface PayrollRecord {
  full_name: string;
  position: string;
  salary: number | null;
  joining_date: string;
  years_of_experience: number;
  department: string;
}

export default function HRPayrollPage() {
  const router = useRouter();
  const supabase = useSupabase();
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
          .select('role, full_name, avatar_url, position, salary, joining_date, years_of_experience, department')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'hr') {
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
          department: profile.department ?? '—',
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

  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)]">
  //       <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
  //       <p className="text-[var(--text-secondary)] mt-4 font-medium animate-pulse">Accessing Payroll Securely...</p>
  //     </div>
  //   );
  // }

  return (
    <div className="h-screen flex bg-[var(--background)]"
    style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 80%)' }}>
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role={userRole} />

      {/* Main content using the .admin-main class from your CSS */}
      <main className="admin-main flex-1 overflow-y-auto">
      <div className="w-full max-w-6xl flex flex-col flex-1 min-h-0">
          <div className="shrink-0">
            <PayrollNav basePath="/dashboard/hr/payroll" />
          </div>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          ) :(
            <>
        <div className="max-w-4xl mx-auto mt-6">
          {/* Header Section */}
          <div className="page-header">
            <div>
              <h1 className="page-title text-indigo-900">Payroll Information</h1>
              <p className="page-subtitle">View your monthly compensation details.</p>
            </div>
            <div className="page-actions">
              <span className="badge-common badge-info">
                <Info size={14} />
                Financial Year {getCurrentYear()}
              </span>
            </div>
          </div>

          {record && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Profile Overview Card */}
              <div className="md:col-span-1">
                <div className="card profile-header-card p-6 flex flex-col items-center text-center h-full">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
                    {userName?.[0]}
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{record.full_name}</h2>
                  <p className="text-sm text-[var(--text-secondary)] font-medium">{record.position}</p>
                  
                  <div className="mt-6 pt-6 border-t border-[var(--border)] w-full space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-muted)] flex items-center gap-2"><Award size={14}/> Exp.</span>
                      <span className="font-semibold">{record.years_of_experience} {record.years_of_experience > 1 ? 'Years' : 'Year'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-muted)] flex items-center gap-2"><Calendar size={14}/> Joined</span>
                      <span className="font-semibold text-[var(--text-primary)]">{formatDate(record.joining_date)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary Details Card */}
              <div className="md:col-span-2 space-y-6">
                <div className="card pending-request-card">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-[var(--primary-light)] rounded-[var(--radius-md)] text-[var(--primary)]">
                        <Wallet size={20} />
                      </div>
                      <h3 className="font-bold text-[var(--text-primary)]">Compensation Details</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--background)] border border-[var(--border)]">
                        <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <CreditCard size={12} /> Monthly Gross
                        </p>
                        <p className="text-2xl font-black text-[var(--primary)]">{formatCurrency(record.salary)}</p>
                      </div>

                      <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--status-approved-bg)] border border-[var(--status-approved-border)]">
                        <p className="text-[var(--status-approved-text)] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          Payment Status
                        </p>
                        <p className="text-lg font-bold text-[var(--status-approved-text)]">Active & Verified</p>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 border-b border-[var(--border)] pb-2">
                        Summary
                      </h4>
                      <ul className="space-y-3">
                        <li className="flex justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">Designation Level</span>
                          <span className="font-medium text-[var(--text-primary)]">{record.position}</span>
                        </li>
                        <li className="flex justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">Department</span>
                          <span className="font-medium text-[var(--text-primary)]">{record.department}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Information Notice */}
                <div className="bg-[var(--primary-light)] border border-[var(--primary-muted)] p-4 rounded-[var(--radius-lg)] flex gap-3 items-start">
                   <Info size={18} className="text-[var(--primary)] shrink-0 mt-0.5" />
                   <p className="text-xs text-[var(--primary-hover)] leading-relaxed font-medium">
                     Your payroll is calculated based on the standard company policy. Tax deductions and variables are applied at the time of disbursement. Contact HR for a detailed breakdown.
                   </p>
                </div>
              </div>

            </div>
          )}
        </div>
        </>)}
        </div>
      </main>
    </div>
  );
}
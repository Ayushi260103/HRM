'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { capitalizeName } from '@/lib/utils/string';
import Sidebar from '@/components/Sidebar';

interface PayrollRecord {
  id: string;
  full_name: string;
  position: string;
  salary: number | null;
  joining_date: string;
  years_of_experience: number;
  role: string;
}

export default function AdminPayrollPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSalary, setEditSalary] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          .select('role, full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (!profile || profile.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }

        setUserName(profile.full_name ?? null);
        setAvatarUrl(profile.avatar_url ?? null);
        setUserRole(profile.role ?? null);

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, full_name, position, salary, joining_date, years_of_experience, role')
          .eq('status', 'active')
          .order('full_name', { ascending: true });

        if (fetchError) throw fetchError;
        setRecords(data || []);
      } catch (err) {
        console.error('Error loading payroll:', err);
        setError(err instanceof Error ? err.message : 'Failed to load payroll');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, supabase]);

  const handleStartEdit = (r: PayrollRecord) => {
    setEditingId(r.id);
    setEditSalary(r.salary != null ? String(r.salary) : '');
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditSalary('');
    setError(null);
  };

  const handleSaveSalary = async () => {
    if (!editingId) return;
    const salaryVal = parseFloat(editSalary);
    if (isNaN(salaryVal) || salaryVal < 0) {
      setError('Enter a valid salary (non-negative number)');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc('update_employee_salary', {
        emp_id: editingId,
        new_salary: salaryVal,
      });

      if (rpcError) throw rpcError;

      setRecords(prev =>
        prev.map(r => (r.id === editingId ? { ...r, salary: salaryVal } : r))
      );
      setEditingId(null);
      setEditSalary('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update salary');
    } finally {
      setSaving(false);
    }
  };

  const filtered = records.filter(
    r =>
      (r.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.position ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (v: number | null) =>
    v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
  const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <p className="text-sm text-slate-500">Loading payroll...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 80%)' }}
    >
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role={userRole} />

      <main className="admin-main mt-6">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="page-header mb-0">
              <div>
                <h1 className="page-title">Payroll</h1>
                <p className="page-subtitle">View and administer payroll for all employees</p>
              </div>
              <input
                type="text"
                placeholder="Search by name or designation..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-base w-full sm:w-72"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm mt-12 max-w-5xl mx-auto w-full">
            <div className="overflow-x-auto max-h-[65vh] overflow-y-auto no-scrollbar admin-table-wrap">
              <table className="min-w-full divide-y divide-slate-200 text-sm table-admin">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--primary-muted)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joining Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience (years)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Salary</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map(r => (
                    <tr key={r.id} className="transition-colors odd:bg-[rgba(59,130,246,0.06)] even:bg-[rgba(59,130,246,0.03)] hover:bg-[rgba(59,130,246,0.12)] hover:text-[var(--primary-hover)] group">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 group-hover:text-[var(--primary-hover)]">{capitalizeName(r.full_name) ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(r.joining_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 group-hover:text-[var(--primary-hover)]">{r.position ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-left">{r.years_of_experience ?? 0}</td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === r.id ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editSalary}
                              onChange={e => setEditSalary(e.target.value)}
                              className="input-base w-24"
                            />
                            <button onClick={handleSaveSalary} disabled={saving} className="text-[var(--primary)] hover:text-[var(--primary-hover)] text-xs font-medium transition-colors">
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEdit} className="text-slate-500 hover:text-slate-700 text-xs transition-colors">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          formatCurrency(r.salary)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right w-16">
                        {editingId === r.id ? null : (
                          <button
                            onClick={() => handleStartEdit(r)}
                            className="inline-flex items-center justify-center text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
                            aria-label="Edit salary"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="p-10 text-center text-slate-500 text-sm">No payroll records found</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

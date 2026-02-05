'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading payroll...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role={userRole} />

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payroll</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              View and manage payroll for all employees
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or designation..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Designation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Salary
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Joining Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Years of Experience
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Role
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.position ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === r.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editSalary}
                              onChange={e => setEditSalary(e.target.value)}
                              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                              onClick={handleSaveSalary}
                              disabled={saving}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span>{formatCurrency(r.salary)}</span>
                            <button
                              onClick={() => handleStartEdit(r)}
                              className="ml-2 text-blue-600 hover:text-blue-700 text-xs"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(r.joining_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.years_of_experience ?? 0}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                            r.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : r.role === 'hr'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {r.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No payroll records found</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

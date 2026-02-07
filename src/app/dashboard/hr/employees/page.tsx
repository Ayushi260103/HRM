'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import Image from 'next/image';
import { capitalizeName } from '@/lib/utils/string';
import Sidebar from '@/components/Sidebar';
import PageHeader from '@/components/PageHeader';
import { ProfileCard, ProfileField } from '@/components/ProfileCard';

interface Employee {
  id: string;
  full_name: string;
  email_id: string;
  department: string;
  position: string;
  phone: string;
  dob: string;
  hire_date: string;
  joining_date?: string;
  avatar_url?: string;
  role?: string;
  address?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  education?: string | null;
  salary?: number | null;
}

export default function EmployeesPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editData, setEditData] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        setEmail(user.email ?? null);
        // setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status, full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (!profile || (profile.role !== 'hr')) {
          router.replace('/dashboard/hr/home');
          return;
        }

        setUserName(profile?.full_name ?? null);
        setAvatarUrl(profile?.avatar_url ?? null);
        setUserRole(profile?.role ?? null);

        const { data: allEmployees, error: employeesError } = await supabase
          .from('profiles')
          .select('id, full_name, email_id, department, position, phone, dob, hire_date, joining_date, avatar_url, role, salary, address, gender, marital_status, education')
          .eq('status', 'active')
          .in('role', ['employee', 'hr'])
          .order('full_name', { ascending: true });

        if (employeesError) {
          console.error('Error loading employees:', employeesError);
          setEmployees([]);
        } else {
          setEmployees(allEmployees || []);
        }
      } catch (err) {
        console.error('Error loading employees:', err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [router, supabase]);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = (emp.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (emp.email_id ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDept || emp.department === filterDept;
    const matchesGender = !filterGender || (emp.gender ?? '').toLowerCase() === filterGender;
    return matchesSearch && matchesDept && matchesGender;
  });

  const departments = [...new Set(employees.map(e => e.department))];

  const rolePillStyle = (role: string) => {
    if (role === 'hr') {
      return { backgroundColor: 'var(--status-info-bg)', color: 'var(--status-info-text)' };
    }
    return { backgroundColor: 'var(--status-pending-bg)', color: 'var(--status-pending-text)' };
  };

  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
  const getAgeFromDob = (dob: string | null | undefined): number | null => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };
  const formatCurrency = (v: number | null | undefined) =>
    v != null ? `INR ${Number(v).toLocaleString('en-IN')}` : '--';

  // Sync editData when selected employee changes
  useEffect(() => {
    if (selectedEmployee) {
      setEditData({ ...selectedEmployee });
      setIsEditing(false);
      setDetailError(null);
    } else {
      setEditData(null);
    }
  }, [selectedEmployee]);

  const handleSaveDetail = async () => {
    if (!editData || !selectedEmployee) return;
    if (editData.joining_date && editData.hire_date && editData.joining_date < editData.hire_date) {
      setDetailError('Joining date must be on or after hire date');
      return;
    }
    if (editData.salary != null && (isNaN(editData.salary) || editData.salary < 0)) {
      setDetailError('Enter a valid salary (non-negative number)');
      return;
    }
    try {
      setSaving(true);
      setDetailError(null);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          email_id: editData.email_id,
          department: editData.department,
          position: editData.position,
          phone: editData.phone,
          dob: editData.dob,
          hire_date: editData.hire_date,
          joining_date: editData.joining_date ?? null,
          salary: editData.salary != null ? editData.salary : null,
          address: editData.address ?? null,
          gender: editData.gender ?? null,
          marital_status: editData.marital_status ?? null,
          education: editData.education ?? null,
        })
        .eq('id', selectedEmployee.id);
      if (error) throw error;
      setSelectedEmployee(editData);
      setEmployees(prev => prev.map(e => (e.id === selectedEmployee.id ? editData : e)));
      setIsEditing(false);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDetail = () => {
    setEditData(selectedEmployee ? { ...selectedEmployee } : null);
    setIsEditing(false);
    setDetailError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <p className="text-sm sm:text-base" style={{ color: '#64748b' }}>Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role={userRole} />

      <main
        className="admin-main mt-6"
        style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
      >
        <div className="w-full max-w-6xl mx-auto">
          <PageHeader title="All Employees" />
          <div className="h-6" />

          <div className="flex flex-col lg:flex-row lg:items-center gap-6 min-h-[calc(100vh-220px)]">
            {/* Filters */}
            <div className="w-full lg:w-72 shrink-0">
              <div className="sticky top-6 h-[calc(100vh-220px)]">
                <div
                  className="card card-body rounded-xl p-4 sm:p-6 h-full flex flex-col"
                  style={{ backgroundImage: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)' }}
                >
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-100">
                        Search by Name or Email
                      </label>
                      <input
                        type="text"
                        placeholder="Enter name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 text-sm rounded-lg outline-none transition-all bg-white/90 text-slate-900 placeholder:text-slate-500 border border-white/40 focus:ring-2 focus:ring-white/60"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-100">
                        Filter by Department
                      </label>
                      <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 text-sm rounded-lg outline-none transition-all bg-white/90 text-slate-900 border border-white/40 focus:ring-2 focus:ring-white/60"
                      >
                        <option value="">All Departments</option>
                        {departments.filter(Boolean).map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-100">
                        Filter by Gender
                      </label>
                      <select
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2 text-sm rounded-lg outline-none transition-all bg-white/90 text-slate-900 border border-white/40 focus:ring-2 focus:ring-white/60"
                      >
                        <option value="">All Genders</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm mt-auto pt-4 text-slate-100/80">
                    Showing <span className="font-semibold">{filteredEmployees.length}</span> of <span className="font-semibold">{employees.length}</span> employees
                  </p>
                </div>
              </div>
            </div>

            {/* Employee Cards */}
            <div className="flex-1 min-h-0">
              <div className="max-h-[calc(100vh-220px)] overflow-y-auto no-scrollbar pr-1">
                {filteredEmployees.length === 0 ? (
                  <div className="card card-body rounded-xl p-8 sm:p-12 text-center" style={{ borderColor: '#e2e8f0' }}>
                    <p className="text-base sm:text-lg" style={{ color: '#1e293b' }}>No employees found</p>
                    <p className="text-xs sm:text-sm mt-1" style={{ color: '#64748b' }}>Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.map(emp => (
                      <div
                        key={emp.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedEmployee(emp)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEmployee(emp); } }}
                        className="card employee-card rounded-xl overflow-hidden flex flex-row transition-all min-h-[120px] cursor-pointer group"
                      >
                        {/* Left: full-height image */}
                        <div className="w-20 sm:w-24 flex-shrink-0 self-stretch rounded-l-xl overflow-hidden relative bg-gray-100" style={{ minHeight: 120 }}>
                          {emp.avatar_url ? (
                            <Image
                              src={emp.avatar_url}
                              alt={emp.full_name}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold bg-sky-100 text-blue-600">
                              {emp.full_name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                        </div>

                        {/* Right: name, position, role at bottom right */}
                        <div className="flex-1 min-w-0 flex flex-col p-3 sm:p-4 justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm sm:text-base truncate text-slate-800 transition-colors group-hover:text-blue-700" title={emp.full_name || undefined}>
                                {capitalizeName(emp.full_name) || '--'}
                              </p>
                              <p className="text-xs mt-0.5 truncate text-slate-500 transition-colors group-hover:text-blue-600" title={emp.position || undefined}>
                                {emp.position ? `(${emp.position})` : '--'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }}
                              className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-200 bg-white flex-shrink-0 hover:opacity-90"
                              title="View profile"
                              aria-label={`View profile for ${emp.full_name}`}
                            >
                              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M8 7h9v9" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex justify-end mt-2">
                            <span
                              className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                              style={rolePillStyle(emp.role || 'employee')}
                            >
                              {emp.role === 'hr' ? 'HR' : 'Employee'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Employee detail overlay (profile-style card) */}
          {selectedEmployee && editData && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px]"
              onClick={() => setSelectedEmployee(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="employee-detail-title"
            >
              <div
                className="bg-white rounded-2xl shadow-xl border border-[var(--border)] w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-[var(--border)] px-4 sm:px-6 py-3 flex items-center justify-between z-10">
                  <h2 id="employee-detail-title" className="text-lg font-semibold text-slate-900">Employee details</h2>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveDetail}
                          disabled={saving}
                          className="px-4 py-2 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 btn-primary"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDetail}
                          disabled={saving}
                          className="px-4 py-2 rounded-lg font-semibold btn-outline transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 rounded-lg font-semibold text-white transition-colors btn-primary"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(null)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {detailError && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {detailError}
                    </div>
                  )}

                  {/* Top Card: avatar, name, position|dep, role (pill), top right email & phone only */}
                  <div className="rounded-xl shadow-sm border border-[var(--border)] p-6 mb-6 employee-overlay-card">
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                      <div className="shrink-0">
                        {selectedEmployee.avatar_url ? (
                          <Image
                            src={selectedEmployee.avatar_url}
                            alt={selectedEmployee.full_name}
                            width={96}
                            height={96}
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                            {selectedEmployee.full_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-slate-900">{capitalizeName(editData.full_name) || '--'}</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          <span className="text-[var(--primary-hover)] font-medium">{editData.department || '--'}</span>
                          &nbsp; • &nbsp;
                          <span className="text-[var(--primary-hover)] font-medium">{editData.position || '--'}</span>
                        </p>
                        <span
                          className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={rolePillStyle(editData.role || 'employee')}
                        >
                          {editData.role === 'hr' ? 'HR' : 'Employee'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm w-full sm:w-auto sm:min-w-[200px]">
                        <div>
                          <p className="text-[var(--primary-hover)]">Email</p>
                          <p className="text-slate-900 font-medium mt-0.5 break-all">{editData.email_id || '--'}</p>
                        </div>
                        <div>
                          <p className="text-[var(--primary-hover)]">Phone</p>
                          <p className="text-slate-900 font-medium mt-0.5">{editData.phone || '--'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal & Professional - editable */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileCard
                      title="Personal information"
                      onEdit={!isEditing ? () => setIsEditing(true) : undefined}
                      className="employee-overlay-card"
                    >
                      <ProfileField
                        label="Date of birth"
                        value={
                          isEditing ? (
                            <input
                              type="date"
                              value={toDateInput(editData.dob)}
                              onChange={e => setEditData(prev => prev ? { ...prev, dob: e.target.value } : prev)}
                              className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            />
                          ) : (
                            (editData.dob ? formatDate(editData.dob) : null) ?? '--'
                          )
                        }
                      />
                      <ProfileField label="Age" value={getAgeFromDob(editData.dob) != null ? String(getAgeFromDob(editData.dob)) : '--'} />
                      <ProfileField
                        label="Gender"
                        value={
                          isEditing ? (
                            <select
                              value={editData.gender ?? ''}
                              onChange={e => setEditData(prev => prev ? { ...prev, gender: e.target.value || null } : prev)}
                              className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            >
                              <option value="">--</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                          ) : (
                            (editData.gender ? editData.gender.charAt(0).toUpperCase() + editData.gender.slice(1).toLowerCase() : '--')
                          )
                        }
                      />
                      <ProfileField
                        label="Marital status"
                        value={
                          isEditing ? (
                            <select
                              value={editData.marital_status ?? ''}
                              onChange={e => setEditData(prev => prev ? { ...prev, marital_status: e.target.value || null } : prev)}
                              className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            >
                              <option value="">--</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          ) : (
                            (editData.marital_status ? editData.marital_status.charAt(0).toUpperCase() + editData.marital_status.slice(1).toLowerCase() : '--')
                          )
                        }
                      />
                      <ProfileField
                        label="Address"
                        value={
                          isEditing ? (
                            <input
                              type="text"
                              value={editData.address ?? ''}
                              onChange={e => setEditData(prev => prev ? { ...prev, address: e.target.value } : prev)}
                              placeholder="--"
                              className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            />
                          ) : (
                            (editData.address && editData.address.trim()) || '--'
                          )
                        }
                      />
                      <ProfileField
                        label="Education"
                        value={
                          isEditing ? (
                            <textarea
                              value={editData.education ?? ''}
                              onChange={e => setEditData(prev => prev ? { ...prev, education: e.target.value } : prev)}
                              placeholder="Enter your highest education"
                              rows={3}
                              className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none resize-y"
                            />
                          ) : (
                            (editData.education && editData.education.trim()) || '--'
                          )
                        }
                      />
                    </ProfileCard>
                    <ProfileCard
                      title="Professional information"
                      onEdit={!isEditing ? () => setIsEditing(true) : undefined}
                      className="employee-overlay-card"
                    >
                      <ProfileField
                        label="Department"
                        value={
                          isEditing ? (
                            <input
                              type="text"
                              value={editData.department ?? ''}
                              onChange={e => setEditData(prev => prev ? { ...prev, department: e.target.value } : prev)}
                              className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            />
                          ) : (
                            editData.department || '--'
                          )
                        }
                      />
                      <ProfileField
                        label="Position"
                        value={
                          isEditing ? (
                            <input
                              type="text"
                              value={editData.position ?? ''}
                              onChange={e => setEditData(prev => prev ? { ...prev, position: e.target.value } : prev)}
                              className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            />
                          ) : (
                            editData.position || '--'
                          )
                        }
                      />
                      <ProfileField
                        label="Joining date"
                        value={
                          isEditing ? (
                            <input
                              type="date"
                              value={toDateInput(editData.joining_date)}
                              onChange={e => setEditData(prev => prev ? { ...prev, joining_date: e.target.value } : prev)}
                              className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            />
                          ) : (
                            (editData.joining_date ? formatDate(editData.joining_date) : null) ?? '--'
                          )
                        }
                      />
                      <ProfileField
                        label="Salary"
                        value={
                          isEditing ? (
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={editData.salary != null ? editData.salary : ''}
                              onChange={e => {
                                const val = e.target.value;
                                setEditData(prev => prev ? { ...prev, salary: val === '' ? null : parseFloat(val) || 0 } : prev);
                              }}
                              placeholder="--"
                              className="w-full text-right rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            />
                          ) : (
                            formatCurrency(editData.salary)
                          )
                        }
                      />
                    </ProfileCard>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

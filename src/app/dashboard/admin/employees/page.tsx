'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';

interface Employee {
  id: string;
  full_name: string;
  email_id: string;
  department: string;
  position: string;
  phone: string;
  dob: string;
  hire_date: string;
  avatar_url?: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState<string>('');
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        setEmail(user.email ?? null);

        // Check if user is HR or Admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status, full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (!profile || (profile.role !== 'hr' && profile.role !== 'admin')) {
          router.replace('/dashboard');
          return;
        }

        setUserName(profile?.full_name ?? null);
        setAvatarUrl(profile?.avatar_url ?? null)
        setUserRole(profile?.role ?? null);

        // Fetch all active employees
        const { data: allEmployees } = await supabase
          .from('profiles')
          .select('id, full_name, email_id, department, position, phone, dob, hire_date, avatar_url')
          .eq('status', 'active')
          .eq('role', 'employee')
          .order('full_name', { ascending: true });

        setEmployees(allEmployees || []);
      } catch (err) {
        console.error('Error loading employees:', err);
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
    return matchesSearch && matchesDept;
  });

  const departments = [...new Set(employees.map(e => e.department))];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading employees...</p></div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role={userRole} />

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">View and manage all employee profiles</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  🔍 Search by Name or Email
                </label>
                <input
                  type="text"
                  placeholder="Enter name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  🏢 Filter by Department
                </label>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-4">
              Showing <span className="font-semibold">{filteredEmployees.length}</span> of <span className="font-semibold">{employees.length}</span> employees
            </p>
          </div>

          {/* Employees Table/Cards */}
          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
              <div className="text-4xl sm:text-5xl mb-3">👥</div>
              <p className="text-gray-600 text-base sm:text-lg">No employees found</p>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avatar</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Position</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Hire Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredEmployees.map(emp => (
                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {emp.avatar_url ? (
                              <Image
                                src={emp.avatar_url}
                                alt={emp.full_name}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                                {emp.full_name?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium text-gray-900 text-sm">{emp.full_name}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm">{emp.email_id}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm">{emp.department}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm">{emp.position}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm">{emp.phone}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-600 text-sm">{new Date(emp.hire_date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-4">
                {filteredEmployees.map(emp => (
                  <div key={emp.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-4">
                      {emp.avatar_url ? (
                        <Image
                          src={emp.avatar_url}
                          alt={emp.full_name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 flex-shrink-0">
                          {emp.full_name?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{emp.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.position}</p>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</p>
                        <p className="text-gray-900 break-all text-xs">{emp.email_id}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</p>
                        <p className="text-gray-900">{emp.department}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</p>
                        <p className="text-gray-900">{emp.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hire Date</p>
                        <p className="text-gray-900">{new Date(emp.hire_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

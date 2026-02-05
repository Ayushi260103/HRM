'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useSupabase } from '@/hooks/useSupabase';

const NAV_ITEMS = {
    admin: [
      { label: 'Dashboard', href: '/dashboard/admin', icon: '📊' },
      { label: 'Pending Requests', href: '/dashboard/admin/pending', icon: '✅' },
      { label: 'All Employees', href: '/dashboard/admin/employees', icon: '👥' },
      { label: 'Attendance', href: '/dashboard/admin/attendance', icon: '📅' },
      { label: 'Leave Management', href: '/dashboard/admin/leaves', icon: '🏖️' },
      { label: 'Payroll', href: '/dashboard/admin/payroll', icon: '💰' },
      { label: 'Upcoming Birthdays', href: '/dashboard/admin/upcoming-birthdays', icon: '🎂' },
      { label: 'Announcements', href: '/dashboard/admin/announcements', icon: 'A' },
      { label: 'Profile', href: '/dashboard/admin/profile', icon: '👤' },
    ],
    hr: [
      { label: 'Dashboard', href: '/dashboard/hr', icon: '📊' },
      { label: 'All Employees', href: '/dashboard/hr/employees', icon: '👥' },
      { label: 'Attendance', href: '/dashboard/hr/attendance', icon: '📅' },
      { label: 'Leave Management', href: '/dashboard/hr/leaves', icon: '🏖️' },
      { label: 'Payroll', href: '/dashboard/hr/payroll', icon: '💰' },
      { label: 'Upcoming Birthdays', href: '/dashboard/hr/upcoming-birthdays', icon: '🎂' },
      { label: 'Announcements', href: '/dashboard/hr/announcements', icon: 'A' },
      { label: 'Profile', href: '/dashboard/hr/profile', icon: '👤' },
    ],
    employee: [
      { label: 'Dashboard', href: '/dashboard/employee', icon: '📊' },
      { label: 'Payroll', href: '/dashboard/employee/payroll', icon: '💰' },
      { label: 'Upcoming Birthdays', href: '/dashboard/employee/upcoming-birthdays', icon: '🎂' },
      { label: 'Announcements', href: '/dashboard/employee/announcements', icon: 'A' },
      { label: 'Profile', href: '/dashboard/employee/profile', icon: '👤' },
      { label: 'Leaves', href: '/dashboard/employee/leaves', icon: '🏖️' },
    ],
} as const;

interface SidebarProps {
  userEmail?: string | null;
  userName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

export default function Sidebar({ userEmail, userName, avatarUrl, role }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useSupabase();

  const isActive = useCallback((path: string) => pathname.startsWith(path), [pathname]);

  const items = useMemo(
    () => NAV_ITEMS[role as keyof typeof NAV_ITEMS] ?? NAV_ITEMS.employee,
    [role]
  );

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [supabase, router]);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 overflow-y-auto`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">HRM</h1>
            <p className="text-xs text-gray-500 mt-1">Human Resource Management</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-gray-200 p-4 space-y-4">
            {(userName || userEmail) && (
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={userName || 'User'}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {(userName || userEmail)?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {userName && <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>}
                  {userEmail && <p className="text-xs text-gray-500 truncate">{userEmail}</p>}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"
            >
              <span>🚪</span>
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}



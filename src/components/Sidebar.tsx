'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useSupabase } from '@/hooks/useSupabase';
import { capitalizeName } from '@/lib/utils/string';
import { SidebarIcon, IconLogout, type SidebarIconName } from './SidebarIcons';

const NAV_ITEMS = {
  admin: [
    { label: 'Home', href: '/dashboard/admin/home', icon: 'dashboard' as SidebarIconName },
    { label: 'Pending Requests', href: '/dashboard/admin/pending', icon: 'pending' as SidebarIconName },
    { label: 'All Employees', href: '/dashboard/admin/employees', icon: 'employees' as SidebarIconName },
    { label: 'Attendance', href: '/dashboard/admin/attendance', icon: 'attendance' as SidebarIconName },
    { label: 'Leave Management', href: '/dashboard/admin/leaves', icon: 'leaves' as SidebarIconName },
    { label: 'Payroll', href: '/dashboard/admin/payroll', icon: 'payroll' as SidebarIconName },
    { label: 'Moments That Matter', href: '/dashboard/admin/moments', icon: 'moments' as SidebarIconName },
    { label: 'Announcements', href: '/dashboard/admin/announcements', icon: 'announcements' as SidebarIconName },
    { label: 'Profile', href: '/dashboard/admin/profile', icon: 'profile' as SidebarIconName },
  ],
  hr: [
    { label: 'Dashboard', href: '/dashboard/hr', icon: 'dashboard' as SidebarIconName },
    { label: 'All Employees', href: '/dashboard/hr/employees', icon: 'employees' as SidebarIconName },
    { label: 'Attendance', href: '/dashboard/hr/attendance', icon: 'attendance' as SidebarIconName },
    { label: 'Leave Management', href: '/dashboard/hr/leaves', icon: 'leaves' as SidebarIconName },
    { label: 'Payroll', href: '/dashboard/hr/payroll', icon: 'payroll' as SidebarIconName },
    { label: 'Moments That Matter', href: '/dashboard/hr/moments', icon: 'moments' as SidebarIconName },
    { label: 'Announcements', href: '/dashboard/hr/announcements', icon: 'announcements' as SidebarIconName },
    { label: 'Profile', href: '/dashboard/hr/profile', icon: 'profile' as SidebarIconName },
  ],
  employee: [
    { label: 'Dashboard', href: '/dashboard/employee', icon: 'dashboard' as SidebarIconName },
    { label: 'Payroll', href: '/dashboard/employee/payroll', icon: 'payroll' as SidebarIconName },
    { label: 'Moments That Matter', href: '/dashboard/employee/moments', icon: 'moments' as SidebarIconName },
    { label: 'Announcements', href: '/dashboard/employee/announcements', icon: 'announcements' as SidebarIconName },
    { label: 'Profile', href: '/dashboard/employee/profile', icon: 'profile' as SidebarIconName },
    { label: 'Leaves', href: '/dashboard/employee/leaves', icon: 'leaves' as SidebarIconName },
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
        className={`fixed left-0 top-0 z-40 h-screen w-64 max-w-[85vw] bg-white border-r transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 overflow-y-auto`}
        style={{ borderColor: 'var(--border)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)' }}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>HRM</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Human Resource Management</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                  isActive(item.href) ? 'font-semibold' : 'hover:bg-gray-100'
                }`}
                style={
                  isActive(item.href)
                    ? { backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }
                    : { color: 'var(--text-primary)' }
                }
              >
                <SidebarIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="border-t p-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
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
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                    style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
                  >
                    {(userName || userEmail)?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {userName && <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{capitalizeName(userName)}</p>}
                  {userEmail && <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{userEmail}</p>}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-50 hover:text-red-600"
              style={{ color: 'var(--text-secondary)' }}
            >
              <IconLogout />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button - safe area for notched devices */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 lg:hidden p-2.5 rounded-lg bg-white border text-gray-600 hover:bg-gray-50 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
        style={{ top: 'max(1rem, env(safe-area-inset-top))', left: 'max(1rem, env(safe-area-inset-left))', borderColor: 'var(--border)' }}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

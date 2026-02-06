'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Leave requests', href: '/dashboard/admin/leaves/leave-requests' },
  { label: 'Leave allocation', href: '/dashboard/admin/leaves/leave-allocation' },
  { label: 'Weekend allocation', href: '/dashboard/admin/leaves/weekend-allocation' },
  { label: 'Holiday allocation', href: '/dashboard/admin/leaves/holiday-allocation' },
] as const

export default function LeavesNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
      {TABS.map(({ label, href }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive ? 'border-[var(--primary)]' : 'border-transparent hover:bg-gray-100'
            }`}
            style={isActive ? { color: 'var(--primary)' } : { color: 'var(--text-secondary)' }}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

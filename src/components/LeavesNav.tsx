'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type LeavesNavProps = {
  basePath?: '/dashboard/admin/leaves' | '/dashboard/hr/leaves'
}

export default function LeavesNav({ basePath = '/dashboard/admin/leaves' }: LeavesNavProps) {
  const pathname = usePathname()

  const tabs = [
    { label: 'Leave requests', href: `${basePath}/leave-requests` },
    { label: 'Leave allocation', href: `${basePath}/leave-allocation` },
    { label: 'Weekend allocation', href: `${basePath}/weekend-allocation` },
    { label: 'Holiday allocation', href: `${basePath}/holiday-allocation` },
    ...(basePath === '/dashboard/hr/leaves' ? [{ label: 'Leave Apply', href: `${basePath}/leave-apply` }] : []),
  ] as const

  return (
    <nav className="flex flex-wrap gap-0.5 border-b border-slate-200 mb-6">
      {tabs.map(({ label, href }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? 'border-indigo-400 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

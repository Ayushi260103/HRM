'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type PayrollNavProps = {
  basePath?: '/dashboard/hr/payroll'
}

export default function PayrollNav({ basePath = '/dashboard/hr/payroll' }: PayrollNavProps) {
  const pathname = usePathname()

  const tabs = [
    { label: 'Employees Payroll', href: `${basePath}/employees_payroll` },
    { label: 'HR Payroll', href: `${basePath}/hr_payroll` },
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

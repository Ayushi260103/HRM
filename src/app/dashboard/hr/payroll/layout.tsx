'use client'

import { usePathname } from 'next/navigation'
import { useRef, useEffect } from 'react'

const TAB_PATHS = [
  '/dashboard/hr/payroll/employees_payroll',
  '/dashboard/hr/payroll/hr_payroll',
] as const

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPathRef = useRef<string | null>(null)

  const currentIndex = TAB_PATHS.indexOf(pathname as typeof TAB_PATHS[number])
  const prevIndex = prevPathRef.current !== null
    ? TAB_PATHS.indexOf(prevPathRef.current as typeof TAB_PATHS[number])
    : -1

  const direction =
    currentIndex >= 0 && prevIndex >= 0 && currentIndex !== prevIndex
      ? currentIndex > prevIndex
        ? 'right'
        : 'left'
      : null

  useEffect(() => {
    prevPathRef.current = pathname
  }, [pathname])

  const animationClass =
    direction === 'right'
      ? 'leave-tab-enter-right'
      : direction === 'left'
        ? 'leave-tab-enter-left'
        : ''

  return (
    <div key={pathname} className={animationClass}>
      {children}
    </div>
  )
}

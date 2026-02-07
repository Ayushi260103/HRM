'use client'

import { usePathname } from 'next/navigation'
import { useRef, useEffect } from 'react'

const TAB_PATHS = [
  '/dashboard/hr/leaves/leave-requests',
  '/dashboard/hr/leaves/leave-allocation',
  '/dashboard/hr/leaves/weekend-allocation',
  '/dashboard/hr/leaves/holiday-allocation',
] as const

export default function LeavesLayout({ children }: { children: React.ReactNode }) {
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

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HRPayrollHomePage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/dashboard/hr/payroll/employees_payroll')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <p className="text-sm text-slate-500">Redirecting to employees payroll...</p>
    </div>
  )
}

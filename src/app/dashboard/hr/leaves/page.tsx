'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HRLeavesHomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/hr/leaves/leave-requests')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <p className="text-sm text-slate-500">Redirecting to leave requests...</p>
    </div>
  )
}

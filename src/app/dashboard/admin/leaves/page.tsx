'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLeavesHomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/admin/leaves/leave-requests')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Redirecting to leave requests...</p>
    </div>
  )
}

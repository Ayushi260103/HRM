'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Log = {
    id: string
    user_id: string
    clock_in: string
    clock_out: string | null
    profile: {
      full_name: string | null
      role: string | null
    } | null
  }


export default function AttendancePage() {
    const router = useRouter()
    const [logs, setLogs] = useState<Log[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        const loadLogs = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.replace('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, status')
                .eq('id', user.id)
                .single()

            if (profile?.status !== 'active') {
                router.replace('/pending-approval')
                return
            }

            if (profile?.role !== 'hr' && profile?.role !== 'admin') {
                router.replace('/dashboard')
                return
            }

            

            // 1️⃣ Get attendance logs
const { data: attendance, error } = await supabase
.from('attendance_logs')
.select('id, user_id, clock_in, clock_out')
.order('clock_in', { ascending: false })

if (error || !attendance) {
setLoading(false)
return
}

// 2️⃣ Get all related user IDs
const userIds = [...new Set(
    attendance
      .map(log => log.user_id)
      .filter(Boolean) // removes null/undefined
  )]

// 3️⃣ Fetch profiles for those users
const { data: profiles, error: profileError } = await supabase
.from('profiles')
.select('id, full_name, role')
.in('id', userIds)

if (profileError) {
    console.error(profileError)
  }
// 4️⃣ Create a lookup map
// This creates a lookup object (profileMap) where each user's id is the key and their profile data is the value.
// It makes it easy and fast to access profile information for a given user_id later.
const profileMap = Object.fromEntries(
(profiles || []).map(p => [p.id, p])
)
if (attendance.length === 0) {
    setLogs([])
    setLoading(false)
    return
  }
  
// 5️⃣ Merge attendance + profile
const mergedLogs: Log[] = attendance.map(log => ({
...log,
profile: profileMap[log.user_id] || null
}))

setLogs(mergedLogs)
setLoading(false)   
        }

        loadLogs()
    }, [router])

    if (loading) return <p className="p-6">Loading attendance...</p>

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard/hr" className="text-sm text-gray-500 hover:text-gray-700">
                    ← Back
                </Link>
                <h1 className="text-2xl font-semibold">Attendance Logs</h1>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                        <tr>
                            <th className="p-3">Employee</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Clock In</th>
                            <th className="p-3">Clock Out</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className="border-t">
                                <td className="p-3">
                                    {log.profile?.full_name || '—'}
                                </td>

                                <td className="p-3 capitalize">
                                    {log.profile?.role || '—'}
                                </td>
                                <td className="p-3">{new Date(log.clock_in).toLocaleString()}</td>
                                <td className="p-3">
                                    {log.clock_out
                                        ? new Date(log.clock_out).toLocaleString()
                                        : '—'}
                                </td>
                                <td className="p-3">
                                    {log.clock_out ? (
                                        <span className="text-red-600">Checked Out</span>
                                    ) : (
                                        <span className="text-green-600">Working</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

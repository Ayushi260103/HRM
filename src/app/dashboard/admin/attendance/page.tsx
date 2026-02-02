'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

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
    const [email, setEmail] = useState<string | null>(null)
    const [userName, setUserName] = useState<string | null>(null)

    useEffect(() => {
        const supabase = createClient()

        const loadLogs = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.replace('/login')
                return
            }

            setEmail(user.email ?? null)

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, status, full_name')
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

            setUserName(profile?.full_name ?? null)

            

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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading attendance...</p></div>

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Sidebar userEmail={email} userName={userName} role="admin" />

            <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
                <div className="w-full max-w-7xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Attendance Logs</h1>
                        <p className="text-gray-600 mt-2">View all employee clock in/out records</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-900">Employee</th>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-900">Role</th>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-900">Clock In</th>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-900">Clock Out</th>
                                        <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-900">
                                                {log.profile?.full_name || '—'}
                                            </td>

                                            <td className="px-6 py-4 text-gray-700 capitalize">
                                                {log.profile?.role || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">{new Date(log.clock_in).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {log.clock_out
                                                    ? new Date(log.clock_out).toLocaleString()
                                                    : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.clock_out ? (
                                                    <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold">Checked Out</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">Working</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {logs.length === 0 && (
                            <div className="p-12 text-center">
                                <p className="text-gray-500">No attendance records found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

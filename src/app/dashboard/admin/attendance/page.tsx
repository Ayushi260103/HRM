'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

type Log = {
    id: string
    user_id: string
    clock_in: string | null
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
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'clocked_out' | 'not_clocked_in'>('all')
    const [rangeFilter, setRangeFilter] = useState<'last_15' | 'last_30' | 'prev_month' | 'last_3_months' | 'last_6_months' | 'year'>('last_15')

    const getRange = () => {
        const now = new Date()
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        const start = new Date(end)

        if (rangeFilter === 'last_15') start.setDate(start.getDate() - 15)
        if (rangeFilter === 'last_30') start.setDate(start.getDate() - 30)
        if (rangeFilter === 'last_3_months') start.setMonth(start.getMonth() - 3)
        if (rangeFilter === 'last_6_months') start.setMonth(start.getMonth() - 6)
        if (rangeFilter === 'year') {
            start.setFullYear(end.getFullYear(), 0, 1)
        }
        if (rangeFilter === 'prev_month') {
            const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            return { startISO: firstOfPrevMonth.toISOString(), endISO: firstOfThisMonth.toISOString() }
        }

        return { startISO: start.toISOString(), endISO: end.toISOString() }
    }

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

            

            const getLocalDayRange = () => {
                const now = new Date()
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                return { startISO: start.toISOString(), endISO: end.toISOString() }
            }

            const { startISO, endISO } = getLocalDayRange()

            // 1️⃣ Get all employee profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('role', 'employee')

            if (profileError || !profiles) {
                if (profileError) console.error(profileError)
                setLogs([])
                setLoading(false)
                return
            }

            // 2️⃣ Get today's attendance logs
            const { data: attendance, error } = await supabase
                .from('attendance_logs')
                .select('id, user_id, clock_in, clock_out')
                .gte('clock_in', startISO)
                .lt('clock_in', endISO)
                .order('clock_in', { ascending: false })

            if (error || !attendance) {
                setLoading(false)
                return
            }

            // 3️⃣ Build lookup map of latest log per user
            const attendanceMap: Record<string, typeof attendance[number]> = {}
            for (const log of attendance) {
                if (!attendanceMap[log.user_id]) {
                    attendanceMap[log.user_id] = log
                }
            }

            // 4️⃣ Merge profiles + today's attendance
            const mergedLogs: Log[] = profiles.map(profile => {
                const log = attendanceMap[profile.id]
                return {
                    id: log?.id ?? `${profile.id}-today`,
                    user_id: profile.id,
                    clock_in: log?.clock_in ?? null,
                    clock_out: log?.clock_out ?? null,
                    profile,
                }
            })

            setLogs(mergedLogs)
            setLoading(false)   
        }

        loadLogs()
    }, [router])

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading attendance...</p></div>

    const filteredLogs = logs.filter(log => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'not_clocked_in') return !log.clock_in
        if (statusFilter === 'active') return !!log.clock_in && !log.clock_out
        return !!log.clock_in && !!log.clock_out
    })

    const downloadReport = () => {
        const run = async () => {
            const supabase = createClient()
            const { startISO, endISO } = getRange()

            const { data: attendance, error } = await supabase
                .from('attendance_logs')
                .select('id, user_id, clock_in, clock_out')
                .gte('clock_in', startISO)
                .lt('clock_in', endISO)
                .order('clock_in', { ascending: true })

            if (error || !attendance) return

            const userIds = [...new Set(attendance.map(log => log.user_id).filter(Boolean))]
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .in('id', userIds)

            const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

            const header = ['Employee', 'Role', 'Clock In', 'Clock Out', 'Status']
            const rows = attendance.map(log => {
                const status = !log.clock_in
                    ? 'Not Clocked In'
                    : log.clock_out
                        ? 'Clocked Out'
                        : 'Active'
                const profile = profileMap[log.user_id]
                return [
                    profile?.full_name || '',
                    profile?.role || '',
                    log.clock_in ? new Date(log.clock_in).toLocaleString() : '',
                    log.clock_out ? new Date(log.clock_out).toLocaleString() : '',
                    status,
                ]
            })

            const csv = [header, ...rows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n')

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = 'attendance-report.csv'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        }

        void run()
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Sidebar userEmail={email} userName={userName} role="admin" />

            <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
                <div className="w-full max-w-7xl">
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Attendance Logs</h1>
                            <p className="text-gray-600 mt-2">View all employee clock in/out records</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={rangeFilter}
                                onChange={e => setRangeFilter(e.target.value as typeof rangeFilter)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                            >
                                <option value="last_15">Last 15 days</option>
                                <option value="last_30">Last 30 days</option>
                                <option value="prev_month">Previous month</option>
                                <option value="last_3_months">Last 3 months</option>
                                <option value="last_6_months">Last 6 months</option>
                                <option value="year">Complete year</option>
                            </select>
                            <button
                                onClick={downloadReport}
                                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800"
                            >
                                Download Report
                            </button>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                                statusFilter === 'all'
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                                statusFilter === 'active'
                                    ? 'bg-green-600 text-white border-green-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter('clocked_out')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                                statusFilter === 'clocked_out'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            Clocked Out
                        </button>
                        <button
                            onClick={() => setStatusFilter('not_clocked_in')}
                            className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                                statusFilter === 'not_clocked_in'
                                    ? 'bg-gray-600 text-white border-gray-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            Not Clocked In
                        </button>
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
                                    {filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-900">
                                                {log.profile?.full_name || '—'}
                                            </td>

                                            <td className="px-6 py-4 text-gray-700 capitalize">
                                                {log.profile?.role || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {log.clock_in ? new Date(log.clock_in).toLocaleString() : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                {log.clock_out ? new Date(log.clock_out).toLocaleString() : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {!log.clock_in ? (
                                                    <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-full text-xs font-semibold">Not Clocked In</span>
                                                ) : log.clock_out ? (
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">Clocked Out</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">Active</span>
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


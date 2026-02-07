'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'
import Sidebar from '@/components/Sidebar'
import { getLocalDateString, getLocalDayOfWeek } from '@/lib/utils/date'

type DayStatus = 'holiday' | 'on_leave' | 'week_off' | null

type Log = {
    id: string
    user_id: string
    clock_in: string | null
    clock_out: string | null
    dayStatus: DayStatus
    profile: {
      full_name: string | null
      role: string | null
      department: string | null
      position: string | null
    } | null
  }


export default function AttendancePage() {
    const router = useRouter()
    const supabase = useSupabase()
    const [logs, setLogs] = useState<Log[]>([])
    const [loading, setLoading] = useState(true)
    const [email, setEmail] = useState<string | null>(null)
    const [userName, setUserName] = useState<string | null>(null)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'clocked_out' | 'not_clocked_in' | 'holiday' | 'on_leave' | 'week_off'>('all')
    const [rangeFilter, setRangeFilter] = useState<'last_15' | 'last_30' | 'prev_month' | 'last_3_months' | 'last_6_months' | 'year' | 'custom'>('last_15')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

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
        if (rangeFilter === 'custom' && customStart && customEnd) {
            const startCustom = new Date(customStart)
            const endCustom = new Date(customEnd)
            endCustom.setDate(endCustom.getDate() + 1)
            return { startISO: startCustom.toISOString(), endISO: endCustom.toISOString() }
        }

        return { startISO: start.toISOString(), endISO: end.toISOString() }
    }

    useEffect(() => {
        const loadLogs = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.replace('/login')
                return
            }

            setEmail(user.email ?? null)

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, status, full_name, avatar_url')
                .eq('id', user.id)
                .single()

            if (profile?.status !== 'active') {
                router.replace('/pending-approval')
                return
            }

            if (profile?.role !== 'admin') {
                router.replace('/dashboard')
                return
            }

            setUserName(profile?.full_name ?? null)
            setAvatarUrl(profile?.avatar_url ?? null)

            

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
                .select('id, full_name, role, department, position')
                .in('role', ['employee','hr'])

            if (profileError || !profiles) {
                if (profileError) console.error(profileError)
                setLogs([])
                setLoading(false)
                return
            }

            const todayStr = getLocalDateString()
            const dayOfWeek = getLocalDayOfWeek()
            const userIds = profiles.map(p => p.id)

            // 2️⃣ Is today an office holiday?
            const { data: holidayRow } = await supabase
                .from('office_holidays')
                .select('id')
                .eq('date', todayStr)
                .maybeSingle()
            const isHoliday = !!holidayRow

            // 3️⃣ User weekends (user_id -> weekend_days array)
            const { data: userWeekendsRows } = await supabase
                .from('user_weekends')
                .select('user_id, weekend_days')
                .in('user_id', userIds)
            const userWeekOff = new Set<string>()
            for (const row of userWeekendsRows ?? []) {
                const days = (row.weekend_days ?? []) as number[]
                if (days.includes(dayOfWeek)) userWeekOff.add(row.user_id)
            }

            // 4️⃣ Approved leave covering today
            const { data: leaveRows } = await supabase
                .from('leave_requests')
                .select('user_id')
                .eq('status', 'approved')
                .lte('start_date', todayStr)
                .gte('end_date', todayStr)
                .in('user_id', userIds)
            const userOnLeave = new Set((leaveRows ?? []).map(r => r.user_id))

            // 5️⃣ Get today's attendance logs
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

            // 6️⃣ Build lookup map of latest log per user
            const attendanceMap: Record<string, typeof attendance[number]> = {}
            for (const log of attendance) {
                if (!attendanceMap[log.user_id]) {
                    attendanceMap[log.user_id] = log
                }
            }

            // 7️⃣ Merge profiles + today's attendance + day status (priority: holiday > on_leave > week_off)
            const mergedLogs: Log[] = profiles.map(profile => {
                const log = attendanceMap[profile.id]
                let dayStatus: DayStatus = null
                if (isHoliday) dayStatus = 'holiday'
                else if (userOnLeave.has(profile.id)) dayStatus = 'on_leave'
                else if (userWeekOff.has(profile.id)) dayStatus = 'week_off'
                return {
                    id: log?.id ?? `${profile.id}-today`,
                    user_id: profile.id,
                    clock_in: log?.clock_in ?? null,
                    clock_out: log?.clock_out ?? null,
                    dayStatus,
                    profile,
                }
            })

            setLogs(mergedLogs)
            setLoading(false)   
        }

        loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase is stable from useSupabase
    }, [router])

    const filteredLogs = logs.filter(log => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'holiday') return log.dayStatus === 'holiday'
        if (statusFilter === 'on_leave') return log.dayStatus === 'on_leave'
        if (statusFilter === 'week_off') return log.dayStatus === 'week_off'
        if (statusFilter === 'not_clocked_in') return !log.dayStatus && !log.clock_in
        if (statusFilter === 'active') return !log.dayStatus && !!log.clock_in && !log.clock_out
        return !log.dayStatus && !!log.clock_in && !!log.clock_out
    })

    const downloadReport = () => {
        const run = async () => {
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
                .select('id, full_name, role, department, position')
                .in('id', userIds)

            const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

            const header = ['Employee', 'Designation', 'Department', 'Clock In', 'Clock Out', 'Status']
            const rows = attendance.map(log => {
                const status = !log.clock_in
                    ? 'Not Clocked In'
                    : log.clock_out
                        ? 'Clocked Out'
                        : 'Active'
                const profile = profileMap[log.user_id]
                return [
                    profile?.full_name || '',
                    profile?.position || '',
                    profile?.department || '',
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

    const statusTabs = [
        { key: 'all' as const, label: 'All' },
        { key: 'active' as const, label: 'Active' },
        { key: 'clocked_out' as const, label: 'Clocked Out' },
        { key: 'not_clocked_in' as const, label: 'Not Clocked In' },
        { key: 'holiday' as const, label: 'Holiday' },
        { key: 'on_leave' as const, label: 'On Leave' },
        { key: 'week_off' as const, label: 'Week Off' },
    ]

    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--background)' }}>
            <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

            <main className="admin-main mt-6 flex flex-col min-h-0">
                <div className="w-full max-w-6xl flex flex-col flex-1 min-h-0 mx-auto">
                    <div className="mb-12">
                      <div className="page-header shrink-0 mb-0">
                        <div>
                            <h1 className="page-title text-[var(--text-primary)]">Employees Daily Time Logs</h1>
                        </div>
                        <div className="page-actions">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                                className="input-base rounded-lg px-3 py-2 text-sm bg-white min-w-0 flex-1 sm:flex-none sm:min-w-[160px] hover:border-[var(--primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                            >
                                {statusTabs.map(({ key, label }) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <select
                                value={rangeFilter}
                                onChange={e => setRangeFilter(e.target.value as typeof rangeFilter)}
                                className="input-base rounded-lg px-3 py-2 text-sm bg-white min-w-0 flex-1 sm:flex-none sm:min-w-[140px] hover:border-[var(--primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                            >
                                <option value="last_15">Last 15 days</option>
                                <option value="last_30">Last 30 days</option>
                                <option value="prev_month">Previous month</option>
                                <option value="last_3_months">Last 3 months</option>
                                <option value="last_6_months">Last 6 months</option>
                                <option value="year">Complete year</option>
                                <option value="custom">Custom range</option>
                            </select>
                            {rangeFilter === 'custom' && (
                                <>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={e => setCustomStart(e.target.value)}
                                        className="input-base rounded-lg px-3 py-2 text-sm bg-white min-w-0 w-full sm:w-auto"
                                    />
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={e => setCustomEnd(e.target.value)}
                                        className="input-base rounded-lg px-3 py-2 text-sm bg-white min-w-0 w-full sm:w-auto"
                                    />
                                </>
                            )}
                            <button
                                type="button"
                                onClick={downloadReport}
                                disabled={rangeFilter === 'custom' && (!customStart || !customEnd || customStart > customEnd)}
                                className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-white border border-transparent shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                style={{ backgroundColor: 'var(--primary)' }}
                                title="Download Report"
                                aria-label="Download Report"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                        </div>
                      </div>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar max-w-5xl mx-auto w-full py-4">
                            <div
                                className="overflow-hidden rounded-xl border border-slate-200 shadow-sm"
                                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
                            >
                                <div className="overflow-x-auto admin-table-wrap">
                                    <table className="min-w-full text-sm table-admin">
                                        <thead>
                                            <tr className="bg-[var(--primary-muted)]">
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Employee</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Designation</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Department</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Clock In</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Clock Out</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {filteredLogs.map(log => (
                                                <tr key={log.id} className="transition-colors hover:bg-slate-50/80">
                                                    <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">{capitalizeName(log.profile?.full_name) || '—'}</td>
                                                    <td className="px-4 py-3 text-[var(--primary-hover)] font-medium whitespace-nowrap">{log.profile?.position || '—'}</td>
                                                    <td className="px-4 py-3 text-[var(--primary-hover)] font-medium whitespace-nowrap">{log.profile?.department || '—'}</td>
                                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-sm">{log.clock_in ? new Date(log.clock_in).toLocaleString() : '—'}</td>
                                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-sm">{log.clock_out ? new Date(log.clock_out).toLocaleString() : '—'}</td>
                                                    <td className="px-4 py-3">
                                                        {log.dayStatus === 'holiday' ? (
                                                            <span className="badge-common px-2.5 py-1 rounded-md bg-purple-50 text-purple-500 border border-purple-200">Holiday</span>
                                                        ) : log.dayStatus === 'on_leave' ? (
                                                            <span className="badge-common px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 border border-amber-200">On Leave</span>
                                                        ) : log.dayStatus === 'week_off' ? (
                                                            <span className="badge-common px-2.5 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-200">Week Off</span>
                                                        ) : !log.clock_in ? (
                                                            <span className="badge-common badge-rejected">Not Clocked In</span>
                                                        ) : log.clock_out ? (
                                                            <span className="badge-common px-2.5 py-1 rounded-md bg-blue-50 text-blue-500 border border-blue-200">Clocked Out</span>
                                                        ) : (
                                                            <span className="badge-common badge-approved">Active</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredLogs.length === 0 && (
                                    <div className="p-10 text-center">
                                        <p className="text-sm text-slate-500">No attendance records found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

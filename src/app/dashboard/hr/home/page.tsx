'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'
import { getDateString, getLocalDateString, getLocalDayOfWeek } from '@/lib/utils/date'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'
import { useAttendance } from '@/hooks/useAttendance'

type UserState = {
  email: string | null
  userName: string | null
  avatarUrl: string | null
  userId: string | null
}

type Holiday = { id: string; date: string; name: string }
type Announcement = {
  id: string
  title: string
  body: string
  created_at: string
  author_id?: string
  author_name?: string
  author_role?: string
  author_avatar_url?: string | null
  author_position?: string | null
}
type GenderCounts = { male: number; female: number; other: number }
// type PendingUser = { id: string; full_name: string | null; email_id: string; created_at: string }
type PendingLeaveRequest = {
  id: string
  start_date: string
  end_date: string
  reason: string
  created_at: string
  leave_type?: { name: string } | null
  profile?: { full_name: string | null } | null
}
type AgeBucket = { label: string; min: number; max: number; count: number }
type DepartmentCount = { label: string; count: number; color: string }

const MALE_COLOR = '#3b82f6'
const FEMALE_COLOR = '#38bdf8'

function getAgeFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function buildAgeBuckets(employees: { dob?: string | null }[]): AgeBucket[] {
  const buckets: AgeBucket[] = [
    { label: '18-24', min: 18, max: 24, count: 0 },
    { label: '25-34', min: 25, max: 34, count: 0 },
    { label: '35-44', min: 35, max: 44, count: 0 },
    { label: '45-54', min: 45, max: 54, count: 0 },
    { label: '55+', min: 55, max: 999, count: 0 },
  ]
  employees.forEach((e) => {
    const age = getAgeFromDob(e.dob)
    if (age == null) return
    const bucket = buckets.find((b) => age >= b.min && age <= b.max)
    if (bucket) bucket.count++
  })
  return buckets
}

function getNearestUpcomingBirthdays(
  employees: { full_name?: string | null; dob?: string | null }[],
  limit = 2,
): { full_name: string | null; daysUntil: number; nextBirthdayStr: string }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const candidates: { full_name: string | null; daysUntil: number; nextBirthdayStr: string }[] = []
  for (const e of employees) {
    if (!e.dob) continue
    const birth = new Date(e.dob)
    if (isNaN(birth.getTime())) continue
    const thisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
    const nextYear = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate())
    const nextBday = thisYear >= today ? thisYear : nextYear
    const daysUntil = Math.ceil((nextBday.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    candidates.push({
      full_name: e.full_name ?? null,
      daysUntil,
      nextBirthdayStr: nextBday.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    })
  }
  candidates.sort((a, b) => a.daysUntil - b.daysUntil)
  return candidates.slice(0, limit)
}

function calculateGenderRatio(counts: GenderCounts) {
  const total = counts.male + counts.female
  return {
    total,
    malePct: total > 0 ? Math.round((counts.male / total) * 100) : 0,
    femalePct: total > 0 ? Math.round((counts.female / total) * 100) : 0,
  }
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function buildDepartmentCounts(
  employees: { department?: string | null }[],
): DepartmentCount[] {
  const palette = ['#3b82f6', '#38bdf8', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6']
  const counts = new Map<string, number>()
  employees.forEach((e) => {
    const key = (e.department || 'Unknown').trim() || 'Unknown'
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  return entries.map(([label, count], idx) => ({
    label,
    count,
    color: palette[idx % palette.length],
  }))
}

const initialUserState: UserState = {
  email: null,
  userName: null,
  avatarUrl: null,
  userId: null,
}

export default function AdminHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserState>(initialUserState)
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [newJoiners, setNewJoiners] = useState(0)
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([])
  const [genderCounts, setGenderCounts] = useState<GenderCounts>({ male: 0, female: 0, other: 0 })
  const [ageBuckets, setAgeBuckets] = useState<AgeBucket[]>([])
  // const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0)
  // const [latestPendingUser, setLatestPendingUser] = useState<PendingUser | null>(null)
  const [latestPendingLeave, setLatestPendingLeave] = useState<PendingLeaveRequest | null>(null)
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null)
  const [nearestBirthdays, setNearestBirthdays] = useState<{ full_name: string | null; daysUntil: number; nextBirthdayStr: string }[]>([])
  const [onLeaveOrWeekoffToday, setOnLeaveOrWeekoffToday] = useState(0)
  const [dateTime, setDateTime] = useState('')
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [departmentCounts, setDepartmentCounts] = useState<DepartmentCount[]>([])

  const supabase = useSupabase()
  const { clockInTime, clockOutTime, loading: loadingAttendance, clockInBlockReason, formatTime, handleClockIn, handleClockOut } = useAttendance(user.userId)

  const formatDuration = (totalSeconds: number) => {
    const safe = Math.max(0, Math.floor(totalSeconds))
    const hours = Math.floor(safe / 3600)
    const minutes = Math.floor((safe % 3600) / 60)
    const seconds = safe % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  useEffect(() => {
    if (!clockInTime) {
      setTimerSeconds(0)
      return
    }

    const clockInDate = new Date(clockInTime)
    const todayStr = getLocalDateString()
    const clockInDay = getDateString(clockInDate)

    if (clockInDay !== todayStr) {
      setTimerSeconds(0)
      return
    }

    if (clockOutTime) {
      const clockOutDate = new Date(clockOutTime)
      const diff = (clockOutDate.getTime() - clockInDate.getTime()) / 1000
      setTimerSeconds(diff)
      return
    }

    const tick = () => {
      const now = new Date()
      const diff = (now.getTime() - clockInDate.getTime()) / 1000
      setTimerSeconds(diff)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [clockInTime, clockOutTime])

  useEffect(() => {
    const now = new Date()
    setDateTime(now.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }))
    const interval = setInterval(() => {
      const n = new Date()
      setDateTime(n.toLocaleString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (cancelled) return
      if (!authUser) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', authUser.id)
        .single()

      if (cancelled) return
      if (profile?.role !== 'hr') {
        router.replace('/dashboard')
        return
      }

      setUser({
        email: authUser.email ?? null,
        userId: authUser.id,
        userName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      })

      const today = new Date().toISOString().slice(0, 10)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString().slice(0, 10)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10)

      let employees: { id: string; full_name?: string | null; joining_date?: string; created_at?: string; gender?: string | null; dob?: string | null, department?: string | null }[] | null = null
      const { data: employeesWithGender } = await supabase
        .from('profiles')
        .select('id, full_name, department, joining_date, created_at, gender, dob')
        .eq('status', 'active')
        .in('role', ['employee', 'hr'])
      if (employeesWithGender) {
        employees = employeesWithGender
      } else {
        const { data: employeesFallback } = await supabase
          .from('profiles')
          .select('id, full_name, joining_date, created_at, dob')
          .eq('status', 'active')
          .in('role', ['employee', 'hr'])
        employees = employeesFallback
      }

      if (!cancelled && employees) {
        setTotalEmployees(employees.length)
        const newJoinersCount = employees.filter((e) => {
          const joinDate = e.joining_date || e.created_at
          return joinDate && joinDate >= thirtyDaysAgoStr
        }).length
        setNewJoiners(newJoinersCount)

        let male = 0
        let female = 0
        let other = 0
        employees.forEach((e) => {
          const g = (e?.gender || '').toLowerCase().trim()
          if (g === 'male') male++
          else if (g === 'female') female++
          else if (g === 'other') other++
        })
        setGenderCounts({ male, female, other })
        setAgeBuckets(buildAgeBuckets(employees))
        setNearestBirthdays(getNearestUpcomingBirthdays(employees, 2))
        setDepartmentCounts(buildDepartmentCounts(employees))
      }

      const { data: holidays } = await supabase
        .from('office_holidays')
        .select('id, date, name')
        .gte('date', today)
        .lte('date', thirtyDaysFromNowStr)
        .order('date', { ascending: true })

      if (!cancelled) setUpcomingHolidays(holidays || [])

      const todayStr = getLocalDateString()
      const dayOfWeek = getLocalDayOfWeek()
      const employeeIds = employees?.map((e) => e.id) ?? []
      const onLeaveOrWeekoff = new Set<string>()
      if (employeeIds.length > 0) {
        const { data: leaveRows } = await supabase
          .from('leave_requests')
          .select('user_id')
          .eq('status', 'approved')
          .lte('start_date', todayStr)
          .gte('end_date', todayStr)
          .in('user_id', employeeIds)
        ;(leaveRows ?? []).forEach((r) => onLeaveOrWeekoff.add(r.user_id))
        const { data: weekOffRows } = await supabase
          .from('user_weekends')
          .select('user_id, weekend_days')
          .in('user_id', employeeIds)
        ;(weekOffRows ?? []).forEach((row) => {
          const days = (row.weekend_days ?? []) as number[]
          if (days.includes(dayOfWeek)) onLeaveOrWeekoff.add(row.user_id)
        })
      }
      if (!cancelled) setOnLeaveOrWeekoffToday(onLeaveOrWeekoff.size)

      // const { data: pendingUsers, count: pendingCount } = await supabase
      //   .from('profiles')
      //   .select('id, full_name, email_id, created_at', { count: 'exact' })
      //   .eq('status', 'pending')
      //   .order('created_at', { ascending: false })
      //   .limit(1)
      // if (!cancelled) {
      //   setPendingRequestsCount(pendingCount ?? 0)
      //   setLatestPendingUser(pendingUsers?.[0] ?? null)
      // }

      const { data: pendingLeaves, count: pendingLeaveCountVal } = await supabase
        .from('leave_requests')
        .select('id, user_id, start_date, end_date, reason, created_at, leave_type:leave_types(name)', { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
      if (!cancelled) {
        setPendingLeaveCount(pendingLeaveCountVal ?? 0)
      }
      if (!cancelled && pendingLeaves?.[0]) {
        const req = pendingLeaves[0]
        const userIds = [req.user_id]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)
        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
        const enriched = {
          ...req,
          leave_type: Array.isArray(req.leave_type) ? req.leave_type[0] ?? null : req.leave_type,
          profile: profileMap.get(req.user_id) || null,
        }
        setLatestPendingLeave(enriched as PendingLeaveRequest)
      } else if (!cancelled) {
        setLatestPendingLeave(null)
      }

      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, body, created_at, author_id, author_name, author_role')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!cancelled && announcements?.[0]) {
        const ann = announcements[0]
        if (ann.author_id) {
          const { data: authorProfile } = await supabase
            .from('profiles')
            .select('avatar_url, position')
            .eq('id', ann.author_id)
            .maybeSingle()
          setLatestAnnouncement({
            ...ann,
            author_avatar_url: authorProfile?.avatar_url ?? null,
            author_position: authorProfile?.position ?? null,
          })
        } else {
          setLatestAnnouncement(ann)
        }
      }
      } catch (err) {
        console.error('Home load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading" style={{ background: 'var(--background)' }}>
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    )
  }

  const genderRatio = calculateGenderRatio(genderCounts)
  const { total: genderTotal, malePct, femalePct } = genderRatio

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="hr" />

      <div className="admin-notifications-fixed">
        {user.userId && <Notifications role="hr" userId={user.userId} />}
      </div>

      <main className="admin-main mt-6">
        <div className="w-full max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              {getTimeBasedGreeting()}, {capitalizeName(user.userName || 'Admin')}
            </h1>
            <p className="text-sm mt-0.5 text-slate-500">
              {dateTime}
            </p>
          </div>

          {/* Clock In/Out + Latest Leave Request */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className="card p-5 dashboard-card lg:col-span-2"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 65%)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Work Timer</p>
                {clockInTime && !clockOutTime && (
                  <span className="text-xs font-semibold text-[var(--primary)]">Running</span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                {formatDuration(timerSeconds)}
              </p>
              {loadingAttendance ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--primary-light)]/40 p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Clock In</p>
                      <p className="text-base font-bold text-slate-900">{formatTime(clockInTime)}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--primary-light)]/40 p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Clock Out</p>
                      <p className="text-base font-bold text-slate-900">{formatTime(clockOutTime)}</p>
                    </div>
                  </div>
                  {clockInBlockReason && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Cannot clock in: {clockInBlockReason}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!clockInTime && (
                      <button
                        onClick={handleClockIn}
                        disabled={!!clockInBlockReason}
                        className="flex-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Clock In
                      </button>
                    )}
                    {clockInTime && !clockOutTime && (
                      <button
                        onClick={handleClockOut}
                        className="flex-1 rounded-lg border border-[var(--primary)] bg-white px-3 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary-light)] transition"
                      >
                        Clock Out
                      </button>
                    )}
                    {clockOutTime && (
                      <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--primary-light)] px-3 py-2 text-center">
                        <p className="text-xs font-medium text-[var(--primary)]">Shift Completed</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className="card p-5 dashboard-card max-w-md lg:justify-self-end w-full"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 85%)' }}
            >
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 mb-2">
                {pendingLeaveCount} {pendingLeaveCount === 1 ? 'person has' : 'people have'} applied for leave
              </h2>
              {latestPendingLeave ? (
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {capitalizeName(latestPendingLeave.profile?.full_name) || '—'}
                    </p>
                    <p className="text-sm text-slate-600 truncate">
                      {latestPendingLeave.leave_type?.name || 'Leave'} • {new Date(latestPendingLeave.start_date).toLocaleDateString()} – {new Date(latestPendingLeave.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate" title={latestPendingLeave.reason}>
                      {latestPendingLeave.reason}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/hr/leaves/leave-requests"
                    className="w-fit px-3 py-2 rounded-lg text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    Review
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No pending leave requests.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div
              className="card p-5 dashboard-card"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Employees by Department</h3>
                <span className="text-xs text-slate-500">{departmentCounts.reduce((sum, d) => sum + d.count, 0)} total</span>
              </div>
              {departmentCounts.length === 0 ? (
                <p className="text-sm text-slate-500">No department data.</p>
              ) : (
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="relative w-36 h-36 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {(() => {
                        const total = departmentCounts.reduce((sum, d) => sum + d.count, 0) || 1
                        let offset = 0
                        return departmentCounts.map((d, idx) => {
                          const pct = d.count / total
                          const dash = `${pct * 264} 264`
                          const circle = (
                            <circle
                              key={d.label + idx}
                              cx="50"
                              cy="50"
                              r="42"
                              fill="none"
                              stroke={d.color}
                              strokeWidth="16"
                              strokeDasharray={dash}
                              strokeDashoffset={-offset}
                              strokeLinecap="round"
                            />
                          )
                          offset += pct * 264
                          return circle
                        })
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-slate-500">Departments</span>
                      <span className="text-lg font-semibold text-slate-900">{departmentCounts.length}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 w-full">
                    {departmentCounts.map((d) => (
                      <div key={d.label} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
                        <span className="text-sm text-slate-700 truncate">{d.label}</span>
                        <span className="text-xs text-slate-500 ml-auto">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="card p-5 dashboard-card"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 70%)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Announcements</h3>
                <Link href="/dashboard/hr/announcements" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
                  View all
                </Link>
              </div>
              {latestAnnouncement ? (
                <div className="flex gap-4">
                  {latestAnnouncement.author_avatar_url ? (
                    <Image
                      src={latestAnnouncement.author_avatar_url}
                      alt={latestAnnouncement.author_name || 'Author'}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-lg font-semibold bg-[var(--primary-light)] text-[var(--primary)]"
                    >
                      {(latestAnnouncement.author_name || 'A')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{capitalizeName(latestAnnouncement.author_name) || '—'}</span>
                      {latestAnnouncement.author_position && (
                        <span className="text-xs text-slate-500">• {latestAnnouncement.author_position}</span>
                      )}
                      {latestAnnouncement.author_role && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{latestAnnouncement.author_role}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 mt-1">{latestAnnouncement.title}</p>
                    <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{latestAnnouncement.body}</p>
                    <p className="text-xs text-slate-500 mt-2">{new Date(latestAnnouncement.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No announcements yet.</p>
              )}
            </div>
          </div>

          {/* Row 1: Stats - 4 equal cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Employees */}
            <div
              className="card card-body p-5 flex flex-col min-h-[140px] dashboard-card"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 70%)' }}
            >
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Total Employees</h2>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{totalEmployees}</span>
                {newJoiners > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    +{newJoiners} new
                  </span>
                )}
              </div>
              <div className="mt-auto pt-3">
                <Link
                  href="/dashboard/hr/employees"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
                  aria-label="View employee details"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  View details
                </Link>
              </div>
            </div>

            {/* Upcoming Holidays */}
            <div
              className="card card-body p-5 flex flex-col min-h-[140px] dashboard-card"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 80%)' }}
            >
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Upcoming Holidays</h2>
              {upcomingHolidays.length === 0 ? (
                <p className="text-sm text-slate-500">None</p>
              ) : (
                <ul className="space-y-1.5 flex-1">
                  {upcomingHolidays.slice(0, 3).map(h => (
                    <li key={h.id} className="flex justify-between items-baseline text-sm gap-2">
                      <span className="text-slate-700 truncate">{h.name}</span>
                      <span className="text-slate-500 text-xs shrink-0">
                        {new Date(h.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </li>
                  ))}
                  {upcomingHolidays.length > 3 && (
                    <li className="text-xs text-slate-500">+{upcomingHolidays.length - 3} more</li>
                  )}
                </ul>
              )}
            </div>

            {/* Gender Ratio */}
            <div
              className="card card-body p-5 flex flex-col min-h-[140px] dashboard-card"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
            >
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Gender Ratio</h2>
              <div className="flex items-center gap-3 flex-1">
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-label="Gender ratio donut chart">
                    <circle cx="50" cy="50" r="42" fill="none" stroke={MALE_COLOR} strokeWidth="16" strokeDasharray={genderTotal > 0 ? `${(malePct / 100) * 264} 264` : '264'} strokeLinecap="round" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={FEMALE_COLOR} strokeWidth="16" strokeDasharray={genderTotal > 0 ? `${(femalePct / 100) * 264} 264` : '0 264'} strokeDashoffset={genderTotal > 0 ? -((malePct / 100) * 264) : 0} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-xs font-bold" style={{ color: MALE_COLOR }}>{malePct}%</span>
                    <span className="text-xs font-bold" style={{ color: FEMALE_COLOR }}>{femalePct}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: MALE_COLOR }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MALE_COLOR }} aria-hidden />
                    Male
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: FEMALE_COLOR }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: FEMALE_COLOR }} aria-hidden />
                    Female
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div
              className="card card-body p-5 flex flex-col min-h-[140px] dashboard-card"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 75%)' }}
            >
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick Links</h2>
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/hr/leaves/leave-allocation" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors w-fit">
                  Allot leaves
                </Link>
                <Link href="/dashboard/hr/leaves/holiday-allocation" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors w-fit">
                  Add holiday
                </Link>
                <Link href="/dashboard/hr/leaves/leave-apply" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors w-fit">
                  Apply for leave
                </Link>
              </div>
            </div>
          </div>

          {/* Row 3: Employee Age Graph + Upcoming Birthdays + On Leave/Week Off Today */}
          {(ageBuckets.some((b) => b.count > 0) || nearestBirthdays.length > 0 || totalEmployees > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ageBuckets.some((b) => b.count > 0) ? (
            <div
              className="card p-5 dashboard-card"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 70%)' }}
            >
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Employees by Age</h3>
                <div className="flex items-end gap-2 h-36 pb-1">
                  {ageBuckets.map((b) => {
                    const maxCount = Math.max(...ageBuckets.map((x) => x.count), 1)
                    const maxBarPx = 80
                    const barHeightPx = maxCount > 0 ? Math.round((b.count / maxCount) * maxBarPx) : 0
                    const heightPx = b.count > 0 ? Math.max(barHeightPx, 12) : 0
                    return (
                      <div key={b.label} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                        <div
                          className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-500 transition-all duration-200 relative"
                          style={{ height: `${heightPx}px` }}
                          title={`${b.label}: ${b.count} employee${b.count !== 1 ? 's' : ''}`}
                        />
                        <span className="text-xs font-semibold text-slate-700">{b.count}</span>
                        <span className="text-xs font-medium text-slate-600">{b.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              ) : (
                <div
                  className="card p-5 flex items-center justify-center dashboard-card"
                  style={{ backgroundImage: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 70%)' }}
                >
                  <p className="text-sm text-slate-500">No age data.</p>
                </div>
              )}
          <div
            className="card p-5 dashboard-card"
            style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 85%)' }}
          >
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Upcoming Birthdays</h3>
                {nearestBirthdays.length > 0 ? (
                  <div className="space-y-4">
                    {nearestBirthdays.map((b, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-lg font-semibold bg-[var(--primary-light)] text-[var(--primary)]">
                          {(b.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{capitalizeName(b.full_name) || 'Employee'}</p>
                          <p className="text-sm text-slate-600">
                            {b.daysUntil === 0
                              ? 'Today'
                              : b.daysUntil === 1
                                ? 'Tomorrow'
                                : `${b.daysUntil} days`} — {b.nextBirthdayStr}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No upcoming birthdays.</p>
                )}
              </div>
              <div
                className="card p-5 dashboard-card"
                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 80%)' }}
              >
                <h3 className="text-sm font-semibold text-slate-900 mb-4">On Leave / Week Off Today</h3>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">{onLeaveOrWeekoffToday}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {onLeaveOrWeekoffToday === 1 ? 'employee' : 'employees'} on leave or week off
                </p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

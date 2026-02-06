'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'

type UserState = {
  email: string | null
  userName: string | null
  avatarUrl: string | null
  userId: string | null
}

type Holiday = { id: string; date: string; name: string }
type Announcement = { id: string; title: string; body: string; created_at: string }
type GenderCounts = { male: number; female: number; other: number }

const MALE_COLOR = '#14b8a6'
const FEMALE_COLOR = '#f472b6'
const OTHER_COLOR = '#94a3b8'

function calculateGenderRatio(counts: GenderCounts) {
  const total = counts.male + counts.female + counts.other
  return {
    total,
    malePct: total > 0 ? Math.round((counts.male / total) * 100) : 0,
    femalePct: total > 0 ? Math.round((counts.female / total) * 100) : 0,
    otherPct: total > 0 ? Math.round((counts.other / total) * 100) : 0,
  }
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
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
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null)
  const [dateTime, setDateTime] = useState('')

  const supabase = useSupabase()

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
      if (profile?.role !== 'admin') {
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

      let employees: { id: string; joining_date?: string; created_at?: string; gender?: string | null }[] | null = null
      const { data: employeesWithGender } = await supabase
        .from('profiles')
        .select('id, department, joining_date, created_at, gender')
        .eq('status', 'active')
        .in('role', ['employee', 'hr'])
      if (employeesWithGender) {
        employees = employeesWithGender
      } else {
        const { data: employeesFallback } = await supabase
          .from('profiles')
          .select('id, joining_date, created_at')
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
      }

      const { data: holidays } = await supabase
        .from('office_holidays')
        .select('id, date, name')
        .gte('date', today)
        .lte('date', thirtyDaysFromNowStr)
        .order('date', { ascending: true })

      if (!cancelled) setUpcomingHolidays(holidays || [])

      const { count: pendingCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (!cancelled) setPendingRequestsCount(pendingCount ?? 0)

      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, body, created_at')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!cancelled && announcements?.[0]) setLatestAnnouncement(announcements[0])
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
        <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    )
  }

  const genderRatio = calculateGenderRatio(genderCounts)
  const { total: genderTotal, malePct, femalePct, otherPct } = genderRatio

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="admin" />

      <div className="admin-notifications-fixed">
        {user.userId && <Notifications role="admin" userId={user.userId} />}
      </div>

      <main className="admin-main">
        <div className="w-full max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight break-words" style={{ color: 'var(--text-primary)' }}>
              {getTimeBasedGreeting()}, {capitalizeName(user.userName || 'Admin')}
            </h1>
            <p className="text-xs sm:text-sm mt-1 break-words" style={{ color: 'var(--text-secondary)' }}>
              {dateTime}
            </p>
          </div>

          {/* 2x2 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Total Employees */}
            <div className="card card-body rounded-xl p-6 flex flex-col" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Total Employees</h2>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalEmployees}</span>
                {newJoiners > 0 && (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {newJoiners} new in last 30 days
                  </span>
                )}
              </div>
              <div className="mt-auto flex justify-end pt-3">
                <Link
                  href="/dashboard/admin/pending"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                  aria-label={`${pendingRequestsCount} pending requests`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <span>{pendingRequestsCount}</span>
                </Link>
              </div>
            </div>

            {/* Upcoming Holidays */}
            <div className="card card-body rounded-xl p-6" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Upcoming Holidays</h2>
              {upcomingHolidays.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No upcoming holidays.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingHolidays.map(h => (
                    <li key={h.id} className="flex justify-between items-baseline text-sm">
                      <span style={{ color: 'var(--text-primary)' }}>{h.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {new Date(h.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Gender Ratio + Quick Links (parallel) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
              {/* Gender Ratio */}
              <div className="card card-body rounded-xl p-6" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Gender Ratio</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex flex-wrap items-center gap-4 shrink-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: MALE_COLOR }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MALE_COLOR }} aria-hidden />
                      Male
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: FEMALE_COLOR }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: FEMALE_COLOR }} aria-hidden />
                      Female
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: OTHER_COLOR }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: OTHER_COLOR }} aria-hidden />
                      Other
                    </span>
                  </div>
                  <div className="relative w-40 h-40 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-label="Gender ratio donut chart">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke={MALE_COLOR}
                        strokeWidth="16"
                        strokeDasharray={genderTotal > 0 ? `${(malePct / 100) * 264} 264` : '264'}
                        strokeLinecap="round"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke={FEMALE_COLOR}
                        strokeWidth="16"
                        strokeDasharray={genderTotal > 0 ? `${(femalePct / 100) * 264} 264` : '0 264'}
                        strokeDashoffset={genderTotal > 0 ? -((malePct / 100) * 264) : 0}
                        strokeLinecap="round"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke={OTHER_COLOR}
                        strokeWidth="16"
                        strokeDasharray={genderTotal > 0 ? `${(otherPct / 100) * 264} 264` : '0 264'}
                        strokeDashoffset={genderTotal > 0 ? -(((malePct + femalePct) / 100) * 264) : 0}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-sm font-bold leading-tight" style={{ color: MALE_COLOR }}>{malePct}%</span>
                      <span className="text-sm font-bold leading-tight" style={{ color: FEMALE_COLOR }}>{femalePct}%</span>
                      <span className="text-sm font-bold leading-tight" style={{ color: OTHER_COLOR }}>{otherPct}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="card card-body rounded-xl p-6" style={{ borderColor: 'var(--border)' }}>
                <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Quick Links</h2>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/dashboard/admin/leaves/leave-requests"
                    className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors w-fit hover:opacity-80"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    Leave requests
                  </Link>
                  <Link
                    href="/dashboard/admin/leaves/holiday-allocation"
                    className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors w-fit hover:opacity-80"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    Add holiday
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Announcements */}
          <div
            className="rounded-xl border p-4 flex items-start justify-between gap-4"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-bg)' }}
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Announcements</h3>
              {latestAnnouncement ? (
                <p className="text-sm mt-1 truncate" style={{ color: 'var(--text-secondary)' }} title={latestAnnouncement.body}>
                  {latestAnnouncement.title}: {latestAnnouncement.body}
                </p>
              ) : (
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>No announcements.</p>
              )}
            </div>
            <Link
              href="/dashboard/admin/announcements"
              className="text-sm font-medium shrink-0"
              style={{ color: 'var(--primary)' }}
            >
              View all
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

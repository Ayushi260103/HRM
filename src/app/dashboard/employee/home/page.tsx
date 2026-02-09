'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { capitalizeName } from '@/lib/utils/string'
import { getDateString, getLocalDateString } from '@/lib/utils/date'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'
import { useAttendance } from '@/hooks/useAttendance'
import { useUpcomingBirthdays } from '@/components/UpcomingBirthdays'
import { useSupabase } from '@/hooks/useSupabase';

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

export default function EmployeeHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserState>(initialUserState)
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([])
  const supabase = useSupabase();
  const { birthdays, loading: loadingBirthdays } = useUpcomingBirthdays(supabase)

  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null)
  const [nearestBirthdays, setNearestBirthdays] = useState<{ full_name: string | null; daysUntil: number; nextBirthdayStr: string }[]>([])
  const [dateTime, setDateTime] = useState('')
  const [timerSeconds, setTimerSeconds] = useState(0)

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
    if (loadingBirthdays || !birthdays) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nearestTwo = birthdays
      .map((b) => {
        const diffMs = b.upcomingDate.getTime() - today.getTime()
        const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        return {
          full_name: b.full_name,
          daysUntil,
          nextBirthdayStr: b.upcomingDate.toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
          }),
        }
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 2)

    setNearestBirthdays(nearestTwo)
  }, [birthdays, loadingBirthdays])

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
        if (profile?.role !== 'employee') {
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


        const { data: holidays } = await supabase
          .from('office_holidays')
          .select('id, date, name')
          .gte('date', today)
          .lte('date', thirtyDaysFromNowStr)
          .order('date', { ascending: true })

        if (!cancelled) setUpcomingHolidays(holidays || [])

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


  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="employee" />

      <div className="admin-notifications-fixed">
        {user.userId && <Notifications role="employee" userId={user.userId} />}
      </div>

      <main className="admin-main mt-6">
        <div className="w-full max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              {getTimeBasedGreeting()}, {capitalizeName(user.userName || 'Employee')}
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
            {/* Quick Links */}
            <div
              className="card card-body p-5 flex flex-col min-h-[140px] dashboard-card"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 75%)' }}
            >
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick Links</h2>
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/employee/leaves" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors w-fit">
                  Apply for leave
                </Link>
                <Link href="/dashboard/employee/payroll" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors w-fit">
                  View Payroll
                </Link>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

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
                    <Link href={"/dashboard/employee/moments/office-holidays"} className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)]">+{upcomingHolidays.length - 3} more</Link>
                  )}
                </ul>
              )}
            </div>
            <div
              className="card p-5 dashboard-card"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--primary-light) 0%, #ffffff 70%)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Announcements</h3>
                <Link href="/dashboard/employee/announcements" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
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
          </div>

          {/* Row 1: Stats - 4 equal cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">




          </div>

        </div>
      </main>
    </div>
  )
}

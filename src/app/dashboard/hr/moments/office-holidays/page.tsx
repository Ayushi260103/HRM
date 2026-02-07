'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useSupabase } from '@/hooks/useSupabase'
import { getDateString } from '@/lib/utils/date'

type Holiday = { id: string; date: string; name: string }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getCalendarDays(year: number, month: number): { date: Date; dateStr: string; isCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const firstDay = first.getDay()
  const daysInMonth = last.getDate()

  const result: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = []

  // Leading empty / prev month
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const prevLast = new Date(prevYear, prevMonth + 1, 0).getDate()
  for (let i = 0; i < firstDay; i++) {
    const d = prevLast - firstDay + 1 + i
    const date = new Date(prevYear, prevMonth, d)
    result.push({ date, dateStr: getDateString(date), isCurrentMonth: false })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    result.push({ date, dateStr: getDateString(date), isCurrentMonth: true })
  }

  // Trailing next month to fill 6 rows (42 cells)
  const total = result.length
  const remaining = 42 - total
  for (let i = 0; i < remaining; i++) {
    const date = new Date(year, month + 1, i + 1)
    result.push({ date, dateStr: getDateString(date), isCurrentMonth: false })
  }

  return result
}

function MonthCalendar({
  year,
  month,
  holidaysByDate,
  selectedDate,
  onSelectDate,
}: {
  year: number
  month: number
  holidaysByDate: Map<string, string[]>
  selectedDate: string | null
  onSelectDate: (dateStr: string) => void
}) {
  const days = useMemo(() => getCalendarDays(year, month), [year, month])
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const selectedHolidays = selectedDate ? holidaysByDate.get(selectedDate) : null

  return (
    <div className="bg-[var(--primary-light)]/60 rounded-2xl border border-[var(--primary-muted)] p-4 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-center font-semibold text-slate-900 mb-3">{monthLabel}</h3>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-xs font-medium text-slate-500 py-1">
            {w}
          </div>
        ))}
        {days.map(({ date, dateStr, isCurrentMonth }) => {
          const holidayNames = holidaysByDate.get(dateStr)
          const isHoliday = !!holidayNames?.length
          const isSelected = selectedDate === dateStr
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`
                min-h-[36px] rounded-md text-sm transition-colors
                ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-900'}
                ${isHoliday ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] font-medium' : 'hover:bg-[var(--primary-light)]'}
                ${isSelected ? 'ring-2 ring-[var(--primary)] ring-offset-1' : ''}
              `}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
      {selectedHolidays && selectedHolidays.length > 0 && (
        <p className="mt-3 text-center text-sm font-medium text-blue-700">
          {selectedHolidays.join(', ')}
        </p>
      )}
    </div>
  )
}

export default function HROfficeHolidaysPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedByMonth, setSelectedByMonth] = useState<Record<number, string | null>>({ 0: null, 1: null, 2: null, 3: null })
  const [user, setUser] = useState<{ email: string | null; userName: string | null; avatarUrl: string | null; userId: string | null }>({
    email: null,
    userName: null,
    avatarUrl: null,
    userId: null,
  })

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const h of holidays) {
      const existing = map.get(h.date) ?? []
      existing.push(h.name)
      map.set(h.date, existing)
    }
    return map
  }, [holidays])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
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

      const today = new Date()
      const startDate = getDateString(new Date(today.getFullYear(), today.getMonth(), 1))
      const endDate = getDateString(new Date(today.getFullYear(), today.getMonth() + 4, 0))

      const { data } = await supabase
        .from('office_holidays')
        .select('id, date, name')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (!cancelled) setHolidays(data ?? [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [router, supabase])

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 80%)' }}
      >
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  const today = new Date()
  const months: { year: number; month: number }[] = []
  for (let i = 0; i < 4; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() })
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 80%)' }}
    >
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="hr" />

      <main className="admin-main">
        <div className="max-w-4xl">
          <div className="mt-10 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="rounded-2xl border border-transparent bg-transparent px-0 py-0 shadow-none">
              <h1 className="text-xl font-bold text-slate-900">Holidays at a glance for the next four months</h1>
              {/* <p className="text-sm text-slate-500 mt-1">Next four months at a glance</p> */}
            </div>
            <Link
              href="/dashboard/hr/moments"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-light)] shrink-0"
            >
              View upcoming birthday
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {months.map(({ year, month }, index) => (
              <MonthCalendar
                key={`${year}-${month}`}
                year={year}
                month={month}
                holidaysByDate={holidaysByDate}
                selectedDate={selectedByMonth[index] ?? null}
                onSelectDate={(dateStr) =>
                  setSelectedByMonth((prev) => ({
                    ...prev,
                    [index]: prev[index] === dateStr ? null : dateStr,
                  }))
                }
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

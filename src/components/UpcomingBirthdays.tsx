'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { capitalizeName } from '@/lib/utils/string'

export interface BirthdayProfile {
  id: string
  full_name: string
  // department: string
  job_title: string
  dob: string
  avatar_url?: string
  upcomingDate: Date
}

function getBirthdaysInNext30Days(profiles: { id: string; full_name: string; job_title: string; dob: string; avatar_url?: string }[]): BirthdayProfile[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in30Days = new Date(today)
  in30Days.setDate(in30Days.getDate() + 30)

  const result: BirthdayProfile[] = []

  for (const p of profiles) {
    if (!p.dob) continue
    const dob = new Date(p.dob)
    const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
    let nextBday = thisYearBday
    if (thisYearBday < today) {
      nextBday = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate())
    }
    if (nextBday >= today && nextBday <= in30Days) {
      result.push({ ...p, upcomingDate: nextBday, job_title: p.job_title })
    }
  }

  result.sort((a, b) => a.upcomingDate.getTime() - b.upcomingDate.getTime())
  return result
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
}

export function useUpcomingBirthdays(supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>) {
  const [birthdays, setBirthdays] = useState<BirthdayProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.rpc('get_upcoming_birthdays')

        const list = getBirthdaysInNext30Days(data || [])
        setBirthdays(list)
      } catch (err) {
        console.error('Error loading birthdays:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  return { birthdays, loading }
}

function BirthdayCard({ person, isTodayBirthday, variant }: { person: BirthdayProfile; isTodayBirthday?: boolean; variant: 'odd' | 'even' }) {
  return (
    <div
      className={`aspect-square rounded-full overflow-hidden transition-all duration-200 flex flex-col items-center justify-start p-3 border shadow-md hover:shadow-lg ${
        variant === 'odd'
          ? 'bg-[var(--primary-hover)] border-[var(--primary)]'
          : 'bg-[var(--primary-hover)] border-[var(--primary)]'
      }`}
    >
      <div className="mb-0 text-white/80">
        {isTodayBirthday ? (
          <svg className="birthday-arc" viewBox="0 0 160 70" aria-label="Happy Birthday">
            <defs>
              <path id="arc-top" d="M10,46 Q80,6 150,46" />
              <path id="arc-bottom" d="M10,62 Q80,22 150,62" />
            </defs>
            <text dy="-2">
              <textPath href="#arc-top" startOffset="50%" textAnchor="middle">Happy</textPath>
            </text>
            <text dy="2">
              <textPath href="#arc-bottom" startOffset="50%" textAnchor="middle">Birthday</textPath>
            </text>
          </svg>
        ) : (
          <svg className="birthday-arc" viewBox="0 0 160 70" aria-label="Birthday Soon">
            <defs>
              <path id="arc-top-soon" d="M10,46 Q80,6 150,46" />
              <path id="arc-bottom-soon" d="M10,62 Q80,22 150,62" />
            </defs>
            <text dy="-2">
              <textPath href="#arc-top-soon" startOffset="50%" textAnchor="middle">Birthday</textPath>
            </text>
            <text dy="2">
              <textPath href="#arc-bottom-soon" startOffset="50%" textAnchor="middle">Soon</textPath>
            </text>
          </svg>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
        {person.avatar_url ? (
          <Image
            src={person.avatar_url}
            alt={person.full_name}
            width={80}
            height={80}
            className="w-30 h-30 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-md"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-200 to-blue-200 flex items-center justify-center text-2xl font-semibold text-blue-700 flex-shrink-0 ring-2 ring-white shadow-md">
            {person.full_name?.[0]?.toUpperCase()}
          </div>
        )}
        <p className="font-semibold text-white text-base mt-2.5 truncate w-full text-center">{capitalizeName(person.full_name)}</p>
        <p className="text-sm text-white/80 mt-0.5 truncate w-full text-center">{person.job_title || '--'}</p>
        {/* <p className="text-sm text-white/80 mt-0.5 truncate w-full text-center">{person.department || '--'}</p> */}
        <p className="text-sm font-medium mt-2 text-white/80">
          {person.upcomingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

export default function UpcomingBirthdays({ birthdays, loading }: { birthdays: BirthdayProfile[]; loading: boolean }) {
  const todayBirthdays = birthdays.filter(p => isToday(p.upcomingDate))
  const upcomingBirthdays = birthdays.filter(p => !isToday(p.upcomingDate))

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <p className="text-slate-500 text-sm sm:text-base">Loading upcoming birthdays...</p>
      </div>
    )
  }

  if (birthdays.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 sm:p-14 text-center">
        <div className="text-5xl mb-4">??</div>
        <p className="text-slate-700 font-medium text-lg">No upcoming birthdays</p>
        <p className="text-slate-500 text-sm mt-1">No birthdays in the next 30 days</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {todayBirthdays.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mt-10 mb-10 flex items-center gap-2">
            Birthday Today
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayBirthdays.map((person, index) => (
              <BirthdayCard key={person.id} person={person} isTodayBirthday variant={index % 2 === 0 ? 'odd' : 'even'} />
            ))}
          </div>
        </div>
      )}

      {upcomingBirthdays.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900 mt-10 mb-10 flex items-center gap-2 ">
            Birthdays in next 30 days
          </h2>
          {/* <p className="text-slate-500 text-sm mb-4">Birthdays in the next 30 days</p> */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingBirthdays.map((person, index) => (
              <BirthdayCard key={person.id} person={person} variant={index % 2 === 0 ? 'odd' : 'even'} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

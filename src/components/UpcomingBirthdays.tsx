'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export interface BirthdayProfile {
  id: string
  full_name: string
  department: string
  position: string
  dob: string
  avatar_url?: string
  upcomingDate: Date
}

function getBirthdaysInNext30Days(profiles: { id: string; full_name: string; department: string; position: string; dob: string; avatar_url?: string }[]): BirthdayProfile[] {
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
      result.push({ ...p, upcomingDate: nextBday })
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

function BirthdayCard({ person, isTodayBirthday }: { person: BirthdayProfile; isTodayBirthday?: boolean }) {
  return (
    <div
      className={`rounded-xl p-4 sm:p-5 hover:shadow-md transition-shadow flex items-center gap-4 ${
        isTodayBirthday
          ? 'bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200 shadow-sm'
          : 'bg-white border border-gray-200'
      }`}
    >
      {person.avatar_url ? (
        <Image
          src={person.avatar_url}
          alt={person.full_name}
          width={56}
          height={56}
          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center text-lg font-semibold text-pink-600 flex-shrink-0">
          {person.full_name?.[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{person.full_name}</p>
        <p className="text-xs text-gray-500 truncate">{person.department} · {person.position}</p>
        <p className={`text-sm font-medium mt-1 ${isTodayBirthday ? 'text-pink-600' : 'text-pink-600'}`}>
          🎂 {person.upcomingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
        <p className="text-gray-600 text-sm sm:text-base">Loading upcoming birthdays...</p>
      </div>
    )
  }

  if (birthdays.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
        <div className="text-4xl sm:text-5xl mb-3">🎂</div>
        <p className="text-gray-600 text-base sm:text-lg">No upcoming birthdays</p>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">No birthdays in the next 30 days</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {todayBirthdays.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🎉</span> Birthday Today
          </h2>
          <p className="text-gray-600 text-sm mb-4">Wish them a wonderful day!</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayBirthdays.map((person) => (
              <BirthdayCard key={person.id} person={person} isTodayBirthday />
            ))}
          </div>
        </div>
      )}

      {upcomingBirthdays.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>📅</span> Upcoming Birthdays
          </h2>
          <p className="text-gray-600 text-sm mb-4">Birthdays in the next 30 days</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingBirthdays.map((person) => (
              <BirthdayCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

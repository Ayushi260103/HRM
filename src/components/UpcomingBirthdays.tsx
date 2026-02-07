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
const CONFETTI_BG =
  "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.6) 2px, transparent 3px),\
   radial-gradient(circle at 70% 40%, rgba(255,255,255,0.6) 2px, transparent 3px),\
   radial-gradient(circle at 40% 80%, rgba(255,255,255,0.6) 2px, transparent 3px)";

   function BirthdayCard({
    person,
    isTodayBirthday,
  }: {
    person: BirthdayProfile
    isTodayBirthday?: boolean
  }) {
    const isToday = !!isTodayBirthday
  
    return (
      <div
        className={`
          relative flex flex-col items-center justify-center
          transition-all duration-300
          shadow-lg hover:shadow-xl
  
          ${
            isToday
              ? 'rounded-2xl aspect-[4/3] p-6'
              : 'rounded-full aspect-square p-6'
          }
        `}
        style={
          isToday
            ? {
                backgroundImage: `
                  ${CONFETTI_BG},
                  linear-gradient(135deg, #1e40af, #2563eb)
                `,
              }
            : {
                backgroundImage:
                  'linear-gradient(135deg, #93c5fd, #60a5fa)',
              }
        }
        
      >
        {/* Decorative border ring */}
        <div
          className={`
            absolute inset-1
            pointer-events-none
            ${
              isToday ? 'rounded-xl' : 'rounded-full'
            }
            border border-white/30
          `}
        />
  
        {/* Header text */}
        <div className="mb-2">
          <p
            className={`
              text-sm font-semibold tracking-wide
              ${
                isToday
                  ? 'text-white'
                  : 'text-slate-800'
              }
            `}
          >
            {isToday ? '🎉 Happy Birthday!' : 'Birthday Soon'}
          </p>
        </div>
  
        {/* Avatar */}
        <div className="relative">
          {person.avatar_url ? (
            <Image
              src={person.avatar_url}
              alt={person.full_name}
              width={96}
              height={96}
              className={`
                rounded-full object-cover
                ring-4 ring-white shadow-md
                ${isToday ? 'w-24 h-24' : 'w-20 h-20'}
              `}
            />
          ) : (
            <div
              className={`
                flex items-center justify-center
                rounded-full bg-white text-slate-700 font-bold
                ring-4 ring-white shadow-md
                ${isToday ? 'w-24 h-24 text-2xl' : 'w-20 h-20 text-xl'}
              `}
            >
              {person.full_name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
  
        {/* Text */}
        <div className="mt-3 text-center">
          <p
            className={`
              font-semibold
              ${isToday ? 'text-white' : 'text-slate-900'}
            `}
          >
            {capitalizeName(person.full_name)}
          </p>
  
          <p
            className={`
              text-sm
              ${isToday ? 'text-white/80' : 'text-slate-700'}
            `}
          >
            {person.job_title}
          </p>
  
          <p
            className={`
              mt-1 text-sm font-medium
              ${isToday ? 'text-white/90' : 'text-slate-800'}
            `}
          >
            {person.upcomingDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
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
            {todayBirthdays.map((person) => (
              <BirthdayCard key={person.id} person={person} isTodayBirthday />
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
            {upcomingBirthdays.map((person) => (
              <BirthdayCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

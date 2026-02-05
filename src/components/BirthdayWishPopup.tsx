'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'

function isBirthdayToday(dob: string | null): boolean {
  if (!dob) return false
  const today = new Date()
  const birth = new Date(dob)
  return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate()
}

function getStorageKey(userId: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `birthday-wish-${userId}-${today}`
}

export default function BirthdayWishPopup() {
  const supabase = useSupabase()
  const [show, setShow] = useState(false)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const storageKey = getStorageKey(user.id)
      // If browser already stored this key → Do not show popup again
      if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('dob, full_name')
        .eq('id', user.id)
        .single()

      if (profile?.dob && isBirthdayToday(profile.dob)) {
        setUserName(profile.full_name || '')
        setShow(true)
        sessionStorage.setItem(storageKey, '1')
      }
    }
    check()
  }, [supabase])

  if (!show) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[100] transition-opacity" aria-hidden />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center border-2 border-pink-200">
          <div className="text-5xl sm:text-6xl mb-4">🎂</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Happy Birthday!</h2>
          <p className="text-gray-600 text-base sm:text-lg mb-6">
            Wishing you a wonderful day, <span className="font-semibold text-pink-600">{userName || 'you'}</span>!
          </p>
          <button
            onClick={() => setShow(false)}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Thank you!
          </button>
        </div>
      </div>
    </>
  )
}

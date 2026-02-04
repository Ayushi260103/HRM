'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { getLocalDayRange, formatTime } from '@/lib/utils/date'

export function useAttendance(userId: string | null) {
  const supabase = useSupabase()
  const [logId, setLogId] = useState<string | null>(null)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [clockOutTime, setClockOutTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAttendance = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    const { startISO, endISO } = getLocalDayRange()
    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('clock_in', startISO)
      .lt('clock_in', endISO)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setLogId(data.id)
      setClockInTime(data.clock_in)
      setClockOutTime(data.clock_out)
    } else {
      setLogId(null)
      setClockInTime(null)
      setClockOutTime(null)
    }
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  const handleClockIn = useCallback(async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([{ user_id: userId }])
      .select()
      .single()

    if (!error && data) {
      setLogId(data.id)
      setClockInTime(data.clock_in)
    }
  }, [userId, supabase])

  const handleClockOut = useCallback(async () => {
    if (!logId) return

    const { data, error } = await supabase
      .from('attendance_logs')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', logId)
      .select()
      .single()

    if (!error && data) {
      setClockOutTime(data.clock_out)
    }
  }, [logId, supabase])

  return {
    logId,
    clockInTime,
    clockOutTime,
    loading,
    formatTime,
    handleClockIn,
    handleClockOut,
  }
}

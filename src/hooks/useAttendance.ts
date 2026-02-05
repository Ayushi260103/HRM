'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { getLocalDayRange, getLocalDateString, getLocalDayOfWeek, formatTime, getEndOfDayISO } from '@/lib/utils/date'

export function useAttendance(userId: string | null) {
  const supabase = useSupabase()
  const [logId, setLogId] = useState<string | null>(null)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [clockOutTime, setClockOutTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [clockInBlockReason, setClockInBlockReason] = useState<string | null>(null)

  const checkCanClockIn = useCallback(async (uid: string): Promise<string | null> => {
    const today = getLocalDateString()
    const dayOfWeek = getLocalDayOfWeek()

    const { data: holiday } = await supabase
      .from('office_holidays')
      .select('id')
      .eq('date', today)
      .maybeSingle()
    if (holiday) return 'Office is closed today (holiday).'

    const { data: weekend } = await supabase
      .from('user_weekends')
      .select('weekend_days')
      .eq('user_id', uid)
      .maybeSingle()
    const weekendDays = (weekend?.weekend_days ?? []) as number[]
    if (weekendDays.includes(dayOfWeek)) return 'Today is your week-off.'

    const { data: leave } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('user_id', uid)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
      .maybeSingle()
    if (leave) return 'You are on leave today.'

    return null
  }, [supabase])

  const loadAttendance = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    const { startISO, endISO } = getLocalDayRange()

    // Auto clock-out any open log from a previous day (forgot to clock out)
    const { data: staleLogs } = await supabase
      .from('attendance_logs')
      .select('id, clock_in')
      .eq('user_id', userId)
      .is('clock_out', null)
      .lt('clock_in', startISO)
      .order('clock_in', { ascending: false })
    if (staleLogs?.length) {
      for (const log of staleLogs) {
        const clockOutMidnight = getEndOfDayISO(log.clock_in, false)
        await supabase
          .from('attendance_logs')
          .update({ clock_out: clockOutMidnight })
          .eq('id', log.id)
      }
    }

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
      setClockInBlockReason(null)
    } else {
      setLogId(null)
      setClockInTime(null)
      setClockOutTime(null)
      const reason = await checkCanClockIn(userId)
      setClockInBlockReason(reason)
    }
    setLoading(false)
  }, [userId, supabase, checkCanClockIn])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  const handleClockIn = useCallback(async () => {
    if (!userId) return
    setClockInBlockReason(null)

    const blockReason = await checkCanClockIn(userId)
    if (blockReason) {
      setClockInBlockReason(blockReason)
      return
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([{ user_id: userId }])
      .select()
      .single()

    if (!error && data) {
      setLogId(data.id)
      setClockInTime(data.clock_in)
      setClockInBlockReason(null)
    }
  }, [userId, supabase, checkCanClockIn])

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
    clockInBlockReason,
    formatTime,
    handleClockIn,
    handleClockOut,
  }
}

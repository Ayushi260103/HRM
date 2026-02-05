import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEndOfDayISO } from '@/lib/utils/date'

/**
 * Auto clock-out at midnight: closes any attendance log that has clock_in but no clock_out
 * and whose clock_in is before today (UTC). Sets clock_out to end of that day (23:59:59 UTC).
 * Call this from a cron job (e.g. daily at 00:05 UTC) with CRON_SECRET in Authorization header.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  )

  const now = new Date()
  const startOfTodayUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ))
  const startISO = startOfTodayUTC.toISOString()

  const { data: openLogs, error: fetchError } = await supabase
    .from('attendance_logs')
    .select('id, clock_in')
    .is('clock_out', null)
    .lt('clock_in', startISO)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!openLogs?.length) {
    return NextResponse.json({ closed: 0, message: 'No open logs to close' })
  }

  let closed = 0
  for (const log of openLogs) {
    const clockOutMidnight = getEndOfDayISO(log.clock_in, true)
    const { error: updateError } = await supabase
      .from('attendance_logs')
      .update({ clock_out: clockOutMidnight })
      .eq('id', log.id)
    if (!updateError) closed++
  }

  return NextResponse.json({ closed, total: openLogs.length })
}

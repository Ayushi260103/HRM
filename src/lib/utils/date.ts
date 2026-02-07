export function getLocalDateString(): string {
  return getDateString(new Date())
}

/** Returns YYYY-MM-DD for a given Date (local time). */
export function getDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getLocalDayOfWeek(): number {
  return new Date().getDay()
}

export function getLocalDayRange(): { startISO: string; endISO: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

export function parseSupabaseTime(time: string): Date {
  const hasTz = /[zZ]|[+-]\d{2}:\d{2}$/.test(time)
  return new Date(hasTz ? time : `${time}Z`)
}

export function formatTime(time: string | null): string {
  return time ? parseSupabaseTime(time).toLocaleTimeString() : '--'
}

/**
 * Returns end-of-day (23:59:59.999) as ISO string for the same calendar day as clockIn.
 * useUTC: false = use local date (client); true = use UTC date (server/cron).
 */
export function getEndOfDayISO(clockInISO: string, useUTC = false): string {
  const d = new Date(clockInISO)
  const y = useUTC ? d.getUTCFullYear() : d.getFullYear()
  const m = useUTC ? d.getUTCMonth() : d.getMonth()
  const day = useUTC ? d.getUTCDate() : d.getDate()
  const end = useUTC
    ? new Date(Date.UTC(y, m, day, 23, 59, 59, 999))
    : new Date(y, m, day, 23, 59, 59, 999)
  return end.toISOString()
}

export function getCurrentYear(): number {
  return new Date().getFullYear()
}
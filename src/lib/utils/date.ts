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

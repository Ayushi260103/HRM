/** Returns the string with the first character uppercase. */
export function capitalizeFirst(str: string | null | undefined): string {
  if (str == null || str === '') return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Returns the string with the first letter of each word capitalized (for names). */
export function capitalizeName(str: string | null | undefined): string {
  if (str == null || str === '') return ''
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

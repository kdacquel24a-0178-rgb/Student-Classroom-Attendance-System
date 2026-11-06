export function formatDate(
  date: string,

  options: Intl.DateTimeFormatOptions,
): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", options)
}

/** Demo hospital clock. Day lists and due-medication windows use this zone. */
export const HOSPITAL_TIME_ZONE = "America/Los_Angeles"

type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date)

  const value = Object.fromEntries(
    formatted.filter(part => part.type !== "literal").map(part => [part.type, part.value])
  )
  const hour = value.hour === "24" ? 0 : Number(value.hour)

  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
    hour,
    minute: Number(value.minute),
    second: Number(value.second),
  }
}

function offsetMs(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - date.getTime()
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond))
  const firstOffset = offsetMs(guess, timeZone)
  const corrected = new Date(guess.getTime() - firstOffset)
  const secondOffset = offsetMs(corrected, timeZone)
  return secondOffset === firstOffset ? corrected : new Date(guess.getTime() - secondOffset)
}

export function hospitalDayBounds(now = new Date()) {
  const parts = zonedParts(now, HOSPITAL_TIME_ZONE)
  return {
    start: zonedDateTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0, 0, HOSPITAL_TIME_ZONE),
    end: zonedDateTimeToUtc(parts.year, parts.month, parts.day, 23, 59, 59, 999, HOSPITAL_TIME_ZONE),
  }
}

export function hospitalMonthStart(monthsAgo: number, now = new Date()) {
  const current = hospitalYearMonth(now)
  const index = current.year * 12 + (current.month - 1) - monthsAgo
  const year = Math.floor(index / 12)
  const month = (((index % 12) + 12) % 12) + 1
  return zonedDateTimeToUtc(year, month, 1, 0, 0, 0, 0, HOSPITAL_TIME_ZONE)
}

/** Weekday is 0 Sunday through 6 Saturday, matching `Schedule.dayOfWeek`. */
export function hospitalClock(date: Date) {
  const parts = zonedParts(date, HOSPITAL_TIME_ZONE)
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
  return { ...parts, weekday, minutes: parts.hour * 60 + parts.minute }
}

export function hospitalYearMonth(date: Date) {
  const parts = zonedParts(date, HOSPITAL_TIME_ZONE)
  return { year: parts.year, month: parts.month }
}

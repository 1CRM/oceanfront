export const sameDate = (d1: Date, d2: Date): boolean =>
  d1.getDate() == d2.getDate() &&
  d1.getMonth() == d2.getMonth() &&
  d1.getFullYear() == d2.getFullYear()

// always sets day to 1!
export const addMonths = (d: Date, months: number): Date => {
  const date = new Date(d.getTime())
  date.setMonth(date.getMonth() + months)
  date.setDate(1)
  return date
}

export const addDays = (d: Date, days: number): Date => {
  const date = new Date(d.getTime())
  date.setDate(date.getDate() + days)
  return date
}

export const addMinutes = (d: Date, minutes: number): Date => {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes() + minutes
  )
}

export const allDayEnd = (d: Date): Date => {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
}

/** First monday of the month */
export const firstMonday = (d?: Date): Date => {
  d = d || new Date()
  d = new Date(d.getFullYear(), d.getMonth(), 1)
  const wd = d.getDay() || 7
  return addDays(d, 1 - wd)
}

export const lastMonthDay = (d: Date): Date => {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export const parseDay = (day: number | string, defaultDay = 1): number => {
  const dayInt = parseInt(day as string)
  return isNaN(dayInt) ? defaultDay : Math.max(0, Math.min(6, dayInt))
}

const monthDaysRolling = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
const monthDaysRollingLeap = [
  0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335
]

export const isLeapYear = (y: number): boolean =>
  y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)

export const weeksInYear = (y: number): number => {
  let d = new Date(y, 0, 1)
  if (d.getDay() == 4) return 53
  d = new Date(y, 11, 31)
  if (d.getDay() == 4) return 53
  return 52
}

/** ISO week number */
export const isoWeekNumber = (d: Date): number => {
  const dow = d.getDay() || 7
  const y = d.getFullYear()
  const isLeap = isLeapYear(y)
  const month = d.getMonth()
  const doy =
    d.getDate() +
    (isLeap ? monthDaysRollingLeap[month] : monthDaysRolling[month])
  const w = Math.floor((10 + doy - dow) / 7)
  if (w < 1) return weeksInYear(y - 1)
  if (w > weeksInYear(y)) return 1
  return w
}

export interface MonthGridCell {
  date: Date
  today: boolean
  otherMonth: boolean
}

export interface MonthGridData {
  weekDays: number[]
  grid: MonthGridCell[][]
}

export function nextMonth(date: Date): Date {
  return addMonths(date, 1)
}

export function prevMonth(date: Date): Date {
  return addMonths(date, -1)
}

export const monthGrid = (
  forDate?: Date,
  weekStart?: number | string
): MonthGridData => {
  const weekDays = [1, 2, 3, 4, 5, 6, 7]
  const monthStart = new Date(forDate?.valueOf() ?? new Date().valueOf())
  monthStart.setDate(1)
  const month = monthStart.getMonth()
  const wd = monthStart.getDay() || 7
  const ws = parseDay(weekStart ?? 1)
  let date = addDays(monthStart, ws - (wd >= ws ? wd : wd + 7))
  let rowIdx = 0
  const grid = []
  const today = new Date()
  // there are always at least 4 rows, and we want to stop as soon as we
  // hit another month
  while (rowIdx < 4 || date.getMonth() == month) {
    rowIdx++
    const row = []
    for (let i = 0; i < 7; i++) {
      row.push({
        date,
        today: sameDate(today, date),
        otherMonth: date.getMonth() != month
      })
      date = addDays(date, 1)
    }
    grid.push(row)
  }
  return {
    grid,
    weekDays
  }
}

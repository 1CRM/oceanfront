import { addDays, addMonths, addMinutes, allDayEnd } from '../datetime'
import { DateTimeFormatter } from '../../formats/DateTime'
import { FormatState } from '../../lib/formats'

const OFFSET_TIMESTAMP = 10000
const OFFSET_YEAR = 10000
const OFFSET_MONTH = 100
export const MINUTES_IN_DAY = 60 * 24
export const MINUTES_IN_HOUR = 60

export function toTimestamp(date: Date): Timestamp {
  return {
    date: date,
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hours: date.getHours(),
    minutes: date.getMinutes()
  }
}

export function fromTimestamp(ts: Timestamp): Date {
  return new Date(ts.year, ts.month, ts.day, ts.hours, ts.minutes)
}

export function withZeroTime(ts: Timestamp): Timestamp {
  const d = new Date(ts.date.valueOf())
  d.setHours(0)
  d.setMinutes(0)
  d.setSeconds(0)
  d.setMilliseconds(0)
  return {
    ...ts,
    date: d,
    hours: 0,
    minutes: 0
  }
}

export function compareTimestamps(a: Timestamp, b: Timestamp): number {
  let delta = a.year - b.year
  if (delta != 0) return Math.sign(delta)
  delta = a.month - b.month
  if (delta != 0) return Math.sign(delta)
  delta = a.day - b.day
  if (delta != 0) return Math.sign(delta)
  delta = a.hours - b.hours
  if (delta != 0) return Math.sign(delta)
  delta = a.minutes - b.minutes
  if (delta != 0) return Math.sign(delta)
  return 0
}

export function daysInEvent(e: InternalEvent, range?: Timestamp[]): number {
  // This is a bit tricky. Simple arithmetic may yield incorrect
  // results because of DST
  let [start, end] = [e.startTS, e.endTS]
  if (range !== undefined) {
    if (compareTimestamps(start, range[0]) < 0) {
      start = range[0]
    }
    if (compareTimestamps(end, range[1]) > 0) {
      end = range[1]
    }
  }
  let date = fromTimestamp(start)
  let nDays = 0
  for (
    ;
    compareTimestamps(start, end) < 0;
    date = addDays(date, 1), start = toTimestamp(date)
  ) {
    nDays++
  }
  return nDays || 1
}

export const getDayIdentifier = (date: Timestamp): DayIdentifier => {
  return date.year * OFFSET_YEAR + date.month * OFFSET_MONTH + date.day
}

export const dayIdToTs = (id: DayIdentifier): Timestamp => {
  const day = id % OFFSET_MONTH
  const month = (id % OFFSET_YEAR) / OFFSET_MONTH
  const year = Math.floor(id / OFFSET_YEAR)
  return toTimestamp(new Date(year, month, day))
}

export const getTimeIdentifier = (date: Timestamp): TimeIdentifier => {
  return date.hours * MINUTES_IN_HOUR + date.minutes
}

export const getTimestampIdintifier = (date: Timestamp): DayIdentifier => {
  return getDayIdentifier(date) * OFFSET_TIMESTAMP + getTimeIdentifier(date)
}

export const isEventInRange = (
  event: InternalEvent,
  start: TimestampIdentifier,
  end: TimestampIdentifier
): boolean =>
  (event.end > start && event.end <= end) ||
  (event.start >= start && event.start < end) ||
  (start >= event.start && start < event.end) ||
  (start >= event.start && start < event.end)

export const eventsStartingAtDay = (
  events: InternalEvent[],
  day: DayIdentifier,
  intervalStart: DayIdentifier
): InternalEvent[] => {
  return events.filter((e) => {
    return Math.max(e.startDay, intervalStart) == day
  })
}

const categoryMatch = (
  cat: string,
  categories: string | string[] | undefined
): boolean => {
  if (Array.isArray(categories)) return !!~categories.indexOf(cat)
  return cat === categories
}

export const getEventsOfDay = (
  events: InternalEvent[],
  day: DayIdentifier,
  allDay: boolean | 'ignore',
  category?: string,
  sorted?: boolean
): InternalEvent[] => {
  const filtered = events.filter(
    (e) =>
      (allDay === 'ignore' || (e.allDay || false) === allDay) &&
      (category === undefined || categoryMatch(category, e.category)) &&
      isEventInRange(e, day * OFFSET_TIMESTAMP, (day + 1) * OFFSET_TIMESTAMP)
  )
  if (!sorted) return filtered
  return filtered.sort((a, b) => a.start - b.start)
}

export const getEventsOfMonth = (
  events: InternalEvent[],
  day: Timestamp,
  sorted?: boolean
): InternalEvent[] => {
  const start = getTimestampIdintifier(toTimestamp(addMonths(day.date, 0)))
  const end = getTimestampIdintifier(toTimestamp(addMonths(day.date, 1)))
  const filtered = events.filter((e) => isEventInRange(e, start, end))
  if (!sorted) return filtered
  return filtered.sort((a, b) => a.start - b.start)
}

export const hasOverlap = (
  s0: number,
  e0: number,
  s1: number,
  e1: number,
  exclude = true
): boolean => {
  return exclude ? !(s0 >= e1 || e0 <= s1) : !(s0 > e1 || e0 < s1)
}

export const getNormalizedRange = (
  event: InternalEvent,
  day: DayIdentifier
): TimestampIdentifier[] => {
  const start = day * OFFSET_TIMESTAMP
  const end = (day + 1) * OFFSET_TIMESTAMP
  return [Math.max(event.start, start), Math.min(event.end, end)]
}

export function getNormalizedTSRange(
  event: InternalEvent,
  day: Date
): Timestamp[]
export function getNormalizedTSRange(
  event: InternalEvent,
  startTS: Timestamp,
  endTS: Timestamp
): Timestamp[]

export function getNormalizedTSRange(
  event: InternalEvent,
  dayOrStartTS: Date | Timestamp,
  endTS?: Timestamp
): Timestamp[] {
  if (dayOrStartTS instanceof Date) {
    endTS = {
      ...toTimestamp(addDays(dayOrStartTS, 1)),
      hours: 0,
      minutes: 0
    }
    dayOrStartTS = {
      ...toTimestamp(dayOrStartTS),
      hours: 0,
      minutes: 0
    }
  }
  const start =
    compareTimestamps(event.startTS, dayOrStartTS) < 0
      ? dayOrStartTS
      : event.startTS
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const end = compareTimestamps(event.endTS, endTS!) > 0 ? endTS! : event.endTS
  return [start, end]
}

export function getGroups(
  events: InternalEvent[],
  day: DayIdentifier,
  allDay: boolean,
  category: string | undefined,
  layout: layoutFunc,
  overlapThreshold: number,
  [startHour, endHour]: number[]
): CalendarEventsGroup[] {
  const dayStart = day * OFFSET_TIMESTAMP + startHour * MINUTES_IN_HOUR
  const dayEnd = day * OFFSET_TIMESTAMP + endHour * MINUTES_IN_HOUR

  const dayEnd30 =
    day * OFFSET_TIMESTAMP + endHour * MINUTES_IN_HOUR - MINUTES_IN_HOUR / 2

  const dayLength = (endHour - startHour) * MINUTES_IN_HOUR
  const groups: CalendarEventsGroup[] = []
  const dayEvents = getEventsOfDay(events, day, allDay, category)
  dayEvents.sort((a, b) => a.start - b.start)
  const placements: CalendarEventPlacement[] = dayEvents.map((e) => ({
    event: e,
    start: Math.max(dayStart, e.start),
    end: Math.min(dayEnd, e.end),
    height: 0,
    top: 0,
    width: 0,
    left: 0,
    columns: 1,
    offset: 0,
    zIndex: 0,
    columnAdjust: 0,
    conflict: false
  }))
  for (const p of placements) {
    let [start, end] = [p.start, p.end]
    if (end - start < 30) {
      end = start + 30
      if (end > dayEnd) {
        end = dayEnd
        start = dayEnd30
      }
    }
    p.start = start
    p.end = end

    p.top =
      (((start % OFFSET_TIMESTAMP) - (dayStart % OFFSET_TIMESTAMP)) /
        dayLength) *
      100
    p.height =
      (((end % OFFSET_TIMESTAMP) - (start % OFFSET_TIMESTAMP)) / dayLength) *
      100
    let added = false
    for (const g of groups) {
      if (hasOverlap(start, end, g.start, g.end)) {
        g.placements.push(p)
        // no need to update start - events are sorted by start time, so
        // placement of the event with minimal timestamp is guaranteed
        // to be seen first
        g.end = Math.max(g.end, end)
        added = true
        break
      }
    }
    if (!added) {
      groups.push({
        start,
        end,
        placements: [p]
      })
    }
  }
  for (const g of groups) {
    if (g.placements.length > 1) {
      g.placements.forEach((p) => {
        p.conflict = true
      })
    }
    layout(g, overlapThreshold)
  }
  return groups
}

export type DayIdentifier = number
export type TimeIdentifier = number
export type TimestampIdentifier = number

export type categoryItem = {
  category: string
  date: Date
}

export interface Timestamp {
  readonly date: Date
  readonly year: number
  readonly month: number
  readonly day: number
  readonly hours: number
  readonly minutes: number
}

/** Calendar event. This event representation is used to supply events to the
 * calendar. The events will be parsed into InternalEvent. If event duration
 * cannot be determined from either of `end` or `duration` fields, the event
 * will be considered all-day regardless of `allDay` field value. All-day events
 * can span multiple days.  */
export interface CalendarEvent {
  /** Event name */
  readonly name: string
  /** Event start date/time "2009-12-28 11:30" */
  readonly start: string
  /** Event end date/time "2009-12-28 14:45" */
  readonly end?: string
  /** Event duration in minutes */
  readonly duration?: number
  /** Event color */
  readonly color?: string
  /** True if the event takes all day */
  readonly allDay?: boolean
  /** Event category */
  readonly category?: string | string[]
  readonly [_: string]: any
}

/** Calendar event, internal representation */
export interface InternalEvent {
  /** The original event that was parsed to create this internal representation */
  readonly orig: any
  /** Event start day identifier */
  readonly startDay: DayIdentifier
  /** Event start time identifier */
  readonly startTime: TimeIdentifier
  /** Event end  date identifier */
  readonly endDay: DayIdentifier
  /** Event end  time identifier */
  readonly endTime: TimeIdentifier
  readonly start: TimestampIdentifier
  readonly end: TimestampIdentifier
  readonly startTS: Timestamp
  readonly endTS: Timestamp
  /** True if the event occupies all day */
  readonly allDay?: boolean
  /** Event name */
  readonly name: string
  /** Event color */
  readonly color?: string
  /** Event class */
  readonly class?: string
  /** Event category */
  readonly category?: string | string[]

  uniq: string

  readonly [_: string]: any
}

export type CalendarAlldayEventPlacement = {
  event: InternalEvent
  top: number
  daysSpan: number
}

/** CalendarEventPlacement represents the placement of an event within a day.
 * Expressing height in milliseconds allows to adapt for different vertical
 * scales and grid slot heights.
 *
 * TODO: Would fractions of the whole day work here?
 */
export type CalendarEventPlacement = {
  /** The original event */
  event: InternalEvent
  start: TimestampIdentifier
  end: TimestampIdentifier
  /** Top position, expressed in minutes since day start */
  top: number
  /** Width as a fraction of day width */
  width: number
  /** Height, expressed in milliseconds */
  height: number
  left: number
  columns: number
  columnAdjust: number
  offset: number
  zIndex: number
  conflict: boolean
}

/** CalendarEventsGroup is a group of overlapping events */
export type CalendarEventsGroup = {
  start: TimestampIdentifier
  end: TimestampIdentifier
  placements: CalendarEventPlacement[]
}

export type Column = {
  placements: CalendarEventPlacement[]
  offset: number
  end: number
}

export type layoutFunc = (
  group: CalendarEventsGroup,
  overlapThreshold: number
) => void

export const parseEvent = (
  e: CalendarEvent,
  f: FormatState
): InternalEvent | undefined => {
  const fm = f.getTextFormatter('datetime') as DateTimeFormatter
  const startDate = fm.loadValue(e.start)
  if (startDate == null) {
    return undefined
  }
  let endDate: Date | null = null
  if (e.end) {
    endDate = fm.loadValue(e.end)
  }
  if ((endDate == null && e.duration) || 0 > 0) {
    endDate = addMinutes(startDate, e.duration || 0)
  }
  let allDay = e.allDay || false
  if (endDate == null || endDate < startDate) {
    allDay = true
    endDate = allDayEnd(startDate)
  }
  const startTS = toTimestamp(startDate)
  const endTS = toTimestamp(endDate)
  return {
    uniq: '',
    name: e.name,
    color: e.color,
    class: e.class,
    allDay: allDay,
    startTS: startTS,
    endTS: endTS,
    start: getTimestampIdintifier(startTS),
    end: getTimestampIdintifier(endTS),
    startDay: getDayIdentifier(startTS),
    endDay: getDayIdentifier(endTS),
    startTime: getTimeIdentifier(startTS),
    endTime: getTimeIdentifier(endTS),
    category: e.category,
    orig: e
  }
}

export const uniqEvent = (
  e: InternalEvent,
  cat: categoryItem
): InternalEvent => {
  return {
    ...e,
    uniq: '' + getDayIdentifier(toTimestamp(cat.date)) + '|' + cat.category
  }
}

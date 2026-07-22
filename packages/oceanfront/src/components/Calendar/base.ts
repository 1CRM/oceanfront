import { DateTimeFormatterOptions } from '../../formats/DateTime'
import {
  getDayIdentifier,
  getEventsOfDay,
  toTimestamp,
  CalendarEvent,
  InternalEvent,
  parseEvent,
  uniqEvent
} from '../../lib/calendar'
import { parseDay, sameDate } from '../../lib/datetime'
import { resolveFormats } from '../../lib/formats'
import { resolveLocale } from '../../lib/locale'
import { computed, h, Slots } from 'vue'
import {
  adjustCalendarEventHoverPosition,
  resetCalendarEventHoverPosition
} from './eventUtils'

const weekDayFormat: DateTimeFormatterOptions = {
  nativeOptions: { weekday: 'short' }
}

const dayFormat: DateTimeFormatterOptions = {
  nativeOptions: { day: 'numeric' }
}

/** Resolve the first day of the week from a calendar prop or the active locale. */
export function resolveWeekStart(
  weekStart: number | undefined,
  locale: { localeParams?: { weekStart?: number } }
): number {
  const day =
    weekStart === undefined ? (locale.localeParams?.weekStart ?? 1) : weekStart
  return parseDay(day)
}

/**
 * Shared calendar helpers (formatters, day/weekday rendering, slot lookup)
 * used by the month, year and day-column based calendar views.
 */
export function useCalendarBase(slots: Slots) {
  const formatMgr = computed(() => resolveFormats())
  const locale = computed(() => resolveLocale())

  function renderSlot(name: string, param: any, fallback: () => any) {
    const slot = slots[name]
    return slot ? slot(param) : fallback()
  }

  function renderWeekDay(date?: Date) {
    const weekFmt = formatMgr.value.getTextFormatter('date', weekDayFormat)
    return h('div', { class: 'weekday' }, weekFmt?.format(date).textValue)
  }

  function renderDayNumber(date?: Date, weekday?: boolean) {
    const dayFmt = formatMgr.value.getTextFormatter('date', dayFormat)
    return h(
      'div',
      {
        class: 'of-calendar-day-title',
        tabindex: weekday ? undefined : '0'
      },
      [
        weekday ? renderWeekDay(date) : null,
        h(
          'div',
          {
            class: {
              'day-number': true,
              today: date && sameDate(date, new Date())
            }
          },
          dayFmt?.format(date).textValue
        )
      ]
    )
  }

  return {
    formatMgr,
    locale,
    renderSlot,
    renderWeekDay,
    renderDayNumber,
    header: () => slots['header']?.(),
    footer: () => slots['footer']?.()
  }
}

/**
 * Shared "month grid" day/event helpers used by the month and year calendar
 * views: parses the raw `events` prop, looks up the events for a given day,
 * and renders the "N more" link and individual event pills within a day
 * cell. Both views declare the same set of emits this relies on
 * (`click:event`, `enter:event`, `leave:event`, `click:more`, `click:day`,
 * `focus:day`, `blur:day`).
 */
export function useMonthGridEvents(
  props: Record<string, any>,
  slots: Slots,
  emit: (event: any, ...args: any[]) => void
) {
  const base = useCalendarBase(slots)
  const { formatMgr, renderSlot } = base

  const eventsLimitNumber = computed(() =>
    Math.max(2, parseInt(props.eventsLimit as unknown as string) || 5)
  )

  const eventHeightNumber = computed(
    () => parseInt(props.eventHeight as unknown as string) || 20
  )

  const parsedEvents = computed((): InternalEvent[] => {
    const events: CalendarEvent[] = props.events || []
    return events
      .map((e) => parseEvent(e, formatMgr.value))
      .filter((e) => e !== undefined) as InternalEvent[]
  })

  function dayEvents(day: Date): InternalEvent[] {
    return getEventsOfDay(
      parsedEvents.value,
      getDayIdentifier(toTimestamp(day)),
      'ignore'
    ).map((e) => uniqEvent(e, { category: '', date: day }))
  }

  /** Cap events for a day cell and compute the leftover "N more" count. */
  function limitDayEvents(events: InternalEvent[]) {
    let limit = eventsLimitNumber.value
    let more = 0
    if (events.length > limit) {
      limit -= 1
      more = events.length - limit
    }
    return { events: events.slice(0, limit), more, limit }
  }

  function hideDate(date: Date) {
    return props.hideWeekends && [6, 0].includes(date.getDay())
  }

  function renderMoreLink(count: number, day: Date, top: number) {
    if (count < 1) return null
    const slot = slots['more']
    return h(
      'div',
      {
        class: 'of-calendar-more',
        tabindex: '0',
        onClick: (event: any) => {
          emit('click:more', event, day)
        },
        onKeypress: (event: KeyboardEvent) => {
          if (['Enter', 'Space'].includes(event.code)) {
            event.preventDefault()
            emit('click:day', event, day)
          }
        },
        style: {
          top: '' + top + 'px'
        }
      },
      slot ? slot(count) : `${count} more`
    )
  }

  function renderRowDayEvent(e: InternalEvent, idx: number) {
    const top = eventHeightNumber.value * idx
    const finalColor = props.eventColor?.(e) ?? e.color
    const eventClass =
      props.eventClass?.(e) ?? (e.class ? { [e.class]: true } : {})
    return h(
      'div',
      {
        class: { ...eventClass, 'of-calendar-event': true },
        style: {
          'background-color': finalColor,
          top: `${top}px`
        },
        tabindex: '0',
        onClick: (event: any) => {
          emit('click:event', event, { ...e, color: finalColor })
          event.stopPropagation()
        },
        onMouseenter: (event: any) => {
          adjustCalendarEventHoverPosition(event.currentTarget)
          emit('enter:event', event, e)
        },
        onMouseleave: (event: any) => {
          resetCalendarEventHoverPosition(event.currentTarget)
          emit('leave:event', event, e)
        },
        onKeypress: (event: KeyboardEvent) => {
          if (['Enter', 'Space'].includes(event.code)) {
            event.preventDefault()
            emit('click:event', event, { ...e, color: finalColor })
            event.stopPropagation()
          }
        },
        onFocus: () => {
          emit('focus:day')
        },
        onBlur: () => {
          emit('blur:day')
        }
      },
      renderSlot('allday-event-content', { event: e }, () =>
        h('strong', e.name)
      )
    )
  }

  return {
    ...base,
    eventsLimitNumber,
    eventHeightNumber,
    parsedEvents,
    dayEvents,
    limitDayEvents,
    hideDate,
    renderMoreLink,
    renderRowDayEvent
  }
}

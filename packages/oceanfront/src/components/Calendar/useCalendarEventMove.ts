import { addMinutes } from '../../lib/datetime'
import {
  getTimestampIdintifier,
  toTimestamp,
  withZeroTime,
  categoryItem,
  InternalEvent,
  OFFSET_TIMESTAMP,
  Timestamp
} from '../../lib/calendar'
import { computed, ComputedRef, onUnmounted, Ref, ref, VNode, h } from 'vue'

const MOVE_THRESHOLD_PX = 4

export type CalendarMoveMeta = { allDay: boolean }

type MoveState = {
  event: InternalEvent
  originStart: number
  originEnd: number
  originAllDay: boolean
  durationMinutes: number
  offsetMinutes: number
  startX: number
  startY: number
  active: boolean
  previewStart: number
  previewEnd: number
  category: string
  allDay: boolean
}

export type UseCalendarEventMoveOptions = {
  props: {
    movable?: boolean
    eventMovable?: (e: InternalEvent) => boolean
    categoriesList?: categoryItem[]
    eventColor?: (e: InternalEvent) => any
    eventClass?: (e: InternalEvent) => any
    eventHeight?: number | string
  }
  emit: (...args: any[]) => void
  hoursInterval: ComputedRef<number[]>
  numHourIntervals: ComputedRef<number>
  eventMaxWidth: Ref<number>
  clearSelection: () => void
}

function precisionMinutes(numHourIntervals: number) {
  return 60 / numHourIntervals
}

function timestampFromY(
  clientY: number,
  dayBoundEl: HTMLElement,
  day: Timestamp,
  hours: number[],
  precision: number
) {
  const bounds = dayBoundEl.getBoundingClientRect()
  let minutes = Math.floor(
    ((clientY - bounds.top) / bounds.height) * (hours[1] - hours[0]) * 60
  )
  minutes -= minutes % precision
  minutes += hours[0] * 60
  return toTimestamp(addMinutes(withZeroTime(day).date, minutes))
}

export function useCalendarEventMove(options: UseCalendarEventMoveOptions) {
  const {
    props,
    emit,
    hoursInterval,
    numHourIntervals,
    eventMaxWidth,
    clearSelection
  } = options

  const moving = ref<MoveState | null>(null)
  let suppressClick = false

  function isEventMovable(e: InternalEvent): boolean {
    if (!props.movable) return false
    return typeof props.eventMovable === 'function'
      ? props.eventMovable(e) !== false
      : true
  }

  function emitMove(
    type: 'start' | 'change' | 'end',
    m: MoveState,
    nativeEvent: Event
  ) {
    emit(
      `move:${type}`,
      m.event,
      m.previewStart,
      m.previewEnd,
      m.category,
      { allDay: m.allDay } satisfies CalendarMoveMeta,
      nativeEvent
    )
  }

  function cleanupListeners() {
    window.removeEventListener('mousemove', onWindowMove)
    window.removeEventListener('mouseup', onWindowUp)
    window.removeEventListener('keydown', onWindowKey)
  }

  function cancelMove(nativeEvent?: Event) {
    const m = moving.value
    cleanupListeners()
    moving.value = null
    if (m?.active) emit('move:cancel', m.event, nativeEvent)
  }

  function beginMove(
    nativeEvent: MouseEvent,
    event: InternalEvent,
    fromAllDay: boolean
  ): boolean {
    if (nativeEvent.buttons !== 1) return false
    // Always stop so day selection does not start from an event press.
    nativeEvent.stopPropagation()
    if (!isEventMovable(event)) return false
    nativeEvent.preventDefault()

    const precision = precisionMinutes(numHourIntervals.value)
    const durationMinutes = event.allDay
      ? Math.max(30, precision)
      : Math.max(
          Math.round(
            (event.endTS.date.getTime() - event.startTS.date.getTime()) / 60000
          ),
          precision
        )

    let offsetMinutes = 0
    if (!fromAllDay && nativeEvent.currentTarget) {
      const el = nativeEvent.currentTarget as HTMLElement
      const bounds = el.getBoundingClientRect()
      offsetMinutes = Math.floor(
        (Math.max(0, nativeEvent.clientY - bounds.top) /
          Math.max(bounds.height, 1)) *
          durationMinutes
      )
      offsetMinutes -= offsetMinutes % precision
    }

    moving.value = {
      event,
      originStart: event.start,
      originEnd: event.end,
      originAllDay: !!event.allDay,
      durationMinutes,
      offsetMinutes,
      startX: nativeEvent.clientX,
      startY: nativeEvent.clientY,
      active: false,
      previewStart: event.start,
      previewEnd: event.end,
      category: '',
      allDay: fromAllDay
    }
    window.addEventListener('mousemove', onWindowMove)
    window.addEventListener('mouseup', onWindowUp)
    window.addEventListener('keydown', onWindowKey)
    return true
  }

  function findCategory(dayBoundEl: HTMLElement): categoryItem | null {
    const key = dayBoundEl.dataset.ofCategory
    if (key === undefined) return null
    return (props.categoriesList || []).find((c) => c.category === key) ?? null
  }

  function updatePreview(next: MoveState, e: MouseEvent) {
    const el = document.elementFromPoint(
      e.clientX,
      e.clientY
    ) as HTMLElement | null
    if (!el) {
      moving.value = next
      return
    }

    const dayBoundEl = el.closest('.of-calendar-day') as HTMLElement | null
    if (!dayBoundEl || dayBoundEl.closest('.of-calendar-day-titles')) {
      moving.value = next
      return
    }

    const cat = findCategory(dayBoundEl)
    if (!cat) {
      moving.value = next
      return
    }

    if (el.closest('.of-calendar-allday-row')) {
      const startId = getTimestampIdintifier(
        withZeroTime(toTimestamp(cat.date))
      )
      moving.value = {
        ...next,
        allDay: true,
        category: cat.category,
        previewStart: startId,
        previewEnd: startId + next.durationMinutes
      }
      emitMove('change', moving.value, e)
      return
    }

    const precision = precisionMinutes(numHourIntervals.value)
    const [dayStartHour, dayEndHour] = hoursInterval.value
    const dayTs = toTimestamp(cat.date)
    const ts = timestampFromY(
      e.clientY,
      dayBoundEl,
      dayTs,
      hoursInterval.value,
      precision
    )
    const dur = next.durationMinutes
    let startMinutes = ts.hours * 60 + ts.minutes - next.offsetMinutes
    const minM = dayStartHour * 60
    const maxStart = dayEndHour * 60 - dur
    startMinutes = Math.max(minM, Math.min(startMinutes, maxStart))
    startMinutes -= startMinutes % precision

    const startTs = toTimestamp(
      addMinutes(withZeroTime(dayTs).date, startMinutes)
    )
    const endTs = toTimestamp(addMinutes(startTs.date, dur))
    moving.value = {
      ...next,
      allDay: false,
      category: cat.category,
      previewStart: getTimestampIdintifier(startTs),
      previewEnd: getTimestampIdintifier(endTs)
    }
    emitMove('change', moving.value, e)
  }

  function onWindowMove(e: MouseEvent) {
    const m = moving.value
    if (!m) return

    let next = m
    if (!m.active) {
      const dx = e.clientX - m.startX
      const dy = e.clientY - m.startY
      if (dx * dx + dy * dy < MOVE_THRESHOLD_PX * MOVE_THRESHOLD_PX) return
      next = { ...m, active: true }
      clearSelection()
      emitMove('start', next, e)
    }
    updatePreview(next, e)
  }

  function onWindowUp(e: MouseEvent) {
    const m = moving.value
    cleanupListeners()
    moving.value = null
    if (!m?.active) return

    suppressClick = true
    const changed =
      m.allDay !== m.originAllDay ||
      m.previewStart !== m.originStart ||
      m.previewEnd !== m.originEnd
    if (changed) emitMove('end', m, e)
    else emit('move:cancel', m.event, e)
  }

  function onWindowKey(e: KeyboardEvent) {
    if (e.key === 'Escape') cancelMove(e)
  }

  onUnmounted(cleanupListeners)

  function consumeClickSuppress(): boolean {
    if (!suppressClick) return false
    suppressClick = false
    return true
  }

  function renderMoveGhost(
    event: InternalEvent,
    style: Record<string, string>
  ): VNode {
    const color = props.eventColor?.(event) ?? event.color
    const eventClass =
      props.eventClass?.(event) ?? (event.class ? { [event.class]: true } : {})
    return h(
      'div',
      {
        class: {
          ...eventClass,
          'of-calendar-event': true,
          'of-calendar-event--ghost': true
        },
        style: {
          'background-color': color,
          'max-width': eventMaxWidth.value + 'px',
          ...style
        }
      },
      h('strong', event.name)
    )
  }

  function timedMoveGhost(cat: categoryItem): VNode | null {
    const m = moving.value
    if (!m?.active || m.allDay || m.category !== cat.category) return null

    const [startHour, endHour] = hoursInterval.value
    const dayLength = (endHour - startHour) * 60
    if (dayLength <= 0) return null

    const startMin = m.previewStart % OFFSET_TIMESTAMP
    const endMin = m.previewEnd % OFFSET_TIMESTAMP
    const top = ((startMin - startHour * 60) / dayLength) * 100
    const height = Math.max(
      100 / dayLength,
      ((endMin - startMin) / dayLength) * 100
    )

    return renderMoveGhost(m.event, {
      left: '5px',
      width: 'calc(100% - 10px)',
      top: `calc(${Math.max(0, top)}% + 1px)`,
      height: `calc(${height}% - 3px)`,
      'min-height': `calc(${height}% - 3px)`
    })
  }

  function allDayMoveGhost(cat: categoryItem): VNode | null {
    const m = moving.value
    if (!m?.active || !m.allDay || m.category !== cat.category) return null

    const eventHeight = parseInt(props.eventHeight as unknown as string) || 20
    return renderMoveGhost(m.event, {
      width: 'calc(100% - 10px)',
      top: '2px',
      height: eventHeight - 4 + 'px'
    })
  }

  /** Handlers/classes to attach on calendar event nodes. */
  function eventMoveBindings(event: InternalEvent, fromAllDay: boolean) {
    return {
      class: { 'of-calendar-event--movable': isEventMovable(event) },
      onMousedown: (e: MouseEvent) => beginMove(e, event, fromAllDay),
      shouldIgnoreClick: consumeClickSuppress,
      isMoveActive: () => !!moving.value?.active
    }
  }

  const showAllDayForMove = computed(
    () => !!(moving.value?.active && moving.value.allDay)
  )

  function isTimedMoveHighlight(
    intervalTime: number,
    cat: categoryItem
  ): boolean {
    const m = moving.value
    return !!(
      m?.active &&
      !m.allDay &&
      intervalTime >= m.previewStart &&
      intervalTime < m.previewEnd &&
      m.category === cat.category
    )
  }

  function isAllDayMoveHighlight(cat: categoryItem): boolean {
    const m = moving.value
    return !!(m?.active && m.allDay && m.category === cat.category)
  }

  /** Marks a day/category cell so drag hit-testing can map it back to a category. */
  function categoryAttr(cat: categoryItem) {
    return { 'data-of-category': cat.category }
  }

  return {
    showAllDayForMove,
    eventMoveBindings,
    timedMoveGhost,
    allDayMoveGhost,
    isTimedMoveHighlight,
    isAllDayMoveHighlight,
    categoryAttr
  }
}

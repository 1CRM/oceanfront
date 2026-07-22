import { DateTimeFormatterOptions } from '../../formats/DateTime'
import { BusyInfo, layoutAllday } from '../../lib/calendar/layout/allday'
import { addMinutes } from '../../lib/datetime'
import { FormatState } from '../../lib/formats'
import {
  computed,
  ComponentPublicInstance,
  defineComponent,
  h,
  onMounted,
  reactive,
  ref,
  VNode
} from 'vue'
import { OfOverlay } from '../Overlay'
import {
  eventsStartingAtDay,
  getDayIdentifier,
  getEventsOfDay,
  getGroups,
  getNormalizedTSRange,
  getTimestampIdintifier,
  toTimestamp,
  withZeroTime,
  CalendarAlldayEventPlacement,
  CalendarEvent,
  CalendarEventPlacement,
  categoryItem,
  InternalEvent,
  layoutFunc,
  parseEvent,
  Timestamp,
  uniqEvent
} from '../../lib/calendar'
import ColumnLayout from '../../lib/calendar/layout/columns'
import StackLayout from '../../lib/calendar/layout/stack'
import { useCalendarBase } from './base'
import calendarProps from './props'
import {
  adjustCalendarEventHoverPosition,
  resetCalendarEventHoverPosition
} from './eventUtils'

function formatRange(mgr: FormatState, e: InternalEvent, withinDate: Date) {
  const [startTS, endTS] = getNormalizedTSRange(e, withinDate)
  const start = new Date(
    startTS.year,
    startTS.month,
    startTS.day,
    startTS.hours,
    startTS.minutes
  )
  const end = new Date(
    endTS.year,
    endTS.month,
    endTS.day,
    endTS.hours,
    endTS.minutes
  )
  const spansNoon = startTS.hours < 12 != endTS.hours < 12
  const opts: DateTimeFormatterOptions = {
    nativeOptions: { hour: 'numeric', minute: 'numeric' }
  }
  const fmt = mgr.getTextFormatter('date', opts)
  const resStart = fmt?.format(start).parts as any[]
  const resEnd = fmt?.format(end).parts as any[]
  if (!resStart || !resEnd) return ''
  const startStr = resStart
    .filter((p) => spansNoon || p.type != 'dayPeriod')
    .map((p) => p.value)
    .join('')
    .trim()
  const endStr = resEnd
    .map((p) => p.value)
    .join('')
    .trim()
  return startStr + '-' + endStr
}

export default defineComponent({
  props: {
    ...calendarProps.internal,
    ...calendarProps.common,
    ...calendarProps.week
  },
  emits: [
    'click:event',
    'enter:event',
    'leave:event',
    'click:category',
    'click:day',
    'mousedown:time',
    'mousemove:time',
    'mouseup:time',
    'selection:change',
    'selection:end',
    'selection:cancel',
    'selection:allday',
    'focus:day',
    'blur:day'
  ],
  setup(props, { slots, emit }) {
    const { formatMgr, renderSlot, header, footer } = useCalendarBase(slots)

    const selecting = ref<'start' | 'end' | false>(false)
    const selectionStart = ref(0)
    const selectionEnd = ref(0)
    const selectionCategory = ref('')
    const dayEl = ref<HTMLElement | undefined>(undefined)
    const eventMaxWidth = ref(250)
    const allDayPopups = reactive<{
      active: Record<string, boolean>
      closeTimerId: Record<string, number | undefined>
      width: Record<string, number>
      height: Record<string, number>
    }>({
      active: {},
      closeTimerId: {},
      width: {},
      height: {}
    })

    const overlapThresholdNumber = computed(
      () => parseInt(props.overlapThreshold as unknown as string) || 0
    )

    const numHourIntervals = computed(
      () => parseInt(props.hourIntervals as unknown as string) || 4
    )

    const parsedEvents = computed((): InternalEvent[] => {
      const events: CalendarEvent[] = props.events || []
      return events
        .map((e) => parseEvent(e, formatMgr.value))
        .filter((e) => e !== undefined) as InternalEvent[]
    })

    const layoutFuncValue = computed(
      (): layoutFunc => (props.layout === 'stack' ? StackLayout : ColumnLayout)
    )

    const hasAllDay = computed(
      () => (props.events?.filter((e) => e.allDay).length || 0) > 0
    )

    const groupAllDay = computed(
      () =>
        props.groupAllDayEvents === true &&
        ['week', 'day'].includes(props.type ?? '')
    )

    const hoursInterval = computed(() => {
      let start = parseInt(props.dayStart as unknown as string) || 0
      let end = parseInt(props.dayEnd as unknown as string) || 0
      if (start >= end) [start, end] = [0, 24]
      start = Math.max(0, start)
      end = Math.min(24, end)
      return [start, end]
    })

    const allDayEvents = computed(() => {
      const visRange = props.visibleRange || []
      const rangeStart = getDayIdentifier(visRange[0])
      const allDayEventsResult = {} as any
      let busyInfo: BusyInfo = { busyColumns: [], currentColumn: 0 }
      for (const cat of props.categoriesList || []) {
        const day = getDayIdentifier(toTimestamp(cat.date))
        const dayEventsList = getEventsOfDay(
          parsedEvents.value,
          day,
          true,
          props.ignoreCategories ? undefined : cat.category,
          true
        )
        const evs = groupAllDay.value
          ? dayEventsList
          : eventsStartingAtDay(dayEventsList, day, rangeStart)
        const layedOut = layoutAllday(evs, visRange, busyInfo)
        if (props.type == 'category')
          busyInfo = { busyColumns: [], currentColumn: 0 }
        let top = -1
        allDayEventsResult[cat.category] = layedOut.map((p) => {
          top++
          return {
            ...p,
            ...(groupAllDay.value
              ? {
                  top,
                  daysSpan: 1
                }
              : {}),
            event: { ...p.event, uniq: uniqEvent(p.event, cat) }
          }
        })
      }
      return allDayEventsResult
    })

    const dayEvents = computed(() => {
      const dayEventsResult = {} as any
      for (const cat of props.categoriesList || []) {
        const day = getDayIdentifier(toTimestamp(cat.date))
        const threshold = overlapThresholdNumber.value
        const forCategory = props.ignoreCategories ? undefined : cat.category
        const groups = getGroups(
          parsedEvents.value,
          day,
          false,
          forCategory,
          layoutFuncValue.value,
          threshold,
          hoursInterval.value
        )
        dayEventsResult[cat.category] = groups
          .map((g) =>
            g.placements.map((p) => {
              return {
                ...p,
                event: { ...p.event, uniq: uniqEvent(p.event, cat) }
              }
            })
          )
          .flat(1)
      }
      return dayEventsResult
    })

    // Every day/category column shares this same ref, so `lastDayEl` ends
    // up holding whichever column was rendered last (matching the original
    // Options API behavior, where a shared string ref had the same effect).
    // It is captured in a plain variable rather than `dayEl` directly:
    // `dayEl` is read during render (see `dayRowEvent`), so mutating it
    // synchronously while refs are applied would make the render effect
    // trigger itself repeatedly across day columns.
    let lastDayEl: HTMLElement | undefined
    function setDayEl(el: Element | ComponentPublicInstance | null) {
      lastDayEl = (el as HTMLElement) ?? undefined
    }
    onMounted(() => {
      dayEl.value = lastDayEl
    })

    function intervals() {
      const [start, end] = hoursInterval.value
      return Array.from({ length: end - start }, (_, i) => i + start)
    }

    function hideDate(date: Date) {
      return (
        props.type === 'week' &&
        props.hideWeekends &&
        [6, 0].includes(date.getDay())
      )
    }

    function getEventIntervalRange(ts: Timestamp): number[] {
      const startTsId = getTimestampIdintifier(ts)
      const endTsId = getTimestampIdintifier(
        toTimestamp(addMinutes(ts.date, 60 / numHourIntervals.value))
      )
      return [startTsId, endTsId]
    }

    function getEventTimestamp(e: MouseEvent | TouchEvent, day: Timestamp) {
      const hours = hoursInterval.value
      const precision = 60 / numHourIntervals.value
      const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const touchEvent: TouchEvent = e as TouchEvent
      const mouseEvent: MouseEvent = e as MouseEvent
      const touches: TouchList = touchEvent.changedTouches || touchEvent.touches
      const clientY: number =
        touches && touches[0] ? touches[0].clientY : mouseEvent.clientY
      const offsetY = clientY - bounds.top
      let minutes = Math.floor(
        (offsetY / bounds.height) * (hours[1] - hours[0]) * 60
      )
      minutes -= minutes % precision
      minutes += hours[0] * 60
      const ts = toTimestamp(addMinutes(withZeroTime(day).date, minutes))
      return ts
    }

    function superTitle() {
      const slot = slots['super-title']
      if (!slot) return ''
      return [
        h('div', { class: 'of-calendar-gutter' }),
        h('div', { class: 'of-calendar-day-supertitle' }, slot())
      ]
    }

    function renderCategoryTitle(cat: categoryItem) {
      const isDate = props.type != 'category'
      const slotName = isDate ? 'day-title' : 'category-title'
      const theDay = cat.date
      const slotArgs = isDate ? theDay : cat.category
      const eventName = isDate ? 'click:day' : 'click:category'
      const weekDayCls = isDate ? 'week-day-' + cat.date.getDay() : false
      if (hideDate(cat.date)) return
      return h(
        'div',
        {
          class: ['of-calendar-category-title', weekDayCls],
          tabindex: '0',
          onClick: (event: any) => emit(eventName as any, event, slotArgs),
          onKeypress: (event: KeyboardEvent) => {
            if (['Enter', 'Space'].includes(event.code)) {
              event.preventDefault()
              emit(eventName as any, event, slotArgs)
            }
          }
        },
        renderSlot(slotName, slotArgs, () => cat.category)
      )
    }

    function title() {
      if (!props.categoryTitles || props.type === 'custom') {
        return ''
      }
      const titles = !props.categoriesList
        ? ''
        : props.categoriesList.map(renderCategoryTitle)

      return h('div', { class: 'of-calendar-day-titles' }, [
        h('div', { class: 'of-calendar-gutter' }),
        titles
      ])
    }

    function allDayLabel() {
      const slot = slots['all-day-label']
      return slot?.()
    }

    function allDayRowEvent(
      acc: { height: number; columns: any[] },
      eventHeight: number
    ) {
      return (e: CalendarAlldayEventPlacement) => {
        acc.height = Math.max(e.top, acc.height)
        const finalColor = props.eventColor?.(e.event) ?? e.event.color
        const eventClass =
          props.eventClass?.(e.event) ??
          (e.event.class ? { [e.event.class]: true } : {})
        const slot = slots['allday-event-content']
        return h(
          'div',
          {
            class: { ...eventClass, 'of-calendar-event': true },
            style: {
              'background-color': finalColor,
              width: 'calc(' + (e.daysSpan || 1) * 100 + '% - 10px)',
              top: '' + e.top * eventHeight + 'px',
              'max-width': eventMaxWidth.value + 'px'
            },
            tabindex: '0',
            onClick: (event: any) => {
              emit('click:event', event, {
                ...e.event,
                color: finalColor
              })
            },
            onKeypress: (event: KeyboardEvent) => {
              if (['Enter', 'Space'].includes(event.code)) {
                event.preventDefault()
                emit('click:event', event, {
                  ...e.event,
                  color: finalColor
                })
              }
            },
            onMousedown: (event: any) => {
              event.stopPropagation()
            },
            onMouseenter: (event: any) => {
              adjustCalendarEventHoverPosition(event.currentTarget)
              emit('enter:event', event, e.event)
            },
            onMouseleave: (event: any) => {
              resetCalendarEventHoverPosition(event.currentTarget)
              emit('leave:event', event, e.event)
              event.stopPropagation()
            },
            onFocus: () => {
              emit('focus:day')
            },
            onBlur: () => {
              emit('blur:day')
            }
          },
          slot ? slot({ event: e.event }) : h('strong', e.event.name)
        )
      }
    }

    function allDayRowCell(
      acc: { height: number; columns: any[] },
      cat: categoryItem
    ) {
      const isDate = props.type != 'category'
      const eventHeight = parseInt(props.eventHeight as unknown as string) || 20
      const events =
        (allDayEvents.value[cat.category] as CalendarAlldayEventPlacement[]) ||
        []
      const weekDay = cat.date.getDay()
      const vnode = h(
        'div',
        {
          class: [
            'of-calendar-day',
            {
              selected:
                selecting.value &&
                selectionCategory.value === 'allday-' + weekDay,
              ['week-day-' + weekDay]: isDate
            }
          ],
          ...allDaySelectingHandlers(cat.date)
        },
        events.map(allDayRowEvent(acc, eventHeight))
      )
      if (!hideDate(cat.date)) acc.columns.push(vnode)
      return acc
    }

    function allDayCount() {
      const titles = {} as any
      const count = {} as any
      Object.entries(allDayEvents.value).forEach(([key, val]) => {
        const events: any = val
        const grouped = events.reduce((acc: any, item: any) => {
          acc[item.event.category] = [...(acc[item.event.category] || []), item]
          return acc
        }, {})
        Object.entries(grouped).forEach(([category, val]) => {
          const events: any = val
          titles[key] = [
            ...(titles[key] || []),
            events.length + ' ' + category + props.groupPostfix
          ]
          count[key] = (count[key] ?? 0) + events.length
        })
        titles[key] = titles[key] ? titles[key].join(', ') : ''
      })
      return { titles, count }
    }

    function allDayRow() {
      if (!hasAllDay.value || props.type === 'custom') return ''
      const eventHeight = parseInt(props.eventHeight as unknown as string) || 20
      const { height, columns } = !props.categoriesList
        ? { height: 0, columns: [] as any[] }
        : props.categoriesList.reduce(allDayRowCell, {
            height: 0,
            columns: [] as any[]
          })
      const allDayheight = groupAllDay.value
        ? eventHeight * 2
        : height * eventHeight + eventHeight
      const clearCloseTimer = (id: string) => {
        if (allDayPopups.closeTimerId[id]) {
          clearTimeout(allDayPopups.closeTimerId[id])
          allDayPopups.closeTimerId[id] = undefined
        }
      }
      const closeAllDay = (id: string) => {
        allDayPopups.closeTimerId[id] = window.setTimeout(() => {
          allDayPopups.active[id] = false
        }, 50)
      }
      const openAllDay = (e: MouseEvent, id: string) => {
        clearCloseTimer(id)
        const el = e.target as HTMLElement
        allDayPopups.active[id] = true
        allDayPopups.width[id] = el.clientWidth
      }
      const allDay = (eventsNodes: VNode, index: number | string) => {
        const id = 'all-day-' + index
        const { titles, count } = groupAllDay.value
          ? allDayCount()
          : { titles: '' as any, count: 0 as any }
        return h(
          'div',
          {
            ...eventsNodes.props,
            style: {
              'z-index': 1
            }
          },
          [
            h(
              'div',
              {
                id,
                class: {
                  'of--elevated-1': count[index],
                  'grouped-title': count[index]
                },
                style: {
                  height: allDayPopups.active[id]
                    ? 'auto'
                    : allDayheight - 7 + 'px',
                  'min-height': allDayheight - 7 + 'px'
                },
                onMouseenter: (event: any) => openAllDay(event, id),
                onMouseleave: () =>
                  allDayPopups.active[id] ? closeAllDay(id) : null
              },
              titles[index]
            ),
            h(
              OfOverlay,
              {
                active: allDayPopups.active[id],
                capture: false,
                shade: false,
                target: '#' + id,
                onBlur: () => closeAllDay(id)
              },
              () => {
                return h(
                  'div',
                  {
                    style: {
                      width: allDayPopups.width[id] + 'px',
                      height: count[index] * eventHeight + 'px'
                    },
                    class: 'of--elevated-1 of-calendar-grouped-popup',
                    onMouseenter: () => clearCloseTimer(id),
                    onMouseleave: () => closeAllDay(id)
                  },
                  eventsNodes
                )
              }
            )
          ]
        )
      }
      const grouped =
        props.type == 'week'
          ? columns.map((dayColumns, index) => allDay(dayColumns, index))
          : allDay(columns[0], 'Today')

      return h(
        'div',
        {
          class: 'of-calendar-allday-row',
          style: {
            height: allDayheight + 'px',
            'min-height': allDayheight + 'px'
          }
        },
        [
          h(
            'div',
            {
              class: 'of-calendar-gutter',
              style: groupAllDay.value ? 'height: inherit;' : ''
            },
            allDayLabel()
          ),
          groupAllDay.value ? grouped : columns
        ]
      )
    }

    function allDaySelectingHandlers(date: Date) {
      return {
        onMousedown: (e: MouseEvent) => {
          const leftPressed = (e as MouseEvent).buttons === 1
          if (props.selectable && leftPressed) {
            selecting.value = 'start'
            selectionCategory.value = 'allday-' + date.getDay()
          }
        },
        onMouseup: (e: MouseEvent) => {
          const leftReleased = ((e as MouseEvent).buttons & 1) === 0
          if (selecting.value && leftReleased) {
            emit('selection:allday', date)
            selecting.value = false
            selectionCategory.value = ''
          }
        },
        onMouseleave: () => {
          selecting.value = false
          selectionCategory.value = ''
        }
      }
    }

    function intervalSelectionHandlers(cat: categoryItem) {
      const onStartSelect = (e: MouseEvent | TouchEvent) => {
        const ts = getEventTimestamp(e, toTimestamp(cat.date))
        const [startTsId, endTsId] = getEventIntervalRange(ts)
        emit('mousedown:time', e, ts)
        if (props.selectable) {
          selecting.value = 'end'
          selectionStart.value = startTsId
          selectionEnd.value = endTsId
          selectionCategory.value = cat.category
          emit(
            'selection:change',
            selectionStart.value,
            selectionEnd.value,
            selectionCategory.value
          )
        }
      }

      const onEndSelect = (e: MouseEvent | TouchEvent) => {
        const ts = getEventTimestamp(e, toTimestamp(cat.date))
        emit('mouseup:time', e, ts)
        if (selecting.value) {
          emit(
            'selection:end',
            selectionStart.value,
            selectionEnd.value,
            selectionCategory.value
          )
          selecting.value = false
        }
      }

      const onMove = (e: MouseEvent | TouchEvent) => {
        const ts = getEventTimestamp(e, toTimestamp(cat.date))
        emit('mousemove:time', e, ts)
        if (selecting.value) {
          const [startTs, endTs] = getEventIntervalRange(ts)
          if (startTs < selectionStart.value) {
            selecting.value = 'start'
            selectionStart.value = startTs
          } else if (endTs > selectionEnd.value) {
            selecting.value = 'end'
            selectionEnd.value = endTs
          } else if (selecting.value == 'start') {
            selectionStart.value = startTs
          } else if (selecting.value == 'end') {
            selectionEnd.value = endTs
          }
          emit(
            'selection:change',
            selectionStart.value,
            selectionEnd.value,
            selectionCategory.value
          )
        }
      }

      return {
        onMousemove: (e: MouseEvent) => onMove(e),
        onTouchmove: (e: TouchEvent) => {
          if (e.touches.length === 2) {
            if (e.cancelable) e.preventDefault()
            onMove(e)
          }
        },
        onMousedown: (e: MouseEvent) => {
          if (e.buttons === 1) onStartSelect(e)
        },
        onTouchstart: (e: TouchEvent) => {
          if (e.touches.length === 2) {
            onStartSelect(e)
          }
        },
        onMouseup: (e: MouseEvent) => {
          if ((e.buttons & 1) === 0) onEndSelect(e)
        },
        onTouchend: (e: TouchEvent) => onEndSelect(e)
      }
    }

    function dayRowEventHandlers(e: InternalEvent) {
      return {
        onClick: (event: any) => {
          emit('click:event', event, e)
        },
        onMousedown: (event: any) => {
          event.stopPropagation()
        },
        onMouseenter: (event: any) => {
          if (!selecting.value) {
            adjustCalendarEventHoverPosition(event.currentTarget)
            emit('enter:event', event, e)
          }
        },
        onMouseleave: (event: any) => {
          if (!selecting.value) {
            resetCalendarEventHoverPosition(event.currentTarget)
            emit('leave:event', event, e)
          }
        },
        onKeypress: (event: KeyboardEvent) => {
          if (['Enter', 'Space'].includes(event.code)) {
            event.preventDefault()
            emit('click:event', event, e)
          }
        },
        onFocus: () => {
          emit('focus:day')
        },
        onBlur: () => {
          emit('blur:day')
        }
      }
    }

    function dayRowEvent(cat: categoryItem) {
      return (e: CalendarEventPlacement) => {
        const brk = e.event.end - e.event.start > overlapThresholdNumber.value
        const separator = !brk ? ' ' : h('br')
        const formattedRange = formatRange(formatMgr.value, e.event, cat.date)
        const finalColor = props.eventColor?.(e.event) ?? e.event.color
        const eventClass =
          props.eventClass?.(e.event) ??
          (e.event.class ? { [e.event.class]: true } : {})
        const finalEvent = { ...e.event, color: finalColor }

        const eventsGap = 5
        const dayWidth =
          dayEl.value?.getBoundingClientRect().width ?? eventMaxWidth.value
        const columnsNum = 1 / e.width
        const maxWidth = columnsNum * eventMaxWidth.value < dayWidth
        const left = maxWidth
          ? eventMaxWidth.value * e.columnNum + eventsGap + 'px'
          : 'calc(' + e.left * 100 + '% + ' + eventsGap + 'px)'
        const width = maxWidth
          ? eventMaxWidth.value - eventsGap * 2 + 'px'
          : 'calc(' + (e.width * 100 + '% - ' + eventsGap * 2) + 'px)'

        return h(
          'div',
          {
            class: {
              ...eventClass,
              'of-calendar-event': true,
              conflict: e.conflict,
              'two-lines': brk
            },
            style: {
              'max-width': eventMaxWidth.value + 'px',
              'background-color': finalColor,
              'z-index': e.zIndex,
              left,
              width,
              top: 'calc(' + e.top + '% + 1px)',
              height: 'calc(' + e.height + '% - 3px)',
              'min-height': 'calc(' + e.height + '% - 3px)'
            },
            tabindex: '0',
            ...dayRowEventHandlers(finalEvent)
          },
          renderSlot(
            'event-content',
            { event: finalEvent, brk, formattedRange },
            () => [h('strong', finalEvent.name), separator, formattedRange]
          )
        )
      }
    }

    function dayRowInterval(cat: categoryItem, intervalNumber: number) {
      return (_: any, subIntervalNumber: number) => {
        const theDayTS = withZeroTime(toTimestamp(cat.date))
        const numSubIntervals = numHourIntervals.value
        const [startHour] = hoursInterval.value
        const minutes =
          60 * intervalNumber +
          (60 / numSubIntervals) * subIntervalNumber +
          startHour * 60
        const intervalTime = getTimestampIdintifier(
          toTimestamp(addMinutes(theDayTS.date, minutes))
        )
        return h('div', {
          class: {
            'of-calendar-subinterval': true,
            selected:
              selecting.value &&
              intervalTime >= selectionStart.value &&
              intervalTime < selectionEnd.value &&
              selectionCategory.value == cat.category
          }
        })
      }
    }

    function dayRowCell(cat: categoryItem) {
      const isDate = props.type != 'category'
      const numSubIntervals = numHourIntervals.value
      const intervalsList = intervals().map((_, intervalNumber) => {
        const subIntevals = Array.from(
          { length: numSubIntervals },
          dayRowInterval(cat, intervalNumber)
        )
        return h(
          'div',
          {
            class: 'of-calendar-interval'
          },
          subIntevals
        )
      })
      const es =
        (dayEvents.value[cat.category] as CalendarEventPlacement[]) || []
      const events = es.map(dayRowEvent(cat))
      const weekDayCls = isDate ? 'week-day-' + cat.date.getDay() : false
      if (hideDate(cat.date)) return
      return h(
        'div',
        {
          class: ['of-calendar-day', weekDayCls],
          ...intervalSelectionHandlers(cat),
          ref: setDayEl
        },
        [...intervalsList, ...events]
      )
    }

    function dayRow() {
      if (props.type === 'custom') {
        const slot = slots['custom']
        return slot?.()
      }
      const intervalsList = intervals().map((interval) =>
        h(
          'div',
          { class: 'of-calendar-interval' },
          h('div', { class: 'of-calendar-interval-label' }, interval + ':00')
        )
      )
      const days = (props.categoriesList || []).map(dayRowCell)
      return h(
        'div',
        {
          class: 'of-calendar-day-row',
          onMouseleave: (_: MouseEvent | TouchEvent) => {
            if (selecting.value) {
              emit('selection:cancel')
              selecting.value = false
            }
          }
        },
        [
          h(
            'div',
            {
              class: 'of-calendar-gutter'
            },
            intervalsList
          ),
          days
        ]
      )
    }

    return () => {
      const eventHeight = parseInt(props.eventHeight as unknown as string) || 20
      const hourHeight = parseInt(props.hourHeight as unknown as string) || 48
      const conflictColor = props.conflictColor || null
      const subIntervalHeight = '' + 100 / numHourIntervals.value + '%'
      return h(
        'div',
        {
          class: 'container of--calendar',
          style: {
            '--of-calendar-iterval-height': `${hourHeight}px`,
            '--of-event-height': `${eventHeight}px`,
            '--of-calendar-conflict-color': conflictColor,
            '--of-calendar-subinterval-height': subIntervalHeight,
            '--of-categories-num': (props.categoriesList?.length ?? 0) + 1
          },
          onselectstart(e: Event) {
            e.preventDefault()
          }
        },
        [
          header(),
          h('div', [superTitle(), title(), allDayRow(), dayRow()]),
          footer()
        ]
      )
    }
  }
})

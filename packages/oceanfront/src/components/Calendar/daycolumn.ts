import { DateTimeFormatterOptions } from '../../formats/DateTime'
import { BusyInfo, layoutAllday } from '../../lib/calendar/layout/allday'
import { addMinutes } from '../../lib/datetime'
import { FormatState, useFormats } from '../../lib/formats'
import { defineComponent, h, VNode } from 'vue'
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
  uniqEvent,
} from '../../lib/calendar'
import ColumnLayout from '../../lib/calendar/layout/columns'
import StackLayout from '../../lib/calendar/layout/stack'
import Base from './base'
import calendarProps from './props'

function formatRange(mgr: FormatState, e: InternalEvent, withinDate: Date) {
  const [startTS, endTS] = getNormalizedTSRange(e, withinDate)
  const start = new Date(
    startTS.year,
    startTS.month,
    startTS.day,
    startTS.hours,
    startTS.minutes,
  )
  const end = new Date(
    endTS.year,
    endTS.month,
    endTS.day,
    endTS.hours,
    endTS.minutes,
  )
  const spansNoon = startTS.hours < 12 != endTS.hours < 12
  const opts: DateTimeFormatterOptions = {
    nativeOptions: { hour: 'numeric', minute: 'numeric' },
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
  mixins: [Base],
  props: {
    ...calendarProps.internal,
    ...calendarProps.common,
    ...calendarProps.week,
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
    'blur:day',
  ],
  data() {
    const selecting = false
    return {
      selecting: selecting as 'start' | 'end' | false,
      selectionStart: 0,
      selectionEnd: 0,
      selectionCategory: '',
      allDayPopups: {
        active: {},
        closeTimerId: {},
        width: {},
        height: {},
      } as any,
    }
  },
  computed: {
    overlapThresholdNumber(): number {
      return parseInt(this.$props.overlapThreshold as unknown as string) || 0
    },
    numHourIntervals(): number {
      return parseInt(this.$props.hourIntervals as unknown as string) || 4
    },
    parsedEvents(): InternalEvent[] {
      const events: CalendarEvent[] = this.$props.events || []
      const mgr = useFormats()
      return events
        .map((e) => parseEvent(e, mgr))
        .filter((e) => e !== undefined) as InternalEvent[]
    },
    formatMgr: () => useFormats(),
    layoutFunc(): layoutFunc {
      return this.$props.layout === 'stack' ? StackLayout : ColumnLayout
    },
    hasAllDay(): boolean {
      return (this.$props.events?.filter((e) => e.allDay).length || 0) > 0
    },
    groupAllDay(): boolean {
      return (
        this.$props.groupAllDayEvents === true &&
        ['week', 'day'].includes(this.$props.type ?? '')
      )
    },
    allDayEvents() {
      const visRange = this.visibleRange || []
      const rangeStart = getDayIdentifier(visRange[0])
      const allDayEvents = {} as any
      let busyInfo: BusyInfo = { busyColumns: [], currentColumn: 0 }
      for (const cat of this.$props.categoriesList || []) {
        const day = getDayIdentifier(toTimestamp(cat.date))
        const dayEvents = getEventsOfDay(
          this.parsedEvents,
          day,
          true,
          this.ignoreCategories ? undefined : cat.category,
          true,
        )
        const evs = this.groupAllDay
          ? dayEvents
          : eventsStartingAtDay(dayEvents, day, rangeStart)
        const layedOut = layoutAllday(evs, visRange, busyInfo)
        if (this.$props.type == 'category')
          busyInfo = { busyColumns: [], currentColumn: 0 }
        let top = -1
        allDayEvents[cat.category] = layedOut.map((p) => {
          top++
          return {
            ...p,
            ...(this.groupAllDay
              ? {
                  top,
                  daysSpan: 1,
                }
              : {}),
            event: { ...p.event, uniq: uniqEvent(p.event, cat) },
          }
        })
      }
      return allDayEvents
    },
    dayEvents() {
      const dayEvents = {} as any
      for (const cat of this.$props.categoriesList || []) {
        const day = getDayIdentifier(toTimestamp(cat.date))
        const threshold = this.overlapThresholdNumber
        const forCategory = this.ignoreCategories ? undefined : cat.category
        const groups = getGroups(
          this.parsedEvents,
          day,
          false,
          forCategory,
          this.layoutFunc,
          threshold,
          this.hoursInterval,
        )
        dayEvents[cat.category] = groups
          .map((g) =>
            g.placements.map((p) => {
              return {
                ...p,
                event: { ...p.event, uniq: uniqEvent(p.event, cat) },
              }
            }),
          )
          .flat(1)
      }
      return dayEvents
    },
    hoursInterval() {
      let start: number = parseInt(this.dayStart as unknown as string) || 0
      let end: number = parseInt(this.dayEnd as unknown as string) || 0
      if (start >= end) [start, end] = [0, 24]
      if (start < 0) start = 0
      if (end > 24) end = 24
      return [start, end]
    },
  },
  methods: {
    intervals() {
      const [start, end] = this.hoursInterval
      return Array.from({ length: end - start }, (_, i) => i + start)
    },
    hideDate(date: Date) {
      return (
        this.$props.type != 'category' &&
        this.$props.type === 'week' &&
        this.$props.hideWeekends &&
        [6, 0].includes(date.getDay())
      )
    },
    getEventIntervalRange(ts: Timestamp): number[] {
      const startTsId = getTimestampIdintifier(ts)
      const endTsId = getTimestampIdintifier(
        toTimestamp(addMinutes(ts.date, 60 / this.numHourIntervals)),
      )
      return [startTsId, endTsId]
    },
    getEventTimestamp(e: MouseEvent | TouchEvent, day: Timestamp) {
      const hours = this.hoursInterval
      const precision = 60 / this.numHourIntervals
      const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const touchEvent: TouchEvent = e as TouchEvent
      const mouseEvent: MouseEvent = e as MouseEvent
      const touches: TouchList = touchEvent.changedTouches || touchEvent.touches
      const clientY: number =
        touches && touches[0] ? touches[0].clientY : mouseEvent.clientY
      const offsetY = clientY - bounds.top
      let minutes = Math.floor(
        (offsetY / bounds.height) * (hours[1] - hours[0]) * 60,
      )
      minutes -= minutes % precision
      minutes += hours[0] * 60
      const ts = toTimestamp(addMinutes(withZeroTime(day).date, minutes))
      return ts
    },

    superTitle() {
      const slot = this.$slots['super-title']
      if (!slot) return ''
      return [
        h('div', { class: 'of-calendar-gutter' }),
        h('div', { class: 'of-calendar-day-supertitle' }, slot()),
      ]
    },
    renderCategoryTitle(cat: categoryItem) {
      const isDate = this.$props.type != 'category'
      const slotName = isDate ? 'day-title' : 'category-title'
      const theDay = cat.date
      const slotArgs = isDate ? theDay : cat.category
      const eventName = isDate ? 'click:day' : 'click:category'
      const weekDayCls = isDate ? 'week-day-' + cat.date.getDay() : false
      if (this.hideDate(cat.date)) return
      return h(
        'div',
        {
          class: ['of-calendar-category-title', weekDayCls],
          tabindex: '0',
          onClick: (event: any) => this.$emit(eventName, event, slotArgs),
          onKeypress: (event: KeyboardEvent) => {
            if (['Enter', 'Space'].includes(event.code)) {
              event.preventDefault()
              this.$emit(eventName, event, slotArgs)
            }
          },
        },
        this.renderSlot(slotName, slotArgs, () => cat.category),
      )
    },
    title() {
      if (!this.$props.categoryTitles) {
        return ''
      }
      const titles = !this.$props.categoriesList
        ? ''
        : this.$props.categoriesList.map(this.renderCategoryTitle)

      return h('div', { class: 'of-calendar-day-titles' }, [
        h('div', { class: 'of-calendar-gutter' }),
        titles,
      ])
    },
    allDayLabel() {
      const slot = this.$slots['all-day-label']
      return slot?.()
    },
    allDayRowEvent(
      acc: { height: number; columns: any[] },
      eventHeight: number,
    ) {
      return (e: CalendarAlldayEventPlacement) => {
        acc.height = Math.max(e.top, acc.height)
        const finalColor = this.$props.eventColor?.(e.event) ?? e.event.color
        const eventClass =
          this.$props.eventClass?.(e.event) ??
          (e.event.class ? { [e.event.class]: true } : {})
        const slot = this.$slots['allday-event-content']
        return h(
          'div',
          {
            class: { ...eventClass, 'of-calendar-event': true },
            style: {
              'background-color': finalColor,
              width: 'calc(' + (e.daysSpan || 1) * 100 + '% - 4px)',
              top: '' + e.top * eventHeight + 'px',
            },
            tabindex: '0',
            onClick: (event: any) => {
              this.$emit('click:event', event, {
                ...e.event,
                color: finalColor,
              })
            },
            onKeypress: (event: KeyboardEvent) => {
              if (['Enter', 'Space'].includes(event.code)) {
                event.preventDefault()
                this.$emit('click:event', event, {
                  ...e.event,
                  color: finalColor,
                })
              }
            },
            onMousedown: (event: any) => {
              event.stopPropagation()
            },
            onMouseenter: (event: any) => {
              this.$emit('enter:event', event, e.event)
            },
            onMouseleave: (event: any) => {
              this.$emit('leave:event', event, e.event)
              event.stopPropagation()
            },
            onFocus: () => {
              this.$emit('focus:day')
            },
            onBlur: () => {
              this.$emit('blur:day')
            },
          },
          slot ? slot({ event: e.event }) : h('strong', e.event.name),
        )
      }
    },
    allDayRowCell(acc: { height: number; columns: any[] }, cat: categoryItem) {
      const isDate = this.$props.type != 'category'
      const eventHeight =
        parseInt(this.$props.eventHeight as unknown as string) || 20
      const events =
        (this.allDayEvents[cat.category] as CalendarAlldayEventPlacement[]) ||
        []
      const weekDay = cat.date.getDay()
      const vnode = h(
        'div',
        {
          class: [
            'of-calendar-day',
            {
              selected:
                this.selecting &&
                this.$data.selectionCategory === 'allday-' + weekDay,
              ['week-day-' + weekDay]: isDate,
            },
          ],
          ...this.allDaySelectingHandlers(cat.date),
        },
        events.map(this.allDayRowEvent(acc, eventHeight)),
      )
      if (!this.hideDate(cat.date)) acc.columns.push(vnode)
      return acc
    },
    allDayCount() {
      const titles = {} as any
      const count = {} as any
      Object.entries(this.allDayEvents).forEach(([key, val]) => {
        const events: any = val
        const grouped = events.reduce((acc: any, item: any) => {
          acc[item.event.category] = [...(acc[item.event.category] || []), item]
          return acc
        }, {})
        Object.entries(grouped).forEach(([category, val]) => {
          const events: any = val
          titles[key] = [
            ...(titles[key] || []),
            events.length + ' ' + category + this.$props.groupPostfix,
          ]
          count[key] = (count[key] ?? 0) + events.length
        })
        titles[key] = titles[key] ? titles[key].join(', ') : ''
      })
      return { titles, count }
    },
    allDayRow() {
      if (!this.hasAllDay) return ''
      const eventHeight =
        parseInt(this.$props.eventHeight as unknown as string) || 20
      const { height, columns } = !this.$props.categoriesList
        ? { height: 0, columns: [] as any[] }
        : this.$props.categoriesList.reduce(this.allDayRowCell, {
            height: 0,
            columns: [] as any[],
          })
      const allDayheight = this.groupAllDay
        ? eventHeight * 2
        : height * eventHeight + eventHeight
      const clearCloseTimer = (id: string) => {
        if (this.$data.allDayPopups['closeTimerId'][id]) {
          clearTimeout(this.$data.allDayPopups['closeTimerId'][id])
          this.$data.allDayPopups['closeTimerId'][id] = undefined
        }
      }
      const closeAllDay = (id: string) => {
        this.$data.allDayPopups['closeTimerId'][id] = window.setTimeout(() => {
          this.$data.allDayPopups['active'][id] = false
        }, 50)
      }
      const openAllDay = (e: MouseEvent, id: string) => {
        clearCloseTimer(id)
        const el = e.target as HTMLElement
        this.$data.allDayPopups['active'][id] = true
        this.$data.allDayPopups['width'][id] = el.clientWidth
      }
      const allDay = (eventsNodes: VNode, index: number | string) => {
        const id = 'all-day-' + index
        const { titles, count } = this.groupAllDay
          ? this.allDayCount()
          : { titles: '', count: 0 }
        return h(
          'div',
          {
            ...eventsNodes.props,
            style: {
              'z-index': 1,
            },
          },
          [
            h(
              'div',
              {
                id,
                class: {
                  'of--elevated-1': count[index],
                  'grouped-title': count[index],
                },
                style: {
                  height: this.$data.allDayPopups['active'][id]
                    ? 'auto'
                    : allDayheight - 7 + 'px',
                  'min-height': allDayheight - 7 + 'px',
                },
                onMouseenter: (event: any) => openAllDay(event, id),
                onMouseleave: () =>
                  this.$data.allDayPopups['active'][id]
                    ? closeAllDay(id)
                    : null,
              },
              titles[index],
            ),
            h(
              OfOverlay,
              {
                active: this.$data.allDayPopups['active'][id],
                capture: false,
                shade: false,
                target: '#' + id,
                onBlur: () => closeAllDay(id),
              },
              () => {
                return h(
                  'div',
                  {
                    style: {
                      width: this.$data.allDayPopups['width'][id] + 'px',
                      height: count[index] * eventHeight + 'px',
                    },
                    class: 'of--elevated-1 of-calendar-grouped-popup',
                    onMouseenter: () => clearCloseTimer(id),
                    onMouseleave: () => closeAllDay(id),
                  },
                  eventsNodes,
                )
              },
            ),
          ],
        )
      }
      const grouped =
        this.$props.type == 'week'
          ? columns.map((dayColumns, index) => allDay(dayColumns, index))
          : allDay(columns[0], 'Today')

      return h(
        'div',
        {
          class: 'of-calendar-allday-row',
          style: {
            height: allDayheight + 'px',
            'min-height': allDayheight + 'px',
          },
        },
        [
          h(
            'div',
            {
              class: 'of-calendar-gutter',
              style: this.groupAllDay ? 'height: inherit;' : '',
            },
            this.allDayLabel(),
          ),
          this.groupAllDay ? grouped : columns,
        ],
      )
    },
    allDaySelectingHandlers(date: Date) {
      return {
        onMousedown: (e: MouseEvent) => {
          const leftPressed = (e as MouseEvent).buttons === 1
          if (this.selectable && leftPressed) {
            this.selecting = 'start'
            this.$data.selectionCategory = 'allday-' + date.getDay()
          }
        },
        onMouseup: (e: MouseEvent) => {
          const leftReleased = ((e as MouseEvent).buttons & 1) === 0
          if (this.selecting && leftReleased) {
            this.$emit('selection:allday', date)
            this.selecting = false
            this.$data.selectionCategory = ''
          }
        },
        onMouseleave: () => {
          this.selecting = false
          this.$data.selectionCategory = ''
        },
      }
    },
    intervalSelectionHandlers(cat: categoryItem) {
      return {
        onMousemove: (e: MouseEvent | TouchEvent) => {
          const ts = this.getEventTimestamp(e, toTimestamp(cat.date))
          this.$emit('mousemove:time', e, ts)
          if (this.selecting) {
            const [startTs, endTs] = this.getEventIntervalRange(ts)
            if (startTs < this.selectionStart) {
              this.selecting = 'start'
              this.selectionStart = startTs
            } else if (endTs > this.selectionEnd) {
              this.selecting = 'end'
              this.selectionEnd = endTs
            } else if (this.selecting == 'start') {
              this.selectionStart = startTs
            } else if (this.selecting == 'end') {
              this.selectionEnd = endTs
            }
            this.$emit(
              'selection:change',
              this.selectionStart,
              this.selectionEnd,
              this.selectionCategory,
            )
          }
        },

        onMousedown: (e: MouseEvent | TouchEvent) => {
          const ts = this.getEventTimestamp(e, toTimestamp(cat.date))
          const [startTsId, endTsId] = this.getEventIntervalRange(ts)
          this.$emit('mousedown:time', e, ts)
          const leftPressed = (e as MouseEvent).buttons === 1
          if (this.selectable && leftPressed) {
            this.$data.selecting = 'end'
            this.$data.selectionStart = startTsId
            this.$data.selectionEnd = endTsId
            this.$data.selectionCategory = cat.category
            this.$emit(
              'selection:change',
              this.selectionStart,
              this.selectionEnd,
              this.selectionCategory,
            )
          }
        },
        onMouseup: (e: MouseEvent | TouchEvent) => {
          const ts = this.getEventTimestamp(e, toTimestamp(cat.date))
          this.$emit('mouseup:time', e, ts)
          const leftReleased = ((e as MouseEvent).buttons & 1) === 0
          if (this.selecting && leftReleased) {
            this.$emit(
              'selection:end',
              this.selectionStart,
              this.selectionEnd,
              this.selectionCategory,
            )
            this.selecting = false
          }
        },
      }
    },
    dayRowEventHandlers(e: InternalEvent) {
      return {
        onClick: (event: any) => {
          this.$emit('click:event', event, e)
        },
        onMousedown: (event: any) => {
          event.stopPropagation()
        },
        onMouseenter: (event: any) => {
          if (!this.selecting) {
            this.$emit('enter:event', event, e)
          }
        },
        onMouseleave: (event: any) => {
          if (!this.selecting) {
            this.$emit('leave:event', event, e)
          }
        },
        onKeypress: (event: KeyboardEvent) => {
          if (['Enter', 'Space'].includes(event.code)) {
            event.preventDefault()
            this.$emit('click:event', event, e)
          }
        },
        onFocus: () => {
          this.$emit('focus:day')
        },
        onBlur: () => {
          this.$emit('blur:day')
        },
      }
    },
    dayRowEvent(cat: categoryItem) {
      return (e: CalendarEventPlacement) => {
        const brk = e.event.end - e.event.start > this.overlapThresholdNumber
        const separator = !brk ? ' ' : h('br')
        const formattedRange = formatRange(this.formatMgr, e.event, cat.date)
        const finalColor = this.$props.eventColor?.(e.event) ?? e.event.color
        const eventClass =
          this.$props.eventClass?.(e.event) ??
          (e.event.class ? { [e.event.class]: true } : {})
        const finalEvent = { ...e.event, color: finalColor }
        return h(
          'div',
          {
            class: {
              ...eventClass,
              'of-calendar-event': true,
              conflict: e.conflict,
              'two-lines': brk,
            },
            style: {
              'background-color': finalColor,
              'z-index': e.zIndex,
              left: e.left * 100 + '%',
              width: 'calc(' + e.width * 100 + '% - 4px)',
              top: 'calc(' + e.top + '% + 1px)',
              height: 'calc(' + e.height + '% - 3px)',
              'min-height': 'calc(' + e.height + '% - 3px)',
            },
            tabindex: '0',
            ...this.dayRowEventHandlers(finalEvent),
          },
          this.renderSlot(
            'event-content',
            { event: finalEvent, brk, formattedRange },
            () => [h('strong', finalEvent.name), separator, formattedRange],
          ),
        )
      }
    },
    dayRowInterval(cat: categoryItem, intervalNumber: number) {
      return (_: any, subIntervalNumber: number) => {
        const theDayTS = withZeroTime(toTimestamp(cat.date))
        const numSubIntervals = this.numHourIntervals
        const [startHour] = this.hoursInterval
        const minutes =
          60 * intervalNumber +
          (60 / numSubIntervals) * subIntervalNumber +
          startHour * 60
        const intervalTime = getTimestampIdintifier(
          toTimestamp(addMinutes(theDayTS.date, minutes)),
        )
        return h('div', {
          class: {
            'of-calendar-subinterval': true,
            selected:
              this.$data.selecting &&
              intervalTime >= this.$data.selectionStart &&
              intervalTime < this.$data.selectionEnd &&
              this.$data.selectionCategory == cat.category,
          },
        })
      }
    },
    dayRowCell(cat: categoryItem) {
      const isDate = this.$props.type != 'category'
      const numSubIntervals = this.numHourIntervals
      const intervals = this.intervals().map((_, intervalNumber) => {
        const subIntevals = Array.from(
          { length: numSubIntervals },
          this.dayRowInterval(cat, intervalNumber),
        )
        return h(
          'div',
          {
            class: 'of-calendar-interval',
          },
          subIntevals,
        )
      })
      const es =
        (this.dayEvents[cat.category] as CalendarEventPlacement[]) || []
      const events = es.map(this.dayRowEvent(cat))
      const weekDayCls = isDate ? 'week-day-' + cat.date.getDay() : false
      if (this.hideDate(cat.date)) return
      return h(
        'div',
        {
          class: ['of-calendar-day', weekDayCls],
          ...this.intervalSelectionHandlers(cat),
        },
        [...intervals, ...events],
      )
    },
    dayRow() {
      const intervals = this.intervals().map((interval) =>
        h(
          'div',
          { class: 'of-calendar-interval' },
          h('div', { class: 'of-calendar-interval-label' }, interval + ':00'),
        ),
      )
      const days = (this.$props.categoriesList || []).map(this.dayRowCell)
      return h(
        'div',
        {
          class: 'of-calendar-day-row',
          onMouseleave: (_: MouseEvent | TouchEvent) => {
            if (this.selecting) {
              this.$emit('selection:cancel')
              this.selecting = false
            }
          },
        },
        [
          h(
            'div',
            {
              class: 'of-calendar-gutter',
            },
            intervals,
          ),
          days,
        ],
      )
    },
    header() {
      const slot = this.$slots['header']
      return slot?.()
    },
    footer() {
      const slot = this.$slots['footer']
      return slot?.()
    },
  },
  render() {
    const eventHeight =
      parseInt(this.$props.eventHeight as unknown as string) || 20
    const hourHeight =
      parseInt(this.$props.hourHeight as unknown as string) || 48
    const conflictColor = this.$props.conflictColor || null
    const subIntervalHeight = '' + 100 / this.numHourIntervals + '%'
    return h(
      'div',
      {
        class: 'container of--calendar',
        style: {
          '--of-calendar-iterval-height': `${hourHeight}px`,
          '--of-event-height': `${eventHeight}px`,
          '--of-calendar-conflict-color': conflictColor,
          '--of-calendar-subinterval-height': subIntervalHeight,
        },
        onselectstart(e: Event) {
          e.preventDefault()
        },
      },
      [
        this.header(),
        h('div', [
          this.superTitle(),
          this.title(),
          this.allDayRow(),
          this.dayRow(),
        ]),
        this.footer(),
      ],
    )
  },
})

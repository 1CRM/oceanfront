import {
  getDayIdentifier,
  getEventsOfDay,
  toTimestamp,
} from '../../lib/calendar'
import {
  CalendarEvent,
  InternalEvent,
  parseEvent,
  uniqEvent,
} from '../../lib/calendar/common'
import {
  addDays,
  firstMonday,
  isoWeekNumber,
  monthGrid,
  MonthGridCell,
  MonthGridData,
} from '../../lib/datetime'
import { useFormats } from '../../lib/formats'
import { defineComponent, h } from 'vue'
import Base from './base'
import calendarProps from './props'

export default defineComponent({
  mixins: [Base],
  props: {
    ...calendarProps.internal,
    ...calendarProps.common,
    ...calendarProps.month,
  },
  emits: [
    'click:event',
    'enter:event',
    'leave:event',
    'click:day',
    'click:more',
    'click:week',
    'focus:day',
    'blur:day',
  ],
  computed: {
    eventsLimitNumber(): number {
      const limit = parseInt(this.$props.eventsLimit as any as string) || 5
      if (limit < 2) return 2
      return limit
    },
    eventHeightNumber(): number {
      return parseInt(this.$props.eventHeight as unknown as string) || 20
    },

    monthGrid(): MonthGridData {
      return monthGrid(this.day)
    },
    parsedEvents(): InternalEvent[] {
      const events: CalendarEvent[] = this.$props.events || []
      const mgr = useFormats()
      return events
        .map((e) => parseEvent(e, mgr))
        .filter((e) => e !== undefined) as InternalEvent[]
    },
  },
  methods: {
    dayEvents(day: Date): InternalEvent[] {
      return getEventsOfDay(
        this.parsedEvents,
        getDayIdentifier(toTimestamp(day)),
        'ignore'
      ).map((e) => uniqEvent(e, { category: '', date: day }))
    },
    hideDate(date: Date) {
      return this.$props.hideWeekends && [6, 0].includes(date.getDay())
    },
    header() {
      const slot = this.$slots['header']
      return slot?.()
    },
    footer() {
      const slot = this.$slots['footer']
      return slot?.()
    },
    renderDayNumberOrSlot(day: Date) {
      const slot = this.$slots['day-title']
      const content = slot ? slot(day) : this.renderDayNumber(day, false)
      return h(
        'div',
        {
          class: 'day-title',
          tabindex: slot ? '0' : undefined,
        },
        content
      )
    },
    renderMoreLink(count: number, day: Date, top: number) {
      if (count < 1) return null
      const slot = this.$slots['more']
      return h(
        'div',
        {
          class: 'of-calendar-more',
          tabindex: '0',
          onClick: (event: any) => {
            this.$emit('click:more', event, day)
          },
          onKeypress: (event: KeyboardEvent) => {
            if (['Enter', 'Space'].includes(event.code)) {
              event.preventDefault()
              this.$emit('click:day', event, day)
            }
          },
          style: {
            top: '' + top + 'px',
          },
        },
        slot ? slot(count) : `${count} more`
      )
    },
    renderRowDayEvent(e: InternalEvent, idx: number) {
      const top = this.eventHeightNumber * idx
      const finalColor = this.$props.eventColor?.(e) ?? e.color
      const eventClass =
        this.$props.eventClass?.(e) ?? (e.class ? { [e.class]: true } : {})
      return h(
        'div',
        {
          class: { ...eventClass, 'of-calendar-event': true },
          style: {
            'background-color': finalColor,
            top: `${top}px`,
          },
          tabindex: '0',
          onClick: (event: any) => {
            this.$emit('click:event', event, { ...e, color: finalColor })
            event.stopPropagation()
          },
          onMouseenter: (event: any) => {
            this.$emit('enter:event', event, e)
          },
          onMouseleave: (event: any) => {
            this.$emit('leave:event', event, e)
          },
          onKeypress: (event: KeyboardEvent) => {
            if (['Enter', 'Space'].includes(event.code)) {
              event.preventDefault()
              this.$emit('click:event', event, { ...e, color: finalColor })
              event.stopPropagation()
            }
          },
          onFocus: () => {
            this.$emit('focus:day')
          },
          onBlur: () => {
            this.$emit('blur:day')
          },
        },
        this.renderSlot('allday-event-content', { event: e }, () =>
          h('strong', e.name)
        )
      )
    },
    renderRowDay(day: MonthGridCell) {
      const dayEvents = this.dayEvents(day.date)
      let limit = this.eventsLimitNumber
      let more = 0
      if (dayEvents.length > limit) {
        limit -= 1
        more = dayEvents.length - limit
      }
      const events = dayEvents.slice(0, limit)
      const dayHeight = events.length + (more ? 1 : 0)
      const style = this.$props.fixedRowHeight
        ? {}
        : {
            '--of-month-day-heigth':
              '' + dayHeight * this.eventHeightNumber + 'px',
          }
      if (!this.$props.fixedRowHeight) {
        //--of-month-day-heigth
      }
      if (this.hideDate(day.date)) return
      return h(
        'div',
        {
          class: ['of-calendar-month-day', 'week-day-' + day.date.getDay()],
          style,
          onClick: (event: any) => {
            this.$emit('click:day', event, day.date)
          },
          onKeypress: (event: KeyboardEvent) => {
            if (['Enter', 'Space'].includes(event.code)) {
              event.preventDefault()
              this.$emit('click:day', event, day.date)
            }
          },
        },
        day.otherMonth && this.hideOtherMonths
          ? []
          : [
              this.renderDayNumberOrSlot(day.date),
              h('div', { class: 'events' }, [
                events.map(this.renderRowDayEvent),
                this.renderMoreLink(
                  more,
                  day.date,
                  events.length * this.eventHeightNumber
                ),
              ]),
            ]
      )
    },
    renderRow(rowDays: MonthGridCell[], weekNumber: number) {
      const firstDay = addDays(firstMonday(this.day), weekNumber * 7)
      const wn = isoWeekNumber(firstDay)
      const wnSlot = this.$slots['week-number']
      return h('div', { class: 'of-calendar-month-row' }, [
        h(
          'div',
          {
            class: 'of-calendar-gutter of-week-number',
            tabindex: '0',
            onClick: (event: any) => {
              this.$emit('click:week', event, wn, firstDay)
            },
            onKeypress: (event: KeyboardEvent) => {
              if (['Enter', 'Space'].includes(event.code)) {
                event.preventDefault()
                this.$emit('click:week', event, wn, firstDay)
              }
            },
          },
          wnSlot ? wnSlot(wn) : wn
        ),
        rowDays.map(this.renderRowDay),
      ])
    },
    renderGrid() {
      const fm = firstMonday(this.day)
      const style = this.fixedRowHeight
        ? {
            '--of-month-day-heigth':
              '' + this.eventHeightNumber * this.eventsLimitNumber + 'px',
          }
        : {}
      return h('div', { class: 'of-calendar-month-grid', style }, [
        h('div', { class: 'of-calendar-day-titles' }, [
          h('div', { class: 'of-calendar-gutter' }),
          Array.from({ length: 7 }, (_, i) => {
            const weekDay = addDays(fm, i)
            if (this.hideDate(weekDay)) return
            return h(
              'div',
              {
                class: [
                  'of-calendar-category-title',
                  'week-day-' + weekDay.getDay(),
                ],
              },
              h(
                'div',
                { class: 'of-calendar-day-title' },
                this.renderWeekDay(weekDay)
              )
            )
          }),
        ]),
        this.monthGrid.grid.map(this.renderRow),
      ])
    },
  },
  render() {
    return h(
      'div',
      {
        class: 'container of--calendar',
        style: {
          '--of-event-height': `${this.eventHeightNumber}px`,
        },
        onSelectStart(e: Event) {
          e.preventDefault()
        },
      },
      [this.header(), this.renderGrid(), this.footer()]
    )
  },
})

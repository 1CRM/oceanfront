import {
  getDayIdentifier,
  getEventsOfDay,
  toTimestamp,
  CalendarEvent,
  InternalEvent,
  parseEvent,
  uniqEvent
} from '../../lib/calendar'
import { parseDay, sameDate, YearGridCell } from '../../lib/datetime'
import { useFormats } from '../../lib/formats'
import { useLocale } from '../../lib/locale'
import { defineComponent, h } from 'vue'
import Base from './base'
import calendarProps from './props'

export default defineComponent({
  mixins: [Base],
  props: {
    ...calendarProps.internal,
    ...calendarProps.common,
    ...calendarProps.year
  },
  emits: [
    'click:event',
    'enter:event',
    'leave:event',
    'click:day',
    'click:more',
    'click:week',
    'focus:day',
    'blur:day'
  ],
  data() {
    return {
      maxEventLength: 0
    }
  },
  computed: {
    eventsLimitNumber(): number {
      const limit = parseInt(this.$props.eventsLimit as any as string) || 5
      if (limit < 2) return 2
      return limit
    },
    eventHeightNumber(): number {
      return parseInt(this.$props.eventHeight as unknown as string) || 20
    },
    gridElementHeight(): string {
      return this.maxEventLength * 20 + 'px'
    },
    parsedEvents(): InternalEvent[] {
      const events: CalendarEvent[] = this.$props.events || []
      const mgr = useFormats()
      return events
        .map((e) => parseEvent(e, mgr))
        .filter((e) => e !== undefined) as InternalEvent[]
    },
    weekStartLocale(): number {
      const locale = useLocale()
      const day =
        this.weekStart === undefined
          ? locale.localeParams?.weekStart ?? 1
          : this.weekStart
      return parseDay(day)
    }
  },
  watch: {
    day() {
      this.maxEventLength = 0
    }
  },
  methods: {
    month() {
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ]
      return months.map((item, index) => {
        return {
          name: item,
          days: new Date(
            new Date(this.day).getFullYear(),
            index + 1,
            0
          ).getDate()
        }
      })
    },
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
            top: '' + top + 'px'
          }
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
            top: `${top}px`
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
          }
        },
        this.renderSlot('allday-event-content', { event: e }, () =>
          h('strong', e.name)
        )
      )
    },
    renderDayEvents(day: YearGridCell) {
      const dayEvents = this.dayEvents(day.date)
      let limit = this.eventsLimitNumber
      let more = 0
      if (dayEvents.length > limit) {
        limit -= 1
        more = dayEvents.length - limit
      }
      if (dayEvents.length <= limit && this.maxEventLength < dayEvents.length)
        this.maxEventLength = dayEvents.length
      else if (dayEvents.length > limit) this.maxEventLength = limit + 1

      const events = dayEvents.slice(0, limit)
      const dayHeight = events.length + (more ? 1 : 0)
      const style = this.$props.fixedRowHeight
        ? {}
        : {
            '--of-month-day-heigth':
              '' + dayHeight * this.eventHeightNumber + 'px'
          }
      if (this.hideDate(day.date)) return
      return h(
        'div',
        {
          class: 'of-calendar-month-day',
          style
        },
        [
          h('div', { class: 'events' }, [
            events.map(this.renderRowDayEvent),
            this.renderMoreLink(
              more,
              day.date,
              events.length * this.eventHeightNumber
            )
          ])
        ]
      )
    },
    getDate(month: number, day: number) {
      const year = new Date(this.day).getFullYear()
      return new Date(
        `${year}-${month + 1 < 10 ? '0' + (month + 1) : month + 1}-${day < 10 ? '0' + day : day}`
      )
    },
    renderRow(month: number, day: number) {
      const year = new Date(this.day).getFullYear()
      const date = new Date(
        `${year}-${month + 1 < 10 ? '0' + (month + 1) : month + 1}-${day < 10 ? '0' + day : day}`
      )
      return this.renderDayEvents({ date, today: true })
    },
    renderGrid() {
      const months = this.month()
      return h(
        'div',
        {
          class: 'of-calendar-year-grid',
          style: { '--of-month-day-height': this.gridElementHeight }
        },
        [
          months.map((item, index) => {
            return h('div', { class: 'of-calendar-month-titles' }, [
              h('div', { class: 'month-name' }, item.name),
              Array.from({ length: item.days }, (_, i) => {
                return [
                  h(
                    'div',
                    {
                      class: [
                        'day-of-month',
                        {
                          today: sameDate(
                            this.getDate(index, i + 1),
                            new Date()
                          )
                        }
                      ],
                      onClick: (event: any) => {
                        this.$emit('click:day', event, this.getDate(index, i))
                      },
                      onKeypress: (event: KeyboardEvent) => {
                        if (['Enter', 'Space'].includes(event.code)) {
                          event.preventDefault()
                          this.$emit(
                            'click:day',
                            event,
                            this.getDate(index, i + 1)
                          )
                        }
                      }
                    },
                    ++i
                  ),
                  h('div', this.renderRow(index, i))
                ]
              })
            ])
          })
        ]
      )
    }
  },
  render() {
    return h(
      'div',
      {
        class: 'container of--calendar',
        style: {
          '--of-event-height': `${this.eventHeightNumber}px`
        },
        onSelectStart(e: Event) {
          e.preventDefault()
        }
      },
      [this.header(), this.renderGrid(), this.footer()]
    )
  }
})

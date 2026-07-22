import { sameDate, YearGridCell } from '../../lib/datetime'
import { computed, defineComponent, h, ref, watch } from 'vue'
import { useMonthGridEvents } from './base'
import calendarProps from './props'

const MONTH_NAMES = [
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

export default defineComponent({
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
  setup(props, { slots, emit }) {
    const {
      header,
      footer,
      eventHeightNumber,
      dayEvents,
      limitDayEvents,
      hideDate,
      renderMoreLink,
      renderRowDayEvent
    } = useMonthGridEvents(props, slots, emit)

    const maxEventLength = ref(0)

    watch(
      () => props.day,
      () => {
        maxEventLength.value = 0
      }
    )

    const gridElementHeight = computed(
      (): string => maxEventLength.value * 20 + 'px'
    )

    function monthsOfYear() {
      const year = new Date(props.day).getFullYear()
      return MONTH_NAMES.map((name, index) => ({
        name,
        days: new Date(year, index + 1, 0).getDate()
      }))
    }

    function getDate(month: number, day: number) {
      return new Date(new Date(props.day).getFullYear(), month, day)
    }

    function renderDayEvents(day: YearGridCell) {
      const dayEventsList = dayEvents(day.date)
      const { events, more, limit } = limitDayEvents(dayEventsList)

      if (dayEventsList.length <= limit) {
        if (maxEventLength.value < dayEventsList.length) {
          maxEventLength.value = dayEventsList.length
        }
      } else {
        maxEventLength.value = limit + 1
      }

      const dayHeight = events.length + (more ? 1 : 0)
      const style = props.fixedRowHeight
        ? {}
        : {
            '--of-month-day-heigth':
              '' + dayHeight * eventHeightNumber.value + 'px'
          }
      if (hideDate(day.date)) return
      return h(
        'div',
        {
          class: 'of-calendar-month-day',
          style
        },
        [
          h('div', { class: 'events' }, [
            events.map(renderRowDayEvent),
            renderMoreLink(
              more,
              day.date,
              events.length * eventHeightNumber.value
            )
          ])
        ]
      )
    }

    function renderGrid() {
      return h(
        'div',
        {
          class: 'of-calendar-year-grid',
          style: { '--of-month-day-height': gridElementHeight.value }
        },
        monthsOfYear().map((item, monthIndex) =>
          h('div', { class: 'of-calendar-month-titles' }, [
            h('div', { class: 'month-name' }, item.name),
            Array.from({ length: item.days }, (_, dayIndex) => {
              const day = dayIndex + 1
              const date = getDate(monthIndex, day)
              return [
                h(
                  'div',
                  {
                    class: [
                      'day-of-month',
                      { today: sameDate(date, new Date()) }
                    ],
                    onClick: (event: any) => {
                      emit('click:day', event, date)
                    },
                    onKeypress: (event: KeyboardEvent) => {
                      if (['Enter', 'Space'].includes(event.code)) {
                        event.preventDefault()
                        emit('click:day', event, date)
                      }
                    }
                  },
                  day
                ),
                h('div', renderDayEvents({ date, today: true }))
              ]
            })
          ])
        )
      )
    }

    return () =>
      h(
        'div',
        {
          class: 'container of--calendar',
          style: {
            '--of-event-height': `${eventHeightNumber.value}px`
          },
          onSelectStart(e: Event) {
            e.preventDefault()
          }
        },
        [header(), renderGrid(), footer()]
      )
  }
})

import {
  addDays,
  firstMonday,
  isoWeekNumber,
  monthGrid,
  MonthGridCell,
  MonthGridData
} from '../../lib/datetime'
import { computed, defineComponent, h } from 'vue'
import { resolveWeekStart, useMonthGridEvents } from './base'
import calendarProps from './props'

export default defineComponent({
  props: {
    ...calendarProps.internal,
    ...calendarProps.common,
    ...calendarProps.month
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
      locale,
      renderWeekDay,
      renderDayNumber,
      header,
      footer,
      eventsLimitNumber,
      eventHeightNumber,
      dayEvents,
      limitDayEvents,
      hideDate,
      renderMoreLink,
      renderRowDayEvent
    } = useMonthGridEvents(props, slots, emit)

    const weekStartLocale = computed(() =>
      resolveWeekStart(props.weekStart, locale.value)
    )

    const monthGridData = computed((): MonthGridData => {
      return monthGrid(props.day, weekStartLocale.value)
    })

    function renderDayNumberOrSlot(day: Date) {
      const slot = slots['day-title']
      const content = slot ? slot(day) : renderDayNumber(day, false)
      return h(
        'div',
        {
          class: 'day-title',
          tabindex: slot ? '0' : undefined
        },
        content
      )
    }

    function renderRowDay(day: MonthGridCell) {
      const { events, more } = limitDayEvents(dayEvents(day.date))
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
          class: ['of-calendar-month-day', 'week-day-' + day.date.getDay()],
          style,
          onClick: (event: any) => {
            emit('click:day', event, day.date)
          },
          onKeypress: (event: KeyboardEvent) => {
            if (['Enter', 'Space'].includes(event.code)) {
              event.preventDefault()
              emit('click:day', event, day.date)
            }
          }
        },
        day.otherMonth && props.hideOtherMonths
          ? []
          : [
              renderDayNumberOrSlot(day.date),
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

    function renderRow(rowDays: MonthGridCell[], weekNumber: number) {
      const firstDay = addDays(firstMonday(props.day), weekNumber * 7)
      const wn = isoWeekNumber(firstDay)
      const wnSlot = slots['week-number']
      return h('div', { class: 'of-calendar-month-row' }, [
        h(
          'div',
          {
            class: 'of-calendar-gutter of-week-number',
            tabindex: '0',
            onClick: (event: any) => {
              emit('click:week', event, wn, firstDay)
            },
            onKeypress: (event: KeyboardEvent) => {
              if (['Enter', 'Space'].includes(event.code)) {
                event.preventDefault()
                emit('click:week', event, wn, firstDay)
              }
            }
          },
          wnSlot ? wnSlot(wn) : wn
        ),
        rowDays.map(renderRowDay)
      ])
    }

    function renderGrid() {
      const fm = firstMonday(props.day)
      const wd = fm.getDay() || 7
      const firstDayMonth = addDays(
        fm,
        weekStartLocale.value - (wd >= weekStartLocale.value ? wd : wd + 7)
      )
      const style = props.fixedRowHeight
        ? {
            '--of-month-day-heigth':
              '' + eventHeightNumber.value * eventsLimitNumber.value + 'px'
          }
        : {}
      return h('div', { class: 'of-calendar-month-grid', style }, [
        h('div', { class: 'of-calendar-day-titles' }, [
          h('div', { class: 'of-calendar-gutter' }),
          Array.from({ length: 7 }, (_, i) => {
            const weekDay = addDays(firstDayMonth, i)
            if (hideDate(weekDay)) return
            return h(
              'div',
              {
                class: [
                  'of-calendar-category-title',
                  'week-day-' + weekDay.getDay()
                ]
              },
              h(
                'div',
                { class: 'of-calendar-day-title' },
                renderWeekDay(weekDay)
              )
            )
          })
        ]),
        monthGridData.value.grid.map(renderRow)
      ])
    }

    return () =>
      h(
        'div',
        {
          class: 'container of--calendar',
          style: {
            '--of-event-height': `${eventHeightNumber.value}px`,
            '--of-categories-num': 8
          },
          onSelectStart(e: Event) {
            e.preventDefault()
          }
        },
        [header(), renderGrid(), footer()]
      )
  }
})

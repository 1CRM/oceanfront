import { defineComponent, h } from 'vue'
import { useCalendarBase } from './base'
import { useDayGridCalendar } from './day'
import calendarProps from './props'

export default defineComponent({
  props: {
    ...calendarProps.internal,
    ...calendarProps.common,
    ...calendarProps.category
  },
  emits: ['click:day'],
  setup(props, { slots, emit }) {
    const base = useCalendarBase(slots)

    const { render } = useDayGridCalendar(
      props,
      slots,
      {
        getIgnoreCategories: () => false,
        getCategoriesList: () =>
          props.categories.map((category) => ({
            category,
            date: props.day
          })),
        superTitleSlot: () => () =>
          h(
            'div',
            {
              tabindex: '0',
              onClick: (event: any) => {
                emit('click:day', event, props.day)
              },
              onKeypress: (event: KeyboardEvent) => {
                if (['Enter', 'Space'].includes(event.code)) {
                  event.preventDefault()
                  emit('click:day', event, props.day)
                }
              }
            },
            base.renderDayNumber(props.day, true)
          )
      },
      base
    )

    return render
  }
})

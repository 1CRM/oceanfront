import { DateTimeFormatterOptions } from '../../formats/DateTime'
import { sameDate } from '../../lib/datetime'
import { useFormats } from '../../lib/formats'
import { defineComponent, h } from 'vue'

const weekDayFormat: DateTimeFormatterOptions = {
  nativeOptions: { weekday: 'short' }
}

const dayFormat: DateTimeFormatterOptions = {
  nativeOptions: { day: 'numeric' }
}

export default defineComponent({
  computed: {
    formatMgr: () => useFormats()
  },
  methods: {
    renderSlot(name: string, param: any, fallback: Function) {
      const slot = this.$slots[name]
      return slot ? slot(param) : fallback()
    },
    renderWeekDay(date?: Date) {
      const weekFmt = this.formatMgr.getTextFormatter('date', weekDayFormat)
      return h('div', { class: 'weekday' }, weekFmt?.format(date).textValue)
    },
    renderDayNumber(date?: Date, weekday?: boolean) {
      const dayFmt = this.formatMgr.getTextFormatter('date', dayFormat)
      return h(
        'div',
        {
          class: 'of-calendar-day-title',
          tabindex: weekday ? undefined : '0'
        },
        [
          weekday ? this.renderWeekDay(date) : null,
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
  }
})

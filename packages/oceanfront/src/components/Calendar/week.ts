import { toTimestamp, Timestamp } from '../../lib/calendar'
import { addDays, parseDay } from '../../lib/datetime'
import { useLocale } from '../../lib/locale'
import { defineComponent } from 'vue'
import DayCalendar from './day'
import calendarProps from './props'

export default defineComponent({
  mixins: [DayCalendar],
  props: {
    ...calendarProps.common,
    ...calendarProps.week
  },
  computed: {
    weekStartLocale(): number {
      const locale = useLocale()
      const day =
        this.weekStart === undefined
          ? (locale.localeParams?.weekStart ?? 1)
          : this.weekStart
      return parseDay(day)
    }
  },
  methods: {
    getVisibleRange(): Timestamp[] {
      const weekDay = this.$props.day.getDay() || 7
      const firstDay = addDays(this.$props.day, 1 - weekDay)
      const lastDay = addDays(firstDay, 7)
      const firstTS = { ...toTimestamp(firstDay), hours: 0, minutes: 0 }
      const lastTS = { ...toTimestamp(lastDay), hours: 0, minutes: 0 }
      return [firstTS, lastTS]
    },
    getCategoriesList() {
      const weekDay = this.$props.day.getDay() ?? 7
      const offset =
        this.weekStartLocale -
        (weekDay >= this.weekStartLocale ? weekDay : weekDay + 7)
      return Array.from({ length: 7 }, (_, i) => ({
        category: '' + i,
        date: addDays(this.$props.day, i + offset)
      }))
    }
  }
})

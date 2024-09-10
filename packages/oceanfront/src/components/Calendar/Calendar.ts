import { defineComponent, h } from 'vue'
import CategoryCalendar from './category'
import DayCalendar from './day'
import YearCalendar from './year'
import MonthCalendar from './month'
import NDaysCalendar from './ndays'
import calendarProps from './props'
import WeekCalendar from './week'

export default defineComponent({
  name: 'OfCalendar',
  props: calendarProps.common,
  render() {
    switch (this.$props.type) {
      case 'week':
        return h(WeekCalendar, this.$props as any, this.$slots)
      case 'category':
        return h(CategoryCalendar, this.$props as any, this.$slots)
      case 'ndays':
        return h(NDaysCalendar, this.$props as any, this.$slots)
      case 'month':
        return h(MonthCalendar, this.$props as any, this.$slots)
      case 'year':
        return h(YearCalendar, this.$props as any, this.$slots)
      default:
        return h(DayCalendar, this.$props as any, this.$slots)
    }
  }
})

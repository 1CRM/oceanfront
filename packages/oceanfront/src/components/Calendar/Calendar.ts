import { Component, defineComponent, h } from 'vue'
import CategoryCalendar from './category'
import DayCalendar from './day'
import YearCalendar from './year'
import MonthCalendar from './month'
import NDaysCalendar from './ndays'
import calendarProps from './props'
import WeekCalendar from './week'

const views: Record<string, Component> = {
  week: WeekCalendar,
  category: CategoryCalendar,
  ndays: NDaysCalendar,
  month: MonthCalendar,
  year: YearCalendar,
  day: DayCalendar
}

export default defineComponent({
  name: 'OfCalendar',
  props: calendarProps.common,
  setup(props, { slots }) {
    return () => {
      const view = views[props.type ?? 'day'] ?? DayCalendar
      return h(view, props as any, slots)
    }
  }
})

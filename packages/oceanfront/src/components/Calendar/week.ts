import { toTimestamp, Timestamp } from '../../lib/calendar'
import { addDays } from '../../lib/datetime'
import { computed, defineComponent } from 'vue'
import { resolveWeekStart, useCalendarBase } from './base'
import { useDayGridCalendar } from './day'
import calendarProps from './props'

export default defineComponent({
  props: {
    ...calendarProps.internal,
    ...calendarProps.common,
    ...calendarProps.week
  },
  setup(props, { slots }) {
    const base = useCalendarBase(slots)

    const weekStartLocale = computed(() =>
      resolveWeekStart(props.weekStart, base.locale.value)
    )

    function getVisibleRange(): Timestamp[] {
      // Sunday is 0; treat it as 7 so the week starts on Monday by default.
      const weekDay = props.day.getDay() || 7
      const firstDay = addDays(props.day, 1 - weekDay)
      const lastDay = addDays(firstDay, 7)
      return [
        { ...toTimestamp(firstDay), hours: 0, minutes: 0 },
        { ...toTimestamp(lastDay), hours: 0, minutes: 0 }
      ]
    }

    function getCategoriesList() {
      const weekDay = props.day.getDay() || 7
      const offset =
        weekStartLocale.value -
        (weekDay >= weekStartLocale.value ? weekDay : weekDay + 7)
      return Array.from({ length: 7 }, (_, i) => ({
        category: '' + i,
        date: addDays(props.day, i + offset)
      }))
    }

    const { render } = useDayGridCalendar(
      props,
      slots,
      { getVisibleRange, getCategoriesList },
      base
    )
    return render
  }
})

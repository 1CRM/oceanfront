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

    /** Days from `props.day` back to the configured first weekday (0=Sun … 6=Sat). */
    function weekStartOffset(): number {
      const weekDay = props.day.getDay()
      const ws = weekStartLocale.value
      return ws - (weekDay >= ws ? weekDay : weekDay + 7)
    }

    function getVisibleRange(): Timestamp[] {
      const firstDay = addDays(props.day, weekStartOffset())
      const lastDay = addDays(firstDay, 7)
      return [
        { ...toTimestamp(firstDay), hours: 0, minutes: 0 },
        { ...toTimestamp(lastDay), hours: 0, minutes: 0 }
      ]
    }

    function getCategoriesList() {
      const offset = weekStartOffset()
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

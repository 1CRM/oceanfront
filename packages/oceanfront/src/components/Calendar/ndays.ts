import { toTimestamp, Timestamp } from '../../lib/calendar'
import { addDays } from '../../lib/datetime'
import { defineComponent } from 'vue'
import { useDayGridCalendar } from './day'
import calendarProps from './props'

function clampNumDays(value: unknown): number {
  const n = parseInt(value as string)
  if (isNaN(n)) return 2
  return Math.min(6, Math.max(2, n))
}

export default defineComponent({
  props: {
    ...calendarProps.internal,
    ...calendarProps.common,
    ...calendarProps.ndays
  },
  setup(props, { slots }) {
    function getVisibleRange(): Timestamp[] {
      const nDays = clampNumDays(props.numDays)
      const firstDay = props.day
      const lastDay = addDays(firstDay, nDays)
      return [
        { ...toTimestamp(firstDay), hours: 0, minutes: 0 },
        { ...toTimestamp(lastDay), hours: 0, minutes: 0 }
      ]
    }

    function getCategoriesList() {
      return Array.from({ length: clampNumDays(props.numDays) }, (_, i) => ({
        category: '' + i,
        date: addDays(props.day, i)
      }))
    }

    const { render } = useDayGridCalendar(props, slots, {
      getVisibleRange,
      getCategoriesList
    })
    return render
  }
})

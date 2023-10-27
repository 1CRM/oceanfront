import { toTimestamp, Timestamp } from '../../lib/calendar'
import { addDays } from '../../lib/datetime'
import { defineComponent } from 'vue'
import DayCalendar from './day'
import calendarProps from './props'

export default defineComponent({
  mixins: [DayCalendar],
  props: {
    ...calendarProps.common,
    ...calendarProps.ndays,
  },
  methods: {
    getVisibleRange(): Timestamp[] {
      let nDays = parseInt(this.$props.numDays as string)
      if (nDays < 2) nDays = 2
      if (nDays > 6) nDays = 6
      if (isNaN(nDays)) nDays = 2
      const firstDay = this.$props.day
      const lastDay = addDays(firstDay, nDays)
      const firstTS = { ...toTimestamp(firstDay), hours: 0, minutes: 0 }
      const lastTS = { ...toTimestamp(lastDay), hours: 0, minutes: 0 }
      return [firstTS, lastTS]
    },
    getCategoriesList() {
      let nDays = parseInt(this.$props.numDays as string)
      if (nDays < 2) nDays = 2
      if (nDays > 6) nDays = 6
      if (isNaN(nDays)) nDays = 2
      return Array.from({ length: nDays }, (_, i) => ({
        category: '' + i,
        date: addDays(this.$props.day, i),
      }))
    },
  },
})

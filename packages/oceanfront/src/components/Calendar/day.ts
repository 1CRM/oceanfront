import { toTimestamp, withZeroTime, Timestamp } from '../../lib/calendar'
import { addDays } from '../../lib/datetime'
import { useFormats } from '../../lib/formats'
import { defineComponent, h } from 'vue'
import Base from './base'
import dayColumns from './daycolumn'
import calendarProps from './props'

export default defineComponent({
  mixins: [Base],
  props: {
    ...calendarProps.internal,
    ...calendarProps.common
  },
  computed: {
    formatMgr: () => useFormats()
  },
  methods: {
    getVisibleRange(): Timestamp[] {
      const firstDay = this.$props.day
      const lastDay = addDays(firstDay, 1)
      const firstTS = withZeroTime(toTimestamp(firstDay))
      const lastTS = withZeroTime(toTimestamp(lastDay))
      return [firstTS, lastTS]
    },
    dayTitleSlot() {
      return (date: any) => {
        const slot = this.$slots['day-title']
        return slot ? slot(date) : this.renderDayNumber(date, true)
      }
    },
    superTitleSlot() {
      return undefined
    },
    collectSlots() {
      return {
        'day-title': this.dayTitleSlot(),
        'super-title': this.superTitleSlot()
      }
    },
    getCategoriesList() {
      return [
        {
          category: 'Today',
          date: this.$props.day
        }
      ]
    },
    getIgnoreCategories() {
      return true
    },
    getProps() {
      return {
        ...this.$props,
        categoriesList: this.getCategoriesList(),
        ignoreCategories: this.getIgnoreCategories(),
        visibleRange: this.getVisibleRange()
      }
    }
  },
  render() {
    return h(dayColumns, this.getProps(), {
      ...this.$slots,
      ...this.collectSlots()
    })
  }
})

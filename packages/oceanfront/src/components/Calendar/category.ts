import { defineComponent, h } from 'vue'
import DayCalendar from './day'
import calendarProps from './props'

export default defineComponent({
  mixins: [DayCalendar],
  props: {
    ...calendarProps.common,
    ...calendarProps.category,
  },
  emits: ['click:day'],
  methods: {
    superTitleSlot() {
      return (_: any) => {
        return h(
          'div',
          {
            tabindex: '0',
            onClick: (event: any) => {
              this.$emit('click:day', event, this.$props.day)
            },
            onKeypress: (event: KeyboardEvent) => {
              if (['Enter', 'Space'].includes(event.code)) {
                event.preventDefault()
                this.$emit('click:day', event, this.$props.day)
              }
            },
          },
          this.renderDayNumber(this.$props.day, true),
        )
      }
    },
    categoryTitleSlot() {
      return (args: any) => {
        const slot = this.$slots['category-title']
        return slot ? slot(args) : h('strong', {}, args.categoryName)
      }
    },
    getIgnoreCategories() {
      return false
    },
    getCategoriesList() {
      return this.$props.categories.map((category) => ({
        category,
        date: this.$props.day,
      }))
    },
  },
})

import { defineComponent, h } from 'vue'
import { resolveLocale } from '../locale'

/** Test helper: Options API computed calling resolveLocale (calendar-style). */
export const LocaleOptionsApiProbe = defineComponent({
  name: 'LocaleOptionsApiProbe',
  computed: {
    weekStart(): number | undefined {
      return resolveLocale().localeParams?.weekStart
    },
    localeTag(): string {
      return resolveLocale().locale
    }
  },
  render() {
    return h('span', {
      'data-week': String(this.weekStart),
      'data-locale': this.localeTag
    })
  }
})

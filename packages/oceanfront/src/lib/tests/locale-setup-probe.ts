import { defineComponent, h } from 'vue'
import { resolveConfig } from '../config'
import { resolveFormats } from '../formats'
import { resolveLocale } from '../locale'

/** Test helper: Composition API setup calling resolveConfig / resolveLocale. */
export const LocaleSetupProbe = defineComponent({
  name: 'LocaleSetupProbe',
  setup() {
    const locale = resolveLocale()
    const formats = resolveFormats()
    return () =>
      h('span', {
        'data-has-config': String(!!resolveConfig()),
        'data-locale': locale.locale,
        'data-week': String(locale.localeParams?.weekStart),
        'data-has-formats': String(
          typeof formats.getTextFormatter === 'function'
        )
      })
  }
})

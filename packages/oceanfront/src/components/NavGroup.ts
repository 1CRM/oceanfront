import { defineComponent } from 'vue'
import { provideNavGroup, reactiveNavGroup } from '../lib/nav'

export const OfNavGroup = defineComponent({
  name: 'OfNavGroup',
  setup(_props, ctx) {
    const items = reactiveNavGroup()
    provideNavGroup(items)
    return () => ctx.slots.default?.({ focused: items.isFocused })
  }
})

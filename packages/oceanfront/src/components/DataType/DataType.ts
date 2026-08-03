import { PropType, Suspense, defineComponent, h, isVNode, toRaw } from 'vue'
import { DataTypeValue } from '../../lib/datatype'
import { freshVNode } from '../../lib/virtual_scroll_vnode'

import Currency from './currency'
import Link from './link'

export default defineComponent({
  name: 'OfDataType',
  props: {
    editable: Boolean,
    value: {
      type: [String, Boolean, Number, Array, Object] as PropType<DataTypeValue>,
      default: null
    },
    /**
     * Set by `of-table-row` only when its ancestor `of-data-table` has
     * `virtual-scroll` on. Cached VNodes are single-use, so a virtual-scroll
     * row remount needs a rebuilt tree or it renders blank; every other
     * consumer (classic tables, forms, etc.) renders the VNode/array as-is,
     * same as before this existed.
     */
    freshVnode: Boolean
  },
  render() {
    // Suspense so async-setup formatters resolve after a virtual-scroll remount.
    const renderFresh = (input: unknown) =>
      h(Suspense, null, { default: () => freshVNode(toRaw(input)) as any })
    const wrap = (input: unknown) =>
      this.$props.freshVnode ? renderFresh(input) : input

    if (this.$props.value && typeof this.$props.value === 'object') {
      switch (
        (this.$props.value.format as any)?.type ||
        this.$props.value.format
      ) {
        case 'currency':
          return h(Currency, this.$props as any, this.$slots)
        case 'link':
          return h(Link, this.$props as any, this.$slots)
        default: {
          const inner = this.$props.value.value
          return isVNode(inner) || Array.isArray(inner) ? wrap(inner) : inner
        }
      }
    }

    const value = this.$props.value
    return isVNode(value) ? wrap(value) : value
  }
})

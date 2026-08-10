import { PropType, defineComponent, h, inject, isVNode } from 'vue'
import { DataTypeValue } from '../../lib/datatype'
import {
  dataTableVirtualScrollKey,
  notVirtualScroll,
  wrapFreshVNode
} from '../../lib/virtual_scroll_vnode'
import { OfFormat } from '../Format'

import Currency from './currency'
import Link from './link'

export default defineComponent({
  name: 'OfDataType',
  props: {
    editable: Boolean,
    value: {
      type: [String, Boolean, Number, Array, Object] as PropType<DataTypeValue>,
      default: null
    }
  },
  setup() {
    const virtualScrollActive = inject(
      dataTableVirtualScrollKey,
      notVirtualScroll
    )
    return { virtualScrollActive }
  },
  render() {
    const wrap = (input: unknown) =>
      wrapFreshVNode(input, !!this.virtualScrollActive)

    if (this.$props.value && typeof this.$props.value === 'object') {
      const format = this.$props.value.format as any
      const formatType = format?.type || format
      switch (formatType) {
        case 'currency':
          return h(Currency, this.$props as any, this.$slots)
        case 'link':
          return h(Link, this.$props as any, this.$slots)
        default: {
          if (typeof formatType === 'string' && formatType) {
            return h(OfFormat, {
              type: formatType,
              options: format?.formatOptions,
              value: this.$props.value.value
            })
          }
          const inner = this.$props.value.value
          return isVNode(inner) || Array.isArray(inner) ? wrap(inner) : inner
        }
      }
    }

    const value = this.$props.value
    return isVNode(value) ? wrap(value) : value
  }
})

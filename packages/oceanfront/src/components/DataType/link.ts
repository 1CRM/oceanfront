import { PropType, defineComponent, h, inject, isVNode } from 'vue'
import { DataTypeValue } from '../../lib/datatype'
import {
  dataTableVirtualScrollKey,
  freshVNode,
  notVirtualScroll
} from '../../lib/virtual_scroll_vnode'
import { OfLink } from '../Link'

export default defineComponent({
  props: { value: { type: Object as PropType<DataTypeValue>, required: true } },
  setup() {
    const virtualScrollActive = inject(
      dataTableVirtualScrollKey,
      notVirtualScroll
    )
    return { virtualScrollActive }
  },
  render() {
    return h(
      OfLink as any,
      {
        href: this.$props.value.params.href || null,
        to: this.$props.value.params.to || null,
        beforeNavigate: this.$props.value.params.beforeNavigate || null,
        ariaLabel: this.$props.value.params.ariaLabel || null
      },
      {
        default: () => {
          const inner = this.$props.value.value
          if (!(isVNode(inner) || Array.isArray(inner))) return inner
          return this.virtualScrollActive ? freshVNode(inner) : inner
        }
      }
    )
  }
})

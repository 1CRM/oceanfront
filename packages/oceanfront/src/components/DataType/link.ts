import { PropType, defineComponent, h, isVNode } from 'vue'
import { DataTypeValue } from '../../lib/datatype'
import { freshVNode } from '../../lib/virtual_scroll_vnode'
import { OfLink } from '../Link'

export default defineComponent({
  props: { value: { type: Object as PropType<DataTypeValue>, required: true } },
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
          // Always clone: cached list-cell VNodes are single-use.
          return freshVNode(inner)
        }
      }
    )
  }
})

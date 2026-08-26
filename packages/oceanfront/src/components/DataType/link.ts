import { PropType, defineComponent, h } from 'vue'
import { DataTypeValue, cloneRenderTree } from '../../lib/datatype'
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
        default: () => cloneRenderTree(this.$props.value.value)
      }
    )
  }
})

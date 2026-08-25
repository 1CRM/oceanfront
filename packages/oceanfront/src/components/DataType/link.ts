import { PropType, defineComponent, h, inject } from 'vue'
import {
  DataTypeValue,
  cloneRenderTree,
  noReuseRenderTrees,
  reuseRenderTreesKey
} from '../../lib/datatype'
import { OfLink } from '../Link'

export default defineComponent({
  props: { value: { type: Object as PropType<DataTypeValue>, required: true } },
  setup() {
    return { reuseTrees: inject(reuseRenderTreesKey, noReuseRenderTrees) }
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
          const value = this.$props.value.value
          return this.reuseTrees ? cloneRenderTree(value) : value
        }
      }
    )
  }
})

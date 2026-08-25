import { PropType, defineComponent, h, inject } from 'vue'
import {
  DataTypeValue,
  cloneRenderTree,
  noReuseRenderTrees,
  reuseRenderTreesKey
} from '../../lib/datatype'
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
    return { reuseTrees: inject(reuseRenderTreesKey, noReuseRenderTrees) }
  },
  render() {
    const keep = <T>(value: T): T =>
      this.reuseTrees ? cloneRenderTree(value) : value

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
          return keep(this.$props.value.value)
        }
      }
    }

    return keep(this.$props.value)
  }
})

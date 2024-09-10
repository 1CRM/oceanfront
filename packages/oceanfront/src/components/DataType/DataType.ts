import { PropType, defineComponent, h } from 'vue'
import { DataTypeValue } from '../../lib/datatype'

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
  render() {
    if (this.$props.value && typeof this.$props.value === 'object') {
      switch (
        (this.$props.value.format as any)?.type ||
        this.$props.value.format
      ) {
        case 'currency':
          return h(Currency, this.$props as any, this.$slots)
        case 'link':
          return h(Link, this.$props as any, this.$slots)
        default:
          return this.$props.value.value
      }
    }

    return this.$props.value
  }
})

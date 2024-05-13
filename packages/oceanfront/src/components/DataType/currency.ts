import { PropType, defineComponent, h } from 'vue'
import { DataTypeValue } from '../../lib/datatype'
import { useFormats } from '../../lib/formats'

export default defineComponent({
  props: {
    value: { type: Object as PropType<DataTypeValue>, required: true }
  },
  render() {
    const formatMgr = useFormats()
    const numberFormat = formatMgr.getTextFormatter('number')
    const result = numberFormat?.format(this.$props.value.value)
    if (result) {
      return h('span', {
        innerHTML: this.$props.value.params.symbol + ' ' + result.textValue
      })
    }
    return ''
  }
})

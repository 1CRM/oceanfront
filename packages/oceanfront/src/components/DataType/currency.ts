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
    const symbol = this.$props.value?.params?.symbol || '$'
    if (result?.value) {
      return h('span', {
        innerHTML: symbol + ' ' + result.textValue
      })
    }
    return h('span', {
      innerHTML: '—'
    })
  }
})

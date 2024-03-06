import { computed, defineComponent, h, PropType } from 'vue'
import { useFormats, TextFormatterProp } from '../lib/formats'

export const OfFormat = defineComponent({
  name: 'OfFormat',
  props: {
    type: [String, Function, Object] as PropType<TextFormatterProp>,
    options: Object,
    value: {
      type: [String, Boolean, Number, Array, Object],
      default: undefined,
    },
  },
  setup(props) {
    const formatMgr = useFormats()
    const formatter = computed(() =>
      props.type
        ? formatMgr.getTextFormatter(props.type, props.options)
        : undefined,
    )
    return () => {
      const fmt = formatter.value
      if (fmt) {
        const result = fmt.format(props.value)
        if (result) {
          return h('span', { class: result.textClass }, result.textValue)
        }
      }
      return props.value === undefined ? '' : '' + props.value
    }
  },
})

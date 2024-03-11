import {
  Component,
  computed,
  ComputedRef,
  DefineComponent,
  defineComponent,
  h,
  ref,
  shallowRef,
  watch
} from 'vue'
import { useFormats } from '../lib/formats'
import { FormRecord, useRecords } from '../lib/records'
import { extendReactive } from '../lib/util'

export const OfField = defineComponent({
  name: 'OfField',
  setup(_props, ctx) {
    const format = ref()
    const type_ = ref()
    const comp = shallowRef<DefineComponent>()
    const formatMgr = useFormats()
    const recordMgr = useRecords()
    const record: ComputedRef<FormRecord | undefined> = computed(() => {
      return (
        (ctx.attrs.record as FormRecord) ||
        recordMgr.getCurrentRecord() ||
        undefined
      )
    })
    const metadata = computed(() =>
      ctx.attrs.name ? record.value?.metadata?.[ctx.attrs.name as string] : null
    )

    watch(
      () => [ctx.attrs.format, ctx.attrs.type, metadata.value?.type],
      ([fmt, t, metadataType]) => {
        t = metadataType || t
        format.value = fmt
        type_.value = t

        const found: Component | undefined =
          t && typeof t === 'object' && 'setup' in t
            ? (t as Component)
            : formatMgr.getFieldType(t as string, true)
        if (!found) {
          // FIXME should always resolve something, but might
          // want a field type that just renders an error message
          throw new TypeError(`Unknown field type: ${t}`)
        }
        comp.value = found as DefineComponent
      },
      { immediate: true }
    )

    return () => {
      return comp.value
        ? h(
            comp.value,
            extendReactive(ctx.attrs, { format, type: type_ }),
            ctx.slots
          )
        : null
    }
  }
})

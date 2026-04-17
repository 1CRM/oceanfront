import {
  BaseFieldProps,
  fieldRender,
  OfFieldBase,
  provideFieldContext,
  provideFieldRender,
  useRecords
} from 'oceanfront'
import { computed, defineComponent, h, ref } from 'vue'

export default defineComponent({
  name: 'Minutes',
  props: BaseFieldProps,
  setup(props, ctx) {
    const fieldCtx = provideFieldContext(props, ctx)
    const recordMgr = useRecords()
    const record = computed(() => {
      return props.record || recordMgr.getCurrentRecord()
    })
    const focused = ref(false)
    const pendingPointerFocus = ref(false)
    const suppressKeyboardFocusRing = ref(false)

    const elt = ref<HTMLInputElement | undefined>()

    const markPendingPointerFocus = () => {
      pendingPointerFocus.value = true
      requestAnimationFrame(() => {
        if (!focused.value) pendingPointerFocus.value = false
      })
    }

    const focus = (select?: boolean) => {
      if (elt.value) {
        elt.value.focus({
          focusVisible: false
        } as FocusOptions & { focusVisible?: boolean })
        if (select) elt.value.select()
        return true
      }
    }

    const value = computed(() => {
      const h = parseInt(record.value?.value[props.name + '_hours']) || 0
      const m = parseInt(record.value?.value[props.name + '_minutes']) || 0
      return h * 60 + m
    })

    const hooks = {
      onChange: (evt: Event) => {
        if (!record.value) return
        const target = evt.target as
          | (HTMLInputElement | HTMLTextAreaElement)
          | null
        if (!target) return
        const val = target.value
        let hm = parseInt(val)
        if (!isNaN(hm)) {
          const sign = hm < 0 ? -1 : 1
          hm *= sign
          record.value.value[props.name + '_hours'] = (
            sign * Math.floor(hm / 60)
          ).toFixed(0)
          record.value.value[props.name + '_minutes'] = (
            sign *
            (hm % 60)
          ).toFixed(0)
        }
      },
      onFocus: () => {
        suppressKeyboardFocusRing.value = pendingPointerFocus.value
        pendingPointerFocus.value = false
        focused.value = true
      },
      onBlur: () => {
        focused.value = false
        suppressKeyboardFocusRing.value = false
      }
    }

    const slots = {
      interactiveContent: () => {
        return h('input', {
          type: 'number',
          readonly: !fieldCtx.editable,
          class: ['of-field-input'],
          value: value.value,
          ...hooks,
          ref: elt
        })
      }
    }

    const fRender = fieldRender({
      cursor: computed(() => (fieldCtx.editable ? 'text' : 'normal')),
      focused,
      focus,
      click: () => focus(fieldCtx.editable),
      onMousedown: markPendingPointerFocus,
      class: computed(() => ({
        'of-text-field': true,
        'of--suppress-keyboard-focus-ring': suppressKeyboardFocusRing.value
      }))
    })

    provideFieldRender(fRender)

    return () => {
      return h(OfFieldBase, props, { ...slots, ...ctx.slots })
    }
  }
})

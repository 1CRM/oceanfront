import { computed, defineComponent, h, PropType, ref, VNode } from 'vue'
import { FieldMode, newFieldId } from '../lib/fields'
import { FormRecord, useRecords } from '../lib/records'
import { RadioInner } from './RadioInner'

export const OfRadio = defineComponent({
  name: 'OfRadio',
  inheritAttrs: false,
  props: {
    checked: { type: [Boolean, Number], default: false },
    id: String,
    initialValue: { type: Boolean, default: undefined },
    label: String,
    loading: Boolean,
    locked: Boolean,
    mode: String as PropType<FieldMode>,
    muted: Boolean,
    name: String,
    readonly: Boolean,
    record: Object as PropType<FormRecord>,
    required: Boolean,
    value: String
  },
  emits: {
    'update:checked': null
  },
  setup(props, ctx) {
    const defaultId = newFieldId()
    const recordMgr = useRecords()
    const record = computed(() => {
      return props.record || recordMgr.getCurrentRecord() || undefined
    })
    const inputId = computed(() => props.id || defaultId)
    const value = computed(() => {
      const val = props.checked
      return typeof val === 'number' ? Boolean(val) : val
    })
    const locked = computed(() => props.locked || record.value?.locked)
    const focused = ref(false)
    const elt = ref<HTMLInputElement | undefined>()
    const handlers = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
      },
      onClick() {
        const val = !value.value
        if (props.name && record.value) record.value.value[props.name] = val
        else {
          ctx.emit('update:checked', val)
        }
      }
    }

    const setElt = (e: VNode) => {
      elt.value = e.el as HTMLInputElement
    }
    return () => {
      const content = h(RadioInner, {
        checked: props.checked,
        label: props.label,
        inputId: inputId.value,
        name: props.name,
        onInputMounted: setElt
      })
      return h(
        'div',
        {
          class: [
            'of-toggle',
            'of-field',
            {
              'of--active': true,
              'of--focused': focused.value,
              'of--muted': props.muted,
              'of--locked': locked.value,
              'of--checked': props.checked
            }
          ],
          tabIndex: -1,
          ...handlers
        },
        content
      )
    }
  }
})

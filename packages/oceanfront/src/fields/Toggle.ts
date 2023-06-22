import { computed, defineComponent, h, ref, VNode, watch } from 'vue'
import { OfFieldBase } from '../components/FieldBase'
import { ToggleInner } from '../components/ToggleInner'
import {
  BaseFieldProps,
  FieldRender,
  fieldRender,
  newFieldId,
  provideFieldContext,
  provideFieldRender,
} from '../lib/fields'

export const supportedTypes = new Set(['checkbox', 'switch'])

export const OfToggleField = defineComponent({
  name: 'OfToggleField',
  props: { ...BaseFieldProps, inputType: String, switch: Boolean },
  setup(props, ctx) {
    const fieldCtx = provideFieldContext(props, ctx)
    const initialValue = computed(() => {
      let initial = fieldCtx.initialValue
      if (initial === undefined) initial = props.defaultValue
      return initial ?? null
    })
    const stateValue = ref()
    watch(
      () => fieldCtx.value,
      (val) => {
        if (val === undefined || val === '') val = null
        stateValue.value = val
      },
      {
        immediate: true,
      }
    )

    const elt = ref<HTMLInputElement | undefined>()
    const focused = ref(false)
    let defaultFieldId: string
    const inputId = computed(() => {
      let id = fieldCtx.id
      if (!id) {
        if (!defaultFieldId) defaultFieldId = newFieldId()
        id = defaultFieldId
      }
      return id
    })
    const inputType = computed(() => {
      const pi = props.inputType
      return pi && supportedTypes.has(pi)
        ? pi
        : props.switch
        ? 'switch'
        : 'checkbox'
    })

    const focus = () => {
      const curelt = elt.value
      if (curelt) curelt.focus()
    }
    const clickToggle = (_evt?: MouseEvent) => {
      if (fieldCtx.editable) {
        stateValue.value = !stateValue.value
        if (fieldCtx.onUpdate) fieldCtx.onUpdate(stateValue.value)
      }
      focus()
      return false
    }
    const hooks = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
      },
      onInputMounted(vnode: VNode) {
        elt.value = vnode.el as HTMLInputElement
      },
      'onUpdate:checked': (checked: boolean) => {
        stateValue.value = checked
        if (fieldCtx.onUpdate) fieldCtx.onUpdate(stateValue.value)
      },
    }

    const slots = {
      interactiveContent: () => {
        return h(
          ToggleInner,
          {
            switch: inputType.value === 'switch',
            checked: stateValue.value,
            focused: focused.value,
            label: fieldCtx.inputLabel,
            inputId: inputId.value,
            align: props.align,
            name: props.name,
            mode: fieldCtx.mode,
            size: fieldCtx.size,
            ariaLabel: fieldCtx.ariaLabel,
            ...hooks,
          },
          { icon: ctx.slots.icon }
        )
      },
    }

    const fRender: FieldRender = fieldRender({
      active: true, // always show content
      blank: computed(() => !stateValue.value),
      class: computed(() => {
        return { 'of-toggle-field': true, 'of--checked': !!stateValue.value }
      }),
      click: clickToggle,
      cursor: computed(() => (fieldCtx.editable ? 'pointer' : null)),
      focus,
      focused,
      inputId,
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue,
      undecorated: true,
      fieldContext: fieldCtx,
    })
    provideFieldRender(fRender)

    const render = () => {
      return h(OfFieldBase, props, { ...slots, ...ctx.slots })
    }
    return render
  },
})

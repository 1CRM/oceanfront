import { computed, defineComponent, h, ref, VNode, watch } from 'vue'
import { OfFieldBase } from '../components/FieldBase'
import { RadioInner } from '../components/RadioInner'
import {
  BaseFieldProps,
  FieldRender,
  fieldRender,
  newFieldId,
  provideFieldContext,
  provideFieldRender
} from '../lib/fields'
import { makeItems } from '../lib/items'

const gridClass = (grid: string | undefined) => {
  switch (grid) {
    case 'column':
      return { 'of--column': true }
    case 'row':
      return { 'of--row': true }
    default:
      return {}
  }
}
export const OfRadioField = defineComponent({
  name: 'OfRadioField',
  props: {
    ...BaseFieldProps,
    grid: String,
    inputType: String,
    switch: Boolean,
    outside: { type: Boolean, default: true }
  },
  setup(props, ctx) {
    const fieldCtx = provideFieldContext(props, ctx)
    const initialValue = computed(() => {
      let initial = fieldCtx.initialValue
      if (initial === undefined) initial = props.defaultValue
      return initial ?? null
    })
    const items: any = computed(() => {
      if (typeof props.items === 'string' || Array.isArray(props.items)) {
        return makeItems(props.items)
      }
      return []
    })
    const stateValue = ref()
    const focused = ref(false)
    const focusIndex = ref<number>()

    watch(
      () => fieldCtx.value,
      (val) => {
        if (val === undefined || val === '') val = null
        stateValue.value = val
      },
      {
        immediate: true
      }
    )

    const elt = ref<HTMLInputElement | undefined>()
    let defaultFieldId: string
    const inputId = computed(() => {
      let id = fieldCtx.id
      if (!id) {
        if (!defaultFieldId) defaultFieldId = newFieldId()
        id = defaultFieldId
      }
      return id
    })
    const focus = () => {
      const curelt = elt.value
      if (curelt) curelt.focus()
    }
    const clickToggle = (data?: any) => {
      if (fieldCtx.editable) {
        if (fieldCtx.onUpdate) fieldCtx.onUpdate(data)
      }
      return false
    }
    const selectAdjacent = (delta: 1 | -1) => {
      const list = items.value
      const len = list.length
      if (len === 0 || !fieldCtx.editable) return
      let idx = list.findIndex((item: any) => item.value == stateValue.value)
      if (idx === -1) idx = focusIndex.value ?? 0
      idx = (idx + delta + len) % len
      clickToggle(list[idx].value)
    }
    const hooks = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
        focusIndex.value = undefined
      },
      onFocus(index: number) {
        focused.value = true
        focusIndex.value = index
      },
      onInputMounted(vnode: VNode) {
        elt.value = vnode.el as HTMLInputElement
      },
      'onUpdate:checked': (checked: boolean) => {
        stateValue.value = checked
        if (fieldCtx.onUpdate) fieldCtx.onUpdate(stateValue.value)
      }
    }

    const selectedItemText = computed(() => {
      let res
      for (const item of items.value) {
        if (item.value === stateValue.value) res = item.text
      }
      return res
    })
    const slots = {
      interactiveContent: () => {
        if (props.mode === 'fixed')
          return [
            h(
              'div',
              {
                role: 'textbox',
                class: [
                  'of-field-content-text',
                  'of--align-' + (props.align || 'start')
                ],
                id: inputId.value,
                ref: elt,
                tabindex: -1,
                'aria-label':
                  fieldCtx.ariaLabel ?? props.label ?? stateValue.value ?? ' ',
                'aria-disabled': 'true',
                'aria-readonly': 'true',
                'aria-invalid': props.invalid ? 'true' : undefined,
                ...hooks
              },
              selectedItemText.value
            )
          ]
        return h(
          'div',
          {
            class: ['radio-group', gridClass(props.grid)],
            role: 'radiogroup',
            'aria-label': fieldCtx.ariaLabel ?? props.label ?? undefined
          },
          [
            items.value.map((item: any, index: number) =>
              h(
                RadioInner,
                {
                  onSelectItem: (value: string | number) => {
                    clickToggle(value)
                  },
                  checked: stateValue.value === item.value,
                  focused: focusIndex.value === index,
                  index,
                  label: item.text,
                  value: item.value,
                  inputId: inputId.value + item.value,
                  align: props.align,
                  name: props.name ?? inputId.value,
                  mode: fieldCtx.mode,
                  scale: props.scale,
                  invalid: props.invalid,
                  ariaDescription: fieldCtx.ariaModeDescription,
                  ...hooks
                },
                { icon: ctx.slots.icon }
              )
            )
          ]
        )
      }
    }

    const fRender: FieldRender = fieldRender({
      active: true, // always show content
      blank: computed(() => !stateValue.value),
      class: computed(() => {
        return { 'of-toggle-field': true, 'of--checked': !!stateValue.value }
      }),
      cursor: computed(() => (fieldCtx.editable ? 'pointer' : null)),
      focus,
      focused,
      inputId,
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue,
      fieldContext: fieldCtx,
      keydown: (event: KeyboardEvent) => {
        if (!fieldCtx.editable) return
        let consumed = false
        if (['ArrowRight', 'ArrowDown'].includes(event.code)) {
          selectAdjacent(1)
          consumed = true
        } else if (['ArrowLeft', 'ArrowUp'].includes(event.code)) {
          selectAdjacent(-1)
          consumed = true
        } else if (['Enter', 'Space'].includes(event.code)) {
          const i =
            focusIndex.value ??
            items.value.findIndex((item: any) => item.value == stateValue.value)
          const idx = i >= 0 ? i : 0
          if (items.value[idx]) clickToggle(items.value[idx].value)
          consumed = true
        }
        if (consumed) {
          event.preventDefault()
          event.stopPropagation()
        }
      }
    })
    provideFieldRender(fRender)

    const render = () => {
      return h(OfFieldBase, props, { ...slots, ...ctx.slots })
    }
    return render
  }
})

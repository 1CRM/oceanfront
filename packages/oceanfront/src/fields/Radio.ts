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
  props: { ...BaseFieldProps, grid: String },
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
    const focusIndex = ref()
    const setFocusIndex = (
      delta: number | undefined = undefined,
      index: number | undefined = undefined
    ) => {
      if (index !== undefined && focusIndex.value !== undefined) {
        focusIndex.value = index
      } else if (delta) {
        const newIndex = focusIndex.value + delta
        const length = items.value.length - 1
        focusIndex.value =
          newIndex > length ? 0 : newIndex < 0 ? length : newIndex
      } else if (focused.value) {
        const currentIndex = items.value.findIndex(
          (item: any) => item.value == stateValue.value
        )
        focusIndex.value = currentIndex == -1 ? 0 : currentIndex
      }
    }

    watch(
      () => fieldCtx.value,
      (val) => {
        if (val === undefined || val === '') val = null
        stateValue.value = val
        setFocusIndex()
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
    const hooks = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
        focusIndex.value = undefined
      },
      onFocus(index: number) {
        focused.value = true
        setFocusIndex(undefined, index)
      },
      onInputMounted(vnode: VNode) {
        elt.value = vnode.el as HTMLInputElement
      },
      'onUpdate:checked': (checked: boolean) => {
        stateValue.value = checked
        if (fieldCtx.onUpdate) fieldCtx.onUpdate(stateValue.value)
      }
    }
    const itemText = (value: any) => {
      let res;
      for (const item of items.value) {
        if(item.value === value)
          res = item.text
      }
      return res
    }
    const selectedItemText = () => itemText(stateValue.value)
    const slots = {
      interactiveContent: () => {
        if(props.mode === 'fixed') 
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
              tabindex: fieldCtx.mode === 'fixed' ? -1 : 0,
              ariaLabel:
                fieldCtx.ariaLabel ?? props.label ?? stateValue.value ?? ' ',
              ...hooks
            },
            selectedItemText()
          )
        ]
        return h('div', { class: ['radio-group', gridClass(props.grid)] }, [
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
                ...hooks
              },
              { icon: ctx.slots.icon }
            )
          )
        ])
      }
    }

    const fRender: FieldRender = fieldRender({
      active: true, // always show content
      blank: computed(() => !stateValue.value),
      class: computed(() => {
        return [
          'of-toggle-field',
          'of-radio-field',
          {
            'of--checked': !!stateValue.value
          }
        ]
      }),
      cursor: computed(() => (fieldCtx.editable ? 'pointer' : null)),
      focus,
      focused,
      inputId,
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue,
      fieldContext: fieldCtx,
      keydown: (event: KeyboardEvent) => {
        let consumed = false
        if (['ArrowRight', 'ArrowDown'].includes(event.code)) {
          setFocusIndex(+1)
          consumed = true
        } else if (['ArrowLeft', 'ArrowUp'].includes(event.code)) {
          setFocusIndex(-1)
          consumed = true
        } else if (['Enter', 'Space'].includes(event.code)) {
          clickToggle(items.value[focusIndex.value].value)
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

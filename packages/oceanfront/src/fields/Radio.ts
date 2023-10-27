import { computed, defineComponent, h, ref, VNode, watch } from 'vue'
import { OfFieldBase } from '../components/FieldBase'
import { RadioInner } from '../components/RadioInner'
import {
  BaseFieldProps,
  FieldRender,
  fieldRender,
  newFieldId,
  provideFieldContext,
  provideFieldRender,
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
    const items: any = computed(() => {
      if (typeof props.items === 'string' || Array.isArray(props.items)) {
        return makeItems(props.items)
      }
      return []
    })
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
    const focus = () => {
      const curelt = elt.value
      if (curelt) curelt.focus()
    }
    const clickToggle = (data?: any) => {
      if (fieldCtx.editable) {
        if (fieldCtx.onUpdate) fieldCtx.onUpdate(data)
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
        return h('div', { class: ['radio-group', gridClass(props.grid)] }, [
          items.value.map((item: any) =>
            h(
              RadioInner,
              {
                onSelectItem: (value: String | Number) => {
                  clickToggle(value)
                },
                checked: stateValue.value === item.value,
                label: item.text,
                value: item.value,
                inputId: inputId.value + item.value,
                align: props.align,
                name: props.name,
                mode: fieldCtx.mode,
                size: props.scale,
                ...hooks,
              },
              { icon: ctx.slots.icon }
            )
          ),
        ])
      },
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
    })
    provideFieldRender(fRender)

    const render = () => {
      return h(OfFieldBase, props, { ...slots, ...ctx.slots })
    }
    return render
  },
})

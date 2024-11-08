import { PropType, computed, defineComponent, h, VNode, ref } from 'vue'
import { OfIcon } from './Icon'
import { FieldMode } from '../lib/fields'

export const RadioInner = defineComponent({
  props: {
    checked: [Boolean, Number],
    label: [String, Number],
    inputId: String,
    align: String,
    name: String,
    mode: String as PropType<FieldMode>,
    value: [String, Number],
    scale: [String, Number],
    focused: [Boolean],
    index: [Number]
  },
  emits: ['focus', 'blur', 'inputMounted', 'selectItem'],
  setup(props, ctx) {
    const icon = computed(() => {
      const checked = !!props.checked
      return 'radio' + (checked ? ' checked' : '')
    })
    const hooks = {
      onFocus() {
        ctx.emit('focus', props.index)
      },
      onBlur() {
        ctx.emit('blur')
      },
      onVnodeMounted(vnode: VNode) {
        ctx.emit('inputMounted', vnode)
      }
    }
    return () => {
      const inputLabel = props.label
      const label = inputLabel
        ? h(
            'label',
            {
              class: [
                'of-field-content-text',
                'of--align-' + (props.align || 'start')
              ],
              for: props.inputId,
              onClick: (evt: MouseEvent) => evt.stopPropagation()
            },
            [inputLabel]
          )
        : undefined
      const inner = [
        h(
          'div',
          {
            class: ['of-toggle-input', { 'of--focused': props.focused }]
          },
          [
            h('input', {
              class: 'of-field-input',
              checked: props.checked,
              onClick: () => {
                ctx.emit('selectItem', props.value)
              },
              id: props.inputId,
              // disabled: disabled.value,
              tabindex: props.mode === 'fixed' ? -1 : 0,
              name: props.name,
              type: 'radio',
              value: props.value,
              ...hooks
            }),
            ctx.slots.icon
              ? ctx.slots.icon(props.checked)
              : h(OfIcon, {
                  class: 'of-toggle-icon',
                  name: icon.value,
                  scale: props.scale || 'input'
                })
          ]
        )
      ]
      if (label) inner.push(label)
      return [
        h(
          'div',
          {
            class: 'of-toggle-wrapper'
          },
          inner
        )
      ]
    }
  }
})

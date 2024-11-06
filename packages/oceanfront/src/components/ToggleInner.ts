import { PropType, computed, defineComponent, h, VNode } from 'vue'
import { OfIcon } from './Icon'
import { FieldMode } from '../lib/fields'
export const ToggleInner = defineComponent({
  props: {
    switch: Boolean,
    checked: [Boolean, Number],
    focused: Boolean,
    label: String,
    ariaLabel: String,
    inputId: String,
    align: String,
    name: String,
    mode: String as PropType<FieldMode>,
    scale: [String, Number],
    outside: Boolean
  },
  emits: ['focus', 'blur', 'inputMounted'],
  setup(props, ctx) {
    const icon = computed(() => {
      const checked = !!props.checked
      return 'checkbox' + (checked ? ' checked' : '')
    })
    const hooks = {
      onFocus() {
        ctx.emit('focus')
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
            class: {
              'of-toggle-input': true,
              'of-toggle-input-switch': props.switch,
              'of--focused': props.focused
            }
          },
          [
            h('input', {
              class: ['of-field-input', { 'of--focused': props.focused }],
              checked: props.checked,
              id: props.inputId,
              // disabled: disabled.value,
              tabindex: props.mode === 'fixed' ? -1 : 0,
              name: props.name,
              type: 'checkbox',
              value: '1',
              'aria-label': (props.ariaLabel ?? '') + ' ' + props.label,
              ...hooks
            }),
            props.switch
              ? h(
                  'div',
                  { class: ['of-switch', { outside: !props.outside }] },
                  [
                    h('div', {
                      class: ['of-switch-track', { outside: !props.outside }]
                    }),
                    h('div', {
                      class: ['of-switch-thumb', { outside: !props.outside }]
                    })
                  ]
                )
              : ctx.slots.icon
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

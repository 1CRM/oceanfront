import { computed, defineComponent, h, ref, VNode, watch } from 'vue'
import { OfFieldBase } from '../components/FieldBase'
import { OfIcon } from '../components/Icon'
import {
  BaseFieldProps,
  fieldRender,
  FieldRender,
  makeFieldContext,
  newFieldId,
  provideFieldRender
} from '../lib/fields'

export const OfFileField = defineComponent({
  name: 'OfFileField',
  props: {
    ...BaseFieldProps
  },
  setup(props, ctx) {
    const fieldCtx = makeFieldContext(props, ctx)
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
        immediate: true
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

    const focus = () => {
      elt.value?.focus()
    }
    const clickOpen = (_evt?: MouseEvent) => {
      if (fieldCtx.editable) {
        elt.value?.focus()
        elt.value?.click()
      }
      return false
    }
    const clickClear = (evt?: MouseEvent) => {
      if (!elt.value || !fieldCtx.editable) {
        return
      }
      elt.value.value = ''
      // FIXME shouldn't need to set stateValue here
      if (evt) {
        evt.stopPropagation()
        evt.preventDefault()
      }
      stateValue.value = null
      if (fieldCtx.onUpdate) fieldCtx.onUpdate(null)
    }
    const handleUpdate = (files: FileList | null) => {
      let val = null
      if (files && files.length) {
        val = files[0]
      }
      // FIXME shouldn't need to set stateValue here
      stateValue.value = val
      if (fieldCtx.onUpdate) fieldCtx.onUpdate(val)
    }
    const hooks = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
      },
      onChange(evt: InputEvent) {
        handleUpdate((evt.target as HTMLInputElement).files)
      },
      onClick(evt: MouseEvent) {
        evt.stopPropagation()
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
      },
      onVnodeMounted(vnode: VNode) {
        elt.value = vnode.el as HTMLInputElement
      }
    }
    const dragIn = {
      onDrop(evt: DragEvent) {
        const files = evt.dataTransfer?.files || null
        // FIXME cannot assign multiple files unless input is multiple
        if (files && elt.value) {
          elt.value.files = files
        }
        handleUpdate(files)
      }
    }

    const slots = {
      append() {
        if (
          stateValue.value &&
          (fieldCtx.editable || fieldCtx.mode === 'locked')
        )
          return h(OfIcon, {
            class: 'of-icon-clear-file',
            name: 'cancel circle',
            scale: props.scale || 'input',
            tabindex: '0',
            onClick: clickClear,
            onKeydown(evt: KeyboardEvent) {
              if (evt.key == 'Enter') clickClear()
            }
          })
      },
      interactiveContent: () => {
        let label
        if (stateValue.value) {
          label = h(
            'label',
            {
              class: [
                'of-field-content-text',
                'of--align-' + (props.align || 'start')
              ],
              for: inputId.value,
              onClick: (evt: MouseEvent) => evt.stopPropagation()
            },
            stateValue.value.name
          )
        } else {
          label = h(
            'label',
            {
              class: [
                'of-field-content-text',
                'of--align-' + (props.align || 'start'),
                'of--text-placeholder'
              ],
              for: inputId.value,
              onClick: (evt: MouseEvent) => evt.stopPropagation()
            },
            [props.placeholder || 'Attach a file']
          )
        }
        return h('div', { class: 'of-file-input' }, [
          h('input', {
            class: 'of-field-input',
            id: inputId.value,
            disabled: !fieldCtx.editable,
            name: fieldCtx.name,
            type: 'file',
            ...hooks
          }),
          label
        ])
      },
      prepend() {
        return h(OfIcon, { name: 'attach', size: props.scale || 'input' })
      }
    }

    const fRender: FieldRender = fieldRender({
      blank: computed(() => !stateValue.value),
      cursor: computed(() => (fieldCtx.editable ? 'pointer' : 'default')),
      dragIn,
      focus,
      focused,
      inputId,
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue,
      class: computed(() => ({ 'of-file-field': true })),
      click: clickOpen
    })
    provideFieldRender(fRender)

    const render = () => {
      return h(OfFieldBase, props, { ...slots, ...ctx.slots })
    }
    return render
  }
})

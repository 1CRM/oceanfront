import { useConfig } from '../lib/config'
import {
  computed,
  defineComponent,
  h,
  ref,
  SetupContext,
  VNode,
  watch
} from 'vue'
import { OfFieldBase } from '../components/FieldBase'
import {
  BaseFieldProps,
  fieldRender,
  FieldRender,
  makeFieldContext,
  newFieldId,
  provideFieldRender
} from '../lib/fields'
import OfOptionList from '../components/OptionList.vue'
import { TextFormatter, useFormats } from '../lib/formats'
import { removeEmpty, throttle } from '../lib/util'
import { useItems } from '../lib/items'

// editing a list field does not necessarily mean swapping input to edit mode
// it may/should show a popup instead (this might be implied by 'muted' flag)
const allowInputTypes = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'tel',
  'time',
  'week',
  'url'
])

const _inputTypeFrom = (type?: string) => {
  if (type && allowInputTypes.has(type)) return type
  return 'text'
}

export const OfTextField = defineComponent({
  name: 'OfTextField',
  props: {
    ...BaseFieldProps,
    rows: [Number, String],
    inputType: String
  },
  emits: [
    'focus',
    'input',
    'keydown:enter',
    'keyup:enter',
    'update:modelValue',
    'blur'
  ],
  setup(props, ctx) {
    const fieldCtx = makeFieldContext(props, ctx as SetupContext)
    const config = useConfig()
    const itemMgr = useItems(config)
    const formatMgr = useFormats(config)
    const formatter = computed(() => {
      return formatMgr.getTextFormatter(
        props.type || props.inputType,
        props.formatOptions,
        fieldCtx.name,
        props.record
      )
    })
    const initialValue = computed(() => {
      let initial = fieldCtx.initialValue
      if (initial === undefined) initial = props.defaultValue
      const fmt = formatter.value
      if (fmt) {
        const fval = fmt.format(initial)
        if (fval.error) {
          console.error('Error loading initial value:', fval.error)
        } else initial = fval.value
      }
      if (initial === undefined) initial = null
      return initial
    })

    let lazyInputValue = ''
    const blank = ref()
    const inputValue = ref('')
    const pendingValue = ref()
    const stateValue = ref()
    const invalid = ref(false)
    const updateValue = (val: any, fmt?: TextFormatter) => {
      let updInvalid = false
      if (fmt) {
        const fval = fmt.format(val)
        if (fval.error) {
          // FIXME set messages
          console.error('Error loading field value:', fval.error, val)
          updInvalid = true
        } else {
          lazyInputValue = fval.textValue ?? ''
          val = fval.value
        }
      } else {
        if (val === null || val === undefined) lazyInputValue = ''
        else lazyInputValue = '' + val
        val = lazyInputValue
      }
      if (val === undefined || val === '') val = null
      blank.value = val == null
      inputValue.value = lazyInputValue
      stateValue.value = val
      pendingValue.value = undefined
      invalid.value = updInvalid
    }
    watch(
      () => [fieldCtx.value, formatter.value],
      ([val, fmt], _) => updateValue(val, fmt),
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
    const multiline = computed(
      () => !!(fieldCtx.fieldType === 'textarea' || formatter.value?.multiline)
    )
    const inputType = computed(() => {
      const fmt = formatter.value
      return multiline.value
        ? undefined
        : fmt?.inputType || _inputTypeFrom(props.inputType)
    })

    const itemsOpened = ref(false)

    const hasItems = computed(() => {
      return (
        fieldCtx.editable &&
        !multiline.value &&
        (props.items as any[])?.length > 0
      )
    })

    const items = computed(() => {
      const input = searchText.value?.trim().toLowerCase()
      if (!input) return props.items
      return (props.items as any[]).filter((item) => {
        if (item.value !== undefined) {
          const optionText: string = item.text
          return optionText.toLowerCase().includes(input)
        }
      })
    })

    const formatItems = computed(() => {
      const data = {
        items: [],
        textKey: 'text',
        valueKey: 'value',
        iconKey: 'icon'
      }
      const list = itemMgr.getItemList(items.value)
      if (list) Object.assign(data, list)

      const rows = []
      if (!data.items.length) return []

      for (const item of data.items) {
        if (typeof item === 'string') {
          rows.push({
            text: item,
            value: item
          })
        } else if (typeof item === 'object') {
          rows.push({
            text: item[data.textKey],
            value: item[data.valueKey],
            icon: item[data.iconKey] ?? ''
          })
        }
      }
      return rows
    })

    let closing: number | null = null
    let focusing: number | null = null
    const openItemsPopup = (_evt?: MouseEvent) => {
      if (itemsOpened.value) {
        closeItemsPopup()
      } else if (hasItems.value && !closing) {
        itemsOpened.value = true
        if (focusing) clearTimeout(focusing)
        focusing = window.setTimeout(() => {
          focus()
          focusing = null
        }, 0)
      }
      return false
    }
    const closeItemsPopup = (refocus?: boolean) => {
      if (itemsOpened.value) {
        itemsOpened.value = false
        if (closing) clearTimeout(closing)
        closing = window.setTimeout(() => {
          closing = null
        }, 150)
        if (refocus) focus()
      }
    }
    const setItem = (val: any) => {
      updateValue(val, formatter.value)
      fieldCtx.onUpdate?.(val)
      searchText.value = val
      closeItemsPopup(true)
    }

    const searchText = ref(inputValue.value)
    const search = throttle(300, (input: string) => {
      searchText.value = input.trim()
    })

    const focus = (select?: boolean) => {
      ctx.emit('focus')
      if (elt.value) {
        elt.value.focus()
        if (select) elt.value.select()
        return true
      }
    }
    const hooks = {
      onblur(evt: FocusEvent) {
        const target = evt.target as
          | (HTMLInputElement | HTMLTextAreaElement)
          | null
        if (target) {
          ctx.emit('blur', target.value)
        }
        focused.value = false
        const fmt = formatter.value
        if (fmt?.handleBlur) {
          fmt.handleBlur(evt)
        }
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
      },
      onChange(evt: Event) {
        const target = evt.target as
          | (HTMLInputElement | HTMLTextAreaElement)
          | null
        if (!target) return
        let val = target.value
        const fmt = formatter.value
        if (fmt) {
          try {
            // FIXME change text formatter to catch exception
            val = fmt.unformat(val)
          } catch (e) {
            invalid.value = true
            // FIXME support an onInvalidInput hook maybe?
            pendingValue.value = undefined
            return
          }
        }
        if (val === stateValue.value) {
          // if the value has changed then this will be called automatically
          // when the new value is bound to the component, otherwise call
          // it manually so that the input reflects the formatted result
          updateValue(val, fmt)
          target.value = lazyInputValue
        } else {
          blank.value = val == null || val === ''
          pendingValue.value = undefined
        }
        if (fieldCtx.onUpdate) fieldCtx.onUpdate(val)
      },
      onClick(evt: MouseEvent) {
        // avoid select() when clicking in unfocused field
        evt.stopPropagation()
      },
      onInput(evt: InputEvent) {
        const inputElt = evt.target as HTMLInputElement | HTMLTextAreaElement
        if (hasItems.value) search(inputElt.value)
        const fmt = formatter.value
        if (fmt?.handleInput) {
          const upd = fmt.handleInput(evt)
          if (upd) {
            if (!upd.updated) return
            const iVal = upd.textValue ?? ''
            inputElt.value = iVal
            if (upd.selStart !== undefined) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              inputElt.setSelectionRange(upd.selStart, upd.selEnd!)
            }
            lazyInputValue = iVal
            pendingValue.value = upd.value
          }
        }
        if (fieldCtx.onInput) fieldCtx.onInput(evt.data, inputElt.value)
      },
      onKeyup(_evt: KeyboardEvent) {
        if (_evt.key === 'Enter' && fieldCtx.onKeyup) {
          const target = _evt.target as
            | (HTMLInputElement | HTMLTextAreaElement)
            | null
          if (!target) return
          const val = target.value
          fieldCtx.onKeyup(val)
        }
      },
      onKeydown(evt: KeyboardEvent) {
        if (evt.key === 'Enter') {
          const target = evt.target as
            | (HTMLInputElement | HTMLTextAreaElement)
            | null
          if (target) {
            ctx.emit('keydown:enter', target.value)
          }
        }
        if (
          hasItems.value &&
          (evt.key == 'ArrowUp' || evt.key == 'ArrowDown')
        ) {
          openItemsPopup()
          evt.preventDefault()
          evt.stopPropagation()
        } else if (evt.key == 'Tab' || evt.key === 'Escape') {
          closeItemsPopup()
        } else if (
          !(
            /(^Key([A-Z]$))/.test(evt.code) ||
            !/(^Digit([0-9]$))/.test(evt.code)
          ) ||
          evt.altKey ||
          evt.metaKey ||
          evt.ctrlKey
        ) {
          const fmt = formatter.value
          if (fmt?.handleKeyDown) {
            fmt.handleKeyDown(evt)
          }
        }
      },
      onKeypress(evt: KeyboardEvent) {
        if (
          (/(^Key([A-Z]$))/.test(evt.code) ||
            /(^Digit([0-9]$))/.test(evt.code)) &&
          !evt.altKey &&
          !evt.metaKey &&
          !evt.ctrlKey
        ) {
          if (!itemsOpened.value) openItemsPopup()
        }
      },
      onVueMounted(vnode: VNode) {
        elt.value = vnode.el as HTMLInputElement
      }
    }

    const slots = {
      interactiveContent: () => {
        const fmt = formatter.value
        return h(multiline.value ? 'textarea' : 'input', {
          class: [
            'of-field-input',
            fmt?.inputClass,
            'of--align-' + (props.align || fmt?.align || 'start')
          ],
          ...removeEmpty({
            inputmode: fmt?.inputMode,
            id: inputId.value,
            maxlength: props.maxlength,
            name: fieldCtx.name,
            placeholder: props.placeholder,
            readonly: !fieldCtx.editable || undefined,
            rows: props.rows,
            // size: props.size,  - need to implement at field level?
            type: inputType.value,
            'aria-label': fieldCtx.ariaLabel ?? fieldCtx.label,
            autocomplete: fieldCtx.autocomplete ?? null,
            value: inputValue.value,
            ...hooks
          })
        })
      },
      fixedContent: () => {
        return (
          formatter.value?.formatFixed?.(fieldCtx.value) ?? inputValue.value
        )
      }
    }

    const fRender: FieldRender = fieldRender({
      blank,
      class: computed(() => ({
        'of-text-field': true,
        'of--multiline': multiline
      })),
      click: () => focus(fieldCtx.editable),
      cursor: computed(() => (fieldCtx.editable ? 'text' : 'normal')),
      focus,
      focused,
      inputId,
      inputValue,
      invalid,
      pendingValue,
      popup: {
        content: () =>
          hasItems.value && itemsOpened.value
            ? h(OfOptionList, {
                items: formatItems.value,
                class: 'of--elevated-1',
                onClick: setItem
              })
            : undefined,
        visible: itemsOpened,
        onBlur: closeItemsPopup
      },
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue
    })
    provideFieldRender(fRender)

    const render = () => {
      return h(OfFieldBase, props, { ...slots, ...ctx.slots })
    }
    return render
  }
})

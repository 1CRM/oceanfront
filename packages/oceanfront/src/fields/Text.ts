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

const allowedNumberInputKeys = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Backspace',
  'Enter',
  'Tab',
  'Delete'
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
    inputType: String,
    focusItems: { type: Boolean, default: true },
    filterItems: { type: Boolean, default: true },
    showEmptyList: { type: Boolean, default: false },
    openItemsOnChange: { type: Boolean, default: false },
    capture: { type: Boolean, default: true },
    setItem: Function
  },
  emits: [
    'focus',
    'input',
    'keydown:escape',
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
    watch(
      () => props.items,
      () => {
        if (props.openItemsOnChange) itemsOpened.value = true
      }
    )

    const elt = ref<HTMLInputElement | undefined>()
    const focused = ref(false)
    const focusFirstItem = ref(false)
    const optionListFocused = ref(false)
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
        ((props.items as any[])?.length > 0 || props.showEmptyList)
      )
    })

    const items = computed(() => {
      const input = searchText.value?.trim().toLowerCase()
      if (!input || !props.filterItems) return props.items
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
    let dispatchChange = false

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
          const fmt = formatter.value
          let val = target.value
          if (fmt) {
            val = fmt.unformat(val)
          }
          ctx.emit('blur', val)
        }
        focused.value = false
        const fmt = formatter.value
        if (fmt?.handleBlur) {
          fmt.handleBlur(evt)
        }

        //In Safari, the change event is not triggered when the input with 'handleInput' in the formatter is blurred
        if (
          /Safari/.test(navigator.userAgent) &&
          (props.type === 'phone' || props.type === 'number') &&
          dispatchChange
        ) {
          const inputElt = evt.target as HTMLInputElement | HTMLTextAreaElement
          inputElt.dispatchEvent(new Event('change'))
          dispatchChange = false
        }

        if (!optionListFocused.value && !props.capture) closeItemsPopup(true)
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        if (props.inputType === 'number') {
          if (inputElt.value.length > 1 && inputElt.value[0] === '0') {
            inputElt.value = '0'
          }
        }
        if (hasItems.value) {
          search(inputElt.value)
          inputValue.value = inputElt.value
          if (!itemsOpened.value) openItemsPopup()
        }
        const fmt = formatter.value
        if (fmt?.handleInput) {
          const upd = fmt.handleInput(evt)
          if (upd && upd.updated) {
            dispatchChange = true
            const iVal = upd.textValue ?? ''
            inputElt.value = iVal
            if (upd.selStart !== undefined) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              inputElt.setSelectionRange(upd.selStart, upd.selEnd!)
            }
            inputValue.value = iVal
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
        if (
          !allowedNumberInputKeys.has(evt.key) &&
          props.inputType === 'number' &&
          !(evt.key === '0' || parseInt(evt.key as string))
        ) {
          evt.preventDefault()
          return
        }
        if (evt.key === 'Enter') {
          const target = evt.target as
            | (HTMLInputElement | HTMLTextAreaElement)
            | null
          if (target) {
            const fmt = formatter.value
            let val = target.value
            if (fmt) {
              val = fmt.unformat(val)
            }
            ctx.emit('keydown:enter', val)
          }
        }
        if (
          hasItems.value &&
          (evt.key == 'ArrowUp' || evt.key == 'ArrowDown')
        ) {
          openItemsPopup()
          evt.preventDefault()
          evt.stopPropagation()
        } else if (evt.key === 'Escape') {
          closeItemsPopup()
          ctx.emit('keydown:escape')
        } else if (evt.key === 'Tab') {
          if (itemsOpened.value) {
            focusFirstItem.value = true
            evt.preventDefault()
            evt.stopPropagation()
          }
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
      onVnodeMounted(vnode: VNode) {
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
            autocapitalize: fieldCtx.autocapitalize ?? null,
            autocorrect: fieldCtx.autocorrect ?? null,
            spellcheck: fieldCtx.spellcheck ?? null,
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
                focusOnMount: false,
                focus: focusFirstItem.value,
                class: [
                  'of--elevated-1',
                  'of-text-items',
                  { 'text-items-loading': props.loading }
                ],
                onFocused: () => {
                  focusFirstItem.value = false
                  optionListFocused.value = true
                },
                onBlur: () => {
                  focusFirstItem.value = false
                  optionListFocused.value = false
                  if (!props.capture) closeItemsPopup(true)
                },
                onClick: (val) =>
                  props.setItem ? props.setItem(val) : setItem(val)
              })
            : undefined,
        visible: itemsOpened,
        onBlur: closeItemsPopup,
        focus: props.focusItems,
        capture: props.capture
      },
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue
    })
    provideFieldRender(fRender)

    return () => {
      return h(OfFieldBase, props, { ...slots, ...ctx.slots })
    }
  }
})

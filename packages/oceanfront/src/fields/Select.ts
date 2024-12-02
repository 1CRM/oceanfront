import { computed, defineComponent, h, ref, SetupContext, watch } from 'vue'
import OfBadge from '../components/Badge.vue'
import { OfFieldBase } from '../components/FieldBase'
import { OfIcon } from '../components/Icon'
import { useConfig } from '../lib/config'
import { OfSelectPopup } from './SelectPopup'

import {
  BaseFieldProps,
  fieldRender,
  makeFieldContext,
  newFieldId,
  provideFieldRender
} from '../lib/fields'
import { transformItemsList, useItems } from '../lib/items'
import { useLanguage } from '../lib/language'

type ActiveItem = { text?: string; [key: string]: any }

export const OfSelectField = defineComponent({
  name: 'OfSelectField',
  props: {
    ...BaseFieldProps,
    multi: Boolean,
    addRemove: Boolean,
    closeAfterSelect: {
      type: Boolean,
      default: true
    },
    inDataTable: {
      type: Boolean,
      default: false
    }
  },
  emits: ['focus', 'blur', 'update:modelValue'],
  setup(props, ctx) {
    const lang = useLanguage()
    const config = useConfig()
    const itemMgr = useItems(config)
    const fieldCtx = makeFieldContext(props, ctx as SetupContext)
    let selectTimerId: number | undefined
    const initialValue = computed(() => {
      let initial = fieldCtx.initialValue
      if (initial === undefined) initial = props.defaultValue
      return initial ?? null
    })

    const searchText = ref()
    const inputValue = ref()
    const pendingValue = ref() // store selected but unconfirmed value
    const stateValue = ref()

    watch(
      () => props.mode,
      (val) => {
        if (val === 'editable') focus()
      }
    )
    watch(
      () => fieldCtx.value,
      (val) => {
        if (val === undefined || val === '') val = null
        inputValue.value = val
        stateValue.value = val
        pendingValue.value = undefined
      },
      {
        immediate: true
      }
    )

    const elt = ref<HTMLElement | undefined>()
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
    const opened = ref(false)
    const items = computed(() =>
      transformItemsList(itemMgr, props.items, props.name, props.record)
    )

    const itemForValue = (value: any) => {
      const resolved = items.value
      let cmpVal
      let found: { idx?: number; item?: ActiveItem } = {}
      let idx = 0
      for (const item of resolved.items) {
        if (typeof item === 'string') {
          cmpVal = item
        } else if (typeof item === 'object') {
          if (resolved.specialKey && item[resolved.specialKey]) {
            idx++
            continue
          }
          cmpVal = resolved.valueKey && (item as any)[resolved.valueKey]
        }
        if (cmpVal === '') cmpVal = null
        if (cmpVal === value) {
          if (typeof item === 'string') {
            found = { idx, item: { value: item, text: item } }
          } else {
            found = { idx, item }
          }
          break
        }
        idx++
      }
      return found
    }

    let closing: number | null = null
    const clickOpen = (_evt?: MouseEvent) => {
      if (opened.value) {
        closePopup()
      } else if (fieldCtx.editable && !closing) {
        opened.value = true
      }
      return false
    }
    const closePopup = (refocus?: boolean) => {
      ctx.emit('blur')
      if (opened.value) {
        opened.value = false
        if (closing) clearTimeout(closing)
        closing = window.setTimeout(() => {
          closing = null
        }, 150)
        if (refocus && !props.inDataTable) focus()
      }
    }
    const focus = () => {
      const curelt = elt.value
      if (curelt) curelt.focus()
    }

    const toggleValue = (val: any): any => {
      if (!props.multi) return val
      if (!Array.isArray(inputValue.value)) {
        return [val]
      }
      let found = false
      const filtered = inputValue.value.filter((item) => {
        if (item === val) {
          found = true
          return false
        }
        return true
      })
      if (!found) {
        filtered.push(val)
      }
      return filtered
    }
    const setValue = (
      val: any,
      _item?: any,
      ev?: MouseEvent | KeyboardEvent
    ) => {
      ev?.stopPropagation()
      ev?.preventDefault()
      const newValue = toggleValue(val)
      inputValue.value = newValue
      fieldCtx.onUpdate?.(newValue)
      if (!(props.multi || !props.closeAfterSelect || ev?.shiftKey)) {
        closePopup(true)
      }
    }

    const itemText = (value: any) => {
      const item = itemForValue(value)
      const result = item.item?.selectedText || item.item?.text || ''

      if (item.item?.class) {
        return h('span', { class: item.item.class }, result)
      }
      return result
    }

    const selectedItemText = () => itemText(inputValue.value)

    const renderBadges = () => {
      const values = Array.isArray(inputValue.value) ? inputValue.value : []
      return values.map((val) =>
        h(
          OfBadge,
          { status: 'primary', style: 'margin-bottom:0', density: 3 },
          () => [
            itemText(val),
            fieldCtx.editable
              ? h(OfIcon, {
                  class: 'remove-item',
                  name: 'cancel',
                  size: '14px',
                  tabindex: 0,
                  ariaLabel: lang.value.remove + ' ' + itemText(val),
                  onClick: (e: Event) => {
                    e.stopPropagation()
                    setValue(val)
                  },
                  onKeydown(e: KeyboardEvent) {
                    if (e.code === 'Enter') {
                      e.stopPropagation()
                      setValue(val)
                      focus()
                    }
                  }
                })
              : undefined
          ]
        )
      )
    }

    const hooks = {
      onBlur() {
        focused.value = false
      },
      onFocus(_evt: FocusEvent) {
        ctx.emit('focus')
        focused.value = true
        searchText.value = ''
      },
      onKeydown(evt: KeyboardEvent) {
        if (evt.key == ' ' || evt.key == 'ArrowUp' || evt.key == 'ArrowDown') {
          clickOpen()
          evt.preventDefault()
          evt.stopPropagation()
        }
      }
    }

    const slots = {
      append: () => {
        if (fieldCtx.editable || fieldCtx.mode === 'locked')
          return h(OfIcon, {
            class: 'of-select-icon',
            name: opened.value ? 'select up' : 'select down',
            size: 'input'
          })
      },
      interactiveContent: () => {
        const labels = props.multi ? renderBadges() : selectedItemText()

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
              tabindex: fieldCtx.mode === 'fixed' ? -1 : undefined,
              ariaLabel: fieldCtx.ariaLabel ?? props.label,
              ...hooks
            },
            labels
          )
        ]
      }
    }
    const selectMouseEvents = {
      onMouseenter: () => {
        clearTimeout(selectTimerId)
      },
      onMouseleave: () => {
        if (!opened.value) return false
        selectTimerId = window.setTimeout(() => {
          closePopup()
        }, 500)
      }
    }
    const fRender = fieldRender({
      blank: computed(() => {
        if (props.multi)
          return !Array.isArray(inputValue.value) || !inputValue.value.length
        const activeItem = itemForValue(inputValue.value)
        if (!activeItem.item) return true
        const val = inputValue.value
        return val === undefined || val === null || val === ''
      }),
      class: 'of-select-field',
      click: clickOpen,
      ...selectMouseEvents,
      cursor: computed(() => (fieldCtx.editable ? 'pointer' : null)),
      focus,
      focused,
      inputId,
      inputValue,
      pendingValue,
      popup: {
        content: () =>
          opened.value
            ? h(OfSelectPopup, {
                items: items.value,
                multi: props.multi,
                addRemove: props.addRemove,
                closeAfterSelect: props.closeAfterSelect,
                closePopup,
                value: inputValue.value,
                onUpdateValue: (val: any) => {
                  fieldCtx.onUpdate?.(val)
                },
                'onKeydown:escape': () => closePopup(),
                class: 'of--elevated-1',
                ...selectMouseEvents
              })
            : undefined,
        visible: opened,
        capture: false
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

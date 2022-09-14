/* eslint-disable vue/one-component-per-file */
import {
  computed,
  defineComponent,
  h,
  Ref,
  ref,
  SetupContext,
  watch,
} from 'vue'
import OfDateTimePopup from '../components/DateTimePopup.vue'
import { OfFieldBase } from '../components/FieldBase'
import { OfIcon } from '../components/Icon'
import {
  DateFormatter,
  DateTimeFormatter,
  TimeFormatter,
} from '../formats/DateTime'
import {
  BaseFieldProps,
  fieldRender,
  makeFieldContext,
  newFieldId,
  provideFieldRender,
} from '../lib/fields'
import { useFormats } from '../lib/formats'

type InputType = 'date' | 'datetime' | 'time'

type RenderOpts = {
  close: (date?: Date) => any
  selectedDate: Ref<Date>
  monthStart: Ref<Date>
  withTime: boolean
  withDate: boolean
}

export const renderDateTimePopup = (opts: RenderOpts): any => {
  return h(OfDateTimePopup, {
    date: opts.selectedDate.value,
    monthStart: opts.monthStart.value,
    withTime: opts.withTime,
    withDate: opts.withDate,
    accept: opts.close,
  })
}

const defineField = (type: InputType, name: string, cls: string) =>
  defineComponent({
    name,
    class: cls,
    props: BaseFieldProps,
    setup(props, ctx: SetupContext) {
      const fieldCtx = makeFieldContext(props, ctx)
      const withTime = type == 'datetime' || type == 'time'
      const withDate = type == 'datetime' || type == 'date'
      const withClear = !fieldCtx.required
      const formatMgr = useFormats()
      const elt = ref<HTMLElement | undefined>()
      const focused = ref(false)
      const formatter = computed(() => {
        switch (type) {
          case 'date':
            return formatMgr.getTextFormatter('date', {
              dateFormat: 'short',
            }) as DateFormatter
          case 'time':
            return formatMgr.getTextFormatter('time', {
              dateFormat: 'short',
            }) as TimeFormatter
          default:
            return formatMgr.getTextFormatter('datetime', {
              dateFormat: 'short',
            }) as DateTimeFormatter
        }
      })

      const parseDate = (value: any) => {
        const df = formatter.value
        try {
          const loadedValue = df.loadValue(value)
          if (loadedValue instanceof Date) value = loadedValue
        } catch (e) {}
        return value
      }

      const initialValue = computed(() => {
        let initial = fieldCtx.initialValue
        if (initial === undefined) initial = props.defaultValue
        initial = parseDate(initial)
        return initial ?? null
      })

      const stateValue = ref()
      const opened = ref(false)
      let defaultFieldId: string
      const inputId = computed(() => {
        let id = fieldCtx.id
        if (!id) {
          if (!defaultFieldId) defaultFieldId = newFieldId()
          id = defaultFieldId
        }
        return id
      })

      const currentDate: Ref<Date> = ref(new Date())
      const editableDate: Ref<Date> = ref(new Date())
      const monthStart: Ref<Date> = ref(new Date())

      const focus = () => {
        elt.value?.focus()
      }

      const closePopup = (refocus?: boolean) => {
        opened.value = false
        if (refocus) focus()
      }

      const onCancel = (e: MouseEvent | TouchEvent | KeyboardEvent) => {
        let cancel = false
        if (e.type == 'keydown') {
          const keyboardEvent = e as KeyboardEvent
          if (keyboardEvent.key == ' ' || keyboardEvent.key == 'Enter')
            cancel = true
        } else {
          cancel = true
        }

        if (cancel) {
          e.stopPropagation()
          e.preventDefault()
          fieldCtx.onUpdate?.('')
          focus()
        }
      }

      watch(
        () => fieldCtx.value,
        (val) => {
          if (val === undefined || val === '') val = null
          const loaded = parseDate(val)
          if (loaded instanceof Date) {
            currentDate.value = loaded
            monthStart.value = loaded
            stateValue.value = val
          } else {
            currentDate.value = new Date()
            monthStart.value = new Date()
            stateValue.value = ''
          }
        },
        {
          immediate: true,
        }
      )

      const clickOpen = (_evt?: MouseEvent) => {
        editableDate.value = new Date(currentDate.value.valueOf())
        monthStart.value = new Date(currentDate.value.valueOf())
        opened.value = true
        return false
      }

      const acceptResult = (date?: Date) => {
        if (date && fieldCtx.onUpdate)
          fieldCtx.onUpdate(formatter.value.formatPortable(date))
        opened.value = false
      }

      const renderPopup = () => {
        return renderDateTimePopup({
          close: acceptResult,
          selectedDate: editableDate,
          monthStart,
          withTime,
          withDate,
        })
      }

      const hooks = {
        onBlur(_evt: FocusEvent) {
          focused.value = false
        },
        onFocus(_evt: FocusEvent) {
          focused.value = true
        },
        onKeydown(evt: KeyboardEvent) {
          if (
            evt.key == ' ' ||
            evt.key == 'ArrowUp' ||
            evt.key == 'ArrowDown'
          ) {
            clickOpen()
            evt.preventDefault()
            evt.stopPropagation()
          }
        },
      }
      const slots = {
        interactiveContent: () => {
          const value = stateValue.value
            ? formatter.value?.format(stateValue.value)?.textValue
            : ''
          return [
            h(
              'div',
              {
                class: [
                  'of-field-content-text',
                  'of--align-' + (props.align || 'start'),
                ],
                id: inputId.value,
                tabindex: fieldCtx.mode === 'fixed' ? -1 : 0,
                ref: elt,
                ...hooks,
              },
              value
            ),
          ]
        },
        append() {
          if (fieldCtx.interactive)
            return [
              withDate
                ? h(OfIcon, {
                    name: 'date',
                    size: 'input',
                  })
                : null,
              withTime && !withDate
                ? h(OfIcon, {
                    name: 'time',
                    size: 'input',
                  })
                : null,
              withClear &&
              !(!fieldCtx.editable || fieldCtx.mode === 'locked') &&
              stateValue.value
                ? h(OfIcon, {
                    name: 'cancel circle',
                    size: 'input',
                    tabindex: '0',
                    class: 'of-icon-clear-calendar',
                    onClick: onCancel,
                    onKeydown: onCancel,
                  })
                : null,
            ]
        },
      }

      const fRender = fieldRender({
        focused,
        updated: computed(() => {
          return initialValue.value !== stateValue.value
        }),
        cursor: computed(() => (fieldCtx.editable ? 'pointer' : 'default')),
        click: computed(() => (fieldCtx.editable ? clickOpen : null)),
        inputId,
        popup: {
          content: () => (opened.value ? renderPopup() : null),
          visible: opened,
          onBlur: closePopup,
        },
        value: stateValue,
      })
      provideFieldRender(fRender)

      const render = () => {
        return h(OfFieldBase, props, { ...slots, ...ctx.slots })
      }
      return render
    },
  })

export const OfDatetimeField = defineField(
  'datetime',
  'OfDatetimeField',
  'of-datetime-field'
)
export const OfDateField = defineField('date', 'OfDateField', 'of-date-field')
export const OfTimeField = defineField('time', 'OfTimeField', 'of-time-field')

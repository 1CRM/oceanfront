import {
  computed,
  defineComponent,
  h,
  ref,
  resolveComponent,
  VNode,
  watch
} from 'vue'
import { OfFieldBase } from '../components/FieldBase'
import ColorHue from '../components/ColorHue'
import ColorSaturation from '../components/ColorSaturation'
import {
  hexToRgb,
  hslToRgb,
  hsvToHsl,
  hsvToRgb,
  loadColor,
  rgbToHex,
  rgbToHsv
} from '../lib/color'
import {
  BaseFieldProps,
  fieldRender,
  FieldRender,
  makeFieldContext,
  newFieldId,
  provideFieldRender
} from '../lib/fields'

export const OfColorField = defineComponent({
  name: 'OfColorField',
  class: 'of-color-field',
  props: BaseFieldProps,
  setup(props, ctx) {
    const fieldCtx = makeFieldContext(props, ctx)
    const opened = ref(false)
    const focused = ref(false)
    const saturationFocused = ref(false)
    const elt = ref<HTMLElement | undefined>()
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
    const closePopup = (refocus?: boolean) => {
      opened.value = false
      if (refocus) focus()
    }
    const clickOpen = () => {
      if (fieldCtx.editable) opened.value = true
    }
    const togglePopup = () => {
      opened.value = !opened.value
    }
    const initialValue = computed(() => {
      let initial = fieldCtx.initialValue
      if (initial === undefined) initial = props.defaultValue
      return initial ?? null
    })

    const types = ['hex', 'hsl', 'rgb']
    const colorMode = computed(() => {
      let mode = props.context
      if (!mode || !types.includes(mode)) mode = 'hex'

      return mode
    })

    const popupMode = ref(colorMode.value)
    const stateValue = ref()

    const compColor: any = computed(() => {
      const hsv = stateValue.value || { h: 0, s: 0, v: 0 }
      const rgb = hsvToRgb(hsv)
      const hsl = hsvToHsl(hsv)
      return {
        hsv,
        rgb: 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')',
        hsl:
          'hsl(' +
          hsl.h +
          ', ' +
          Math.round(hsl.s * 100) +
          '%, ' +
          Math.round(hsl.l * 100) +
          '%)',
        hex: rgbToHex(rgb)
      }
    })

    const hsv = computed(() => stateValue.value || { h: 0, s: 0, v: 0 })
    const rgb = computed(() => hsvToRgb(hsv.value))
    const hsl = computed(() => hsvToHsl(hsv.value))
    const hex = computed(() => rgbToHex(hsvToRgb(hsv.value)))

    watch(
      () => fieldCtx.value,
      (val) => {
        try {
          const rgb = val ? loadColor(val) : null
          if (rgb) {
            if (!stateValue.value || compColor.value.hex != rgbToHex(rgb)) {
              // conditional to avoid clobbering the hue value
              stateValue.value = rgbToHsv(rgb as any)
            }
          }
        } catch (e) {
          // ignore invalid color
        }
      },
      {
        immediate: true
      }
    )

    watch(
      () => props.context,
      (val) => {
        if (val) {
          popupMode.value = val
        }
      },
      {
        immediate: true
      }
    )

    const setHsv = (color: { h: number; s: number; v: number; a?: number }) => {
      stateValue.value = color
      onChange(compColor.value.hex)
    }
    const onChange = (data: string): void => {
      if (stateValue.value && fieldCtx.onUpdate) fieldCtx.onUpdate(data)
    }

    const onSaturationBlur = () => {
      saturationFocused.value = false
    }

    const onSaturationFocus = () => {
      saturationFocused.value = true
    }

    const nextMode = (currentMode: string) => {
      types.forEach((type, index: number) => {
        if (type == currentMode) {
          popupMode.value = types[index + 1] ? types[index + 1] : 'hex'
        }
      })
    }

    const renderPopup = () => {
      const color = compColor.value
      const hsv = color.hsv
      const colorsInput = () => {
        const prepareChildren = (labels: any) => {
          const color: any = { ...rgb.value, ...hsl.value }
          const children: VNode[] = []

          labels.forEach((label: string) => {
            const modelValue =
              parseFloat(color[label]) < 1
                ? Math.round(color[label] * 100)
                : color[label]

            const child = h(resolveComponent('OfField'), {
              label: label,
              type: 'number',
              maxlength: 3,
              modelValue: modelValue,
              'onUpdate:modelValue': (val: any) => {
                choseColor(val, label)
              }
            })

            const arrows = h(
              'div',
              {
                class: 'color-picker-icon'
              },
              prepareArrows(label)
            )

            children.push(child)
            children.push(arrows)
          })

          return children
        }

        const prepareArrows = (label: any) => {
          const upIcon = h(resolveComponent('OfIcon'), {
            name: 'select up',
            onClick: () => {
              choseColor(null, label)
            }
          })

          const downIcon = h(resolveComponent('OfIcon'), {
            name: 'select down',
            onClick: () => {
              choseColor(null, label, 'down')
            }
          })

          return [upIcon, downIcon]
        }

        const hexInput = h(resolveComponent('OfField'), {
          label: 'hex',
          class: 'color-picker-input',
          type: 'text',
          maxlength: 7,
          modelValue: hex.value,
          'onUpdate:modelValue': choseColor
        })

        const hslLabels: string[] = ['h', 's', 'l']
        const rgbLabels: string[] = ['r', 'g', 'b']

        const hslInputs = h(
          'div',
          { class: 'color-picker-input' },
          prepareChildren(hslLabels)
        )
        const rgbInputs = h(
          'div',
          { class: 'color-picker-input' },
          prepareChildren(rgbLabels)
        )

        const choseColorInputs: any = {
          hex: hexInput,
          hsl: hslInputs,
          rgb: rgbInputs
        }

        return [choseColorInputs[popupMode.value]]
      }

      const switcher = h(resolveComponent('OfIcon'), {
        name: 'page next',
        class: 'switcher',
        onClick: () => {
          nextMode(popupMode.value)
        }
      })

      return h(
        'div',
        {
          class: 'of-menu of-colorpicker-popup of--elevated-1'
        },
        h('div', { class: 'color-picker' }, [
          h(ColorSaturation, {
            tabindex: saturationFocused.value ? '-1' : '0',
            saturation: hsv.s,
            hue: hsv.h,
            value: hsv.v,
            focus: saturationFocused.value,
            onChange: (s: number, v: number) => setHsv({ ...hsv, s, v }),
            onBlur: onSaturationBlur,
            onFocus: onSaturationFocus,
            onSelect: closePopup
          }),
          h(ColorHue, {
            tabindex: !saturationFocused.value ? '-1' : '0',
            hue: hsv.h,
            onChange: (h: number) => setHsv({ ...hsv, h }),
            onBlur: focus,
            onSelect: closePopup
          }),
          switcher,
          colorsInput()
        ])
      )
    }
    const hooks = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
      },
      onKeydown(evt: KeyboardEvent) {
        let consumed = false
        if ([' ', 'ArrowUp', 'ArrowDown'].includes(evt.key)) {
          consumed = true
          togglePopup()
        } else if (evt.key == 'Tab' && opened.value) {
          consumed = true
          saturationFocused.value = true
        }
        if (consumed) {
          evt.preventDefault()
          evt.stopPropagation()
        }
      }
    }
    const choseColor = (val: any, label: any, directional = 'up') => {
      const hslNew: any = { ...hsl.value }
      let rgbNew: any = { ...rgb.value }

      switch (popupMode.value) {
        case 'hex':
          rgbNew = hexToRgb(val)
          break
        case 'hsl':
          let increment: number
          label == 'h' ? (increment = 1) : (increment = 0.01)

          if (val) {
            hslNew[label] = val * increment
          } else {
            if (directional == 'up') {
              hslNew[label] = hslNew[label] + increment
            } else {
              hslNew[label] = hslNew[label] - increment
            }
          }
          rgbNew = hslToRgb(hslNew)
          break
        default:
          val
            ? (rgbNew[label] = val)
            : directional == 'up'
              ? rgbNew[label]++
              : rgbNew[label]--
          break
      }

      setHsv(rgbToHsv(rgbNew))
    }
    const slots = {
      interactiveContent: () =>
        h(
          'div',
          {
            class: [
              'of-field-content-text',
              'of--align-' + (props.align || 'start')
            ],
            id: inputId.value,
            tabindex: 0,
            ref: elt,
            ...hooks
          },
          [compColor.value.hex]
        ),
      prepend: () =>
        h(
          'div',
          {
            class: 'of-color-swatch',
            style: {
              backgroundColor: compColor.value.hex
            }
          },
          h('div', { class: 'of-color-swatch-border' })
        )
    }

    const fRender: FieldRender = fieldRender({
      class: 'of-color-field',
      focused,
      click: clickOpen,
      cursor: computed(() => (fieldCtx.editable ? 'pointer' : 'default')),
      inputId,
      popup: {
        content: () => (opened.value ? renderPopup() : undefined),
        visible: opened,
        onBlur: closePopup
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

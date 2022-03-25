import { computed, h, ref, resolveComponent, watch } from 'vue'
import Saturation from '../components/Saturation'
import Hue from '../components/Hue'
import {
  hsvToHsl,
  hsvToRgb,
  loadColor,
  rgbToHsv,
  rgbToHex,
  hexToRgb,
  hslToRgb,
} from '../lib/color'
import {
  FieldContext,
  FieldProps,
  defineFieldType,
  fieldRender,
  newFieldId,
} from '../lib/fields'
import { VNode } from '@vue/runtime-dom'
import { OfField } from '../components/Field'

export const ColorField = defineFieldType({
  name: 'color',
  class: 'of-color-field',

  init(props: FieldProps, ctx: FieldContext) {
    const opened = ref(false)
    const focused = ref(false)
    const elt = ref<HTMLElement | undefined>()
    let defaultFieldId: string
    const inputId = computed(() => {
      let id = ctx.id
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
      if (ctx.editable) opened.value = true
    }
    const initialValue = computed(() => {
      let initial = ctx.initialValue
      if (initial === undefined) initial = props.defaultValue

      return initial ?? null
    })

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
        hex: rgbToHex(rgb),
      }
    })

    const hsv = computed(() => stateValue.value || { h: 0, s: 0, v: 0 })
    const rgb = computed(() => hsvToRgb(hsv.value))
    const hsl = computed(() => hsvToHsl(hsv.value))
    const hex = computed(() => rgbToHex(hsvToRgb(hsv.value)))

    watch(
      () => ctx.value,
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
        immediate: true,
      }
    )
    const setHsv = (color: { h: number; s: number; v: number; a?: number }) => {
      stateValue.value = color
      /**
       TODO fix popup closing:
       onChange(compColor.value.hex)
       *
       */
    }
    const onChange = (data: string): void => {
      if (stateValue.value && ctx.onUpdate) ctx.onUpdate(data)
    }
    const renderPopup = () => {
      const color: any = compColor.value
      const hsv = color.hsv

      const colorsInput = () => {
        const prepareChildren = (labels: any) => {
          const color: any = { ...rgb.value, ...hsl.value }

          let children: VNode[] = []
          labels.forEach((label: string) => {
            let modelValue =
              parseFloat(color[label]) < 1
                ? Math.round(color[label] * 100)
                : color[label]
            let child = h(resolveComponent('OfField'), {
              label: label,
              type: 'number',
              maxlength: 3,
              modelValue: modelValue,
              'onUpdate:modelValue': (val: any) => {
                chosenColor(val, label)
              },
            })
            children.push(child)
          })

          return children
        }

        const hexInput = h(resolveComponent('OfField'), {
          type: 'text',
          maxlength: 7,
          modelValue: hex.value,
          'onUpdate:modelValue': chosenColor,
        })

        let hslLabels: string[] = ['h', 's', 'l']
        let rgbLabels: string[] = ['r', 'g', 'b']

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

        const chosenColorInputs: any = {
          hex: hexInput,
          hsl: hslInputs,
          rgb: rgbInputs,
        }

        return [chosenColorInputs[props.inputType]]
      }

      return h(
        'div',
        {
          class: 'of-menu of-colorpicker-popup of--elevated-1',
          tabindex: '0',
        },
        h('div', { class: 'color-picker' }, [
          h(Saturation, {
            saturation: hsv.s,
            hue: hsv.h,
            value: hsv.v,
            onChange: (s: number, v: number) => setHsv({ ...hsv, s, v }),
          }),
          h(Hue, {
            hue: hsv.h,
            onChange: (h: number) => setHsv({ ...hsv, h }),
          }),
          colorsInput(),
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
        if (evt.key == ' ' || evt.key == 'ArrowUp' || evt.key == 'ArrowDown') {
          clickOpen()
          evt.preventDefault()
          evt.stopPropagation()
        }
      },
    }

    const chosenColor = (val: any, label: any) => {
      let hslNew: any = { ...hsl.value }
      let rgbNew: any = { ...rgb.value }

      switch (props.inputType) {
        case 'hex':
          rgbNew = hexToRgb(val)
          break
        case 'hsl':
          hslNew[label] = val
          rgbNew = hslToRgb(hslNew)
          break
        default:
          rgbNew[label] = val
          break
      }

      setHsv(rgbToHsv(rgbNew))
    }

    return fieldRender({
      class: 'of-color-field',
      content: () =>
        h(
          'div',
          {
            class: [
              'of-field-content-text',
              'of--align-' + (props.align || 'start'),
            ],
            id: inputId.value,
            tabindex: 0,
            ref: elt,
            ...hooks,
          },
          [compColor.value[props.inputType]]
        ),
      focused,
      click: clickOpen,
      cursor: computed(() => (ctx.editable ? 'pointer' : 'default')),
      inputId,
      popup: {
        content: () => (opened.value ? renderPopup() : undefined),
        visible: opened,
        onBlur: closePopup,
      },
      prepend: () =>
        h(
          'div',
          {
            class: 'of-color-swatch',
            style: {
              backgroundColor: compColor.value.hex,
            },
          },
          h('div', { class: 'of-color-swatch-border' })
        ),
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue,
    })
  },
})

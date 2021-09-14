import { computed, h, ref, watch } from 'vue'
import Saturation from '../components/Saturation'
import Hue from '../components/Hue'
import {
  defineFieldType,
  FieldContext,
  FieldProps,
  newFieldId,
  fieldRender,
} from '../lib/fields'

import { hsvToRgb } from '../lib/colorpicker'

export const ColorField = defineFieldType({
  name: 'color',
  class: 'of-color-field',

  setup(props: FieldProps, ctx: FieldContext) {
    const stateValue = ref()
    const hsl = ref()
    const rgb = ref()
    const label = ref()
    const opened = ref(false)
    const editable = computed(() => ctx.mode === 'edit' && !ctx.locked)
    let defaultFieldId: string
    const inputId = computed(() => {
      let id = ctx.id
      if (!id) {
        if (!defaultFieldId) defaultFieldId = newFieldId()
        id = defaultFieldId
      }
      return id
    })
    const closePopup = () => {
      opened.value = false
    }
    const clickOpen = () => {
      opened.value = true
    }
    const hexp = (val: number): string => {
      const v = val.toString(16)
      return v.length == 1 ? '0' + v : v
    }
    watch(
      () => stateValue.value,
      (val) => {
        hsl.value = {
          h: val.h,
          s: Math.round(val.s * 100),
          l: Math.round(val.v * 100),
        }
        rgb.value = hsvToRgb(val.h, val.s, val.v)
        label.value =
          '#' + hexp(rgb.value.r) + hexp(rgb.value.g) + hexp(rgb.value.b)
      },
      { deep: true }
    )
    const initialValue = computed(() => {
      let initial = ctx.initialValue
      if (initial === undefined) initial = props.defaultValue
      return initial ?? null
    })
    stateValue.value = ctx.value
    const onSaturationChange = (saturation: number, bright: number) => {
      stateValue.value = {
        h: stateValue.value.h,
        s: saturation,
        v: bright,
      }
      onChange(stateValue)
    }
    const onHueChange = (hue: number) => {
      stateValue.value = {
        h: hue,
        s: stateValue.value.s,
        v: stateValue.value.v,
      }
      onChange(stateValue)
    }
    const onChange = (data: any): void => {
      if (stateValue.value && ctx.onUpdate) ctx.onUpdate(data.value)
    }
    const renderPopup = () => {
      return h(
        'div',
        { class: 'of-menu of-colorpicker-popup' },
        h('div', { class: 'color-picker' }, [
          h(Saturation, {
            saturation: stateValue.value.s,
            hue: stateValue.value.h,
            value: stateValue.value.v,
            onChange: onSaturationChange,
          }),
          h(Hue, {
            hue: stateValue.value.h,
            onChange: onHueChange,
          }),
          h(
            'div',
            {},
            'hsl(' +
              hsl.value.h +
              ', ' +
              hsl.value.s +
              '%, ' +
              hsl.value.l +
              '%)'
          ),
          h(
            'div',
            {},
            'rgb(' + rgb.value.r + ', ' + rgb.value.g + ', ' + rgb.value.b + ')'
          ),
        ])
      )
    }

    return fieldRender({
      class: 'of-color-field',
      content: () =>
        h(
          'div',
          {
            class: [
              'of-field-input-label',
              'of--align-' + (props.align || 'start'),
            ],
            id: inputId.value,
            tabindex: 0,
          },
          [
            label.value,
            h('div', {
              class: 'of-color-swatch',
              style: {
                backgroundColor:
                  'hsl(' +
                  hsl.value.h +
                  ', ' +
                  hsl.value.s +
                  '%, ' +
                  hsl.value.l +
                  '%)',
              },
            })
          
          ]
        ),
      click: clickOpen,
      cursor: editable.value ? 'pointer' : 'default',
      inputId,
      popup: {
        content: () => (opened.value ? renderPopup() : undefined),
        visible: opened,
        onBlur: closePopup,
      },
 
      value: stateValue,
      updated: computed(() => initialValue.value !== stateValue.value),
    })
  },
})

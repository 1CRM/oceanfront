import {
  computed,
  defineComponent,
  h,
  nextTick,
  ref,
  shallowRef,
  triggerRef,
  watch,
  watchEffect
} from 'vue'
import { OfFieldBase } from '../components/FieldBase'
import {
  BaseFieldProps,
  fieldRender,
  newFieldId,
  provideFieldContext,
  provideFieldRender
} from '../lib/fields'
import { watchPosition } from '../lib/util'

function intoInt(val?: string | number): number | undefined {
  if (typeof val === 'number') {
    return Math.round(val)
  }
  if (val != null) return parseInt(val, 10)
}

export const OfSliderField = defineComponent({
  name: 'OfSliderField',
  props: {
    ...BaseFieldProps,
    min: [String, Number],
    max: [String, Number],
    step: [String, Number]
  },
  setup(props, ctx) {
    const pendingValue = ref<number>(0)
    const stateValue = ref()
    const thumbClass = ref('of-slider-thumb')

    const fieldCtx = provideFieldContext(props, ctx)
    const initialValue = computed(() => {
      let initial = fieldCtx.initialValue
      if (initial === undefined) initial = props.defaultValue
      return initial ?? null
    })
    const opts = computed(() => {
      let min = intoInt(props.min) ?? 0
      let max = intoInt(props.max) ?? 100
      if (min > max) {
        const m = max
        max = min
        min = m
      }
      const delta = max - min
      const step = Math.max(0, Math.min(delta, intoInt(props.step) ?? 1))
      return { min, max, delta, step }
    })
    watch(
      () => fieldCtx?.value || null,
      (val) => {
        if (isNaN(val))
          val = opts.value.min + (opts.value.max - opts.value.min) / 2
        pendingValue.value = val
        stateValue.value = val
      },
      {
        immediate: true
      }
    )

    const fixValue = (val: number) => {
      const { delta, step, min, max } = opts.value
      if (delta && step) {
        val = Math.round((val - min) / step) * step + min
      }
      val = Math.max(min, Math.min(max, val))
      return val
    }

    let defaultFieldId: string
    let lazyInputValue = pendingValue.value
    let startX = 0
    let startVal = 0
    const inputElt = shallowRef<HTMLInputElement | undefined>()
    const thumbElt = shallowRef<HTMLDivElement | undefined>()
    const labelElt = shallowRef<HTMLDivElement | undefined>()
    const trackElt = shallowRef<HTMLDivElement | undefined>()
    const trackProcessElt = shallowRef<HTMLDivElement | undefined>()
    const trackWidth = ref(0)
    const focused = ref(false)
    const focus = () => {
      inputElt.value?.focus()
    }
    const inputId = computed(() => {
      let id = fieldCtx.id
      if (!id) {
        if (!defaultFieldId) defaultFieldId = newFieldId()
        id = defaultFieldId
      }
      return id
    })
    const inputHooks = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
      },
      onKeydown(evt: KeyboardEvent) {
        if (evt.key == 'ArrowUp' || evt.key == 'ArrowRight') {
          setValue(fixValue(pendingValue.value + opts.value.step))
        } else if (evt.key == 'ArrowDown' || evt.key == 'ArrowLeft') {
          setValue(fixValue(pendingValue.value - opts.value.step))
        } else if (evt.key == 'Escape') {
          pendingValue.value = stateValue.value
          cancelMove()
        }
      }
    }
    const thumbHooks = {
      onMousedown(evt: MouseEvent) {
        const elt = thumbElt.value
        if (!elt || !fieldCtx.editable || evt.button !== 0) return
        evt.stopPropagation()
        evt.preventDefault()
        focus()
        startX = evt.pageX
        startVal = pendingValue.value
        document.addEventListener('mousemove', handleMove)
        document.addEventListener('mouseup', stopMove)
        // snap to current step in case value was manually assigned
        handleMove(evt)
      },
      onTouchstart(evt: TouchEvent) {
        evt.stopPropagation()
        if (evt.cancelable) evt.preventDefault()
        startX = evt.targetTouches[0].pageX
        startVal = pendingValue.value
        document.addEventListener('touchmove', handleMove)
        document.addEventListener('touchend', stopMove)
        handleMove(evt)
      }
    }
    const trackHooks = {
      onMousedown(evt: MouseEvent) {
        const tg = trackElt.value as HTMLDivElement | null
        if (!tg || !fieldCtx.editable || evt.button !== 0) return
        const dims = tg.getBoundingClientRect()
        if (!dims?.width) return
        evt.stopPropagation()
        evt.preventDefault()
        focus()
        startX = evt.pageX
        startVal = fixValue(
          ((startX - dims.left) * opts.value.delta) / dims.width +
            opts.value.min
        )
        pendingValue.value = startVal
        document.addEventListener('mousemove', handleMove)
        document.addEventListener('mouseup', stopMove)
      }
    }

    const cancelMove = () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', stopMove)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', stopMove)
      thumbClass.value = 'of-slider-thumb'
    }
    const stopMove = () => {
      cancelMove()
      setValue(pendingValue.value)
    }
    const handleMove = (evt: MouseEvent | TouchEvent) => {
      const tw = trackWidth.value
      thumbClass.value = 'of-slider-thumb of--moved'

      if (tw) {
        pendingValue.value = fixValue(
          startVal +
            ((((evt as TouchEvent)?.targetTouches?.[0].pageX ??
              (evt as MouseEvent).pageX) -
              startX) *
              opts.value.delta) /
              tw
        )
        setActiveTrack(thumbElt.value, trackProcessElt.value)
      }
    }
    const setValue = (val: number) => {
      lazyInputValue = val
      pendingValue.value = val
      stateValue.value = val
      if (inputElt.value) inputElt.value.value = '' + val
      if (fieldCtx.onUpdate) fieldCtx.onUpdate(val)
    }

    const setActiveTrack = (
      thumbElt: HTMLDivElement | undefined,
      trackProcessElt: HTMLDivElement | undefined
    ) => {
      if (!thumbElt || !trackProcessElt) {
        return
      }
      let tpeWidth = Math.round(
        (trackWidth.value / opts.value.delta) * pendingValue.value
      )
      tpeWidth = tpeWidth - thumbElt.offsetWidth + thumbElt.offsetWidth * 0.7
      if (tpeWidth <= 0) tpeWidth = 0

      trackProcessElt.style.width = tpeWidth.toString() + 'px'
    }

    const trackPos = watchPosition({ immediate: true })
    watch(trackPos.positions, (entries) => {
      const first = entries.values().next().value
      trackWidth.value = Math.round(first?.width || 0)
    })
    watch(trackElt, (track) => {
      trackPos.disconnect()
      if (track && trackProcessElt) {
        trackPos.observe(track)
      }
    })
    // position thumb + active track width
    watchEffect(() => {
      const { delta, min } = opts.value
      const tw = trackWidth.value
      const val = pendingValue.value
      const thumb = thumbElt.value
      const trackProcess = trackProcessElt.value

      if (thumb && delta && tw && trackProcess) {
        const left =
          ((((val - min) * tw) / delta) * 100) / 100 + thumb.offsetWidth
        thumb.style.left = left + 'px'
        setActiveTrack(thumb, trackProcess)
      }
    })

    const slots = {
      interactiveContent: () => {
        return h(
          'div',
          {
            class: {
              'of-slider': true,
              'of--focused': focused.value
            },
            onVueMounted: () => {
              // watch is not triggered on first render
              nextTick(() => triggerRef(trackElt))
            },
            ...trackHooks
          },
          [
            h('input', {
              id: inputId.value,
              name: fieldCtx.name,
              ref: inputElt,
              type: 'text',
              class: 'of-field-input',
              value: lazyInputValue,
              ...inputHooks
            }),
            h(
              'div',
              {
                class: thumbClass.value,
                ref: thumbElt,
                ...thumbHooks
              },
              h(
                'div',
                {
                  ref: labelElt,
                  class: 'of-slider-label-container'
                },
                pendingValue.value
              )
            ),
            h(
              'div',
              {
                class: 'of-slider-track',
                ref: trackElt
              },
              h('div', {
                class: 'of-slider-track-process',
                ref: trackProcessElt
              })
            )
          ]
        )
      }
    }
    const fRender = fieldRender({
      class: 'of-slider-field',
      focus,
      focused,
      inputId,
      pendingValue,
      updated: computed(() => initialValue.value !== stateValue.value),
      undecorated: true,
      value: stateValue
    })
    provideFieldRender(fRender)

    return () => {
      return h(OfFieldBase, props, { ...slots, ...ctx.slots })
    }
  }
})

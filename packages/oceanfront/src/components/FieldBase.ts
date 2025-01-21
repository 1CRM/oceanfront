import {
  computed,
  defineComponent,
  h,
  ref,
  Ref,
  resolveComponent,
  VNode,
  watch,
  WatchStopHandle
} from 'vue'
import {
  BaseFieldProps,
  FieldDragIn,
  provideFieldContext,
  Renderable,
  useFieldRender
} from '../lib/fields'
import { useFocusGroup } from '../lib/focus'
import { useRecords } from '../lib/records'
import { useThemeOptions } from '../lib/theme'
import { PositionObserver, scaleClass, watchPosition } from '../lib/util'
import { OfOverlay } from './Overlay'

const renderSlot = (
  container: Renderable[],
  slot?: () => Renderable | undefined,
  outer?: string
): void => {
  if (slot) {
    let children = slot()
    if (children) {
      if (outer) children = h('div', { class: outer }, children)
      container.push(children)
    }
  }
}

const calcPadding = (
  node: VNode,
  state: { listen: PositionObserver; watch?: WatchStopHandle }
) => {
  state.listen.disconnect()
  state.watch?.()
  const outer = node.el as HTMLElement | undefined
  if (!outer || !document.body.contains(outer)) {
    return
  }
  const prepend = outer.querySelector('.of-field-prepend') as HTMLElement | null
  const append = outer.querySelector('.of-field-append') as HTMLElement | null
  if (prepend) state.listen.observe(prepend)
  if (append) state.listen.observe(append)
  state.watch = watch(state.listen.positions, (obs) => {
    let presize = 0
    let appsize = 0
    for (const [target, pos] of obs) {
      if (target === prepend) {
        presize = Math.ceil(pos.width)
      } else if (target === append) {
        appsize = Math.ceil(pos.width)
      }
    }
    outer.style.setProperty('--field-size-prepend', presize + 'px')
    outer.style.setProperty('--field-size-append', appsize + 'px')
  })
}

const makeDragIn = (spec: FieldDragIn, flag: Ref<boolean>) => {
  return {
    handlers: {
      onDragover: function (evt: DragEvent) {
        evt.stopPropagation()
        evt.preventDefault()
        if (evt.dataTransfer) {
          evt.dataTransfer.dropEffect =
            spec.dropEffect === 'none' ||
            spec.dropEffect === 'link' ||
            spec.dropEffect === 'move'
              ? spec.dropEffect
              : 'copy'
        }
        flag.value = true
        if (spec.onEnter) spec.onEnter(evt)
      },
      onDragleave: function (evt: DragEvent) {
        flag.value = false
        if (spec.onLeave) spec.onLeave(evt)
      },
      onDrop: function (evt: DragEvent) {
        flag.value = false

        evt.stopPropagation()
        evt.preventDefault()
        spec.onDrop(evt)
      }
    }
  }
}

const parseDimension = (
  size?: number | string
): { length: number; unit: string } | null => {
  if (size && !isNaN(size as number)) {
    return { length: size as number, unit: 'ch' }
  }
  const percentage = ('' + size).match(/(\d+)(%)/)
  if (percentage) {
    return { length: parseInt(percentage[1], 10), unit: percentage[2] }
  }
  const m = ('' + size).match(/^(\d*\.?\d+)(\w+)$/)
  if (!m) return null
  return { length: parseInt(m[1], 10), unit: m[2] }
}

export const OfFieldBase = defineComponent({
  name: 'OfFieldBase',
  inheritAttrs: false,
  props: BaseFieldProps,
  emits: ['update:modelValue', 'input', 'click', 'focused', 'keydown'],
  setup(props, ctx) {
    const fieldRender = useFieldRender()
    const fieldCtx = provideFieldContext(props, ctx as any)
    const mode = computed(() => fieldCtx.mode)
    const interactive = computed(() => fieldCtx.interactive)
    const labelPosition = computed(() => fieldCtx.labelPosition)
    const density = computed(() => fieldCtx.density)

    const focusGrp = useFocusGroup()
    const recordMgr = useRecords()
    const themeOptions = useThemeOptions()
    const OfIcon = resolveComponent('of-icon')
    const OfTooltip = resolveComponent('of-tooltip')

    const record = computed(() => {
      return props.record || recordMgr.getCurrentRecord() || undefined
    })
    const metadata = computed(() =>
      props.name ? record.value?.metadata?.[props.name] : null
    )

    const dragOver = ref(false)
    const focused = ref(false)
    const variant = computed(() => {
      let v = props.variant
      if (!v || v == 'default') {
        v = themeOptions.defaultInputVariant
      }
      return v || 'outlined'
    })
    const tint = computed(() => props.tint)
    const required = computed(() => props.required)

    const padState = { listen: watchPosition() }
    const checkPad = (node: VNode) => calcPadding(node, padState)

    const handlers: any = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
        if (focusGrp) focusGrp.blur()
      },
      onClick(evt: MouseEvent) {
        evt.stopPropagation()
        fieldRender.click?.(evt)
        ctx.emit('click')
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
        if (focusGrp) focusGrp.focus()
      },
      onMousedown(_evt: MouseEvent) {
        // ctx.emit('mousedown', evt)
      },
      onKeydown(evt: KeyboardEvent) {
        fieldRender.keydown?.(evt)
        ctx.emit('keydown', evt)
      },
      onVnodeMounted: checkPad,
      onVnodeUpdated: checkPad,
      onVnodeUnmounted: checkPad
    }
    if (fieldRender.onMouseleave) {
      handlers.onmouseleave = fieldRender.onMouseleave
    }
    if (fieldRender.onMouseenter) {
      handlers.onmouseenter = fieldRender.onMouseenter
    }
    watch(
      () => fieldRender.focused,
      (val) => {
        if (val) ctx.emit('focused')
      }
    )
    return () => {
      try {
        const outerId = (fieldRender.inputId ?? props.id) + '-outer'
        const mainId = (fieldRender.inputId ?? props.id) + '-main'
        let overlay, overlayActive, overlayBlur, overlayCapture, overlayFocus
        const dragIn =
          fieldRender.dragIn && makeDragIn(fieldRender.dragIn, dragOver)
        if (fieldRender.popup) {
          overlay = fieldRender.popup.content
          overlayActive = fieldRender.popup.visible ?? true
          overlayBlur = fieldRender.popup.onBlur
          overlayCapture = fieldRender.popup.capture
          overlayFocus = fieldRender.popup.focus
        }
        const showFocused =
          focused.value ||
          dragOver.value ||
          overlayActive ||
          fieldRender.focused
        const blank =
          fieldRender.blank &&
          !(showFocused || overlayActive || mode.value === 'fixed')
        const metaLabel = props.name ? metadata.value?.label : undefined
        let labelText = fieldRender.label ?? props.label ?? metaLabel
        const asterisk: VNode | null =
          required.value && mode.value !== 'fixed'
            ? h(OfIcon, {
                name: 'required',
                class: 'of--icon-required'
              })
            : null

        let asteriskLabel = false

        if (labelPosition.value == 'none' && required.value) {
          asteriskLabel = true
          labelText = ' '
        }

        const tooltip = h(OfTooltip, { text: props.tooltip })

        const label = ctx.slots.label
          ? ctx.slots.label()
          : (labelPosition.value !== 'none' || required.value) &&
              labelPosition.value !== 'input' &&
              labelText
            ? h(
                'label',
                {
                  class: 'of-field-label'
                  /*, for: render.inputId: triggering duplicate click events */
                },
                [labelText, asterisk]
              )
            : undefined
        const cls = [
          'of-field ',
          {
            ...scaleClass(fieldCtx.scale),
            'of--tinted': !!tint.value,
            ['of--tint-' + tint.value]: !!tint.value,
            'of--active': fieldRender.active || !blank, // overridden for toggle input to avoid hiding content
            'of--blank': blank,
            'of--dragover': dragOver.value,
            'of--focused': showFocused,
            'of--inline': !fieldCtx.block || props.inline,
            'of--invalid': props.invalid || fieldRender.invalid,
            'of--interactive': interactive.value,
            'of--muted': props.muted,
            'of--required': required.value,
            'of--loading': fieldRender.loading,
            'of--rounded': props.rounded,
            'of--undecorated': !!fieldRender.undecorated,
            'of--updated': fieldRender.updated,
            'of--tooltip': tooltip
          },
          'of--cursor-' + (fieldRender.cursor || 'default'),
          'of--density-' + density.value,
          'of--label-' +
            (asteriskLabel ? 'right' : label ? labelPosition.value : 'none'),
          'of--mode-' + mode.value,
          'of--variant-' + variant.value,
          'of--tint-' + tint.value,
          fieldRender.class,
          props.class
        ]

        const style: Record<string, string> = {}
        const scale = fieldRender.scale || props.scale // FIXME fetch from config
        const dim = parseDimension(scale)
        if (dim) {
          style['--field-font-size'] = '' + dim.length + (dim.unit || 'ch')
        }
        if (!fieldCtx.block) {
          if (fieldCtx.width) {
            const dim = parseDimension(fieldCtx.width)
            style['--field-size'] = '' + dim?.length + (dim?.unit || 'ch')
          }
        }

        const contentSlot =
          ctx.slots.default ||
          (interactive.value
            ? ctx.slots.interactiveContent
            : ctx.slots.fixedContent
              ? () =>
                  h(
                    'div',
                    {
                      class: 'of-field-content-text'
                    },
                    ctx.slots.fixedContent?.()
                  )
              : ctx.slots.interactiveContent)

        const fieldInner: VNode[] = []

        renderSlot(fieldInner, ctx.slots.inputPrepend, 'of-field-inner-prepend')
        renderSlot(fieldInner, contentSlot)

        const inner: VNode | VNode[] = []

        renderSlot(inner, ctx.slots.prepend, 'of-field-prepend')
        renderSlot(inner, () => fieldInner, 'of-field-inner')
        renderSlot(inner, ctx.slots.append, 'of-field-append')
        if (overlay) {
          overlay = h(
            OfOverlay,
            {
              active: overlayActive,
              capture: overlayCapture ?? true,
              shade: false,
              target: mainId ? '#' + mainId : '',
              onBlur: overlayBlur,
              sticky: props.sticky,
              focus: overlayFocus
            },
            overlay
          )
        }

        const tooltipNode = computed(() =>
          props.tooltip ?? '' !== '' ? tooltip : undefined
        )

        const labelNode = computed(() =>
          (label || required.value) &&
          !['frame', 'input'].includes(labelPosition.value ?? '')
            ? label
            : tooltipNode.value
              ? h('label', {
                  class: 'of-field-label',
                  innerHTML: '&nbsp;'
                })
              : undefined
        )

        const children = [
          labelNode.value || tooltipNode.value
            ? h('div', { class: 'of-field-main-label' }, [
                labelNode.value,
                tooltipNode.value
              ])
            : undefined,
          h(
            'div',
            {
              class: 'of-field-main',
              id: mainId
            },
            [
              h('div', { class: 'of--layer of--layer-bg' }),
              h('div', { class: 'of--layer of--layer-brd' }),
              h('div', { class: 'of--layer of--layer-outl' }),
              h(
                'div',
                {
                  class: 'of-field-header'
                },
                label && labelPosition.value === 'frame'
                  ? h('div', { class: 'of-field-header-label' }, label)
                  : undefined
              ),
              h('div', { class: 'of-field-body' }, inner)
            ]
          ),
          h('div', { class: 'of-field-caption' }), // FIXME support custom slot
          overlay
        ]
        return h(
          'div',
          {
            class: cls,
            id: outerId,
            style,
            tabindex: props.tabindex ?? undefined,
            ...handlers,
            ...dragIn?.handlers
          },
          children
        )
      } catch (e) {
        console.error(e)
        return ''
      }
    }
  }
})

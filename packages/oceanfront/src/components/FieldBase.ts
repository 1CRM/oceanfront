import {
  computed,
  defineComponent,
  h,
  ref,
  Ref,
  resolveComponent,
  SetupContext,
  VNode,
  watch,
  WatchStopHandle,
} from 'vue'
import {
  BaseFieldProps,
  FieldDragIn,
  provideFieldContext,
  Renderable,
  useFieldRender,
} from '../lib/fields'
import { useFocusGroup } from '../lib/focus'
import { useRecords } from '../lib/records'
import { useThemeOptions } from '../lib/theme'
import { PositionObserver, watchPosition } from '../lib/util'
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
      },
    },
  }
}

export const OfFieldBase = defineComponent({
  name: 'OfFieldBase',
  inheritAttrs: false,
  props: BaseFieldProps,
  emits: ['update:modelValue', 'input', 'click'],
  setup(props, ctx: SetupContext) {
    const fieldRender = useFieldRender()
    const fieldCtx = provideFieldContext(props, ctx)
    const mode = computed(() => fieldCtx.mode)
    const interactive = computed(() => fieldCtx.interactive)
    const labelPosition = computed(() => fieldCtx.labelPosition)
    const density = computed(() => fieldCtx.density)

    const focusGrp = useFocusGroup()
    const recordMgr = useRecords()
    const themeOptions = useThemeOptions()
    const OfIcon = resolveComponent('of-icon')

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

    const handlers = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
        if (focusGrp) focusGrp.blur()
      },
      onClick(evt: MouseEvent) {
        evt.stopPropagation()
        fieldRender.click?.(evt)
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
        if (focusGrp) focusGrp.focus()
      },
      onMousedown(_evt: MouseEvent) {
        // ctx.emit('mousedown', evt)
      },
      onVnodeMounted: checkPad,
      onVnodeUpdated: checkPad,
      onVnodeUnmounted: checkPad,
    }

    return () => {
      try {
        const outerId = (fieldRender.inputId ?? props.id) + '-outer'
        const mainId = (fieldRender.inputId ?? props.id) + '-main'
        let overlay, overlayActive, overlayBlur
        // if(ctx.slots.overlay) overlay = ctx.slots.overlay(); else
        const dragIn =
          fieldRender.dragIn && makeDragIn(fieldRender.dragIn, dragOver)
        if (fieldRender.popup) {
          overlay = fieldRender.popup.content
          overlayActive = fieldRender.popup.visible ?? true
          overlayBlur = fieldRender.popup.onBlur
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
        const labelText = fieldRender.label ?? props.label ?? metaLabel

        const asterisk: VNode | null = required.value
          ? h(OfIcon, { name: 'required', class: 'of--icon-required' })
          : null

        const label = ctx.slots.label
          ? ctx.slots.label()
          : labelPosition.value !== 'none' &&
            labelPosition.value !== 'input' &&
            labelText
          ? h(
              'label',
              {
                class: 'of-field-label',
                /*, for: render.inputId: triggering duplicate click events */
              },
              [labelText, asterisk]
            )
          : undefined
        const cls = [
          'of-field ',
          {
            'of--tinted': !!tint.value,
            ['of--tint-' + tint.value]: !!tint.value,
            'of--active': fieldRender.active || !blank, // overridden for toggle input to avoid hiding content
            'of--blank': blank,
            'of--dragover': dragOver.value,
            'of--focused': showFocused,
            'of--inline': props.inline,
            'of--invalid': props.invalid || fieldRender.invalid,
            'of--interactive': interactive.value,
            'of--muted': props.muted,
            'of--required': required.value,
            'of--loading': fieldRender.loading,
            'of--rounded': props.rounded,
            'of--updated': fieldRender.updated,
          },
          'of--cursor-' + (fieldRender.cursor || 'default'),
          'of--density-' + density.value,
          'of--label-' + (label ? labelPosition.value : 'none'),
          'of--mode-' + mode.value,
          'of--variant-' + variant.value,
          'of--tint-' + tint.value,
          fieldRender.class,
          props.class,
        ]
        const size = fieldRender.size || props.size // FIXME fetch from config
        const style: Record<string, string> = {}
        if (size) {
          style['--field-size'] = `${size}ch`
        }
        const contentSlot =
          ctx.slots.default ||
          (interactive.value
            ? ctx.slots.interactiveContent
            : ctx.slots.fixedContent
            ? () =>
                h(
                  'div',
                  { class: 'of-field-content-text' },
                  ctx.slots.fixedContent?.()
                )
            : ctx.slots.interactiveContent)

        const inner: VNode | VNode[] = []

        renderSlot(inner, ctx.slots.prepend, 'of-field-prepend')
        renderSlot(inner, contentSlot, 'of-field-inner')
        renderSlot(inner, ctx.slots.append, 'of-field-append')
        if (overlay) {
          overlay = h(
            OfOverlay,
            {
              active: overlayActive,
              capture: true,
              shade: false,
              target: mainId ? '#' + mainId : '',
              onBlur: overlayBlur,
            },
            overlay
          )
        }

        const noLabelAsterisk: VNode | null =
          required.value && labelPosition.value == 'none'
            ? h(OfIcon, {
                name: 'required',
                class: 'of--icon-required no--label',
              })
            : null

        const children = [
          label &&
          labelPosition.value !== 'frame' &&
          labelPosition.value !== 'input' &&
          labelPosition.value !== 'none'
            ? h('div', { class: 'of-field-main-label' }, label)
            : undefined,
          h(
            'div',
            {
              class: 'of-field-main',
              id: mainId,
            },
            [
              h('div', { class: 'of--layer of--layer-bg' }),
              h('div', { class: 'of--layer of--layer-brd' }),
              h('div', { class: 'of--layer of--layer-outl' }),
              h(
                'div',
                {
                  class: 'of-field-header',
                },
                label && labelPosition.value === 'frame'
                  ? h('div', { class: 'of-field-header-label' }, label)
                  : undefined
              ),
              h('div', { class: 'of-field-body' }, [inner, noLabelAsterisk]),
            ]
          ),
          h('div', { class: 'of-field-caption' }), // FIXME support custom slot
          overlay,
        ]

        return h(
          'div',
          {
            class: cls,
            id: outerId,
            style,
            tabindex: '-1',
            ...handlers,
            ...dragIn?.handlers,
          },
          children
        )
      } catch (e) {
        console.error(e)
        return ''
      }
    }
  },
})

import {
  defineComponent,
  computed,
  h,
  nextTick,
  ref,
  watch,
  PropType,
  Teleport,
  Transition,
} from 'vue'
import { useLayout } from '../lib/layout'
import { watchPosition } from '../lib/util'
import OfSpinner from './Spinner.vue'

const relativeParentRect = (elt: Element) => {
  let parent = elt.parentNode as Element | undefined
  if (!parent) return
  while (parent) {
    const ppos = getComputedStyle(parent).position
    if (ppos === 'relative' || ppos === 'absolute') break
    parent =
      [window, document.documentElement].indexOf(parent.parentNode as any) !==
      -1
        ? undefined
        : (parent.parentNode as Element)
  }
  if (!parent) {
    const [l, t, w, h] = [
      -window.scrollX,
      -window.scrollY,
      window.innerWidth,
      window.innerHeight,
    ]
    return { left: l, top: t, width: w, height: h, bottom: t + h, right: l + w }
  }
  return parent.getBoundingClientRect()
}

const checkFocused = (elt?: HTMLElement) => {
  if (!elt) return false
  const active = document.activeElement
  return (active && elt.contains(active)) || false
}

let overlayZIndex = 200
let overlayStack: HTMLElement[] = []

const removeFromStack = (elt?: HTMLElement) => {
  overlayStack = overlayStack.filter((e) => e !== elt)
  if (overlayStack.length == 0) {
    overlayZIndex = 200
  }
  const top = overlayStack[overlayStack.length - 1]
  if (!top) return
  if (!checkFocused(top)) top.focus()
}

export const OfOverlay = defineComponent({
  name: 'OfOverlay',
  inheritAttrs: false,
  props: {
    active: { type: Boolean, default: false },
    focus: { type: Boolean, default: true },
    align: { type: String, default: 'center' },
    capture: { type: Boolean, default: true },
    class: String,
    embed: Boolean,
    id: String,
    loading: Boolean,
    pad: { type: Boolean, default: true }, // FIXME change to string enum
    shade: { type: Boolean, default: true },
    target: { type: [Element, String] } as any as PropType<Element | string>,
    transition: String,
    sticky: { type: Boolean, default: true },
  },
  emits: ['blur'],
  setup(props, ctx) {
    const id = Math.random()
    let focused = false
    const layout = useLayout()
    const elt = ref<HTMLElement | undefined>()
    const clickCapture = ref<HTMLElement | undefined>()
    const portal = ref<HTMLElement | undefined>()
    const portalTo = ref<HTMLElement | undefined>()
    const handlers = {
      onClick(evt: MouseEvent) {
        const outer = elt.value
        if (!outer) return
        if (evt.target === outer || evt.target === clickCapture.value) {
          focused = false
          ctx.emit('blur')
          removeFromStack(outer)
        }
      },
      onKeydown(evt: KeyboardEvent) {
        if (focused && evt.key == 'Escape') {
          focused = false
          ctx.emit('blur', true)
          removeFromStack(elt.value)
        }
      },
    }
    const state = computed(() => (props.embed ? 'embed' : 'overlay'))
    const target = ref()
    const targetPos = watchPosition({ scroll: true })
    watch(targetPos.positions, (_pos) => reposition())
    const bind = (active: boolean) => {
      targetPos.disconnect()
      if (active && target.value) {
        targetPos.observe(target.value)
      }
    }
    const focus = () => {
      const outer = elt.value
      if (!outer) return false
      if (checkFocused(outer)) return
      // FIXME look for [autofocus] or [data-autofocus]?
      const findFocus = outer.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      ;((findFocus as HTMLElement) || outer).focus()
      overlayStack.push(outer)
      overlayZIndex++
      outer.style.zIndex = overlayZIndex.toString()
      focused = true
    }
    const reparent = () => {
      if (!portal.value) return
      const eltParent = portal.value.parentNode as HTMLElement
      if (!eltParent) return
      const swap = state.value !== 'embed'
      portalTo.value = swap
        ? ((eltParent.closest('[data-overlay-parent]') ??
            document.body) as HTMLElement)
        : undefined
    }
    const reposition = () => {
      nextTick(() => {
        const targetElt = target.value
        const outer = elt.value
        if (!outer) return // or not in document
        if (!targetElt) return // or make fixed/absolute

        const parentRect = relativeParentRect(outer)
        const outerRect = outer.getBoundingClientRect()
        const targetRect = targetElt.getBoundingClientRect()
        if (!targetRect || !parentRect) return // or hide?

        const neededWidth = outerRect.width + targetRect.left
        const offsetWidth = Math.max(neededWidth - parentRect.width, 0)
        if (neededWidth > window.innerWidth) {
          const rightOffset = parseInt(getComputedStyle(outer).paddingRight)
          outer.style.setProperty(
            '--overlay-dyn-margin-left',
            Math.max(
              targetRect.right +
                parentRect.left -
                outerRect.width -
                rightOffset,
              0,
            ) + 'px',
          )
          outer.style.setProperty('padding-right', '0')
        } else {
          outer.style.setProperty(
            '--overlay-dyn-margin-left',
            Math.max(targetRect.left + parentRect.left - offsetWidth, 0) + 'px',
          )
          outer.style.removeProperty('padding-right')
        }
        if (!props.sticky) {
          outer.style.setProperty('position', 'absolute')
          outer.style.setProperty(
            'top',
            `${targetRect.y + window.scrollY + targetRect.height - 20}px`,
          )
          outer.style.setProperty('--overlay-dyn-pad-top', '0')
        } else {
          outer.style.setProperty(
            '--overlay-dyn-pad-top',
            Math.max(targetRect.bottom, 0) + 'px',
          )
        }
      })
    }
    const updateState = () => {
      const activeOverlay = props.active && state.value === 'overlay'
      reparent()
      bind(activeOverlay)
      if (activeOverlay) {
        nextTick(() => {
          reposition()
          if (props.focus) focus()
        })
      }
    }
    watch(
      () => [props.target, props.active, props.focus, state.value],
      ([src, active, ..._]) => {
        if (!active) removeFromStack(elt.value)
        if (typeof src === 'string') {
          target.value = document.documentElement.querySelector(src)
        } else if (src instanceof Element) {
          target.value = src
        } else {
          target.value = null
        }
        updateState()
      },
    )
    watch(
      () => layout.windowRect,
      (_) => {
        nextTick(reposition)
      },
    )

    const hasTint = ref(false)
    const tintClass = ref('')

    watch(
      () => props.active,
      (active) => {
        if (!active) return
        hasTint.value = !!(
          target.value &&
          window
            .getComputedStyle(target.value)
            .getPropertyValue('--of-has-tint')
        )

        const tintName =
          target.value &&
          window
            .getComputedStyle(target.value)
            .getPropertyValue('--of-tint-name')
        tintClass.value = `of--tint-${tintName}`
      },
    )

    return () => {
      const cls = {
        [tintClass.value]: !!hasTint.value,
        'of--tinted': !!hasTint.value,
        'of--active': props.active,
        'of--capture': props.active && props.capture,
        'of--embed': state.value === 'embed',
        'of--loading': props.loading,
        'of--overlay': state.value === 'overlay',
        'of--pad': props.pad,
        'of--shade': props.shade,
        'of--fit-content': target.value,
      }
      if (state.value !== 'embed' && !target.value && props.align)
        (cls as any)['of--' + props.align] = true

      return h(
        Teleport,
        {
          disabled: !portalTo.value,
          to: portalTo.value,
          ref: portal,
          onVueMounted: updateState,
          onVueBeforeUnmount: () => {
            bind(false)
            if (focused) removeFromStack(elt.value)
          },
        },
        [
          h(
            Transition,
            { name: props.transition },
            {
              default: () => [
                h(
                  'div',
                  {
                    style: {
                      display: props.active ? 'contents' : 'none',
                    },
                  },
                  [
                    state.value == 'overlay'
                      ? h('div', {
                          class: {
                            'of-overlay-capture': props.active && props.capture,
                          },
                          style: {
                            'z-index': overlayZIndex,
                          },
                          onClick: handlers.onClick,
                          ref: clickCapture,
                        })
                      : undefined,
                    h(
                      'div',
                      {
                        class: ['of-overlay', cls, props.class],
                        style: {
                          'z-index': overlayZIndex,
                        },
                        id: props.id,
                        role: 'document',
                        ref: elt,
                        tabIndex:
                          props.active && state.value === 'overlay'
                            ? '-1'
                            : null,
                        'data-id': id,
                        ...handlers,
                      },
                      props.loading
                        ? () =>
                            ctx.slots.loading
                              ? ctx.slots.loading()
                              : h(OfSpinner)
                        : ctx.slots.default?.({
                            active: props.active,
                            state: state.value,
                          }),
                    ),
                  ],
                ),
              ],
            },
          ),
        ],
      )
    }
  },
})

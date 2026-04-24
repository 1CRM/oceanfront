import {
  defineComponent,
  computed,
  h,
  nextTick,
  ref,
  watch,
  PropType,
  Teleport,
  Transition
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
      window.innerHeight
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
const overlayTriggers = new WeakMap<HTMLElement, HTMLElement>()
const overlayEscCallbacks = new WeakMap<HTMLElement, () => void>()

document.addEventListener('keydown', (evt: KeyboardEvent) => {
  if (evt.key !== 'Escape' || overlayStack.length === 0) return
  const topOverlay = overlayStack[overlayStack.length - 1]
  if (!topOverlay) return
  if (topOverlay.contains(evt.target as Node)) return
  const callback = overlayEscCallbacks.get(topOverlay)
  if (callback) callback()
})

const removeFromStack = (elt?: HTMLElement) => {
  const triggerEl = elt ? overlayTriggers.get(elt) : undefined
  if (elt) {
    overlayTriggers.delete(elt)
    overlayEscCallbacks.delete(elt)
  }

  overlayStack = overlayStack.filter((e) => e !== elt)
  if (overlayStack.length == 0) {
    overlayZIndex = 200
  }

  const active = document.activeElement as HTMLElement | null
  const focusLost =
    !active || active === document.body || (elt && elt.contains(active))

  const top = overlayStack[overlayStack.length - 1]
  if (!top) {
    if (focusLost && triggerEl && triggerEl.isConnected) {
      triggerEl.focus({ focusVisible: false } as FocusOptions & {
        focusVisible?: boolean
      })
    }
    return
  }
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
    sticky: { type: Boolean, default: true }
  },
  emits: ['blur'],
  setup(props, ctx) {
    const id = Math.random()
    let focused = false
    let focusoutTimer: ReturnType<typeof setTimeout> | null = null
    const layout = useLayout()
    const elt = ref<HTMLElement | undefined>()
    const clickCapture = ref<HTMLElement | undefined>()
    const portal = ref<HTMLElement | undefined>()
    const portalTo = ref<HTMLElement | undefined>()
    const instanceZIndex = ref(overlayZIndex)
    const clearFocusoutTimer = () => {
      if (focusoutTimer != null) {
        clearTimeout(focusoutTimer)
        focusoutTimer = null
      }
    }
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
        if (evt.key == 'Escape') {
          evt.stopPropagation()
          focused = false
          ctx.emit('blur', true)
          removeFromStack(elt.value)
        }
      },
      onFocusout(evt: FocusEvent) {
        const outer = elt.value
        if (!outer || !props.active) return
        const related = evt.relatedTarget as Node | null
        if (related && outer.contains(related)) return

        clearFocusoutTimer()
        focusoutTimer = setTimeout(() => {
          focusoutTimer = null
          if (!props.active || !elt.value) return
          const currentOuter = elt.value

          const active = document.activeElement
          if (active && currentOuter.contains(active)) return

          const myIdx = overlayStack.indexOf(currentOuter)
          if (myIdx >= 0 && active) {
            for (let i = myIdx + 1; i < overlayStack.length; i++) {
              if (overlayStack[i].contains(active)) return
            }
          }

          focused = false
          ctx.emit('blur', false)
          removeFromStack(currentOuter)
        }, 0)
      }
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

    const pushToStack = () => {
      if (!elt.value) return false

      const activeEl = document.activeElement as HTMLElement | null
      if (activeEl && activeEl !== document.body) {
        overlayTriggers.set(elt.value, activeEl)
      }

      overlayEscCallbacks.set(elt.value, () => {
        focused = false
        ctx.emit('blur', true)
        removeFromStack(elt.value)
      })

      overlayStack.push(elt.value)
      overlayZIndex++
      instanceZIndex.value = overlayZIndex

      elt.value.style.zIndex = overlayZIndex.toString()
    }

    const focusableSelector =
      'button, [href], input, select, textarea, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'

    const focus = () => {
      const outer = elt.value
      if (!outer) return false
      if (checkFocused(outer)) return true
      const opts = {
        focusVisible: false
      } as FocusOptions & { focusVisible?: boolean }
      const autofocus = outer.querySelector(
        '[autofocus], [data-autofocus]'
      ) as HTMLElement | null
      if (autofocus?.isConnected) {
        autofocus.focus(opts)
        if (checkFocused(outer)) {
          focused = true
          return true
        }
      }
      const findFocus = outer.querySelector(
        focusableSelector
      ) as HTMLElement | null
      const target = findFocus || outer
      target.focus(opts)
      focused = true
      return true
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
        if (!targetElt) {
          outer.style.setProperty('--overlay-dyn-margin-left', '0px')

          // or make fixed/absolute
          return
        }

        const parentRect = relativeParentRect(outer)
        const outerRect = outer?.getBoundingClientRect()
        const targetRect = targetElt?.getBoundingClientRect()
        if (!targetRect || !parentRect || !outerRect || !targetRect) return // or hide?
        const neededWidth =
          outerRect.width +
          targetRect.left -
          parseInt(getComputedStyle(outer).paddingRight)
        const offsetWidth = Math.max(neededWidth - parentRect.width, 0)
        if (neededWidth > window.innerWidth) {
          const marginLeft =
            (window.innerWidth < targetRect.right + window.pageXOffset
              ? window.innerWidth - outerRect.width
              : Math.max(targetRect.right - outerRect.width, 0)) +
            window.pageXOffset
          outer.style.setProperty(
            '--overlay-dyn-margin-left',
            marginLeft + 'px'
          )
          outer.style.setProperty('padding-right', '0')
        } else {
          outer.style.setProperty(
            '--overlay-dyn-margin-left',
            Math.max(targetRect.left + parentRect.left - offsetWidth, 0) + 'px'
          )
          outer.style.removeProperty('padding-right')
        }
        if (!props.sticky) {
          outer.style.setProperty('position', 'absolute')
          outer.style.setProperty(
            'top',
            `${targetRect.y + window.scrollY + targetRect.height - 20}px`
          )
          outer.style.setProperty('--overlay-dyn-pad-top', '0')
        } else {
          let paddingTop = targetRect.bottom - outerRect.y
          const child = outer.firstElementChild
          const observer = new MutationObserver((mutationList, observer) => {
            for (const mutation of mutationList) {
              if (
                mutation.type === 'childList' &&
                !(mutation.target as HTMLElement)?.classList.contains('loading')
              ) {
                observer.disconnect()
                reposition()
                break
              }
            }
          })
          if (child)
            observer.observe(child, {
              childList: true,
              subtree: true
            })
          if (
            outerRect.height - targetRect.bottom - 24 <
            (child as HTMLElement)?.clientHeight
          ) {
            paddingTop =
              targetRect.top - (child as HTMLElement)?.clientHeight - 5
          }
          outer.style.setProperty(
            '--overlay-dyn-pad-top',
            Math.max(paddingTop, 0) + 'px'
          )
          const children = outer.children
          if (targetRect.top < 0) {
            ;(children[0] as HTMLElement)?.style?.setProperty(
              'margin-top',
              `${targetRect.top}px`
            )
          } else {
            ;(children[0] as HTMLElement)?.style?.setProperty(
              'margin-bottom',
              `-${(child as HTMLElement)?.clientHeight - 5 - outerRect.height + targetRect.top}px`
            )
            ;(children[0] as HTMLElement)?.style?.setProperty(
              'margin-top',
              '3px'
            )
          }
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
          pushToStack()
          // Defer focus one extra tick so slot content (e.g. v-if on slot props) is in the DOM.
          if (props.focus) {
            nextTick(() => {
              focus()
              if (!checkFocused(elt.value)) requestAnimationFrame(() => focus())
            })
          }
        })
      }
    }
    watch(
      () => [props.target, props.active, props.focus, state.value],
      ([src, active, ..._]) => {
        if (!active) {
          clearFocusoutTimer()
          removeFromStack(elt.value)
        }
        if (typeof src === 'string') {
          target.value = document.documentElement.querySelector(src)
        } else if (src instanceof Element) {
          target.value = src
        } else {
          target.value = null
        }
        updateState()
      }
    )
    watch(
      () => layout.windowRect,
      (_) => {
        nextTick(reposition)
      }
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
      }
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
        'of--fit-content': target.value
      }
      if (state.value !== 'embed' && !target.value && props.align)
        (cls as any)['of--' + props.align] = true

      return h(
        Teleport,
        {
          disabled: !portalTo.value,
          to: portalTo.value,
          ref: portal,
          onVnodeMounted: updateState,
          onVnodeBeforeUnmount: () => {
            clearFocusoutTimer()
            bind(false)
            if (focused) removeFromStack(elt.value)
          }
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
                      display: props.active ? 'contents' : 'none'
                    }
                  },
                  [
                    state.value == 'overlay'
                      ? h('div', {
                          class: {
                            'of-overlay-capture': props.active && props.capture
                          },
                          style: {
                            'z-index': instanceZIndex.value
                          },
                          onClick: handlers.onClick,
                          ref: clickCapture
                        })
                      : undefined,
                    h(
                      'div',
                      {
                        class: ['of-overlay', cls, props.class],
                        style: {
                          'z-index': instanceZIndex.value
                        },
                        id: props.id,
                        role: 'document',
                        ref: elt,
                        tabIndex:
                          props.active && state.value === 'overlay'
                            ? '-1'
                            : null,
                        'data-id': id,
                        ...handlers
                      },
                      props.loading
                        ? () =>
                            ctx.slots.loading
                              ? ctx.slots.loading()
                              : h(OfSpinner)
                        : ctx.slots.default?.({
                            active: props.active,
                            state: state.value
                          })
                    )
                  ]
                )
              ]
            }
          )
        ]
      )
    }
  }
})

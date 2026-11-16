import { defineComponent, h, nextTick, PropType, Ref, ref } from 'vue'
import { OfIcon } from './Icon'

export const OfTooltip = defineComponent({
  name: 'OfTooltip',
  props: {
    text: String,
    position: { type: String as PropType<'left' | 'right'>, default: 'right' },
    scale: { type: [Number, String], default: 1.71 }
  },
  setup(props, ctx) {
    const tooltipStyle: Ref<any> = ref({})
    const tooltipTextEl = ref()
    const textPosition = ref()
    const opened = ref(false)

    const getVisibleBounds = (el: HTMLElement) => {
      let left = 0
      let right = document.documentElement.clientWidth
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (
          p.clientWidth > 0 &&
          /auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX)
        ) {
          const innerLeft = p.getBoundingClientRect().left + p.clientLeft
          left = Math.max(left, innerLeft)
          right = Math.min(right, innerLeft + p.clientWidth)
        }
      }
      return { left, right }
    }

    const open = (e: MouseEvent | FocusEvent) => {
      tooltipStyle.value = { left: 'auto', right: '0' }
      opened.value = true
      nextTick(() => show(e))
    }

    const show = (e: MouseEvent | FocusEvent) => {
      const tooltipIconEl =
        (e.currentTarget as HTMLElement) ?? (e.target as HTMLElement)

      const tooltipIconElRect = tooltipIconEl?.getBoundingClientRect()
      let tooltipTextElRect = tooltipTextEl.value.getBoundingClientRect()

      const textOffset = 6
      const edgeMargin = 5
      const bounds = getVisibleBounds(tooltipIconEl)
      const maxRight = bounds.right - textOffset - edgeMargin
      const spaceLeft = tooltipIconElRect.left - bounds.left
      const rightTooltipOffset = Math.round(
        tooltipIconElRect.width + textOffset
      )

      textPosition.value =
        props.position === 'right'
          ? tooltipIconElRect.left +
              tooltipTextElRect.width +
              rightTooltipOffset >
              maxRight &&
            spaceLeft - textOffset >
              maxRight - (tooltipIconElRect.left + textOffset)
            ? 'left'
            : 'right'
          : tooltipTextElRect.width + textOffset > spaceLeft &&
              maxRight - tooltipIconElRect.right > spaceLeft
            ? 'right'
            : 'left'

      const maxWidth =
        (textPosition.value === 'left'
          ? spaceLeft - textOffset
          : maxRight - tooltipIconElRect.right) - edgeMargin

      tooltipStyle.value = {
        '--tt-text-offset': textOffset + tooltipIconElRect.width + 'px',
        'max-width': Math.max(Math.round(maxWidth - 16), 50) + 'px',
        bottom: ''
      }

      nextTick(() => {
        tooltipTextElRect = tooltipTextEl.value.getBoundingClientRect()
        tooltipStyle.value['bottom'] =
          Math.round(
            (tooltipIconElRect.height - tooltipTextElRect.height) / 2
          ) + 'px'
      })
    }

    return () =>
      h(
        'div',
        {
          class: 'of-tooltip'
        },
        h(
          'div',
          {
            class: ['of-tooltip-main'],
            tabindex: ctx.slots.default ? undefined : 0,
            onMouseenter: open,
            onMouseleave: () => {
              opened.value = false
            },
            onFocus: open,
            onBlur: () => {
              opened.value = false
            }
          },
          [
            ctx.slots.default
              ? h('div', {}, ctx.slots.default())
              : h(OfIcon, {
                  name: 'help circle',
                  scale: props.scale,
                  ariaLabel: props.text || undefined
                }),
            (props.text ?? '') !== ''
              ? h(
                  'div',
                  {
                    ref: tooltipTextEl,
                    style: tooltipStyle.value,
                    class: [
                      'of-tooltip-text',
                      'of--elevated-1',
                      textPosition.value,
                      { open: opened.value }
                    ],
                    onClick: (e: MouseEvent) => {
                      e.stopPropagation()
                      e.preventDefault()
                      opened.value = false
                    }
                  },
                  [
                    h(
                      'div',
                      {
                        class: 'triangle'
                      },
                      [
                        h(
                          'svg',
                          {
                            width: '3',
                            height: '6',
                            viewBox: '0 0 3 6',
                            fill: 'none',
                            xmlns: 'http://www.w3.org/2000/svg'
                          },
                          [
                            h('path', {
                              d: 'M2.41421 0V6L0.292893 3.75C-0.0976311 3.33579 -0.0976311 2.66421 0.292893 2.25L2.41421 0Z',
                              fill: '#151713'
                            })
                          ]
                        )
                      ]
                    ),
                    props.text
                  ]
                )
              : undefined
          ]
        )
      )
  }
})

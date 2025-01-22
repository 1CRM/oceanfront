import { defineComponent, h, nextTick, PropType, Ref, ref } from 'vue'
import { OfIcon } from './Icon'

export const OfTooltip = defineComponent({
  name: 'OfTooltip',
  props: {
    text: String,
    position: { type: String as PropType<'left' | 'right'>, default: 'right' }
  },
  setup(props) {
    const tooltipStyle: Ref<any> = ref({})
    const tooltipTextEl = ref()
    const textPosition = ref()
    const opened = ref(false)

    const show = (e: MouseEvent) => {
      const clientWidth = document.documentElement.clientWidth
      const tooltipIconEl = e.target as HTMLElement

      const tooltipIconElRect = tooltipIconEl?.getBoundingClientRect()
      let tooltipTextElRect = tooltipTextEl.value.getBoundingClientRect()

      textPosition.value =
        props.position === 'right'
          ? tooltipTextElRect.right > clientWidth &&
            tooltipIconElRect.left > clientWidth - tooltipIconElRect.right
            ? 'left'
            : 'right'
          : tooltipTextElRect.width > tooltipIconElRect.left &&
              clientWidth - tooltipIconElRect.right > tooltipIconElRect.left
            ? 'right'
            : 'left'

      const maxWidth =
        (textPosition.value === 'left'
          ? tooltipIconElRect.left
          : clientWidth - tooltipIconElRect.right) -
        (tooltipIconElRect.width + 25)

      tooltipStyle.value = {
        '--tt-icon-width': Math.round(tooltipIconElRect.width) + 'px',
        'max-width': Math.round(maxWidth) + 'px',
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
          role: 'tooltip',
          'aria-label': props.text,
          class: 'of-tooltip'
        },
        h(
          'div',
          {
            class: ['of-tooltip-main']
          },
          [
            h(OfIcon, {
              name: 'help circle',
              scale: 1.71,
              onMouseenter: (e: MouseEvent) => {
                tooltipStyle.value = {}
                opened.value = true
                nextTick(() => show(e))
              },
              onMouseleave: () => {
                opened.value = false
              },
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                e.preventDefault()
              }
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

import { computed, defineComponent, h } from 'vue'
import { renderSvgIcon, useIcons } from '../lib/icons'

export const OfIcon = defineComponent({
  name: 'OfIcon',
  props: {
    class: String,
    effect: String,
    name: String,
    scale: [Number, String],
    type: String,
    ariaLabel: String,
    title: String
  },
  setup(props, ctx) {
    const mgr = useIcons()
    const icon = computed(() =>
      mgr.resolveIcon(props.name, { effect: props.effect, type: props.type })
    )
    const size = computed(() => {
      let sz = props.scale
      if (sz) {
        if (
          typeof sz === 'number' ||
          (typeof sz === 'string' && sz.match(/^[0-9]+$/))
        ) {
          sz = '' + sz + 'ch'
        }
      }
      return sz || undefined
    })
    return () => {
      const iconVal = icon.value
      const sz = size.value
      const numSz = !isNaN(parseInt(sz as string))
      if (!iconVal) return
      return h(
        'i',
        {
          'aria-label': props.ariaLabel ?? props.title ?? props.name,
          class: [
            {
              'of-icon': true,
              'of-icon--svg': !!iconVal.svg
            },
            props.scale && !numSz ? 'of--icon-size-' + props.scale : undefined,
            props.class,
            iconVal.class
          ],
          'data-name': props.name,
          style: numSz ? { '--icon-size': sz } : undefined,
          ...ctx.attrs
        },
        ctx.slots.default
          ? ctx.slots.default()
          : iconVal.svg
            ? renderSvgIcon(iconVal.svg)
            : iconVal.text
      )
    }
  }
})

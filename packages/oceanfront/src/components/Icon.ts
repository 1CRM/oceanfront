import { computed, defineComponent, h } from 'vue'
import { renderSvgIcon, useIcons } from '../lib/icons'

export const OfIcon = defineComponent({
  name: 'OfIcon',
  props: {
    class: String,
    effect: String,
    name: String,
    size: [Number, String],
    type: String,
  },
  setup(props, ctx) {
    const mgr = useIcons()
    const icon = computed(() =>
      mgr.resolveIcon(props.name, { effect: props.effect, type: props.type })
    )
    const size = computed(() => {
      let sz = props.size
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
          'aria-hidden': 'true',
          class: [
            {
              'of-icon': true,
              'of-icon--svg': !!iconVal.svg,
            },
            props.size && !numSz ? 'of--icon-size-' + props.size : undefined,
            props.class,
            iconVal.class,
          ],
          'data-name': props.name,
          style: numSz ? { '--icon-size': sz } : undefined,
          ...ctx.attrs,
        },
        ctx.slots.default
          ? ctx.slots.default()
          : iconVal.svg
          ? renderSvgIcon(iconVal.svg)
          : iconVal.text
      )
    }
  },
})

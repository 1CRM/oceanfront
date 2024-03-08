<template>
  <div class="of-badge" :class="badgeClass"><slot></slot></div>
</template>

<script lang="ts">
import { useThemeOptions } from '../lib/theme'
import { computed, defineComponent, PropType } from 'vue'
import { Scale, scaleClass } from '../lib/util'

type Status =
  | 'success'
  | 'final'
  | 'info'
  | 'draft'
  | 'pending'
  | 'deferred'
  | 'special'
  | 'error'
  | 'alert'
  | 'warning'
  | 'danger'
  | 'closed'
  | 'dead'
  | 'invert'
  | 'primary'
  | 'secondar'
  | 'tertiary'

export default defineComponent({
  name: 'OfBadge',
  props: {
    status: String as PropType<Status>,
    scale: String as PropType<Scale>,
    circular: Boolean,
    icon: Boolean,
    density: [String, Number]
  },
  setup(props) {
    const themeOptions = useThemeOptions()
    const density = computed(() => {
      let d = props.density
      if (d === 'default') {
        d = undefined
      } else if (typeof d === 'string') {
        d = parseInt(d, 10)
        if (isNaN(d)) d = undefined
      }
      if (typeof d !== 'number') {
        d = themeOptions.defaultDensity
      }
      if (typeof d !== 'number') {
        d = 2
      }
      return Math.max(0, Math.min(3, d || 0))
    })
    const badgeClass = computed(() => {
      return [
        'of--density-' + density.value,
        {
          ['state-' + props.status]: !!props.status,
          'of--circular': props.circular,
          'of--icon': props.icon,
          ...scaleClass(props.scale)
        }
      ]
    })

    return {
      badgeClass
    }
  }
})
</script>

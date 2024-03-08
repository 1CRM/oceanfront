<template>
  <slot :state="state" />
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { provideFocusGroup } from '../lib/focus'

export default defineComponent({
  name: 'OfFocusGroup',
  props: {
    focused: Boolean
  },
  emits: ['focus', 'blur'],
  setup(props, ctx) {
    const state = {
      focused: ref(!!props.focused)
    }
    watch(state.focused, (f) => {
      if (f) {
        ctx.emit('focus')
      } else {
        ctx.emit('blur')
      }
    })
    provideFocusGroup({
      focus() {
        state.focused.value = true
      },
      blur() {
        state.focused.value = false
      }
    })
    return {
      state
    }
  }
})
</script>

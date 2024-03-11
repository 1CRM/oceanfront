<template>
  <slot name="activator" v-bind="{ state, toggle }"></slot>
  <transition :name="transition">
    <div class="of-list-group" v-show="state">
      <slot :state="state" />
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'OfListGroup',
  props: {
    modelValue: Boolean,
    transition: String,
    value: [Boolean, String]
  },
  emits: ['update:modelValue'],
  setup(props, ctx) {
    const state = ref(!!props.modelValue || props.value)
    const toggle = (_args?: any) => {
      state.value = !state.value
      ctx.emit('update:modelValue', state.value)
    }
    return {
      state,
      toggle
    }
  }
})
</script>

<template>
  <of-overlay
    :active="activeSlot"
    align="left"
    :pad="false"
    :embed="embedVal"
    @blur="hide"
  >
    <template #default="{ state }">
      <transition :name="state === 'overlay' ? 'slide-right' : undefined">
        <nav
          class="of-sidebar"
          :class="classAttr"
          :id="idVal"
          role="navigation"
          v-if="activeSlot"
        >
          <slot></slot>
        </nav>
      </transition>
    </template>
  </of-overlay>
</template>

<script lang="ts">
import { ref, defineComponent, computed, watch } from 'vue'
import { OfOverlay } from './Overlay'

export default defineComponent({
  name: 'OfSidebar',
  components: { OfOverlay },
  inheritAttrs: false,
  props: {
    class: String,
    embed: Boolean,
    id: String,
    loading: Boolean,
    modelValue: Boolean,
  },
  emits: ['update:modelValue'],
  setup(props, ctx) {
    const activeSlot = ref(props.modelValue)
    watch(
      () => props.modelValue,
      (val) => {
        activeSlot.value = val
      },
    )
    const embedVal = computed(() => props.embed)
    const classAttr = computed(() => props.class)
    const hide = () => {
      activeSlot.value = false
      ctx.emit('update:modelValue', false)
    }
    const show = () => (activeSlot.value = true)
    return {
      activeSlot,
      idVal: computed(() => props.id),
      classAttr,
      embedVal,
      hide,
      show,
    }
  },
})
</script>

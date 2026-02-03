<template>
  <div class="workflow-canvas-plus-placeholder" :style="positionStyle">
    <button class="workflow-canvas-plus-placeholder__button" @click="handleClick" type="button">
      +
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type { Position } from '../types/workflow'

export default defineComponent({
  name: 'WorkflowPlusPlaceholder',
  props: {
    position: {
      type: Object as () => Position,
      required: true
    },
    afterNodeId: {
      type: String,
      default: undefined
    },
    inGroupId: {
      type: String,
      default: undefined
    }
  },
  emits: ['add-step'],
  setup(props, { emit }) {
    const positionStyle = computed(() => ({
      left: `${props.position.x}px`,
      top: `${props.position.y}px`,
      transform: 'translate(-50%, -50%)'
    }))

    function handleClick() {
      emit('add-step', {
        afterNodeId: props.afterNodeId,
        inGroupId: props.inGroupId
      })
    }

    return {
      positionStyle,
      handleClick
    }
  }
})
</script>

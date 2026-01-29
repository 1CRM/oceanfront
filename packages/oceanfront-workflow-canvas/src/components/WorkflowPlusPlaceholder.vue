<template>
  <div class="workflow-canvas-plus-placeholder" :style="positionStyle">
    <button class="workflow-canvas-plus-placeholder__button" @click="handleClick" type="button">+</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Position } from '../types/workflow'

defineOptions({
  name: 'WorkflowPlusPlaceholder'
})

const props = defineProps<{
  position: Position
  afterNodeId?: string
  inGroupId?: string
}>()

const emit = defineEmits<{
  'add-step': [{ afterNodeId?: string; inGroupId?: string }]
}>()

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
</script>

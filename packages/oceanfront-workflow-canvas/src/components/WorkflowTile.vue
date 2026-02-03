<template>
  <div
    class="workflow-canvas-tile"
    :class="{
      'workflow-canvas-tile--selected': selected,
      'workflow-canvas-tile--dragging': dragging
    }"
  >
    <div class="workflow-canvas-tile__header">
      <div class="workflow-canvas-tile__title">
        <of-icon
          v-if="nodeData.icon"
          scale="sm"
          :name="nodeData.icon"
          class="workflow-canvas-tile__icon"
        />
        <span class="workflow-canvas-tile__title-text">{{ nodeData.title || node.kind }}</span>
      </div>
      <of-button
        class="workflow-canvas-tile__menu"
        variant="text"
        scale="sm"
        @click.stop="handleMenuClick"
        @mousedown.stop
        :title="effectiveLabels.configureButton"
      >
        <of-icon scale="sm" name="more alt" />
      </of-button>
    </div>
    <div v-if="nodeData.description" class="workflow-canvas-tile__content">
      {{ nodeData.description }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNode, NodeData, WorkflowCanvasLabels } from '../types/workflow'
import { DEFAULT_LABELS } from '../constants/labels'

defineOptions({
  name: 'WorkflowTile'
})

const props = withDefaults(
  defineProps<{
    node: WorkflowNode
    selected?: boolean
    dragging?: boolean
    labels?: WorkflowCanvasLabels
  }>(),
  {
    selected: false,
    dragging: false
  }
)

// Use DEFAULT_LABELS if no labels provided
const effectiveLabels = computed(() => props.labels || DEFAULT_LABELS)

const emit = defineEmits<{
  'menu-click': []
}>()

const nodeData = computed(() => {
  const data = props.node.data as NodeData | undefined
  return {
    icon: data?.icon,
    title: data?.title,
    description: data?.description
  }
})

const handleMenuClick = () => emit('menu-click')
</script>

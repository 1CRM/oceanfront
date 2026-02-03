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

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type { WorkflowNode, NodeData, WorkflowCanvasLabels } from '../types/workflow'
import { DEFAULT_LABELS } from '../constants/labels'

export default defineComponent({
  name: 'WorkflowTile',
  props: {
    node: {
      type: Object as () => WorkflowNode,
      required: true
    },
    selected: {
      type: Boolean,
      default: false
    },
    dragging: {
      type: Boolean,
      default: false
    },
    labels: {
      type: Object as () => WorkflowCanvasLabels,
      default: undefined
    }
  },
  emits: ['menu-click'],
  setup(props, { emit }) {
    // Use DEFAULT_LABELS if no labels provided
    const effectiveLabels = computed(() => props.labels || DEFAULT_LABELS)

    const nodeData = computed(() => {
      const data = props.node.data as NodeData | undefined
      return {
        icon: data?.icon,
        title: data?.title,
        description: data?.description
      }
    })

    const handleMenuClick = () => emit('menu-click')

    return {
      effectiveLabels,
      nodeData,
      handleMenuClick
    }
  }
})
</script>

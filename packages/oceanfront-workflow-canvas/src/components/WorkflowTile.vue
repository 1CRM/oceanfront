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
        <span
          class="workflow-canvas-tile__title-text"
          :class="{ 'workflow-canvas-tile__title-text--placeholder': !node.title }"
        >
          {{ node.title || node.placeholder }}
        </span>
      </div>
      <of-button
        v-if="!viewMode"
        class="workflow-canvas-tile__menu"
        variant="text"
        scale="sm"
        :title="LABELS.configure"
        :aria-label="LABELS.configure"
        @click.stop="emit('menu-click')"
        @mousedown.stop
      >
        <of-icon scale="sm" name="more alt" />
      </of-button>
    </div>
    <div v-if="node.title && $slots.default" class="workflow-canvas-tile__content">
      <div class="workflow-canvas-tile__field">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { WorkflowNode } from '../types/workflow'
import { LABELS } from '../constants/labels'

export default defineComponent({
  name: 'WorkflowTile',
  props: {
    node: { type: Object as PropType<WorkflowNode>, required: true },
    selected: Boolean,
    dragging: Boolean,
    viewMode: Boolean
  },
  emits: ['menu-click'],
  setup(_props, { emit }) {
    return { emit, LABELS }
  }
})
</script>

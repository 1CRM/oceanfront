<template>
  <div
    class="workflow-canvas-group"
    :class="{
      'workflow-canvas-group--selected': selected,
      'workflow-canvas-group--dragging': dragging,
      'workflow-canvas-group--dropzone': isDropzone && !invalidDropTarget,
      'workflow-canvas-group--invalid-dropzone': invalidDropTarget && isInvalidDropzone,
      'workflow-canvas-group--nested': isNested,
      'workflow-canvas-group--child-hovered': isChildHovered
    }"
    :style="groupStyle"
    @mousedown="$emit('mousedown', $event, group)"
    @click.stop="$emit('click', group.id)"
  >
    <!-- Input handle -->
    <div
      v-if="!viewMode && !readonly && showInputHandle"
      class="workflow-canvas-group__handle workflow-canvas-group__handle--input"
      @mousedown.stop="$emit('handle-mousedown', $event, group.id, 'input')"
      @mouseup="$emit('handle-mouseup', group.id, 'input')"
    ></div>

    <div v-if="displayLabel" class="workflow-canvas-group__title">
      {{ displayLabel }}
    </div>

    <div v-if="displayLabelRight" class="workflow-canvas-group__label-right">
      {{ displayLabelRight }}
    </div>

    <!-- Hover menu with add node and add group options -->
    <div v-if="!viewMode && !readonly && !hideHoverMenu" class="workflow-canvas-group__hover-menu">
      <button
        class="workflow-canvas-group__hover-menu-button"
        @click.stop="$emit('add-node-to-group', group.id)"
        type="button"
        :title="labels.addNodeToGroupButton"
      >
        {{ addNodeButtonText }}
      </button>
      <button
        v-if="!wouldExceedMaxDepth"
        class="workflow-canvas-group__hover-menu-button"
        @click.stop="$emit('add-nested-group', group.id)"
        type="button"
        :title="labels.addNestedGroupButton"
      >
        {{ addGroupButtonText }}
      </button>
    </div>

    <!-- Output handle -->
    <div
      v-if="!viewMode && !readonly && showOutputHandle"
      class="workflow-canvas-group__handle workflow-canvas-group__handle--output"
      :class="{ 'workflow-canvas-group__handle--free': isOutputFree }"
      @mousedown.stop="$emit('handle-mousedown', $event, group.id, 'output')"
      @mouseup="$emit('handle-mouseup', group.id, 'output')"
    ></div>

    <!-- Resize handles -->
    <template v-if="!viewMode && !readonly">
      <!-- Edge handles -->
      <div
        class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top"
        @mousedown.stop="$emit('resize-mousedown', $event, group.id, 'top')"
      ></div>
      <div
        class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--right"
        @mousedown.stop="$emit('resize-mousedown', $event, group.id, 'right')"
      ></div>
      <div
        class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom"
        @mousedown.stop="$emit('resize-mousedown', $event, group.id, 'bottom')"
      ></div>
      <div
        class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--left"
        @mousedown.stop="$emit('resize-mousedown', $event, group.id, 'left')"
      ></div>

      <!-- Corner handles -->
      <div
        class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top-left"
        @mousedown.stop="$emit('resize-mousedown', $event, group.id, 'top-left')"
      ></div>
      <div
        class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top-right"
        @mousedown.stop="$emit('resize-mousedown', $event, group.id, 'top-right')"
      ></div>
      <div
        class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom-left"
        @mousedown.stop="$emit('resize-mousedown', $event, group.id, 'bottom-left')"
      ></div>
      <div
        class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom-right"
        @mousedown.stop="$emit('resize-mousedown', $event, group.id, 'bottom-right')"
      ></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { WorkflowGroup, WorkflowCanvasLabels, GroupTypeConfig } from '../types/workflow'

interface Props {
  group: WorkflowGroup
  selected: boolean
  dragging: boolean
  viewMode: boolean
  readonly: boolean
  labels: WorkflowCanvasLabels
  groupTypes: GroupTypeConfig
  groupStyle: Record<string, string | number>
  displayLabel: string
  displayLabelRight: string
  showInputHandle: boolean
  showOutputHandle: boolean
  isOutputFree: boolean
  hideHoverMenu: boolean
  wouldExceedMaxDepth: boolean
  addNodeButtonText: string
  addGroupButtonText: string
  isDropzone: boolean
  isInvalidDropzone: boolean
  invalidDropTarget: boolean
  isNested: boolean
  isChildHovered: boolean
}

defineProps<Props>()

defineEmits<{
  mousedown: [event: MouseEvent, group: WorkflowGroup]
  click: [groupId: string]
  'handle-mousedown': [event: MouseEvent, entityId: string, port: string]
  'handle-mouseup': [entityId: string, port: string]
  'add-node-to-group': [groupId: string]
  'add-nested-group': [groupId: string]
  'resize-mousedown': [event: MouseEvent, groupId: string, direction: string]
}>()
</script>

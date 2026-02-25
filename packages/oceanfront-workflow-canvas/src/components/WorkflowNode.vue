<template>
  <div
    :ref="el => setNodeRef(node.id, el as HTMLElement)"
    class="workflow-canvas-node"
    :class="{
      'workflow-canvas-node--selected': selected,
      'workflow-canvas-node--dragging': dragging,
      [nodeCssClass]: true
    }"
    :style="nodeStyle"
    @mousedown="handleMouseDown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Input handle -->
    <div
      v-if="!viewMode && !readonly && showInputHandle"
      class="workflow-canvas-node__handle workflow-canvas-node__handle--input"
      @mousedown.stop="$emit('handle-mousedown', $event, node.id, 'input')"
      @mouseup="$emit('handle-mouseup', node.id, 'input')"
      @mouseenter="$emit('handle-mouseenter', node.id)"
      @mouseleave="$emit('handle-mouseleave')"
    ></div>

    <!-- Node content (slot or default tile) -->
    <slot name="node" :node="node" :selected="selected" :on-menu-click="handleMenuClick">
      <WorkflowTile
        :node="node"
        :selected="selected"
        :dragging="dragging && !!parentGroup"
        :labels="labels"
        :node-types="nodeTypes"
        :view-mode="viewMode"
        @menu-click="handleMenuClick"
      />
    </slot>

    <!-- Hover menu with add node and add group options -->
    <div v-if="!viewMode && !readonly && !hideHoverMenu" class="workflow-canvas-node__hover-menu">
      <button
        class="workflow-canvas-node__hover-menu-button"
        @click.stop="$emit('add-node-after', node.id)"
        type="button"
        :title="labels.addNodeAfterNodeButton"
      >
        {{ addNodeButtonText }}
      </button>
      <button
        class="workflow-canvas-node__hover-menu-button"
        @click.stop="$emit('add-group-after', node.id)"
        type="button"
        :title="labels.addGroupAfterNodeButton"
      >
        {{ addGroupButtonText }}
      </button>
    </div>

    <!-- Output handle -->
    <div
      v-if="!viewMode && !readonly && showOutputHandle"
      class="workflow-canvas-node__handle workflow-canvas-node__handle--output"
      :class="{ 'workflow-canvas-node__handle--free': isOutputFree }"
      @mousedown.stop="$emit('handle-mousedown', $event, node.id, 'output')"
      @mouseup="$emit('handle-mouseup', node.id, 'output')"
      @mouseenter="$emit('handle-mouseenter', node.id)"
      @mouseleave="$emit('handle-mouseleave')"
      @click.stop="$emit('free-output-click', node.id)"
    >
      <span v-if="isOutputFree" class="workflow-canvas-node__handle-plus"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  WorkflowNode,
  WorkflowGroup,
  WorkflowCanvasLabels,
  NodeTypeConfig
} from '../types/workflow'
import WorkflowTile from './WorkflowTile.vue'

interface Props {
  node: WorkflowNode
  selected: boolean
  dragging: boolean
  viewMode: boolean
  readonly: boolean
  labels: WorkflowCanvasLabels
  nodeTypes: NodeTypeConfig
  parentGroup: WorkflowGroup | null
  showInputHandle: boolean
  showOutputHandle: boolean
  isOutputFree: boolean
  hideHoverMenu: boolean
  nodeStyle: Record<string, string>
  nodeCssClass: string
  addNodeButtonText: string
  addGroupButtonText: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  mousedown: [event: MouseEvent, node: WorkflowNode]
  mouseenter: [node: WorkflowNode]
  mouseleave: []
  'menu-click': [nodeId: string]
  'handle-mousedown': [event: MouseEvent, entityId: string, port: string]
  'handle-mouseup': [entityId: string, port: string]
  'handle-mouseenter': [entityId: string]
  'handle-mouseleave': []
  'add-node-after': [nodeId: string]
  'add-group-after': [nodeId: string]
  'free-output-click': [nodeId: string]
  'set-node-ref': [nodeId: string, el: HTMLElement | null]
}>()

function setNodeRef(nodeId: string, el: HTMLElement | null) {
  emit('set-node-ref', nodeId, el)
}

function handleMouseDown(event: MouseEvent) {
  emit('mousedown', event, props.node)
}

function handleMouseEnter() {
  emit('mouseenter', props.node)
}

function handleMouseLeave() {
  emit('mouseleave')
}

function handleMenuClick() {
  if (!props.node.readonly) {
    emit('menu-click', props.node.id)
  }
}
</script>

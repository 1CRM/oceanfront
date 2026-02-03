<template>
  <div class="workflow-canvas-wrapper">
    <div class="workflow-canvas" ref="canvasRef" @click="handleCanvasClick">
      <div class="workflow-canvas__container" :style="containerStyle">
        <!-- SVG layer for connectors -->
        <svg
          class="workflow-canvas__svg-layer"
          :viewBox="svgViewBox"
          :width="svgWidth"
          :height="svgHeight"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="5"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L0,10 L8,5 z" class="workflow-canvas-connector__marker" />
            </marker>
          </defs>

          <!-- Groups background (sorted by depth) -->
          <g v-for="group in sortedGroups" :key="group.id">
            <rect
              :x="group.position.x"
              :y="group.position.y"
              :width="group.size.w"
              :height="group.size.h"
              fill="transparent"
              stroke="none"
              rx="8"
            />
          </g>

          <!-- Edges -->
          <g v-for="edge in props.modelValue.edges" :key="edge.id">
            <path
              :d="getEdgePath(edge)"
              class="workflow-canvas-connector"
              marker-end="url(#arrowhead)"
            />
          </g>

          <!-- Preview connection while dragging -->
          <path
            v-if="connectionPreview"
            :d="connectionPreview.path"
            class="workflow-canvas-connector workflow-canvas-connector--preview"
          />
        </svg>

        <!-- Nodes layer -->
        <div class="workflow-canvas__nodes-layer">
          <!-- Group labels (sorted by depth) -->
          <div
            v-for="group in sortedGroups"
            :key="`group-label-${group.id}`"
            class="workflow-canvas-group"
            :class="{
              'workflow-canvas-group--selected': props.selectedId === group.id,
              'workflow-canvas-group--dragging': draggingGroupId === group.id,
              'workflow-canvas-group--dropzone':
                nodeOverGroupId === group.id || nodeOverGroupIds.includes(group.id),
              'workflow-canvas-group--nested': getGroupDepth(props.modelValue, group.id) > 0,
              'workflow-canvas-group--child-hovered': hoveredNodeGroupId === group.id
            }"
            :style="getGroupStyle(group)"
            @mousedown="handleGroupMouseDown($event, group)"
            @click.stop="handleGroupClick(group.id)"
          >
            <!-- Input handle -->
            <div
              v-if="!readonly"
              class="workflow-canvas-group__handle workflow-canvas-group__handle--input"
              @mousedown.stop="handleGroupHandleMouseDown($event, group.id, 'input')"
              @mouseup.stop="handleGroupHandleMouseUp(group.id, 'input')"
            ></div>

            <div v-if="group.title" class="workflow-canvas-group__title">{{ group.title }}</div>

            <!-- Output handle -->
            <div
              v-if="!readonly"
              class="workflow-canvas-group__handle workflow-canvas-group__handle--output"
              :class="{ 'workflow-canvas-group__handle--free': isOutputFree(group.id) }"
              @mousedown.stop="handleGroupHandleMouseDown($event, group.id, 'output')"
              @mouseup.stop="handleGroupHandleMouseUp(group.id, 'output')"
            ></div>

            <!-- Resize handles -->
            <template v-if="!readonly">
              <!-- Edge handles -->
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top"
                @mousedown.stop="handleResizeMouseDown($event, group.id, 'top')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--right"
                @mousedown.stop="handleResizeMouseDown($event, group.id, 'right')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom"
                @mousedown.stop="handleResizeMouseDown($event, group.id, 'bottom')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--left"
                @mousedown.stop="handleResizeMouseDown($event, group.id, 'left')"
              ></div>

              <!-- Corner handles -->
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top-left"
                @mousedown.stop="handleResizeMouseDown($event, group.id, 'top-left')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top-right"
                @mousedown.stop="handleResizeMouseDown($event, group.id, 'top-right')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom-left"
                @mousedown.stop="handleResizeMouseDown($event, group.id, 'bottom-left')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom-right"
                @mousedown.stop="handleResizeMouseDown($event, group.id, 'bottom-right')"
              ></div>
            </template>
          </div>

          <!-- Nodes -->
          <div
            v-for="node in props.modelValue.nodes"
            :key="node.id"
            :ref="el => setNodeRef(node.id, el as HTMLElement)"
            class="workflow-canvas-node"
            :class="{
              'workflow-canvas-node--selected': props.selectedId === node.id,
              'workflow-canvas-node--dragging': draggingNodeId === node.id
            }"
            :style="getNodeStyle(node)"
            @mousedown="handleNodeMouseDown($event, node)"
            @mouseenter="handleNodeMouseEnter(node)"
            @mouseleave="handleNodeMouseLeave"
          >
            <!-- Input handle -->
            <div
              v-if="!readonly"
              class="workflow-canvas-node__handle workflow-canvas-node__handle--input"
              @mousedown.stop="handleHandleMouseDown($event, node.id, 'input')"
              @mouseup.stop="handleHandleMouseUp(node.id, 'input')"
            ></div>

            <!-- Node content (slot or default tile) -->
            <slot
              name="node"
              :node="node"
              :selected="props.selectedId === node.id"
              :on-menu-click="
                () => {
                  emit('update:selectedId', node.id)
                  emit('node-click', node.id)
                }
              "
            >
              <WorkflowTile
                :node="node"
                :selected="props.selectedId === node.id"
                :dragging="
                  draggingNodeId === node.id && !!getParentGroup(props.modelValue, node.id)
                "
                @menu-click="
                  () => {
                    emit('update:selectedId', node.id)
                    emit('node-click', node.id)
                  }
                "
              />
            </slot>

            <!-- Output handle -->
            <div
              v-if="!readonly"
              class="workflow-canvas-node__handle workflow-canvas-node__handle--output"
              :class="{ 'workflow-canvas-node__handle--free': isOutputFree(node.id) }"
              @mousedown.stop="handleHandleMouseDown($event, node.id, 'output')"
              @mouseup.stop="handleHandleMouseUp(node.id, 'output')"
              @click.stop="handleFreeOutputClick(node.id)"
            >
              <span v-if="isOutputFree(node.id)" class="workflow-canvas-node__handle-plus"></span>
            </div>
          </div>

          <!-- Plus placeholders -->
          <WorkflowPlusPlaceholder
            v-for="placeholder in placeholders"
            :key="placeholder.key"
            :position="placeholder.position"
            :after-node-id="placeholder.afterNodeId"
            :in-group-id="placeholder.inGroupId"
            @add-step="handleAddStep"
          />
        </div>
      </div>
    </div>

    <!-- Configuration panel -->
    <slot
      name="panel"
      :selected-node="selectedNode"
      :selected-group="selectedGroup"
      :close="closePanel"
    >
      <!-- Default panel content if no slot provided -->
      <WorkflowConfigPanel
        :selected-node="selectedNode"
        :selected-group="selectedGroup"
        :graph="props.modelValue"
        @close="closePanel"
        @delete-node="handleDeleteNode"
        @delete-group="handleDeleteGroup"
        @update-node="handleUpdateNode"
        @update-group="handleUpdateGroup"
      />
    </slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  Position,
  WorkflowGroup,
  AddStepEvent,
  ConnectEvent
} from '../types/workflow'
import {
  updateNodePosition,
  findNode,
  findEntity,
  findGroup,
  findGroupAtPosition,
  findAllGroupsAtPosition,
  getParentGroup,
  removeEntityFromAllGroups,
  addEntityToGroup,
  updateGroupPosition,
  getGroupDepth,
  wouldCreateCycle,
  calculateGroupMinimumSize,
  updateGroupBounds,
  isPointInRect,
  areEntitiesInDifferentGroups
} from '../utils/graph-helpers'
import WorkflowTile from './WorkflowTile.vue'
import WorkflowConfigPanel from './WorkflowConfigPanel.vue'
import WorkflowPlusPlaceholder from './WorkflowPlusPlaceholder.vue'

defineOptions({
  name: 'WorkflowCanvas'
})

const props = withDefaults(
  defineProps<{
    modelValue: WorkflowGraph
    readonly?: boolean
    selectedId?: string | null
    width?: number
    height?: number
  }>(),
  {
    readonly: false,
    selectedId: null,
    width: 1000,
    height: 1000
  }
)

const emit = defineEmits<{
  'update:modelValue': [graph: WorkflowGraph]
  'update:selectedId': [id: string | null]
  'add-step': [event: AddStepEvent]
  connect: [event: ConnectEvent]
  'node-drag-start': [nodeId: string]
  'node-drag-end': [nodeId: string, position: Position]
  'node-click': [nodeId: string]
  'node-delete': [nodeId: string]
  'node-update': [node: WorkflowNode]
  'group-drag-start': [groupId: string]
  'group-drag-end': [groupId: string, position: Position]
  'group-click': [groupId: string]
  'group-delete': [groupId: string]
  'group-update': [group: WorkflowGroup]
  'group-resize-start': [groupId: string]
  'group-resize-end': [groupId: string, size: { w: number; h: number }]
  'edge-delete': [edgeId: string]
  'canvas-click': []
  'entity-moved-to-group': [entityId: string, groupId: string | null]
}>()

// Helper function to remove all edges connected to an entity
function removeEdgesForEntity(graph: WorkflowGraph, entityId: string): WorkflowGraph {
  return {
    ...graph,
    edges: graph.edges.filter(
      edge => edge.from.entityId !== entityId && edge.to.entityId !== entityId
    )
  }
}

// Helper function to find target group at position, excluding a specific group
function findDropTargetGroup(
  x: number,
  y: number,
  excludeId: string | null
): WorkflowGroup | undefined {
  // Get all groups at this position, sorted by depth (deepest first)
  const allGroupsAtPosition = findAllGroupsAtPosition(props.modelValue, { x, y })
    .filter(g => g.id !== excludeId)
    .sort((a, b) => getGroupDepth(props.modelValue, b.id) - getGroupDepth(props.modelValue, a.id))

  // Return the deepest group that isn't the one being excluded
  return allGroupsAtPosition.length > 0 ? allGroupsAtPosition[0] : undefined
}

const selectedNode = computed(() =>
  props.selectedId ? findNode(props.modelValue, props.selectedId) : null
)

const selectedGroup = computed(() =>
  props.selectedId ? props.modelValue.groups.find(g => g.id === props.selectedId) : null
)

const canvasRef = ref<HTMLElement>()
const nodeElements = ref<Map<string, HTMLElement>>(new Map())
const draggingNodeId = ref<string | null>(null)
const draggingGroupId = ref<string | null>(null)
const dragOffset = ref<Position>({ x: 0, y: 0 })
const connectionPreview = ref<{ path: string; fromNodeId: string } | null>(null)
const connectionDragStart = ref<{ nodeId: string; port: string } | null>(null)
const connectionDragMoved = ref(false)
const draggedNodeOriginalGroup = ref<string | null>(null)
const disconnectingEdge = ref<WorkflowEdge | null>(null)
const nodeOverGroupId = ref<string | null>(null)
const nodeOverGroupIds = ref<string[]>([])
const hoveredNodeGroupId = ref<string | null>(null)
const resizingGroupId = ref<string | null>(null)
const resizeDirection = ref<string | null>(null)
const resizeStartBounds = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const resizeStartMousePos = ref<Position | null>(null)

// Calculate container size to fit all nodes and groups
const containerStyle = computed(() => {
  let width = props.width
  let height = props.height

  props.modelValue.nodes.forEach(node => {
    const right = node.position.x + (node.size?.w || 250)
    const bottom = node.position.y + (node.size?.h || 100)
    if (right > width) width = right
    if (bottom > height) height = bottom
  })

  props.modelValue.groups.forEach(group => {
    const right = group.position.x + group.size.w
    const bottom = group.position.y + group.size.h
    if (right > width) width = right
    if (bottom > height) height = bottom
  })

  return {
    width: `${width + 100}px`,
    height: `${height + 100}px`
  }
})

const svgViewBox = computed(() => {
  const style = containerStyle.value
  const width = parseInt(style.width)
  const height = parseInt(style.height)
  return `0 0 ${width} ${height}`
})

const svgWidth = computed(() => containerStyle.value.width)
const svgHeight = computed(() => containerStyle.value.height)

// Calculate plus placeholder positions on edges
const placeholders = computed(() => {
  const result: Array<{
    key: string
    position: Position
    afterNodeId?: string
    inGroupId?: string
  }> = []

  if (props.readonly) return result

  // Show "+" on all edges
  props.modelValue.edges.forEach(edge => {
    const fromNode = findNode(props.modelValue, edge.from.entityId)
    const toNode = findNode(props.modelValue, edge.to.entityId)

    if (!fromNode || !toNode) return

    // Calculate midpoint between the two nodes
    const fromCenter = getNodeCenter(fromNode)
    const toCenter = getNodeCenter(toNode)

    const fromDimensions = getNodeDimensions(fromNode)
    const toDimensions = getNodeDimensions(toNode)

    // Output handle is on the bottom of source node
    fromCenter.y += fromDimensions.height / 2
    // Input handle is on the top of target node
    toCenter.y -= toDimensions.height / 2

    // Calculate midpoint
    const midX = (fromCenter.x + toCenter.x) / 2
    const midY = (fromCenter.y + toCenter.y) / 2

    // Get the parent group of the source node (if any)
    const parentGroup = getParentGroup(props.modelValue, fromNode.id)

    result.push({
      key: `edge-${edge.id}`,
      position: { x: midX, y: midY },
      afterNodeId: fromNode.id,
      inGroupId: parentGroup?.id
    })
  })

  return result
})

function setNodeRef(nodeId: string, el: HTMLElement | null) {
  if (el) {
    nodeElements.value.set(nodeId, el)
  } else {
    nodeElements.value.delete(nodeId)
  }
}

function getNodeStyle(node: WorkflowNode) {
  return {
    left: `${node.position.x}px`,
    top: `${node.position.y}px`,
    width: node.size?.w ? `${node.size.w}px` : '250px',
    height: node.size?.h ? `${node.size.h}px` : 'auto'
  }
}

function getGroupStyle(group: WorkflowGroup) {
  return {
    left: `${group.position.x}px`,
    top: `${group.position.y}px`,
    width: `${group.size.w}px`,
    height: `${group.size.h}px`,
    zIndex: getGroupDepth(props.modelValue, group.id)
  }
}

// Sort groups by depth (lowest depth first, so nested groups render on top)
const sortedGroups = computed(() => {
  return [...props.modelValue.groups].sort((a, b) => {
    return getGroupDepth(props.modelValue, a.id) - getGroupDepth(props.modelValue, b.id)
  })
})

function getNodeDimensions(node: WorkflowNode): { width: number; height: number } {
  // Try to get actual rendered dimensions from DOM element
  const element = nodeElements.value.get(node.id)
  if (element) {
    const rect = element.getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height
    }
  }

  // Fall back to node.size or defaults
  return {
    width: node.size?.w || 250,
    height: node.size?.h || 100
  }
}

function getNodeCenter(node: WorkflowNode): Position {
  const { width, height } = getNodeDimensions(node)
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2
  }
}

function getEntityCenter(entity: WorkflowNode | WorkflowGroup): Position {
  if ('kind' in entity && 'containedIds' in entity) {
    // It's a group
    return {
      x: entity.position.x + entity.size.w / 2,
      y: entity.position.y + entity.size.h / 2
    }
  } else {
    // It's a node
    return getNodeCenter(entity)
  }
}

function getEntityDimensions(entity: WorkflowNode | WorkflowGroup): {
  width: number
  height: number
} {
  if ('kind' in entity && 'containedIds' in entity) {
    // It's a group
    return {
      width: entity.size.w,
      height: entity.size.h
    }
  } else {
    // It's a node
    return getNodeDimensions(entity)
  }
}

function getEdgePath(edge: WorkflowEdge): string {
  const fromEntity = findEntity(props.modelValue, edge.from.entityId)
  const toEntity = findEntity(props.modelValue, edge.to.entityId)

  if (!fromEntity || !toEntity) return ''

  const fromPos = getEntityCenter(fromEntity)
  const toPos = getEntityCenter(toEntity)

  const fromDimensions = getEntityDimensions(fromEntity)
  const toDimensions = getEntityDimensions(toEntity)

  // Output handle is on the bottom
  fromPos.y += fromDimensions.height / 2
  // Input handle is on the top
  toPos.y -= toDimensions.height / 2

  // Simple bezier curve with vertical control points
  const dy = toPos.y - fromPos.y
  const controlOffset = Math.abs(dy) / 2

  return `M ${fromPos.x},${fromPos.y} C ${fromPos.x},${fromPos.y + controlOffset} ${toPos.x},${toPos.y - controlOffset} ${toPos.x},${toPos.y}`
}

// Check if an entity's output handle is free (no outgoing edge)
function isOutputFree(entityId: string): boolean {
  return !props.modelValue.edges.some(edge => edge.from.entityId === entityId)
}

function handleCanvasClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target === canvasRef.value || target.classList.contains('workflow-canvas__container')) {
    emit('update:selectedId', null)
    emit('canvas-click')
  }
}

function handleGroupClick(groupId: string) {
  if (!props.readonly) {
    emit('update:selectedId', groupId)
    emit('group-click', groupId)
  }
}

function handleNodeMouseEnter(node: WorkflowNode) {
  const parentGroup = getParentGroup(props.modelValue, node.id)
  if (parentGroup) {
    hoveredNodeGroupId.value = parentGroup.id
  }
}

function handleNodeMouseLeave() {
  hoveredNodeGroupId.value = null
}

function getCanvasMousePosition(event: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  return {
    x: event.clientX - rect.left + canvas.scrollLeft,
    y: event.clientY - rect.top + canvas.scrollTop
  }
}

function handleGroupMouseDown(event: MouseEvent, group: WorkflowGroup) {
  if (props.readonly) return
  // Only handle left mouse button (button 0)
  if (event.button !== 0) return

  const target = event.target as HTMLElement
  if (target.closest('.workflow-canvas-node')) return
  if (target.classList.contains('workflow-canvas-group__handle')) return
  if (target.classList.contains('workflow-canvas-group__resize-handle')) return

  event.preventDefault()
  const mousePos = getCanvasMousePosition(event)
  if (!mousePos) return

  dragOffset.value = {
    x: mousePos.x - group.position.x,
    y: mousePos.y - group.position.y
  }

  const currentParent = getParentGroup(props.modelValue, group.id)
  draggedNodeOriginalGroup.value = currentParent?.id || null
  draggingGroupId.value = group.id
  emit('group-drag-start', group.id)
  // Group selection handled by handleGroupClick, not during mousedown
}

function handleNodeMouseDown(event: MouseEvent, node: WorkflowNode) {
  if (props.readonly) return
  if ((event.target as HTMLElement).classList.contains('workflow-canvas-node__handle')) return
  // Only handle left mouse button (button 0)
  if (event.button !== 0) return

  event.preventDefault()
  const mousePos = getCanvasMousePosition(event)
  if (!mousePos) return

  dragOffset.value = {
    x: mousePos.x - node.position.x,
    y: mousePos.y - node.position.y
  }

  const currentGroup = getParentGroup(props.modelValue, node.id)
  draggedNodeOriginalGroup.value = currentGroup?.id || null
  draggingNodeId.value = node.id
  emit('node-drag-start', node.id)
  // Node selection removed - only select via menu click
}

// Handle group resize during mouse move
function handleResizeMove(mousePos: Position) {
  if (
    !resizingGroupId.value ||
    !resizeDirection.value ||
    !resizeStartBounds.value ||
    !resizeStartMousePos.value
  ) {
    return false
  }

  const group = findGroup(props.modelValue, resizingGroupId.value)
  if (!group) return true

  const deltaX = mousePos.x - resizeStartMousePos.value.x
  const deltaY = mousePos.y - resizeStartMousePos.value.y
  const minimumSize = calculateGroupMinimumSize(props.modelValue, resizingGroupId.value)

  let newPosition = { ...group.position }
  let newSize = { ...group.size }

  // Handle different resize directions
  switch (resizeDirection.value) {
    case 'right':
      newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w + deltaX)
      break
    case 'left':
      newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w - deltaX)
      newPosition.x = resizeStartBounds.value.x + (resizeStartBounds.value.w - newSize.w)
      break
    case 'bottom':
      newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h + deltaY)
      break
    case 'top':
      newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h - deltaY)
      newPosition.y = resizeStartBounds.value.y + (resizeStartBounds.value.h - newSize.h)
      break
    case 'top-left':
      newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w - deltaX)
      newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h - deltaY)
      newPosition.x = resizeStartBounds.value.x + (resizeStartBounds.value.w - newSize.w)
      newPosition.y = resizeStartBounds.value.y + (resizeStartBounds.value.h - newSize.h)
      break
    case 'top-right':
      newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w + deltaX)
      newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h - deltaY)
      newPosition.y = resizeStartBounds.value.y + (resizeStartBounds.value.h - newSize.h)
      break
    case 'bottom-left':
      newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w - deltaX)
      newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h + deltaY)
      newPosition.x = resizeStartBounds.value.x + (resizeStartBounds.value.w - newSize.w)
      break
    case 'bottom-right':
      newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w + deltaX)
      newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h + deltaY)
      break
  }

  const updatedGraph = {
    ...props.modelValue,
    groups: props.modelValue.groups.map(g =>
      g.id === resizingGroupId.value ? { ...g, position: newPosition, size: newSize } : g
    )
  }
  emit('update:modelValue', updatedGraph)
  return true
}

// Handle group drag during mouse move
function handleGroupDragMove(newPosition: Position) {
  if (!draggingGroupId.value) return false

  const updatedGraph = updateGroupPosition(props.modelValue, draggingGroupId.value, newPosition)
  emit('update:modelValue', updatedGraph)

  const group = findGroup(updatedGraph, draggingGroupId.value)
  if (!group) return true

  const groupCenter = {
    x: group.position.x + group.size.w / 2,
    y: group.position.y + group.size.h / 2
  }

  const targetGroup = findDropTargetGroup(groupCenter.x, groupCenter.y, draggingGroupId.value)
  let allGroupsAtPosition = findAllGroupsAtPosition(updatedGraph, groupCenter).filter(
    g => g.id !== draggingGroupId.value
  )

  const originalParent = draggedNodeOriginalGroup.value
  let centerInOriginalParent = false

  if (originalParent) {
    const parentGroup = findGroup(updatedGraph, originalParent)
    if (parentGroup) {
      centerInOriginalParent = isPointInRect(groupCenter, {
        x: parentGroup.position.x,
        y: parentGroup.position.y,
        w: parentGroup.size.w,
        h: parentGroup.size.h
      })
    }
  }

  // Show dropzone highlight
  if (targetGroup && !wouldCreateCycle(updatedGraph, draggingGroupId.value, targetGroup.id)) {
    nodeOverGroupId.value = targetGroup.id
    nodeOverGroupIds.value = allGroupsAtPosition.map(g => g.id)
  } else if (centerInOriginalParent && originalParent) {
    nodeOverGroupId.value = originalParent
    nodeOverGroupIds.value = allGroupsAtPosition.map(g => g.id)
  } else {
    nodeOverGroupId.value = null
    nodeOverGroupIds.value = []
  }

  return true
}

// Handle node drag during mouse move
function handleNodeDragMove(newPosition: Position) {
  if (!draggingNodeId.value) return false

  const updatedGraph = updateNodePosition(props.modelValue, draggingNodeId.value, newPosition)
  emit('update:modelValue', updatedGraph)

  const node = findNode(updatedGraph, draggingNodeId.value)
  if (!node) return true

  const nodeDimensions = getNodeDimensions(node)
  const nodeCenter = {
    x: node.position.x + nodeDimensions.width / 2,
    y: node.position.y + nodeDimensions.height / 2
  }

  const targetGroup = findGroupAtPosition(updatedGraph, nodeCenter)
  const allGroupsAtPosition = findAllGroupsAtPosition(updatedGraph, nodeCenter)

  if (targetGroup) {
    nodeOverGroupId.value = targetGroup.id
    nodeOverGroupIds.value = allGroupsAtPosition.map(g => g.id)
  } else {
    nodeOverGroupId.value = null
    nodeOverGroupIds.value = []
  }

  return true
}

// Handle connection preview during mouse move
function handleConnectionDragMove(mousePos: Position) {
  if (!connectionDragStart.value) return false

  connectionDragMoved.value = true

  const dragEntity = findEntity(props.modelValue, connectionDragStart.value.nodeId)
  if (!dragEntity) return true

  const dragPos = getEntityCenter(dragEntity)
  const dragDimensions = getEntityDimensions(dragEntity)

  let startPos: Position
  let endPos: Position = mousePos
  let startControlY: number
  let endControlY: number

  if (connectionDragStart.value.port === 'input') {
    startPos = { x: dragPos.x, y: dragPos.y - dragDimensions.height / 2 }
    const dy = endPos.y - startPos.y
    const controlOffset = Math.abs(dy) / 2
    startControlY = startPos.y - controlOffset
    endControlY = endPos.y + controlOffset
  } else {
    startPos = { x: dragPos.x, y: dragPos.y + dragDimensions.height / 2 }
    const dy = endPos.y - startPos.y
    const controlOffset = Math.abs(dy) / 2
    startControlY = startPos.y + controlOffset
    endControlY = endPos.y - controlOffset
  }

  connectionPreview.value = {
    path: `M ${startPos.x},${startPos.y} C ${startPos.x},${startControlY} ${endPos.x},${endControlY} ${endPos.x},${endPos.y}`,
    fromNodeId: connectionDragStart.value.nodeId
  }

  return true
}

function handleMouseMove(event: MouseEvent) {
  const mousePos = getCanvasMousePosition(event)
  if (!mousePos) return

  // Try each handler in order
  if (handleResizeMove(mousePos)) return

  const newPosition = {
    x: Math.max(0, mousePos.x - dragOffset.value.x),
    y: Math.max(0, mousePos.y - dragOffset.value.y)
  }

  if (handleGroupDragMove(newPosition)) return
  if (handleNodeDragMove(newPosition)) return
  if (handleConnectionDragMove(mousePos)) return
}

function handleMouseUp() {
  if (resizingGroupId.value) {
    const groupId = resizingGroupId.value
    const group = findGroup(props.modelValue, groupId)

    // Update parent groups recursively to fit the resized group
    const parentGroup = getParentGroup(props.modelValue, groupId)
    if (parentGroup) {
      const updatedGraph = updateGroupBounds(props.modelValue, parentGroup.id)
      emit('update:modelValue', updatedGraph)
    }

    // Emit resize end event
    if (group) {
      emit('group-resize-end', groupId, { w: group.size.w, h: group.size.h })
    }

    // Clear resize state
    resizingGroupId.value = null
    resizeDirection.value = null
    resizeStartBounds.value = null
    resizeStartMousePos.value = null
    return
  }

  if (draggingGroupId.value) {
    const groupId = draggingGroupId.value
    const group = findGroup(props.modelValue, groupId)

    if (group) {
      // Check if group center is inside another group
      const groupCenter = {
        x: group.position.x + group.size.w / 2,
        y: group.position.y + group.size.h / 2
      }
      let targetGroup = findDropTargetGroup(groupCenter.x, groupCenter.y, groupId)
      const originalParent = draggedNodeOriginalGroup.value

      // Check if center is still inside the original parent (for sticky behavior)
      let centerInOriginalParent = false
      if (originalParent) {
        const parentGroup = findGroup(props.modelValue, originalParent)
        if (parentGroup) {
          centerInOriginalParent = isPointInRect(groupCenter, {
            x: parentGroup.position.x,
            y: parentGroup.position.y,
            w: parentGroup.size.w,
            h: parentGroup.size.h
          })
        }
      }

      let updatedGraph = props.modelValue

      // Check if parent group changed
      let parentChanged = false

      // Determine the action based on target and original parent
      if (
        targetGroup &&
        targetGroup.id !== groupId &&
        !wouldCreateCycle(props.modelValue, groupId, targetGroup.id)
      ) {
        // Center is inside a valid target group
        if (originalParent !== targetGroup.id) {
          // Moving from one parent to another (or from no parent to a parent)
          parentChanged = true
          updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)

          // Update the old parent's bounds if it exists
          if (originalParent) {
            updatedGraph = updateGroupBounds(updatedGraph, originalParent)
          }

          // Add to the new parent group (bounds auto-updated in addEntityToGroup)
          updatedGraph = addEntityToGroup(updatedGraph, groupId, targetGroup.id)

          // If parent changed, remove all connected edges
          if (parentChanged) {
            updatedGraph = {
              ...updatedGraph,
              edges: updatedGraph.edges.filter(
                edge => edge.from.entityId !== groupId && edge.to.entityId !== groupId
              )
            }
          }

          emit('update:modelValue', updatedGraph)
          emit('entity-moved-to-group', groupId, targetGroup.id)
        } else if (originalParent) {
          // Moved within the same parent group - update parent bounds
          updatedGraph = updateGroupBounds(updatedGraph, originalParent)
          emit('update:modelValue', updatedGraph)
        }
      } else if (centerInOriginalParent && originalParent) {
        // Center is still inside original parent (even though targetGroup might be undefined due to nesting)
        // Stay in the parent and update its bounds
        updatedGraph = updateGroupBounds(updatedGraph, originalParent)
        emit('update:modelValue', updatedGraph)
      } else if (originalParent && !centerInOriginalParent) {
        // Center has left the original parent - detach from parent
        parentChanged = true
        updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)
        updatedGraph = updateGroupBounds(updatedGraph, originalParent)

        // If parent changed, remove all connected edges
        if (parentChanged) {
          updatedGraph = {
            ...updatedGraph,
            edges: updatedGraph.edges.filter(
              edge => edge.from.entityId !== groupId && edge.to.entityId !== groupId
            )
          }
        }

        emit('update:modelValue', updatedGraph)
        emit('entity-moved-to-group', groupId, null)
      }

      // Emit group drag end event
      emit('group-drag-end', groupId, group.position)
    }

    draggingGroupId.value = null
    draggedNodeOriginalGroup.value = null
    nodeOverGroupId.value = null
    nodeOverGroupIds.value = []
  } else if (draggingNodeId.value) {
    const nodeId = draggingNodeId.value
    const node = findNode(props.modelValue, nodeId)

    if (node) {
      // Check if node center is inside a group
      const nodeDimensions = getNodeDimensions(node)
      const nodeCenter = {
        x: node.position.x + nodeDimensions.width / 2,
        y: node.position.y + nodeDimensions.height / 2
      }
      const targetGroup = findGroupAtPosition(props.modelValue, nodeCenter)
      const originalGroup = draggedNodeOriginalGroup.value

      let updatedGraph = props.modelValue

      // Check if parent group changed
      const parentChanged = originalGroup !== (targetGroup?.id || null)

      // Moving between groups or in/out of groups
      // If moving out of a group, update the original group's bounds
      if (originalGroup) {
        updatedGraph = removeEntityFromAllGroups(updatedGraph, nodeId)
        updatedGraph = updateGroupBounds(updatedGraph, originalGroup)
      } else {
        updatedGraph = removeEntityFromAllGroups(updatedGraph, nodeId)
      }

      // If dropped inside a different group, add to that group (bounds auto-updated in addEntityToGroup)
      if (targetGroup) {
        updatedGraph = addEntityToGroup(updatedGraph, nodeId, targetGroup.id)
      }

      // If parent changed, remove all connected edges
      if (parentChanged) {
        updatedGraph = {
          ...updatedGraph,
          edges: updatedGraph.edges.filter(
            edge => edge.from.entityId !== nodeId && edge.to.entityId !== nodeId
          )
        }
      }

      emit('update:modelValue', updatedGraph)

      // Emit entity moved to group event
      if (targetGroup) {
        emit('entity-moved-to-group', nodeId, targetGroup.id)
      } else if (originalGroup) {
        emit('entity-moved-to-group', nodeId, null)
      }

      // Emit node drag end event
      emit('node-drag-end', nodeId, node.position)
    }

    draggingNodeId.value = null
    draggedNodeOriginalGroup.value = null
    nodeOverGroupId.value = null
    nodeOverGroupIds.value = []
  }

  if (connectionDragStart.value) {
    // If we were disconnecting an edge and released without connecting to a new target,
    // remove the edge
    if (disconnectingEdge.value) {
      const edgeId = disconnectingEdge.value.id
      const updatedGraph = {
        ...props.modelValue,
        edges: props.modelValue.edges.filter(edge => edge.id !== edgeId)
      }
      emit('update:modelValue', updatedGraph)
      emit('edge-delete', edgeId)
      disconnectingEdge.value = null
    }

    connectionDragStart.value = null
    connectionPreview.value = null
    connectionDragMoved.value = false
  }
}

// Generic function to handle handle mouse down for both nodes and groups
function handleEntityHandleMouseDown(event: MouseEvent, entityId: string, port: string) {
  if (props.readonly) return
  // Only handle left mouse button (button 0)
  if (event.button !== 0) return

  event.preventDefault()
  event.stopPropagation()

  // Check if this is an input handle with an existing connection
  if (port === 'input') {
    const existingEdge = props.modelValue.edges.find(edge => edge.to.entityId === entityId)
    if (existingEdge) {
      // Start disconnecting: drag from the input handle itself
      connectionDragStart.value = { nodeId: entityId, port: 'input' }
      disconnectingEdge.value = existingEdge
      return
    }
  }

  // Check if this is an output handle with an existing connection
  if (port === 'output') {
    const existingEdge = props.modelValue.edges.find(edge => edge.from.entityId === entityId)
    if (existingEdge) {
      // Start disconnecting: drag from the output handle itself
      connectionDragStart.value = { nodeId: entityId, port: 'output' }
      disconnectingEdge.value = existingEdge
      return
    }
  }

  // Normal connection start (no existing edge)
  connectionDragStart.value = { nodeId: entityId, port }
  disconnectingEdge.value = null
}

// Wrapper functions for backward compatibility with template
function handleHandleMouseDown(event: MouseEvent, nodeId: string, port: string) {
  handleEntityHandleMouseDown(event, nodeId, port)
}

function handleGroupHandleMouseDown(event: MouseEvent, groupId: string, port: string) {
  handleEntityHandleMouseDown(event, groupId, port)
}

function handleResizeMouseDown(event: MouseEvent, groupId: string, direction: string) {
  if (props.readonly) return
  // Only handle left mouse button (button 0)
  if (event.button !== 0) return

  event.preventDefault()
  event.stopPropagation()

  const group = findGroup(props.modelValue, groupId)
  if (!group) return

  const mousePos = getCanvasMousePosition(event)
  if (!mousePos) return

  resizingGroupId.value = groupId
  resizeDirection.value = direction
  resizeStartBounds.value = {
    x: group.position.x,
    y: group.position.y,
    w: group.size.w,
    h: group.size.h
  }
  resizeStartMousePos.value = mousePos
  emit('update:selectedId', groupId)
  emit('group-resize-start', groupId)
}

// Generic function to handle handle mouse up for both nodes and groups
function handleEntityHandleMouseUp(entityId: string, port: string) {
  if (props.readonly) return

  if (connectionDragStart.value && connectionDragStart.value.nodeId !== entityId) {
    let shouldConnect = false
    let fromEntityId = ''
    let toEntityId = ''

    // Determine connection direction based on drag start port
    if (connectionDragStart.value.port === 'input') {
      // Dragging from input handle - can only connect to output handles
      if (port === 'output') {
        shouldConnect = true
        fromEntityId = entityId // The entity we're dropping on becomes the source
        toEntityId = connectionDragStart.value.nodeId // The entity we started from becomes the target
      }
    } else {
      // Dragging from output handle - can only connect to input handles
      if (port === 'input') {
        shouldConnect = true
        fromEntityId = connectionDragStart.value.nodeId
        toEntityId = entityId
      }
    }

    // Check if entities are in different groups
    if (shouldConnect && areEntitiesInDifferentGroups(props.modelValue, fromEntityId, toEntityId)) {
      shouldConnect = false
    }

    if (shouldConnect) {
      // If we were disconnecting an edge, remove it first
      if (disconnectingEdge.value) {
        const updatedGraph = {
          ...props.modelValue,
          edges: props.modelValue.edges.filter(edge => edge.id !== disconnectingEdge.value!.id)
        }
        emit('update:modelValue', updatedGraph)
      }

      // Emit connect event for the new connection
      emit('connect', {
        fromNodeId: fromEntityId,
        toNodeId: toEntityId
      })
    }
  }

  connectionDragStart.value = null
  connectionPreview.value = null
  disconnectingEdge.value = null
}

// Wrapper functions for backward compatibility with template
function handleGroupHandleMouseUp(groupId: string, port: string) {
  handleEntityHandleMouseUp(groupId, port)
}

function handleHandleMouseUp(nodeId: string, port: string) {
  handleEntityHandleMouseUp(nodeId, port)
}

const handleAddStep = (event: AddStepEvent) => emit('add-step', event)
const closePanel = () => emit('update:selectedId', null)

function handleFreeOutputClick(nodeId: string) {
  // Only trigger if output is actually free and no drag occurred
  if (!isOutputFree(nodeId)) return
  if (connectionDragMoved.value) return

  // Get the parent group of the node (if any)
  const parentGroup = getParentGroup(props.modelValue, nodeId)

  // Emit add-step event with the current node as afterNodeId and group info
  emit('add-step', {
    afterNodeId: nodeId,
    inGroupId: parentGroup?.id
  })
}

function handleDeleteNode() {
  // Remove the node from the graph
  const nodeId = selectedNode.value?.id
  if (!nodeId) return

  // Get the parent group before removing the node
  const parentGroup = getParentGroup(props.modelValue, nodeId)

  const updatedGraph = {
    ...props.modelValue,
    nodes: props.modelValue.nodes.filter(node => node.id !== nodeId),
    edges: props.modelValue.edges.filter(
      edge => edge.from.entityId !== nodeId && edge.to.entityId !== nodeId
    )
  }

  // Remove node from any groups
  let graphWithoutNode = removeEntityFromAllGroups(updatedGraph, nodeId)

  // Update parent group bounds if it exists
  if (parentGroup) {
    graphWithoutNode = updateGroupBounds(graphWithoutNode, parentGroup.id)
  }

  // Close the panel
  emit('update:selectedId', null)
  // Update the graph
  emit('update:modelValue', graphWithoutNode)
  // Emit node delete event
  emit('node-delete', nodeId)
}

function handleDeleteGroup() {
  const groupId = selectedGroup.value?.id
  if (!groupId) return

  // Remove the group from the graph and its edges
  let updatedGraph = {
    ...props.modelValue,
    groups: props.modelValue.groups.filter(group => group.id !== groupId),
    edges: props.modelValue.edges.filter(
      edge => edge.from.entityId !== groupId && edge.to.entityId !== groupId
    )
  }

  // Remove group from any parent groups
  updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)

  // Close the panel
  emit('update:selectedId', null)
  // Update the graph
  emit('update:modelValue', updatedGraph)
  // Emit group delete event
  emit('group-delete', groupId)
}

function handleUpdateNode(updatedNode: WorkflowNode) {
  // Update the node in the graph
  const updatedGraph = {
    ...props.modelValue,
    nodes: props.modelValue.nodes.map(node => (node.id === updatedNode.id ? updatedNode : node))
  }

  // Update the graph
  emit('update:modelValue', updatedGraph)
  // Emit node update event
  emit('node-update', updatedNode)
}

function handleUpdateGroup(updatedGroup: WorkflowGroup) {
  // Update the group in the graph
  const updatedGraph = {
    ...props.modelValue,
    groups: props.modelValue.groups.map(group =>
      group.id === updatedGroup.id ? updatedGroup : group
    )
  }

  // Update the graph
  emit('update:modelValue', updatedGraph)
  // Emit group update event
  emit('group-update', updatedGroup)
}

function handleKeyDown(event: KeyboardEvent) {
  // Only handle Delete/Backspace when something is selected and not in readonly mode
  if (props.readonly || !props.selectedId) return

  // Check if the user is typing in an input field
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return
  }

  // Handle Delete or Backspace key
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()

    // Check if selected item is a node
    if (selectedNode.value) {
      handleDeleteNode()
    }
    // Check if selected item is a group
    else if (selectedGroup.value) {
      handleDeleteGroup()
    }
  }
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

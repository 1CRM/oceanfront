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

          <!-- Groups background -->
          <g v-for="group in graph.groups" :key="group.id">
            <rect
              :x="group.rect.x"
              :y="group.rect.y"
              :width="group.rect.w"
              :height="group.rect.h"
              fill="transparent"
              stroke="none"
              rx="8"
            />
          </g>

          <!-- Edges -->
          <g v-for="edge in graph.edges" :key="edge.id">
            <path :d="getEdgePath(edge)" class="workflow-canvas-connector" />
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
          <!-- Group labels -->
          <div
            v-for="group in graph.groups"
            :key="`group-label-${group.id}`"
            class="workflow-canvas-group"
            :class="{
              'workflow-canvas-group--selected': props.selectedId === group.id,
              'workflow-canvas-group--dragging': draggingGroupId === group.id,
              'workflow-canvas-group--dropzone': nodeOverGroupId === group.id
            }"
            :style="getGroupStyle(group)"
            @mousedown="handleGroupMouseDown($event, group)"
            @click.stop="handleGroupClick(group.id)"
          >
            <div v-if="group.title" class="workflow-canvas-group__title">{{ group.title }}</div>
          </div>

          <!-- Nodes -->
          <div
            v-for="node in graph.nodes"
            :key="node.id"
            :ref="el => setNodeRef(node.id, el as HTMLElement)"
            class="workflow-canvas-node"
            :class="{
              'workflow-canvas-node--selected': props.selectedId === node.id,
              'workflow-canvas-node--dragging': draggingNodeId === node.id,
              'workflow-canvas-node--drop-target': nodeUnderDragId === node.id
            }"
            :style="getNodeStyle(node)"
            @mousedown="handleNodeMouseDown($event, node)"
          >
            <!-- Input handle -->
            <div
              v-if="!readonly && canHaveInputs(node)"
              class="workflow-canvas-node__handle workflow-canvas-node__handle--input"
              @mousedown.stop="handleHandleMouseDown($event, node.id, 'input')"
              @mouseup.stop="handleHandleMouseUp(node.id, 'input')"
            ></div>

            <!-- Node content (slot or default tile) -->
            <slot
              name="node"
              :node="node"
              :selected="props.selectedId === node.id"
              :on-menu-click="() => emit('update:selectedId', node.id)"
            >
              <WorkflowTile
                :node="node"
                :selected="props.selectedId === node.id"
                :dragging="draggingNodeId === node.id && !!getNodeGroup(graph, node.id)"
                @menu-click="emit('update:selectedId', node.id)"
              />
            </slot>

            <!-- Output handle -->
            <div
              v-if="!readonly && canHaveOutputs(node)"
              class="workflow-canvas-node__handle workflow-canvas-node__handle--output"
              :class="{ 'workflow-canvas-node__handle--free': isOutputFree(node.id) }"
              @mousedown.stop="handleHandleMouseDown($event, node.id, 'output')"
              @mouseup.stop="handleHandleMouseUp(node.id, 'output')"
              @click.stop="handleFreeOutputClick(node.id)"
            >
              <span v-if="isOutputFree(node.id)" class="workflow-canvas-node__handle-plus">+</span>
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
  findGroupAtPosition,
  getNodeGroup,
  removeNodeFromAllGroups,
  addNodeToGroup,
  arrangeNodesInGroup,
  reorderNodeInGroup,
  updateGroupPosition
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
}>()

const graph = computed(() => props.modelValue)

const selectedNode = computed(() =>
  props.selectedId ? findNode(graph.value, props.selectedId) : null
)

const selectedGroup = computed(() =>
  props.selectedId ? graph.value.groups.find(g => g.id === props.selectedId) : null
)

const canvasRef = ref<HTMLElement>()
const nodeElements = ref<Map<string, HTMLElement>>(new Map())
const draggingNodeId = ref<string | null>(null)
const draggingGroupId = ref<string | null>(null)
const dragOffset = ref<Position>({ x: 0, y: 0 })
const connectionPreview = ref<{ path: string; fromNodeId: string } | null>(null)
const connectionDragStart = ref<{ nodeId: string; port: string } | null>(null)
const draggedNodeOriginalGroup = ref<string | null>(null)
const disconnectingEdge = ref<WorkflowEdge | null>(null)
const nodeOverGroupId = ref<string | null>(null)
const nodeUnderDragId = ref<string | null>(null)

// Calculate container size to fit all nodes and groups
const containerStyle = computed(() => {
  let width = props.width
  let height = props.height

  graph.value.nodes.forEach(node => {
    const right = node.position.x + (node.size?.w || 250)
    const bottom = node.position.y + (node.size?.h || 100)
    if (right > width) width = right
    if (bottom > height) height = bottom
  })

  graph.value.groups.forEach(group => {
    const right = group.rect.x + group.rect.w
    const bottom = group.rect.y + group.rect.h
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
  graph.value.edges.forEach(edge => {
    const fromNode = findNode(graph.value, edge.from.nodeId)
    const toNode = findNode(graph.value, edge.to.nodeId)

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

    result.push({
      key: `edge-${edge.id}`,
      position: { x: midX, y: midY },
      afterNodeId: fromNode.id
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
    left: `${group.rect.x}px`,
    top: `${group.rect.y}px`,
    width: `${group.rect.w}px`,
    height: `${group.rect.h}px`
  }
}

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

function getEdgePath(edge: WorkflowEdge): string {
  const fromNode = findNode(graph.value, edge.from.nodeId)
  const toNode = findNode(graph.value, edge.to.nodeId)

  if (!fromNode || !toNode) return ''

  const fromPos = getNodeCenter(fromNode)
  const toPos = getNodeCenter(toNode)

  const fromDimensions = getNodeDimensions(fromNode)
  const toDimensions = getNodeDimensions(toNode)

  // Output handle is on the bottom
  fromPos.y += fromDimensions.height / 2
  // Input handle is on the top
  toPos.y -= toDimensions.height / 2

  // Simple bezier curve with vertical control points
  const dy = toPos.y - fromPos.y
  const controlOffset = Math.abs(dy) / 2

  return `M ${fromPos.x},${fromPos.y} C ${fromPos.x},${fromPos.y + controlOffset} ${toPos.x},${toPos.y - controlOffset} ${toPos.x},${toPos.y}`
}

// All nodes can have inputs and outputs by default
const canHaveInputs = (_node: WorkflowNode) => true
const canHaveOutputs = (_node: WorkflowNode) => true

// Check if a node's output handle is free (no outgoing edge)
function isOutputFree(nodeId: string): boolean {
  return !graph.value.edges.some(edge => edge.from.nodeId === nodeId)
}

function handleCanvasClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target === canvasRef.value || target.classList.contains('workflow-canvas__container')) {
    emit('update:selectedId', null)
  }
}

function handleGroupClick(groupId: string) {
  if (!props.readonly) {
    emit('update:selectedId', groupId)
  }
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

  event.preventDefault()
  const mousePos = getCanvasMousePosition(event)
  if (!mousePos) return

  dragOffset.value = {
    x: mousePos.x - group.rect.x,
    y: mousePos.y - group.rect.y
  }

  draggingGroupId.value = group.id
  emit('update:selectedId', group.id)
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

  const currentGroup = getNodeGroup(graph.value, node.id)
  draggedNodeOriginalGroup.value = currentGroup?.id || null
  draggingNodeId.value = node.id
}

function handleMouseMove(event: MouseEvent) {
  const mousePos = getCanvasMousePosition(event)
  if (!mousePos) return

  const newPosition = {
    x: Math.max(0, mousePos.x - dragOffset.value.x),
    y: Math.max(0, mousePos.y - dragOffset.value.y)
  }

  if (draggingGroupId.value) {
    const updatedGraph = updateGroupPosition(graph.value, draggingGroupId.value, newPosition)
    emit('update:modelValue', updatedGraph)
  } else if (draggingNodeId.value) {
    const updatedGraph = updateNodePosition(graph.value, draggingNodeId.value, newPosition)
    emit('update:modelValue', updatedGraph)

    // Check if the node is over a group
    const node = findNode(updatedGraph, draggingNodeId.value)
    if (node) {
      const nodeDimensions = getNodeDimensions(node)
      const nodeCenter = {
        x: node.position.x + nodeDimensions.width / 2,
        y: node.position.y + nodeDimensions.height / 2
      }
      const targetGroup = findGroupAtPosition(updatedGraph, nodeCenter)
      nodeOverGroupId.value = targetGroup?.id || null

      // Check if dragging over another node in the same group
      const currentGroup = getNodeGroup(updatedGraph, draggingNodeId.value)
      if (currentGroup) {
        let foundNodeUnder = null
        for (const otherNodeId of currentGroup.nodeIds) {
          if (otherNodeId === draggingNodeId.value) continue

          const otherNode = findNode(updatedGraph, otherNodeId)
          if (!otherNode) continue

          const otherDimensions = getNodeDimensions(otherNode)
          const isOverNode =
            nodeCenter.y >= otherNode.position.y &&
            nodeCenter.y <= otherNode.position.y + otherDimensions.height

          if (isOverNode) {
            foundNodeUnder = otherNodeId
            break
          }
        }
        nodeUnderDragId.value = foundNodeUnder
      } else {
        nodeUnderDragId.value = null
      }
    }
  } else if (connectionDragStart.value) {
    const dragNode = findNode(graph.value, connectionDragStart.value.nodeId)
    if (!dragNode) return

    const dragPos = getNodeCenter(dragNode)
    const dragDimensions = getNodeDimensions(dragNode)

    let startPos: Position
    let endPos: Position
    let startControlY: number
    let endControlY: number

    if (connectionDragStart.value.port === 'input') {
      // Dragging from input handle - path goes FROM the input handle UP to cursor
      startPos = { x: dragPos.x, y: dragPos.y - dragDimensions.height / 2 }
      endPos = mousePos

      const dy = endPos.y - startPos.y
      const controlOffset = Math.abs(dy) / 2

      // Control points should bend upward from input handle
      startControlY = startPos.y - controlOffset
      endControlY = endPos.y + controlOffset
    } else {
      // Dragging from output handle - path goes FROM the output handle DOWN to cursor
      startPos = { x: dragPos.x, y: dragPos.y + dragDimensions.height / 2 }
      endPos = mousePos

      const dy = endPos.y - startPos.y
      const controlOffset = Math.abs(dy) / 2

      // Control points should bend downward from output handle
      startControlY = startPos.y + controlOffset
      endControlY = endPos.y - controlOffset
    }

    connectionPreview.value = {
      path: `M ${startPos.x},${startPos.y} C ${startPos.x},${startControlY} ${endPos.x},${endControlY} ${endPos.x},${endPos.y}`,
      fromNodeId: connectionDragStart.value.nodeId
    }
  }
}

function handleMouseUp() {
  if (draggingGroupId.value) {
    // Simply clear the dragging state
    draggingGroupId.value = null
  } else if (draggingNodeId.value) {
    const nodeId = draggingNodeId.value
    const node = findNode(graph.value, nodeId)

    if (node) {
      // Check if node center is inside a group
      const nodeDimensions = getNodeDimensions(node)
      const nodeCenter = {
        x: node.position.x + nodeDimensions.width / 2,
        y: node.position.y + nodeDimensions.height / 2
      }
      const targetGroup = findGroupAtPosition(graph.value, nodeCenter)
      const originalGroup = draggedNodeOriginalGroup.value

      let updatedGraph = graph.value

      // Case 1: Reordering within the same group
      if (targetGroup && originalGroup && targetGroup.id === originalGroup) {
        // Find which node (if any) the dragging node is positioned over
        const currentIndex = targetGroup.nodeIds.indexOf(nodeId)
        let targetIndex = currentIndex

        // Check each node in the group to see if dragging node's center overlaps with it
        for (let i = 0; i < targetGroup.nodeIds.length; i++) {
          const otherNodeId = targetGroup.nodeIds[i]
          if (otherNodeId === nodeId) continue

          const otherNode = findNode(graph.value, otherNodeId)
          if (!otherNode) continue

          const otherDimensions = getNodeDimensions(otherNode)

          // Check if the dragging node's center is within the bounds of this node
          const isOverNode =
            nodeCenter.y >= otherNode.position.y &&
            nodeCenter.y <= otherNode.position.y + otherDimensions.height

          if (isOverNode) {
            targetIndex = i
            break
          }
        }

        // Only reorder if the position actually changed
        if (targetIndex !== currentIndex) {
          updatedGraph = reorderNodeInGroup(updatedGraph, nodeId, targetIndex)
        } else {
          // Snap back to original position
          updatedGraph = arrangeNodesInGroup(updatedGraph, targetGroup.id)
        }
      }
      // Case 2: Moving between groups or in/out of groups
      else {
        // Remove from any existing groups
        updatedGraph = removeNodeFromAllGroups(updatedGraph, nodeId)

        // If there was an original group, rearrange it
        if (originalGroup) {
          updatedGraph = arrangeNodesInGroup(updatedGraph, originalGroup)
        }

        // If dropped inside a different group, add to that group
        if (targetGroup) {
          updatedGraph = addNodeToGroup(updatedGraph, nodeId, targetGroup.id)
          updatedGraph = arrangeNodesInGroup(updatedGraph, targetGroup.id)
        }
      }

      emit('update:modelValue', updatedGraph)
    }

    draggingNodeId.value = null
    draggedNodeOriginalGroup.value = null
    nodeOverGroupId.value = null
    nodeUnderDragId.value = null
  }

  if (connectionDragStart.value) {
    // If we were disconnecting an edge and released without connecting to a new target,
    // remove the edge
    if (disconnectingEdge.value) {
      const updatedGraph = {
        ...graph.value,
        edges: graph.value.edges.filter(edge => edge.id !== disconnectingEdge.value!.id)
      }
      emit('update:modelValue', updatedGraph)
      disconnectingEdge.value = null
    }

    connectionDragStart.value = null
    connectionPreview.value = null
  }
}

function handleHandleMouseDown(event: MouseEvent, nodeId: string, port: string) {
  if (props.readonly) return
  // Only handle left mouse button (button 0)
  if (event.button !== 0) return

  // Check if this is an output handle with no existing connection
  // In this case, don't start dragging - let the click handler create a new node
  if (port === 'output' && isOutputFree(nodeId)) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  // Check if this is an input handle with an existing connection
  if (port === 'input') {
    const existingEdge = graph.value.edges.find(edge => edge.to.nodeId === nodeId)
    if (existingEdge) {
      // Start disconnecting: drag from the input handle itself
      connectionDragStart.value = { nodeId, port: 'input' }
      disconnectingEdge.value = existingEdge
      return
    }
  }

  // Check if this is an output handle with an existing connection
  if (port === 'output') {
    const existingEdge = graph.value.edges.find(edge => edge.from.nodeId === nodeId)
    if (existingEdge) {
      // Start disconnecting: drag from the output handle itself
      connectionDragStart.value = { nodeId, port: 'output' }
      disconnectingEdge.value = existingEdge
      return
    }
  }

  // Normal connection start (no existing edge)
  connectionDragStart.value = { nodeId, port }
  disconnectingEdge.value = null
}

function handleHandleMouseUp(nodeId: string, port: string) {
  if (props.readonly) return

  if (connectionDragStart.value && connectionDragStart.value.nodeId !== nodeId) {
    let shouldConnect = false
    let fromNodeId = ''
    let toNodeId = ''

    // Determine connection direction based on drag start port
    if (connectionDragStart.value.port === 'input') {
      // Dragging from input handle - can only connect to output handles
      if (port === 'output') {
        shouldConnect = true
        fromNodeId = nodeId // The node we're dropping on becomes the source
        toNodeId = connectionDragStart.value.nodeId // The node we started from becomes the target
      }
    } else {
      // Dragging from output handle - can only connect to input handles
      if (port === 'input') {
        shouldConnect = true
        fromNodeId = connectionDragStart.value.nodeId
        toNodeId = nodeId
      }
    }

    if (shouldConnect) {
      // If we were disconnecting an edge, remove it first
      if (disconnectingEdge.value) {
        const updatedGraph = {
          ...graph.value,
          edges: graph.value.edges.filter(edge => edge.id !== disconnectingEdge.value!.id)
        }
        emit('update:modelValue', updatedGraph)
      }

      // Emit connect event for the new connection
      emit('connect', {
        fromNodeId,
        toNodeId
      })
    }
  }

  connectionDragStart.value = null
  connectionPreview.value = null
  disconnectingEdge.value = null
}

const handleAddStep = (event: AddStepEvent) => emit('add-step', event)
const closePanel = () => emit('update:selectedId', null)

function handleFreeOutputClick(nodeId: string) {
  // Only trigger if output is actually free
  if (!isOutputFree(nodeId)) return

  // Emit add-step event with the current node as afterNodeId
  emit('add-step', { afterNodeId: nodeId })
}

function handleDeleteNode() {
  // Remove the node from the graph
  const nodeId = selectedNode.value?.id
  if (!nodeId) return

  const updatedGraph = {
    ...graph.value,
    nodes: graph.value.nodes.filter(node => node.id !== nodeId),
    edges: graph.value.edges.filter(
      edge => edge.from.nodeId !== nodeId && edge.to.nodeId !== nodeId
    )
  }

  // Remove node from any groups
  const graphWithoutNode = removeNodeFromAllGroups(updatedGraph, nodeId)

  // Close the panel
  emit('update:selectedId', null)
  // Update the graph
  emit('update:modelValue', graphWithoutNode)
}

function handleDeleteGroup() {
  const groupId = selectedGroup.value?.id
  if (!groupId) return

  // Remove the group from the graph
  const updatedGraph = {
    ...graph.value,
    groups: graph.value.groups.filter(group => group.id !== groupId)
  }

  // Close the panel
  emit('update:selectedId', null)
  // Update the graph
  emit('update:modelValue', updatedGraph)
}

function handleUpdateNode(updatedNode: WorkflowNode) {
  // Update the node in the graph
  const updatedGraph = {
    ...graph.value,
    nodes: graph.value.nodes.map(node => (node.id === updatedNode.id ? updatedNode : node))
  }

  // Update the graphß
  emit('update:modelValue', updatedGraph)
}

function handleUpdateGroup(updatedGroup: WorkflowGroup) {
  // Update the group in the graph
  const updatedGraph = {
    ...graph.value,
    groups: graph.value.groups.map(group => (group.id === updatedGroup.id ? updatedGroup : group))
  }

  // Update the graph
  emit('update:modelValue', updatedGraph)
}

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

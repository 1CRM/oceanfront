<template>
  <div class="workflow-canvas-wrapper">
    <div class="workflow-canvas" ref="canvasRef" @click="handleCanvasClick">
      <div class="workflow-canvas__container" :style="canvas.containerStyle.value">
        <!-- SVG layer for connectors -->
        <svg
          class="workflow-canvas__svg-layer"
          :viewBox="canvas.svgViewBox.value"
          :width="canvas.svgWidth.value"
          :height="canvas.svgHeight.value"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="14"
              markerHeight="14"
              refX="11"
              refY="7"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L0,14 L11,7 z" class="workflow-canvas-connector__marker" />
            </marker>
          </defs>

          <!-- Groups background (sorted by depth) -->
          <g v-for="group in canvas.sortedGroups.value" :key="group.id">
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
            v-if="connections.connectionPreview.value"
            :d="connections.connectionPreview.value.path"
            class="workflow-canvas-connector workflow-canvas-connector--preview"
          />
        </svg>

        <!-- Nodes layer -->
        <div class="workflow-canvas__nodes-layer">
          <!-- Group labels (sorted by depth) -->
          <div
            v-for="group in canvas.sortedGroups.value"
            :key="`group-label-${group.id}`"
            class="workflow-canvas-group"
            :class="{
              'workflow-canvas-group--selected': props.selectedId === group.id,
              'workflow-canvas-group--dragging': dragging.draggingGroupId.value === group.id,
              'workflow-canvas-group--dropzone':
                dragging.nodeOverGroupId.value === group.id ||
                dragging.nodeOverGroupIds.value.includes(group.id),
              'workflow-canvas-group--nested': getGroupDepth(props.modelValue, group.id) > 0,
              'workflow-canvas-group--child-hovered': dragging.hoveredNodeGroupId.value === group.id
            }"
            :style="canvas.getGroupStyle(group)"
            @mousedown="dragging.handleGroupMouseDown($event, group)"
            @click.stop="handleGroupClick(group.id)"
          >
            <!-- Input handle -->
            <div
              v-if="!readonly"
              class="workflow-canvas-group__handle workflow-canvas-group__handle--input"
              @mousedown.stop="connections.handleEntityHandleMouseDown($event, group.id, 'input')"
              @mouseup.stop="connections.handleEntityHandleMouseUp(group.id, 'input')"
            ></div>

            <div v-if="group.title" class="workflow-canvas-group__title">{{ group.title }}</div>

            <!-- Output handle -->
            <div
              v-if="!readonly"
              class="workflow-canvas-group__handle workflow-canvas-group__handle--output"
              :class="{ 'workflow-canvas-group__handle--free': connections.isOutputFree(group.id) }"
              @mousedown.stop="connections.handleEntityHandleMouseDown($event, group.id, 'output')"
              @mouseup.stop="connections.handleEntityHandleMouseUp(group.id, 'output')"
            ></div>

            <!-- Resize handles -->
            <template v-if="!readonly">
              <!-- Edge handles -->
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'top')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--right"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'right')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'bottom')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--left"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'left')"
              ></div>

              <!-- Corner handles -->
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top-left"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'top-left')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top-right"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'top-right')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom-left"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'bottom-left')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom-right"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'bottom-right')"
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
              'workflow-canvas-node--dragging': dragging.draggingNodeId.value === node.id
            }"
            :style="canvas.getNodeStyle(node)"
            @mousedown="dragging.handleNodeMouseDown($event, node)"
            @mouseenter="dragging.handleNodeMouseEnter(node)"
            @mouseleave="dragging.handleNodeMouseLeave"
          >
            <!-- Input handle -->
            <div
              v-if="!readonly"
              class="workflow-canvas-node__handle workflow-canvas-node__handle--input"
              @mousedown.stop="connections.handleEntityHandleMouseDown($event, node.id, 'input')"
              @mouseup.stop="connections.handleEntityHandleMouseUp(node.id, 'input')"
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
                  dragging.draggingNodeId.value === node.id &&
                  !!getParentGroup(props.modelValue, node.id)
                "
                :labels="mergedLabels"
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
              :class="{ 'workflow-canvas-node__handle--free': connections.isOutputFree(node.id) }"
              @mousedown.stop="connections.handleEntityHandleMouseDown($event, node.id, 'output')"
              @mouseup.stop="connections.handleEntityHandleMouseUp(node.id, 'output')"
              @click.stop="handleFreeOutputClick(node.id)"
            >
              <span
                v-if="connections.isOutputFree(node.id)"
                class="workflow-canvas-node__handle-plus"
              ></span>
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

          <!-- Empty group add buttons -->
          <div
            v-for="group in emptyGroups"
            :key="`empty-group-btn-${group.id}`"
            class="workflow-canvas-empty-group-add"
            :style="{
              left: `${group.position.x + group.size.w / 2}px`,
              top: `${group.position.y + group.size.h / 2}px`,
              transform: 'translate(-50%, -50%)'
            }"
          >
            <button
              class="workflow-canvas-empty-group-add__button"
              @click.stop="handleEmptyGroupAddNode(group.id)"
              type="button"
            >
              +
            </button>
          </div>
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
        :labels="mergedLabels"
        @close="closePanel"
        @delete-node="handleDeleteNode"
        @delete-group="handleDeleteGroup"
        @update-node="handleUpdateNode"
        @update-group="handleUpdateGroup"
      />
    </slot>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, toRef } from 'vue'
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  Position,
  WorkflowGroup,
  AddStepEvent,
  WorkflowCanvasLabels
} from '../types/workflow'
import {
  findNode,
  findGroup,
  getParentGroup,
  removeEntityFromAllGroups,
  updateGroupBounds,
  isPointInRect,
  getGroupDepth,
  handleAddStepToGraph,
  addNode,
  addGroup,
  addEntityToGroup
} from '../utils/graph-helpers'
import { DEFAULT_LABELS } from '../constants/labels'
import WorkflowTile from './WorkflowTile.vue'
import WorkflowConfigPanel from './WorkflowConfigPanel.vue'
import WorkflowPlusPlaceholder from './WorkflowPlusPlaceholder.vue'
import { useDragging } from '../composables/useDragging'
import { useConnections } from '../composables/useConnections'
import { useGroupResize } from '../composables/useGroupResize'
import { useCanvas } from '../composables/useCanvas'

export default defineComponent({
  name: 'WorkflowCanvas',
  components: {
    WorkflowTile,
    WorkflowConfigPanel,
    WorkflowPlusPlaceholder
  },
  props: {
    modelValue: {
      type: Object as () => WorkflowGraph,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    },
    selectedId: {
      type: String as () => string | null,
      default: null
    },
    width: {
      type: Number,
      default: 1000
    },
    height: {
      type: Number,
      default: 1000
    },
    maxGroupDepth: {
      type: Number as () => number | null,
      default: null
    },
    labels: {
      type: Object as () => Partial<WorkflowCanvasLabels>,
      default: undefined
    }
  },
  emits: [
    'update:modelValue',
    'update:selectedId',
    'add-step',
    'node-add',
    'group-add',
    'edge-add',
    'node-drag-start',
    'node-drag-end',
    'node-click',
    'node-delete',
    'node-update',
    'group-drag-start',
    'group-drag-end',
    'group-click',
    'group-delete',
    'group-update',
    'group-resize-start',
    'group-resize-end',
    'edge-delete',
    'canvas-click',
    'entity-moved-to-group'
  ],
  setup(props, { emit, expose }) {
    const mergedLabels = computed<WorkflowCanvasLabels>(() => ({
      ...DEFAULT_LABELS,
      ...props.labels
    }))

    const selectedNode = computed(() =>
      props.selectedId ? findNode(props.modelValue, props.selectedId) : null
    )

    const selectedGroup = computed(() =>
      props.selectedId ? props.modelValue.groups.find(g => g.id === props.selectedId) : null
    )

    const canvasRef = ref<HTMLElement>()
    const nodeElements = ref<Map<string, HTMLElement>>(new Map())

    // Helper functions for composables
    const findEntity = (entityId: string): WorkflowNode | WorkflowGroup | undefined => {
      const node = findNode(props.modelValue, entityId)
      if (node) return node
      return findGroup(props.modelValue, entityId)
    }

    const findAllGroupsAtPosition = (position: Position): WorkflowGroup[] => {
      return props.modelValue.groups.filter(g => {
        return isPointInRect(position, {
          x: g.position.x,
          y: g.position.y,
          w: g.size.w,
          h: g.size.h
        })
      })
    }

    const wouldExceedMaxDepth = (entityId: string, parentId: string): boolean => {
      if (props.maxGroupDepth === null) return false
      const parentDepth = getGroupDepth(props.modelValue, parentId)
      const newEntityDepth = parentDepth + 1
      const entity = findGroup(props.modelValue, entityId)

      if (entity) {
        const getDescendants = (groupId: string): string[] => {
          const group = findGroup(props.modelValue, groupId)
          if (!group) return []
          const descendants: string[] = []
          const toProcess = [...group.containedIds]
          while (toProcess.length > 0) {
            const entityId = toProcess.shift()!
            descendants.push(entityId)
            const childGroup = findGroup(props.modelValue, entityId)
            if (childGroup) toProcess.push(...childGroup.containedIds)
          }
          return descendants
        }

        let maxDescendantDepth = 0
        const descendants = getDescendants(entityId)
        descendants.forEach(descendantId => {
          const descendant = findGroup(props.modelValue, descendantId)
          if (descendant) {
            const relativeDepth =
              getGroupDepth(props.modelValue, descendantId) -
              getGroupDepth(props.modelValue, entityId)
            maxDescendantDepth = Math.max(maxDescendantDepth, relativeDepth)
          }
        })
        return newEntityDepth + maxDescendantDepth > props.maxGroupDepth
      }

      return newEntityDepth > props.maxGroupDepth
    }

    const calculateGroupMinimumSize = (groupId: string): { w: number; h: number } => {
      const group = findGroup(props.modelValue, groupId)
      if (!group || group.containedIds.length === 0) {
        return { w: 100, h: 100 }
      }

      const entities = group.containedIds.map(id => findEntity(id)).filter(Boolean) as (
        | WorkflowNode
        | WorkflowGroup
      )[]

      if (entities.length === 0) return { w: 100, h: 100 }

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity

      entities.forEach(entity => {
        let entityX: number, entityY: number, entityW: number, entityH: number
        if ('containedIds' in entity) {
          entityX = entity.position.x
          entityY = entity.position.y
          entityW = entity.size.w
          entityH = entity.size.h
        } else {
          entityX = entity.position.x
          entityY = entity.position.y
          entityW = entity.size?.w || 250
          entityH = entity.size?.h || 100
        }
        minX = Math.min(minX, entityX)
        minY = Math.min(minY, entityY)
        maxX = Math.max(maxX, entityX + entityW)
        maxY = Math.max(maxY, entityY + entityH)
      })

      const padding = 20
      return {
        w: Math.max(100, maxX - group.position.x + padding),
        h: Math.max(100, maxY - group.position.y + padding)
      }
    }

    const findDropTargetGroup = (
      x: number,
      y: number,
      excludeId: string | null
    ): WorkflowGroup | undefined => {
      const allGroupsAtPosition = findAllGroupsAtPosition({ x, y })
        .filter(g => g.id !== excludeId)
        .sort(
          (a, b) => getGroupDepth(props.modelValue, b.id) - getGroupDepth(props.modelValue, a.id)
        )
      return allGroupsAtPosition.length > 0 ? allGroupsAtPosition[0] : undefined
    }

    // Initialize composables
    const canvas = useCanvas({
      graph: toRef(props, 'modelValue'),
      width: toRef(props, 'width'),
      height: toRef(props, 'height'),
      nodeElements
    })

    const dragging = useDragging({
      graph: toRef(props, 'modelValue'),
      maxGroupDepth: toRef(props, 'maxGroupDepth'),
      readonly: toRef(props, 'readonly'),
      canvasRef,
      findDropTargetGroup,
      wouldExceedMaxDepth,
      onGraphUpdate: graph => emit('update:modelValue', graph),
      onNodeDragStart: nodeId => emit('node-drag-start', nodeId),
      onNodeDragEnd: (nodeId, position) => emit('node-drag-end', nodeId, position),
      onGroupDragStart: groupId => emit('group-drag-start', groupId),
      onGroupDragEnd: (groupId, position) => emit('group-drag-end', groupId, position),
      onEntityMovedToGroup: (entityId, groupId) => emit('entity-moved-to-group', entityId, groupId)
    })

    const connections = useConnections({
      graph: toRef(props, 'modelValue'),
      readonly: toRef(props, 'readonly'),
      canvasRef,
      getEntityCenter: canvas.getEntityCenter,
      getEntityDimensions: canvas.getEntityDimensions,
      onGraphUpdate: graph => emit('update:modelValue', graph),
      onEdgeAdd: edge => emit('edge-add', edge),
      onEdgeDelete: edgeId => emit('edge-delete', edgeId)
    })

    const resize = useGroupResize({
      graph: toRef(props, 'modelValue'),
      readonly: toRef(props, 'readonly'),
      canvasRef,
      calculateGroupMinimumSize,
      onGraphUpdate: graph => emit('update:modelValue', graph),
      onGroupResizeStart: groupId => emit('group-resize-start', groupId),
      onGroupResizeEnd: (groupId, size) => emit('group-resize-end', groupId, size),
      onUpdateSelectedId: id => emit('update:selectedId', id)
    })

    // Calculate plus placeholder positions on edges
    const placeholders = computed(() => {
      const result: Array<{
        key: string
        position: Position
        afterNodeId?: string
        inGroupId?: string
      }> = []

      if (props.readonly) return result

      props.modelValue.edges.forEach(edge => {
        const fromNode = findNode(props.modelValue, edge.from.entityId)
        const toNode = findNode(props.modelValue, edge.to.entityId)

        if (!fromNode || !toNode) return

        const fromCenter = canvas.getNodeCenter(fromNode)
        const toCenter = canvas.getNodeCenter(toNode)

        const fromDimensions = canvas.getNodeDimensions(fromNode)
        const toDimensions = canvas.getNodeDimensions(toNode)

        fromCenter.y += fromDimensions.height / 2
        toCenter.y -= toDimensions.height / 2

        const midX = (fromCenter.x + toCenter.x) / 2
        const midY = (fromCenter.y + toCenter.y) / 2

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

    // Filter empty groups for add button
    const emptyGroups = computed(() => {
      if (props.readonly) return []
      return props.modelValue.groups.filter(g => g.containedIds.length === 0)
    })

    function setNodeRef(nodeId: string, el: HTMLElement | null) {
      if (el) {
        nodeElements.value.set(nodeId, el)
      } else {
        nodeElements.value.delete(nodeId)
      }
    }

    function getEdgePath(edge: WorkflowEdge): string {
      const fromEntity = findEntity(edge.from.entityId)
      const toEntity = findEntity(edge.to.entityId)

      if (!fromEntity || !toEntity) return ''

      const fromPos = canvas.getEntityCenter(fromEntity)
      const toPos = canvas.getEntityCenter(toEntity)

      const fromDimensions = canvas.getEntityDimensions(fromEntity)
      const toDimensions = canvas.getEntityDimensions(toEntity)

      fromPos.y += fromDimensions.height / 2
      toPos.y -= toDimensions.height / 2

      const dy = toPos.y - fromPos.y
      const controlOffset = Math.abs(dy) / 2

      return `M ${fromPos.x},${fromPos.y} C ${fromPos.x},${fromPos.y + controlOffset} ${toPos.x},${toPos.y - controlOffset} ${toPos.x},${toPos.y}`
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

    function handleAddStep(event: AddStepEvent) {
      // Emit the add-step event for consumers to handle
      emit('add-step', event)

      // Also handle it internally by default
      const result = handleAddStepToGraph(props.modelValue, event)
      emit('update:modelValue', result.graph)
      emit('update:selectedId', result.newNodeId)
      const newNode = result.graph.nodes.find(n => n.id === result.newNodeId)!
      emit('node-add', newNode)
    }

    const closePanel = () => emit('update:selectedId', null)

    function handleFreeOutputClick(nodeId: string) {
      if (!connections.isOutputFree(nodeId)) return
      if (connections.connectionDragMoved.value) return

      const parentGroup = getParentGroup(props.modelValue, nodeId)

      handleAddStep({
        afterNodeId: nodeId,
        inGroupId: parentGroup?.id
      })
    }

    function handleEmptyGroupAddNode(groupId: string) {
      const group = findGroup(props.modelValue, groupId)
      if (!group) return

      // Calculate center position
      const centerX = group.position.x + group.size.w / 2 - 125 // 250/2 = half node width
      const centerY = group.position.y + group.size.h / 2 - 50 // 100/2 = half node height

      // Create new node at center
      const result = addNode(props.modelValue, {
        position: { x: centerX, y: centerY }
      })

      // Add node to group
      const updatedGraph = addEntityToGroup(result.graph, result.newNodeId, groupId)

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newNodeId)
      const newNode = updatedGraph.nodes.find(n => n.id === result.newNodeId)!
      emit('node-add', newNode)
    }

    function handleDeleteNode() {
      const nodeId = selectedNode.value?.id
      if (!nodeId) return
      if (selectedNode.value?.locked) return

      const parentGroup = getParentGroup(props.modelValue, nodeId)

      const updatedGraph = {
        ...props.modelValue,
        nodes: props.modelValue.nodes.filter(node => node.id !== nodeId),
        edges: props.modelValue.edges.filter(
          edge => edge.from.entityId !== nodeId && edge.to.entityId !== nodeId
        )
      }

      let graphWithoutNode = removeEntityFromAllGroups(updatedGraph, nodeId)

      if (parentGroup) {
        graphWithoutNode = updateGroupBounds(graphWithoutNode, parentGroup.id)
      }

      emit('update:selectedId', null)
      emit('update:modelValue', graphWithoutNode)
      emit('node-delete', nodeId)
    }

    function handleDeleteGroup() {
      const groupId = selectedGroup.value?.id
      if (!groupId) return
      if (selectedGroup.value?.locked) return

      let updatedGraph = {
        ...props.modelValue,
        groups: props.modelValue.groups.filter(group => group.id !== groupId),
        edges: props.modelValue.edges.filter(
          edge => edge.from.entityId !== groupId && edge.to.entityId !== groupId
        )
      }

      updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)

      emit('update:selectedId', null)
      emit('update:modelValue', updatedGraph)
      emit('group-delete', groupId)
    }

    function handleUpdateNode(updatedNode: WorkflowNode) {
      const updatedGraph = {
        ...props.modelValue,
        nodes: props.modelValue.nodes.map(node => (node.id === updatedNode.id ? updatedNode : node))
      }

      emit('update:modelValue', updatedGraph)
      emit('node-update', updatedNode)
    }

    function handleUpdateGroup(updatedGroup: WorkflowGroup) {
      const updatedGraph = {
        ...props.modelValue,
        groups: props.modelValue.groups.map(group =>
          group.id === updatedGroup.id ? updatedGroup : group
        )
      }

      emit('update:modelValue', updatedGraph)
      emit('group-update', updatedGroup)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (props.readonly || !props.selectedId) return

      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()

        if (selectedNode.value) {
          if (!selectedNode.value.locked) {
            handleDeleteNode()
          }
        } else if (selectedGroup.value) {
          if (!selectedGroup.value.locked) {
            handleDeleteGroup()
          }
        }
      }
    }

    function handleMouseMove(event: MouseEvent) {
      const canvas = canvasRef.value
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mousePos = {
        x: event.clientX - rect.left + canvas.scrollLeft,
        y: event.clientY - rect.top + canvas.scrollTop
      }

      if (resize.handleResizeMove(mousePos)) return

      const newPosition = {
        x: Math.max(0, mousePos.x - dragging.dragOffset.value.x),
        y: Math.max(0, mousePos.y - dragging.dragOffset.value.y)
      }

      if (dragging.handleGroupDragMove(newPosition, findAllGroupsAtPosition, isPointInRect)) return
      if (dragging.handleNodeDragMove(newPosition, nodeElements.value, findAllGroupsAtPosition))
        return
      if (connections.handleConnectionDragMove(mousePos)) return
    }

    function handleMouseUp() {
      resize.handleMouseUp()
      dragging.handleMouseUp(isPointInRect)
      connections.handleMouseUp()
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

    // Public methods exposed to parent components
    function addNewNode() {
      const result = addNode(props.modelValue)
      emit('update:modelValue', result.graph)
      emit('update:selectedId', result.newNodeId)
      const newNode = result.graph.nodes.find(n => n.id === result.newNodeId)!
      emit('node-add', newNode)
    }

    function addNewGroup() {
      const result = addGroup(props.modelValue)
      emit('update:modelValue', result.graph)
      emit('update:selectedId', result.newGroupId)
      const newGroup = result.graph.groups.find(g => g.id === result.newGroupId)!
      emit('group-add', newGroup)
    }

    expose({
      addNewNode,
      addNewGroup
    })

    return {
      props,
      emit,
      mergedLabels,
      selectedNode,
      selectedGroup,
      canvasRef,
      nodeElements,
      canvas,
      dragging,
      connections,
      resize,
      placeholders,
      emptyGroups,
      setNodeRef,
      getEdgePath,
      handleCanvasClick,
      handleGroupClick,
      handleAddStep,
      closePanel,
      handleFreeOutputClick,
      handleEmptyGroupAddNode,
      handleDeleteNode,
      handleDeleteGroup,
      handleUpdateNode,
      handleUpdateGroup,
      getParentGroup,
      findNode,
      getGroupDepth,
      isPointInRect
    }
  }
})
</script>

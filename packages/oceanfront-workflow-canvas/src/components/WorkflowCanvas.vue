<template>
  <div
    class="workflow-canvas-wrapper"
    :class="{
      'workflow-canvas-wrapper--view-mode': isViewMode,
      'workflow-canvas-wrapper--full-width': isFullWidth
    }"
  >
    <div
      class="workflow-canvas"
      ref="canvasRef"
      role="application"
      :tabindex="canvasTabIndex"
      :aria-label="canvasApplicationAriaLabel"
      :aria-activedescendant="selectedId ? 'wf-entity-' + selectedId : undefined"
      @click="handleCanvasClick"
    >
      <div class="workflow-canvas__container" :style="canvas.containerStyle.value">
        <!-- SVG layer for connectors -->
        <svg
          class="workflow-canvas__svg-layer"
          aria-hidden="true"
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
            :class="{
              'workflow-canvas-connector--invalid': connections.connectionPreview.value.isInvalid
            }"
          />
        </svg>

        <!-- Nodes layer -->
        <div class="workflow-canvas__nodes-layer">
          <!-- Group labels (sorted by depth) -->
          <div
            v-for="group in canvas.sortedGroups.value"
            :key="`group-label-${group.id}`"
            :id="'wf-entity-' + group.id"
            :data-workflow-entity-id="group.id"
            role="group"
            :aria-label="getEntityA11yName(group.id)"
            class="workflow-canvas-group"
            :class="{
              'workflow-canvas-group--selected': props.selectedId === group.id,
              'workflow-canvas-group--dragging': dragging.draggingGroupId.value === group.id,
              'workflow-canvas-group--dropzone':
                !dragging.invalidDropTarget.value &&
                (dragging.nodeOverGroupId.value === group.id ||
                  dragging.nodeOverGroupIds.value.includes(group.id)),
              'workflow-canvas-group--invalid-dropzone':
                dragging.invalidDropTarget.value &&
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
              v-if="!isViewMode && !readonly && shouldShowInputHandle(group.id)"
              class="workflow-canvas-group__handle"
              aria-hidden="true"
              :class="{
                'workflow-canvas-group__handle--input': getInputHandlePosition(group.id) === 'top',
                'workflow-canvas-group__handle--left': getInputHandlePosition(group.id) === 'left'
              }"
              @mousedown.stop="connections.handleEntityHandleMouseDown($event, group.id, 'input')"
              @mouseup="connections.handleEntityHandleMouseUp(group.id, 'input')"
            ></div>

            <div v-if="getGroupDisplayLabel(group)" class="workflow-canvas-group__title">
              {{ getGroupDisplayLabel(group) }}
            </div>

            <div v-if="getGroupDisplayLabelRight(group)" class="workflow-canvas-group__label-right">
              {{ getGroupDisplayLabelRight(group) }}
            </div>

            <!-- Connection hover menu (for adding connected nodes/groups after) -->
            <div
              v-if="!isViewMode && !readonly"
              class="workflow-canvas-group__hover-menu-connection"
            >
              <button
                v-if="!shouldHideGroupAddNode(group)"
                class="workflow-canvas-group__hover-menu-button"
                @click.stop="handleAddNodeAfterGroup(group.id)"
                type="button"
                :title="mergedLabels.addNodeAfterNodeButton"
              >
                {{ getGroupAddNodeButtonText(group) }}
              </button>
              <button
                v-if="!shouldHideGroupAddGroup(group)"
                class="workflow-canvas-group__hover-menu-button"
                @click.stop="handleAddGroupAfterGroup(group.id)"
                type="button"
                :title="mergedLabels.addGroupAfterNodeButton"
              >
                {{ getGroupAddGroupButtonText(group) }}
              </button>
            </div>

            <!-- Empty group menu with centered + button -->
            <div
              v-if="!isViewMode && !readonly && group.containedIds.length === 0"
              class="workflow-canvas-group__empty-container"
            >
              <div class="workflow-canvas-group__empty-plus">
                <button
                  class="workflow-canvas-group__empty-plus-button"
                  type="button"
                  :aria-label="getEntityA11yName(group.id)"
                  @mousedown.stop
                  @click.stop="handleEmptyPlusClick(group)"
                >
                  +
                </button>
                <div
                  v-if="getEmptyMenuVisibleActions(group).length > 1"
                  class="workflow-canvas-group__empty-menu"
                >
                  <button
                    v-if="!shouldHideGroupNestedAddNode(group)"
                    class="workflow-canvas-group__hover-menu-button"
                    @click.stop="handleAddNodeToGroup(group.id)"
                    type="button"
                    :title="mergedLabels.addNodeToGroupButton"
                  >
                    {{ getGroupAddNodeButtonText(group) }}
                  </button>
                  <button
                    v-if="
                      !wouldExceedMaxDepth('', group.id) && !shouldHideGroupNestedAddGroup(group)
                    "
                    class="workflow-canvas-group__hover-menu-button"
                    @click.stop="handleAddNestedGroup(group.id)"
                    type="button"
                    :title="mergedLabels.addNestedGroupButton"
                  >
                    {{ getGroupAddGroupButtonText(group) }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Output handle -->
            <div
              v-if="!isViewMode && !readonly && shouldShowOutputHandle(group.id)"
              class="workflow-canvas-group__handle"
              aria-hidden="true"
              :class="{
                'workflow-canvas-group__handle--output':
                  getOutputHandlePosition(group.id) === 'bottom',
                'workflow-canvas-group__handle--right':
                  getOutputHandlePosition(group.id) === 'right',
                'workflow-canvas-group__handle--free': connections.isOutputFree(group.id)
              }"
              @mousedown.stop="connections.handleEntityHandleMouseDown($event, group.id, 'output')"
              @mouseup="connections.handleEntityHandleMouseUp(group.id, 'output')"
            ></div>

            <!-- Resize handles -->
            <template v-if="!isViewMode && !readonly">
              <!-- Edge handles -->
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top"
                aria-hidden="true"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'top')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--right"
                aria-hidden="true"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'right')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom"
                aria-hidden="true"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'bottom')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--left"
                aria-hidden="true"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'left')"
              ></div>

              <!-- Corner handles -->
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top-left"
                aria-hidden="true"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'top-left')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--top-right"
                aria-hidden="true"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'top-right')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom-left"
                aria-hidden="true"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'bottom-left')"
              ></div>
              <div
                class="workflow-canvas-group__resize-handle workflow-canvas-group__resize-handle--bottom-right"
                aria-hidden="true"
                @mousedown.stop="resize.handleResizeMouseDown($event, group.id, 'bottom-right')"
              ></div>
            </template>
          </div>

          <!-- Nodes -->
          <div
            v-for="node in props.modelValue.nodes"
            :key="node.id"
            :id="'wf-entity-' + node.id"
            :ref="el => setNodeRef(node.id, el as HTMLElement)"
            :data-workflow-entity-id="node.id"
            role="group"
            :aria-label="getEntityA11yName(node.id)"
            class="workflow-canvas-node"
            :class="{
              'workflow-canvas-node--selected': props.selectedId === node.id,
              'workflow-canvas-node--dragging': dragging.draggingNodeId.value === node.id,
              'workflow-canvas-node--swap-target': dragging.swapTargetNodeId.value === node.id,
              'workflow-canvas-node--invalid-swap-target':
                dragging.invalidSwapTargetNodeId.value === node.id,
              [getNodeCssClass(node)]: true
            }"
            :style="canvas.getNodeStyle(node)"
            @mousedown="dragging.handleNodeMouseDown($event, node)"
            @mouseenter="dragging.handleNodeMouseEnter(node)"
            @mouseleave="dragging.handleNodeMouseLeave"
          >
            <div v-if="getNodeDisplayLabel(node)" class="workflow-canvas-node__label">
              {{ getNodeDisplayLabel(node) }}
            </div>

            <div v-if="getNodeDisplayLabelRight(node)" class="workflow-canvas-node__label-right">
              {{ getNodeDisplayLabelRight(node) }}
            </div>

            <!-- Input handle -->
            <div
              v-if="!isViewMode && !readonly && shouldShowInputHandle(node.id)"
              class="workflow-canvas-node__handle"
              aria-hidden="true"
              :class="{
                'workflow-canvas-node__handle--input': getInputHandlePosition(node.id) === 'top',
                'workflow-canvas-node__handle--left': getInputHandlePosition(node.id) === 'left'
              }"
              @mousedown.stop="connections.handleEntityHandleMouseDown($event, node.id, 'input')"
              @mouseup="connections.handleEntityHandleMouseUp(node.id, 'input')"
              @mouseenter="connections.handleEntityHandleMouseEnter(node.id)"
              @mouseleave="connections.handleEntityHandleMouseLeave()"
            ></div>

            <!-- Node content (slot or default tile) -->
            <slot
              name="node"
              :node="node"
              :selected="props.selectedId === node.id"
              :on-menu-click="
                () => {
                  if (!node.readonly) {
                    emit('update:selectedId', node.id)
                    emit('node-click', node.id)
                  }
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
                :node-types="props.nodeTypes"
                :view-mode="isViewMode"
                :record="props.record"
                @menu-click="
                  () => {
                    if (!node.readonly) {
                      emit('update:selectedId', node.id)
                      emit('node-click', node.id)
                    }
                  }
                "
              />
            </slot>

            <!-- Hover menu with add node and add group options -->
            <div v-if="!isViewMode && !readonly" class="workflow-canvas-node__hover-menu">
              <button
                v-if="!shouldHideNodeAddNode(node)"
                class="workflow-canvas-node__hover-menu-button"
                @click.stop="handleAddNodeAfterNode(node.id)"
                type="button"
                :title="mergedLabels.addNodeAfterNodeButton"
              >
                {{ getNodeAddNodeButtonText(node) }}
              </button>
              <button
                v-if="!shouldHideNodeAddGroup(node)"
                class="workflow-canvas-node__hover-menu-button"
                @click.stop="handleAddGroupAfterNode(node.id)"
                type="button"
                :title="mergedLabels.addGroupAfterNodeButton"
              >
                {{ getNodeAddGroupButtonText(node) }}
              </button>
            </div>

            <!-- Output handle -->
            <div
              v-if="!isViewMode && !readonly && shouldShowOutputHandle(node.id)"
              class="workflow-canvas-node__handle"
              aria-hidden="true"
              :class="{
                'workflow-canvas-node__handle--output':
                  getOutputHandlePosition(node.id) === 'bottom',
                'workflow-canvas-node__handle--right': getOutputHandlePosition(node.id) === 'right',
                'workflow-canvas-node__handle--free': connections.isOutputFree(node.id)
              }"
              @mousedown.stop="connections.handleEntityHandleMouseDown($event, node.id, 'output')"
              @mouseup="connections.handleEntityHandleMouseUp(node.id, 'output')"
              @mouseenter="connections.handleEntityHandleMouseEnter(node.id)"
              @mouseleave="connections.handleEntityHandleMouseLeave()"
              @click.stop="handleFreeOutputClick(node.id)"
            >
              <span
                v-if="connections.isOutputFree(node.id)"
                class="workflow-canvas-node__handle-plus"
                aria-hidden="true"
              ></span>
            </div>
          </div>

          <!-- Plus placeholders -->
          <template v-if="!isViewMode">
            <WorkflowPlusPlaceholder
              v-for="placeholder in placeholders"
              :key="placeholder.key"
              :position="placeholder.position"
              :after-node-id="placeholder.afterNodeId"
              :in-group-id="placeholder.inGroupId"
              :aria-label="getPlaceholderAriaLabel(placeholder)"
              @add-step="handleAddStep"
            />
          </template>

          <!-- Drop indicator line for drag-to-reorder -->
          <div
            v-if="dragging.insertIndicator.value"
            class="workflow-canvas-drop-indicator"
            aria-hidden="true"
            :style="{
              left: dragging.insertIndicator.value.x + 'px',
              top: dragging.insertIndicator.value.y + 'px',
              width: dragging.insertIndicator.value.width + 'px'
            }"
          />
        </div>
      </div>

      <!-- Full width toggle -->
      <button
        class="workflow-canvas__fullwidth-toggle"
        :class="{ 'workflow-canvas__fullwidth-toggle--active': isFullWidth }"
        type="button"
        :title="fullWidthToggleRecordLabel || undefined"
        :aria-label="fullWidthToggleRecordLabel || undefined"
        @click.stop="handleFullWidthToggle"
      >
        <of-icon :name="isFullWidth ? 'expand close' : 'expand open'" scale="sm" />
      </button>
    </div>

    <!-- Configuration panel -->
    <template v-if="!isViewMode || isFullWidth">
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
          :node-types="props.nodeTypes"
          :group-types="props.groupTypes"
          :record="props.record"
          :is-fullscreen="isFullWidth"
          @close="closePanel"
          @delete-node="handleDeleteNode"
          @delete-group="handleDeleteGroup"
          @update-node="handleUpdateNode"
          @update-group="handleUpdateGroup"
        >
          <template #panel-actions="slotProps">
            <slot name="panel-actions" v-bind="slotProps" />
          </template>
        </WorkflowConfigPanel>
      </slot>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, toRef, nextTick } from 'vue'
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  Position,
  Size,
  WorkflowGroup,
  AddStepEvent,
  WorkflowCanvasLabels,
  NodeTypeConfig,
  GroupTypeConfig,
  WorkflowCanvasMode,
  EdgeAddPayload
} from '../types/workflow'
import type { FormRecord } from 'oceanfront'
import {
  findNode,
  findGroup,
  getParentGroup,
  getGroupDescendants,
  removeEntityFromAllGroups,
  updateGroupBounds,
  isPointInRect,
  getGroupDepth,
  handleAddStepToGraph,
  addNode,
  addGroup,
  addEntityToGroup,
  handleConnectNodes,
  getConnectedEntities,
  connectNodeToLastInGroup,
  removeEntityEdgesAndBridge,
  normalizeGroupSpacing,
  normalizeCanvasEntitySpacing
} from '../utils/graph-helpers'
import { DEFAULT_LABELS } from '../constants/labels'
import {
  getNodeCssClass as _getNodeCssClass,
  getNodeDisplayLabel as _getNodeDisplayLabel,
  getNodeDisplayLabelRight as _getNodeDisplayLabelRight,
  getGroupDisplayLabel as _getGroupDisplayLabel,
  getGroupDisplayLabelRight as _getGroupDisplayLabelRight,
  shouldHideGroupAddNode as _shouldHideGroupAddNode,
  shouldHideGroupAddGroup as _shouldHideGroupAddGroup,
  shouldHideGroupNestedAddNode as _shouldHideGroupNestedAddNode,
  shouldHideGroupNestedAddGroup as _shouldHideGroupNestedAddGroup,
  shouldHideNodeAddNode as _shouldHideNodeAddNode,
  shouldHideNodeAddGroup as _shouldHideNodeAddGroup,
  getNodeAddNodeButtonText as _getNodeAddNodeButtonText,
  getNodeAddGroupButtonText as _getNodeAddGroupButtonText,
  getGroupAddNodeButtonText as _getGroupAddNodeButtonText,
  getGroupAddGroupButtonText as _getGroupAddGroupButtonText
} from '../utils/display-helpers'
import { readRecordTrimmed, entityAccessibilityLabel } from '../utils/workflow-record-a11y'
import WorkflowTile from './WorkflowTile.vue'
import WorkflowConfigPanel from './WorkflowConfigPanel.vue'
import WorkflowPlusPlaceholder from './WorkflowPlusPlaceholder.vue'
import { useDragging } from '../composables/useDragging'
import { useConnections } from '../composables/useConnections'
import { useGroupResize } from '../composables/useGroupResize'
import { useCanvas } from '../composables/useCanvas'

/**
 * WorkflowCanvas - A visual workflow editor component with drag-and-drop support
 *
 * @component
 *
 * @description
 * This component provides a complete workflow canvas with nodes, groups, and connections.
 * It supports two-way data binding through v-model, allowing both internal UI interactions
 * and external programmatic updates to the workflow graph.
 *
 * @example
 * // Basic usage with v-model
 * <WorkflowCanvas v-model="workflowGraph" />
 *
 * @example
 * // Programmatic data manipulation
 * const workflowGraph = ref<WorkflowGraph>({
 *   nodes: [...],
 *   edges: [...],
 *   groups: [...]
 * })
 *
 * // Direct modification - canvas updates automatically
 * function moveNode() {
 *   const node = workflowGraph.value.nodes.find(n => n.id === 'node-1')
 *   if (node) {
 *     node.position.x += 100
 *     node.position.y += 50
 *   }
 * }
 *
 * // Batch updates
 * function updateAllNodes() {
 *   workflowGraph.value.nodes.forEach(node => {
 *     node.position.x += 10
 *   })
 * }
 *
 * @prop {WorkflowGraph} modelValue - The complete workflow graph containing nodes, edges, and groups.
 *   This prop supports two-way binding via v-model. Any changes to this object will reactively
 *   update the canvas, and any UI interactions will emit 'update:modelValue' events.
 *   Structure: { nodes: WorkflowNode[], edges: WorkflowEdge[], groups: WorkflowGroup[] }
 *
 * @prop {boolean} readonly - If true, disables all editing capabilities (default: false)
 *
 * @prop {string|null} selectedId - Currently selected node or group ID (supports v-model:selected-id)
 *
 * @prop {number} width - Canvas width in pixels (default: 1000)
 *
 * @prop {number} height - Canvas height in pixels (default: 1000)
 *
 * @prop {number|null} maxGroupDepth - Maximum nesting depth for groups (null = unlimited)
 *
 * @prop {Partial<WorkflowCanvasLabels>} labels - Custom labels for internationalization
 *
 * @prop {NodeTypeConfig} nodeTypes - Configuration for different node types with custom fields
 *
 * @prop {GroupTypeConfig} groupTypes - Configuration for different group types with custom fields
 *
 * @prop {boolean} hideEmptyHandles - If true, hides input/output handles when they have no connections (default: false)
 *
 * @prop {boolean} hidePathAdd - If true, hides the "+" placeholders shown on edges between nodes (default: false)
 *
 * @prop {WorkflowCanvasMode} mode - Canvas mode: 'view' for read-only display or 'edit' for full interactivity (default: 'view')
 *
 * @prop {boolean} edgesLocked - If true, all edges are locked and cannot be disconnected or deleted.
 *   This combines with individual edge.locked properties (edges are locked if either is true).
 *   When enabled, newly created edges will automatically have their locked property set to true. (default: false)
 *
 * @emits update:modelValue - Emitted when the graph changes (nodes moved, added, deleted, etc.)
 * @emits update:selectedId - Emitted when selection changes
 * @emits node-add - Emitted when a node is added
 * @emits node-delete - Emitted when a node is deleted with full entity information (node, parentGroup, connectedEntities)
 * @emits node-update - Emitted when a node is updated
 * @emits group-add - Emitted when a group is added
 * @emits group-delete - Emitted when a group is deleted with full entity information (group, parentGroup, connectedEntities)
 * @emits group-update - Emitted when a group is updated
 * @emits edge-add - Emitted when an edge is added with full entity information (edge, from, to)
 * @emits edge-delete - Emitted when an edge is deleted
 * @emits fullscreen-toggle - Emitted when the full-width toggle button is clicked, with a boolean indicating the new state (true = fullscreen, false = normal)
 */
export default defineComponent({
  name: 'WorkflowCanvas',
  components: {
    WorkflowTile,
    WorkflowConfigPanel,
    WorkflowPlusPlaceholder
  },
  props: {
    /**
     * The workflow graph data structure containing all nodes, edges, and groups.
     * Supports two-way binding via v-model for reactive updates.
     *
     * You can directly modify this object to programmatically update the canvas:
     * - Change node positions: node.position.x = newX
     * - Add/remove nodes: graph.nodes.push(newNode) or filter
     * - Modify groups: group.size.w = newWidth
     *
     * All changes will be reflected in the canvas automatically.
     */
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
    },
    nodeTypes: {
      type: Object as () => NodeTypeConfig,
      default: () => ({})
    },
    groupTypes: {
      type: Object as () => GroupTypeConfig,
      default: () => ({})
    },
    hideEmptyHandles: {
      type: Boolean,
      default: false
    },
    hidePathAdd: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String as () => WorkflowCanvasMode,
      default: 'view'
    },
    edgesLocked: {
      type: Boolean,
      default: false
    },
    record: {
      type: Object as () => FormRecord,
      required: true
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
    'entity-moved-to-group',
    'fullscreen-toggle',
    'node-swap',
    'entity-reorder'
  ],
  setup(props, { emit, expose }) {
    /** Fallback when `--wf-entity-spacing` is missing; matches default in `scss/index.scss` */
    const DEFAULT_ENTITY_SPACING = 50
    const DEFAULT_GROUP_PADDING = 20

    const isViewMode = computed(() => props.mode === 'view')

    const mergedLabels = computed<WorkflowCanvasLabels>(() => ({
      ...DEFAULT_LABELS,
      ...props.labels
    }))

    const canvasApplicationAriaLabel = computed(
      () =>
        readRecordTrimmed(props.record.value, 'workflow-canvas-ariaLabel') ||
        mergedLabels.value.canvasAriaLabel
    )

    const fullWidthToggleRecordLabel = computed(() =>
      readRecordTrimmed(props.record.value, 'workflow-canvas-fullWidthToggle')
    )

    function getEntityA11yName(entityId: string) {
      return entityAccessibilityLabel(props.record.value, entityId)
    }

    function getPlaceholderAriaLabel(placeholder: {
      afterNodeId?: string
      inGroupId?: string
    }): string | undefined {
      const id = placeholder.afterNodeId ?? placeholder.inGroupId
      if (!id) return undefined
      return entityAccessibilityLabel(props.record.value, id)
    }

    const selectedNode = computed(() =>
      props.selectedId ? findNode(props.modelValue, props.selectedId) : null
    )

    const selectedGroup = computed(() =>
      props.selectedId ? props.modelValue.groups.find(g => g.id === props.selectedId) : null
    )

    /** Tab stop for keyboard panes when the workflow can be operated or browsed with keys */
    const canvasTabIndex = computed(() => {
      if (isViewMode.value) return 0
      return props.readonly ? -1 : 0
    })

    const canvasRef = ref<HTMLElement>()
    const nodeElements = ref<Map<string, HTMLElement>>(new Map())
    const isFullWidth = ref(false)

    function readCssPx(el: HTMLElement | undefined, name: string, fallback: number): number {
      if (!el) return fallback
      const raw = getComputedStyle(el).getPropertyValue(name).trim()
      if (!raw) return fallback
      const n = parseFloat(raw)
      return Number.isFinite(n) ? n : fallback
    }

    const getEntitySpacing = () =>
      readCssPx(canvasRef.value, '--wf-entity-spacing', DEFAULT_ENTITY_SPACING)
    const getGroupPadding = () =>
      readCssPx(canvasRef.value, '--wf-group-padding', DEFAULT_GROUP_PADDING)

    /**
     * Build a map of entity ID -> measured {w,h} from the DOM.
     * Groups already carry accurate size in the model; this captures
     * node dimensions that may differ from the model fallback of 250x100.
     */
    const buildEntityDimensionsMap = (): Map<string, Size> => {
      const map = new Map<string, Size>()
      for (const [id, el] of nodeElements.value) {
        const rect = el.getBoundingClientRect()
        map.set(id, { w: rect.width, h: rect.height })
      }
      return map
    }

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
      // Get the parent group to check for group-specific maxDepth
      const parentGroup = findGroup(props.modelValue, parentId)
      if (!parentGroup) return false

      // Use group's maxDepth if set, otherwise fall back to global maxGroupDepth
      const effectiveMaxDepth =
        parentGroup.maxDepth !== undefined ? parentGroup.maxDepth : props.maxGroupDepth

      // If no depth limit is set, allow nesting
      if (effectiveMaxDepth === null) return false

      // Calculate depth relative to the parent group (not absolute depth)
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
        return newEntityDepth + maxDescendantDepth > effectiveMaxDepth
      }

      return newEntityDepth > effectiveMaxDepth
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

      const padding = getGroupPadding()
      return {
        w: Math.max(100, maxX - group.position.x + padding),
        h: Math.max(100, maxY - group.position.y + padding)
      }
    }

    const createEdgeAddPayload = (graph: WorkflowGraph, edge: WorkflowEdge): EdgeAddPayload => {
      const fromEntity = findNode(graph, edge.from.entityId) || findGroup(graph, edge.from.entityId)
      const toEntity = findNode(graph, edge.to.entityId) || findGroup(graph, edge.to.entityId)

      if (!fromEntity || !toEntity) {
        throw new Error('Edge references non-existent entities')
      }

      return {
        edge,
        from: fromEntity,
        to: toEntity
      }
    }

    const expandGroupIfNeeded = (
      graph: WorkflowGraph,
      groupId: string,
      newItemPosition: Position,
      newItemSize: Size
    ): WorkflowGraph => {
      const group = findGroup(graph, groupId)
      if (!group) return graph

      const padding = getGroupPadding()
      const requiredBottom = newItemPosition.y + newItemSize.h + padding
      const currentBottom = group.position.y + group.size.h

      if (requiredBottom > currentBottom) {
        const newHeight = requiredBottom - group.position.y
        return {
          ...graph,
          groups: graph.groups.map(g =>
            g.id === groupId ? { ...g, size: { ...g.size, h: newHeight } } : g
          )
        }
      }

      return graph
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
      edgesLocked: toRef(props, 'edgesLocked'),
      canvasRef,
      nodeTypes: toRef(props, 'nodeTypes'),
      findDropTargetGroup,
      wouldExceedMaxDepth,
      onGraphUpdate: graph => emit('update:modelValue', graph),
      onNodeDragStart: nodeId => emit('node-drag-start', nodeId),
      onNodeDragEnd: (nodeId, position, parentGroup, connected) =>
        emit('node-drag-end', nodeId, position, parentGroup, connected),
      onGroupDragStart: groupId => emit('group-drag-start', groupId),
      onGroupDragEnd: (groupId, position, parentGroup, connected) =>
        emit('group-drag-end', groupId, position, parentGroup, connected),
      onEntityMovedToGroup: (entityId, groupId) => emit('entity-moved-to-group', entityId, groupId),
      onNodeParentGroupChange: (node, parentGroup, connected) =>
        emit('node-update', node, parentGroup, connected),
      onNodeSwap: (nodeIdA, nodeIdB) => emit('node-swap', nodeIdA, nodeIdB),
      onEdgeAdd: (graph, edge) => {
        const payload = createEdgeAddPayload(graph, edge)
        emit('edge-add', payload)
      },
      onEntityReorder: (entityId, groupId, afterEntityId) =>
        emit('entity-reorder', entityId, groupId, afterEntityId),
      getEntitySpacing,
      getGroupPadding,
      buildEntityDimensionsMap
    })

    const connections = useConnections({
      graph: toRef(props, 'modelValue'),
      readonly: toRef(props, 'readonly'),
      edgesLocked: toRef(props, 'edgesLocked'),
      canvasRef,
      getEntityCenter: canvas.getEntityCenter,
      getEntityDimensions: canvas.getEntityDimensions,
      getEntityConnectionPoint: canvas.getEntityConnectionPoint,
      onGraphUpdate: graph => emit('update:modelValue', graph),
      onEdgeAdd: (graph, edge) => {
        const payload = createEdgeAddPayload(graph, edge)
        emit('edge-add', payload)
      },
      onEdgeDelete: edgeId => emit('edge-delete', edgeId),
      nodeTypes: toRef(props, 'nodeTypes')
    })

    const resize = useGroupResize({
      graph: toRef(props, 'modelValue'),
      readonly: toRef(props, 'readonly'),
      canvasRef,
      calculateGroupMinimumSize,
      onGraphUpdate: graph => emit('update:modelValue', graph),
      onGroupResizeStart: groupId => emit('group-resize-start', groupId),
      onGroupResizeEnd: (groupId, size) => emit('group-resize-end', groupId, size),
      onUpdateSelectedId: id => emit('update:selectedId', id),
      getGroupPadding
    })

    // Calculate plus placeholder positions on edges
    const placeholders = computed(() => {
      const result: Array<{
        key: string
        position: Position
        afterNodeId?: string
        inGroupId?: string
      }> = []

      if (props.readonly || props.hidePathAdd) return result

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

      const fromPosition = edge.from.position || 'bottom'
      const toPosition = edge.to.position || 'top'

      const fromPos = canvas.getEntityConnectionPoint(fromEntity, fromPosition)
      const toPos = canvas.getEntityConnectionPoint(toEntity, toPosition)

      const isHorizontalFrom = fromPosition === 'left' || fromPosition === 'right'
      const isHorizontalTo = toPosition === 'left' || toPosition === 'right'

      if (isHorizontalFrom && isHorizontalTo) {
        const dx = toPos.x - fromPos.x
        const controlOffset = Math.abs(dx) / 2
        return `M ${fromPos.x},${fromPos.y} C ${fromPos.x + (fromPosition === 'right' ? controlOffset : -controlOffset)},${fromPos.y} ${toPos.x + (toPosition === 'right' ? controlOffset : -controlOffset)},${toPos.y} ${toPos.x},${toPos.y}`
      } else if (isHorizontalFrom) {
        const dx = Math.abs(toPos.x - fromPos.x)
        const dy = Math.abs(toPos.y - fromPos.y)
        const controlOffset = Math.max(dx, dy) / 2
        return `M ${fromPos.x},${fromPos.y} C ${fromPos.x + (fromPosition === 'right' ? controlOffset : -controlOffset)},${fromPos.y} ${toPos.x},${toPos.y + (toPosition === 'bottom' ? controlOffset : -controlOffset)} ${toPos.x},${toPos.y}`
      } else if (isHorizontalTo) {
        const dx = Math.abs(toPos.x - fromPos.x)
        const dy = Math.abs(toPos.y - fromPos.y)
        const controlOffset = Math.max(dx, dy) / 2
        return `M ${fromPos.x},${fromPos.y} C ${fromPos.x},${fromPos.y + (fromPosition === 'bottom' ? controlOffset : -controlOffset)} ${toPos.x + (toPosition === 'right' ? controlOffset : -controlOffset)},${toPos.y} ${toPos.x},${toPos.y}`
      } else {
        const dy = toPos.y - fromPos.y
        const controlOffset = Math.abs(dy) / 2
        return `M ${fromPos.x},${fromPos.y} C ${fromPos.x},${fromPos.y + controlOffset} ${toPos.x},${toPos.y - controlOffset} ${toPos.x},${toPos.y}`
      }
    }

    const getNodeCssClass = (node: WorkflowNode) => _getNodeCssClass(node, props.nodeTypes)
    const getNodeDisplayLabel = (node: WorkflowNode) => _getNodeDisplayLabel(node)
    const getNodeDisplayLabelRight = (node: WorkflowNode) => _getNodeDisplayLabelRight(node)
    const getGroupDisplayLabel = (group: WorkflowGroup) =>
      _getGroupDisplayLabel(group, props.groupTypes)
    const getGroupDisplayLabelRight = (group: WorkflowGroup) => _getGroupDisplayLabelRight(group)
    const shouldHideGroupAddNode = (group: WorkflowGroup) =>
      _shouldHideGroupAddNode(group, props.groupTypes)
    const shouldHideGroupAddGroup = (group: WorkflowGroup) =>
      _shouldHideGroupAddGroup(group, props.groupTypes)
    const shouldHideGroupNestedAddNode = (group: WorkflowGroup) =>
      _shouldHideGroupNestedAddNode(group, props.groupTypes)
    const shouldHideGroupNestedAddGroup = (group: WorkflowGroup) =>
      _shouldHideGroupNestedAddGroup(group, props.groupTypes)
    const shouldHideNodeAddNode = (node: WorkflowNode) =>
      _shouldHideNodeAddNode(node, props.nodeTypes)
    const shouldHideNodeAddGroup = (node: WorkflowNode) =>
      _shouldHideNodeAddGroup(node, props.nodeTypes)
    const getNodeAddNodeButtonText = (node: WorkflowNode) =>
      _getNodeAddNodeButtonText(node, props.nodeTypes, mergedLabels.value)
    const getNodeAddGroupButtonText = (node: WorkflowNode) =>
      _getNodeAddGroupButtonText(node, props.nodeTypes, mergedLabels.value)
    const getGroupAddNodeButtonText = (group: WorkflowGroup) =>
      _getGroupAddNodeButtonText(group, props.groupTypes, mergedLabels.value)
    const getGroupAddGroupButtonText = (group: WorkflowGroup) =>
      _getGroupAddGroupButtonText(group, props.groupTypes, mergedLabels.value)

    function getEmptyMenuVisibleActions(group: WorkflowGroup): ('addNode' | 'addGroup')[] {
      const actions: ('addNode' | 'addGroup')[] = []

      if (!shouldHideGroupNestedAddNode(group)) {
        actions.push('addNode')
      }

      if (!wouldExceedMaxDepth('', group.id) && !shouldHideGroupNestedAddGroup(group)) {
        actions.push('addGroup')
      }

      return actions
    }

    function shouldShowInputHandle(entityId: string): boolean {
      if (!props.hideEmptyHandles) return true
      return connections.hasIncomingConnection(entityId)
    }

    function shouldShowOutputHandle(entityId: string): boolean {
      if (!props.hideEmptyHandles) return true
      return !connections.isOutputFree(entityId)
    }

    function getInputHandlePosition(entityId: string): 'top' | 'left' {
      const incomingEdge = props.modelValue.edges.find(edge => edge.to.entityId === entityId)
      return incomingEdge?.to.position === 'left' ? 'left' : 'top'
    }

    function getOutputHandlePosition(entityId: string): 'bottom' | 'right' {
      const outgoingEdge = props.modelValue.edges.find(edge => edge.from.entityId === entityId)
      return outgoingEdge?.from.position === 'right' ? 'right' : 'bottom'
    }

    function handleAddNodeAfterNode(nodeId: string) {
      const sourceNode = findNode(props.modelValue, nodeId)
      if (!sourceNode) return

      const parentGroup = getParentGroup(props.modelValue, nodeId)

      // Determine node kind from parent group if available
      let nodeKind = ''
      if (parentGroup && parentGroup.kind && props.nodeTypes[parentGroup.kind]) {
        nodeKind = parentGroup.kind
      }

      // Calculate position: place new node below and to the right of source node
      const nodeWidth = sourceNode.size?.w || 250
      const sourceHeight = canvas.getEntityDimensions(sourceNode).height
      const nodeHeight = sourceNode.size?.h || 100
      const newX = sourceNode.position.x
      const newY = sourceNode.position.y + sourceHeight + getEntitySpacing()

      // Expand parent group if needed
      let graphWithExpandedGroup = props.modelValue
      if (parentGroup) {
        graphWithExpandedGroup = expandGroupIfNeeded(
          props.modelValue,
          parentGroup.id,
          { x: newX, y: newY },
          { w: nodeWidth, h: nodeHeight }
        )
      }

      // Create new node at calculated position
      const result = addNode(graphWithExpandedGroup, {
        position: { x: newX, y: newY },
        kind: nodeKind
      })

      // Add node to parent group if source node is in a group
      let updatedGraph = result.graph
      if (parentGroup) {
        updatedGraph = addEntityToGroup(updatedGraph, result.newNodeId, parentGroup.id)
      }

      // Apply lockParent/requireGroup/allowedParents defaults from node type definition
      const nodeTypeDef = nodeKind ? props.nodeTypes?.[nodeKind] : undefined
      if (
        nodeTypeDef?.lockParent !== undefined ||
        nodeTypeDef?.requireGroup !== undefined ||
        nodeTypeDef?.allowedParents !== undefined
      ) {
        updatedGraph = {
          ...updatedGraph,
          nodes: updatedGraph.nodes.map(n =>
            n.id === result.newNodeId
              ? {
                  ...n,
                  ...(nodeTypeDef.lockParent !== undefined && {
                    lockParent: nodeTypeDef.lockParent
                  }),
                  ...(nodeTypeDef.requireGroup !== undefined && {
                    requireGroup: nodeTypeDef.requireGroup
                  }),
                  ...(nodeTypeDef.allowedParents !== undefined && {
                    allowedParents: nodeTypeDef.allowedParents
                  })
                }
              : n
          )
        }
      }

      // Create edge connecting source node to new node
      updatedGraph = handleConnectNodes(
        updatedGraph,
        {
          fromNodeId: nodeId,
          toNodeId: result.newNodeId
        },
        {
          edgeLocked: props.edgesLocked
        }
      )

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newNodeId)
      const newNode = updatedGraph.nodes.find(n => n.id === result.newNodeId)!
      const connectedEntities = getConnectedEntities(updatedGraph, result.newNodeId)
      emit('node-add', newNode, parentGroup || null, connectedEntities)
      const newEdge = updatedGraph.edges[updatedGraph.edges.length - 1]
      const payload = createEdgeAddPayload(updatedGraph, newEdge)
      emit('edge-add', payload)
    }

    function handleAddGroupAfterNode(nodeId: string) {
      const sourceNode = findNode(props.modelValue, nodeId)
      if (!sourceNode) return

      const parentGroup = getParentGroup(props.modelValue, nodeId)

      // Calculate position below source node
      const sourceHeight = canvas.getEntityDimensions(sourceNode).height
      const defaultGroupSize = { w: 290, h: 140 }
      const newX = sourceNode.position.x
      const newY = sourceNode.position.y + sourceHeight + getEntitySpacing()

      // Expand parent group if needed
      let graphWithExpandedGroup = props.modelValue
      if (parentGroup) {
        graphWithExpandedGroup = expandGroupIfNeeded(
          props.modelValue,
          parentGroup.id,
          { x: newX, y: newY },
          defaultGroupSize
        )
      }

      // Create new group - use same kind as parent group if available
      const groupKind = parentGroup?.kind || mergedLabels.value.defaultGroupKind
      const result = addGroup(graphWithExpandedGroup, {
        position: { x: newX, y: newY },
        kind: groupKind
      })

      // Add group to parent group if source node is in a group
      let updatedGraph = result.graph
      if (parentGroup) {
        updatedGraph = addEntityToGroup(updatedGraph, result.newGroupId, parentGroup.id)
      }

      // Apply lockParent/requireGroup/allowedParents defaults from group type definition if available
      const groupTypeDef = props.groupTypes?.[groupKind]
      if (
        groupTypeDef?.lockParent !== undefined ||
        groupTypeDef?.requireGroup !== undefined ||
        groupTypeDef?.allowedParents !== undefined
      ) {
        updatedGraph = {
          ...updatedGraph,
          groups: updatedGraph.groups.map(g =>
            g.id === result.newGroupId
              ? {
                  ...g,
                  ...(groupTypeDef.lockParent !== undefined && {
                    lockParent: groupTypeDef.lockParent
                  }),
                  ...(groupTypeDef.requireGroup !== undefined && {
                    requireGroup: groupTypeDef.requireGroup
                  }),
                  ...(groupTypeDef.allowedParents !== undefined && {
                    allowedParents: groupTypeDef.allowedParents
                  })
                }
              : g
          )
        }
      }

      // Create edge connecting source node to new group
      updatedGraph = handleConnectNodes(
        updatedGraph,
        {
          fromNodeId: nodeId,
          toNodeId: result.newGroupId
        },
        {
          edgeLocked: props.edgesLocked
        }
      )

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newGroupId)
      const newGroup = updatedGraph.groups.find(g => g.id === result.newGroupId)!
      const connectedEntities = getConnectedEntities(updatedGraph, result.newGroupId)
      emit('group-add', newGroup, parentGroup || null, connectedEntities)
      const newEdge = updatedGraph.edges[updatedGraph.edges.length - 1]
      const payload = createEdgeAddPayload(updatedGraph, newEdge)
      emit('edge-add', payload)
    }

    function handleCanvasClick(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (target === canvasRef.value || target.classList.contains('workflow-canvas__container')) {
        emit('update:selectedId', null)
        emit('canvas-click')
      }
    }

    function handleGroupClick(groupId: string) {
      const group = findGroup(props.modelValue, groupId)
      if (!props.readonly && !group?.readonly) {
        emit('update:selectedId', groupId)
        emit('group-click', groupId)
      }
    }

    function handleAddStep(event: AddStepEvent) {
      // Emit the add-step event for consumers to handle
      emit('add-step', event)

      // Determine node kind from group if available
      let defaultKind = ''
      if (event.inGroupId) {
        const group = findGroup(props.modelValue, event.inGroupId)
        if (group && group.kind && props.nodeTypes[group.kind]) {
          defaultKind = group.kind
        }
      }

      // Track edge count before adding step to determine how many edges were created
      const beforeEdgeCount = props.modelValue.edges.length

      // Also handle it internally by default
      const result = handleAddStepToGraph(props.modelValue, event, {
        defaultKind,
        entitySpacing: getEntitySpacing()
      })

      // Apply lockParent/requireGroup/allowedParents defaults from node type definition if available
      let updatedGraph = result.graph
      const nodeKind = result.graph.nodes.find(n => n.id === result.newNodeId)?.kind
      const nodeTypeDef = nodeKind ? props.nodeTypes?.[nodeKind] : undefined
      if (
        nodeTypeDef?.lockParent !== undefined ||
        nodeTypeDef?.requireGroup !== undefined ||
        nodeTypeDef?.allowedParents !== undefined
      ) {
        updatedGraph = {
          ...updatedGraph,
          nodes: updatedGraph.nodes.map(n =>
            n.id === result.newNodeId
              ? {
                  ...n,
                  ...(nodeTypeDef.lockParent !== undefined && {
                    lockParent: nodeTypeDef.lockParent
                  }),
                  ...(nodeTypeDef.requireGroup !== undefined && {
                    requireGroup: nodeTypeDef.requireGroup
                  }),
                  ...(nodeTypeDef.allowedParents !== undefined && {
                    allowedParents: nodeTypeDef.allowedParents
                  })
                }
              : n
          )
        }
      }

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newNodeId)
      const newNode = updatedGraph.nodes.find(n => n.id === result.newNodeId)!
      const parentGroup = event.inGroupId ? findGroup(updatedGraph, event.inGroupId) : null
      const connectedEntities = getConnectedEntities(updatedGraph, result.newNodeId)
      emit('node-add', newNode, parentGroup, connectedEntities)

      // Emit edge-add for all newly created edges
      // handleAddStepToGraph creates 1 edge (no existing edge) or 2 edges (splits existing edge)
      const edgesAdded = updatedGraph.edges.slice(beforeEdgeCount)
      edgesAdded.forEach(edge => {
        const payload = createEdgeAddPayload(updatedGraph, edge)
        emit('edge-add', payload)
      })
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

    function handleAddNodeToGroup(groupId: string) {
      const group = findGroup(props.modelValue, groupId)
      if (!group) return

      // Get all nodes in this group
      const nodesInGroup = group.containedIds
        .map(id => findNode(props.modelValue, id))
        .filter(Boolean) as WorkflowNode[]

      // Determine node kind from group if available
      let nodeKind = ''
      if (group.kind && props.nodeTypes[group.kind]) {
        nodeKind = group.kind
      }

      let newX: number, newY: number
      const nodeWidth = 250
      const nodeHeight = 100

      if (nodesInGroup.length === 0) {
        // No nodes: center the new node
        newX = group.position.x + group.size.w / 2 - nodeWidth / 2
        newY = group.position.y + group.size.h / 2 - nodeHeight / 2
      } else {
        // Find the bottommost node
        let bottomNode = nodesInGroup[0]
        nodesInGroup.forEach(node => {
          const nodeY = node.position.y + canvas.getEntityDimensions(node).height
          const bottomY = bottomNode.position.y + canvas.getEntityDimensions(bottomNode).height
          if (nodeY > bottomY) {
            bottomNode = node
          }
        })

        // Position below the bottommost node
        const bottomNodeHeight = canvas.getEntityDimensions(bottomNode).height
        newX = bottomNode.position.x
        newY = bottomNode.position.y + bottomNodeHeight + getEntitySpacing()
      }

      // Expand group if needed to accommodate new node
      let graphWithExpandedGroup = expandGroupIfNeeded(
        props.modelValue,
        groupId,
        { x: newX, y: newY },
        { w: nodeWidth, h: nodeHeight }
      )

      // Create new node at calculated position
      const result = addNode(graphWithExpandedGroup, {
        position: { x: newX, y: newY },
        kind: nodeKind
      })

      // Add node to group
      let updatedGraph = addEntityToGroup(result.graph, result.newNodeId, groupId)

      // Apply lockParent/requireGroup/allowedParents defaults from node type definition
      const nodeTypeDef = nodeKind ? props.nodeTypes?.[nodeKind] : undefined
      if (
        nodeTypeDef?.lockParent !== undefined ||
        nodeTypeDef?.requireGroup !== undefined ||
        nodeTypeDef?.allowedParents !== undefined
      ) {
        updatedGraph = {
          ...updatedGraph,
          nodes: updatedGraph.nodes.map(n =>
            n.id === result.newNodeId
              ? {
                  ...n,
                  ...(nodeTypeDef.lockParent !== undefined && {
                    lockParent: nodeTypeDef.lockParent
                  }),
                  ...(nodeTypeDef.requireGroup !== undefined && {
                    requireGroup: nodeTypeDef.requireGroup
                  }),
                  ...(nodeTypeDef.allowedParents !== undefined && {
                    allowedParents: nodeTypeDef.allowedParents
                  })
                }
              : n
          )
        }
      }

      const edgeCountBeforeAutoConnect = updatedGraph.edges.length
      updatedGraph = connectNodeToLastInGroup(updatedGraph, result.newNodeId, groupId, {
        edgeLocked: props.edgesLocked
      })

      // Normalize spacing for all siblings so pre-existing gaps are fixed
      const dims = buildEntityDimensionsMap()
      updatedGraph = normalizeGroupSpacing(
        updatedGraph,
        groupId,
        getEntitySpacing(),
        getGroupPadding(),
        dims
      )

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newNodeId)
      const newNode = updatedGraph.nodes.find(n => n.id === result.newNodeId)!
      const parentGroup = findGroup(updatedGraph, groupId)
      const connectedEntities = getConnectedEntities(updatedGraph, result.newNodeId)
      emit('node-add', newNode, parentGroup || null, connectedEntities)
      if (updatedGraph.edges.length > edgeCountBeforeAutoConnect) {
        const newEdge = updatedGraph.edges[updatedGraph.edges.length - 1]
        const payload = createEdgeAddPayload(updatedGraph, newEdge)
        emit('edge-add', payload)
      }
    }

    function handleAddNestedGroup(parentGroupId: string) {
      const parentGroup = findGroup(props.modelValue, parentGroupId)
      if (!parentGroup) return

      // Check if adding a nested group would exceed depth limits
      if (wouldExceedMaxDepth('', parentGroupId)) return

      // Get nested configuration from group instance or type definition
      const groupTypeDef = props.groupTypes?.[parentGroup.kind]
      const nestedConfig = parentGroup.nested || groupTypeDef?.nested

      // Determine label: use nested config label, or fallback to current behavior
      const label =
        nestedConfig?.label ||
        mergedLabels.value.nestedGroupLabel(parentGroup.kind || mergedLabels.value.defaultGroupKind)

      // Determine placeholder: use nested config placeholder if available
      const placeholder = nestedConfig?.placeholder

      // Determine fields: use nested config fields if available
      const fields = nestedConfig?.fields

      // Get all entities in the parent group
      const allEntitiesInParent = parentGroup.containedIds
        .map(id => findEntity(id))
        .filter(Boolean) as (WorkflowNode | WorkflowGroup)[]

      const defaultGroupSize = { w: 290, h: 140 }

      let position: Position

      if (allEntitiesInParent.length === 0) {
        // Empty parent: center the new group
        position = {
          x: parentGroup.position.x + parentGroup.size.w / 2 - defaultGroupSize.w / 2,
          y: parentGroup.position.y + parentGroup.size.h / 2 - defaultGroupSize.h / 2
        }
      } else {
        // Find the bottommost entity
        let bottomEntity = allEntitiesInParent[0]
        allEntitiesInParent.forEach(entity => {
          const entityBottom = entity.position.y + canvas.getEntityDimensions(entity).height
          const currentBottom =
            bottomEntity.position.y + canvas.getEntityDimensions(bottomEntity).height
          if (entityBottom > currentBottom) {
            bottomEntity = entity
          }
        })

        // Position below the bottommost entity
        const bottomEntityHeight = canvas.getEntityDimensions(bottomEntity).height

        position = {
          x: bottomEntity.position.x,
          y: bottomEntity.position.y + bottomEntityHeight + getEntitySpacing()
        }
      }

      // Expand parent group if needed
      let graphWithExpandedParent = expandGroupIfNeeded(
        props.modelValue,
        parentGroupId,
        position,
        defaultGroupSize
      )

      // Create new group with same kind as parent
      const result = addGroup(graphWithExpandedParent, {
        position,
        kind: parentGroup.kind,
        label
      })

      // If placeholder, fields, lockParent, requireGroup, or allowedParents are configured, set them in the group
      let updatedGraph = result.graph
      const shouldApplyLockParent = groupTypeDef?.lockParent !== undefined
      const shouldApplyRequireGroup = groupTypeDef?.requireGroup !== undefined
      const shouldApplyAllowedParents = groupTypeDef?.allowedParents !== undefined
      if (
        placeholder ||
        fields ||
        shouldApplyLockParent ||
        shouldApplyRequireGroup ||
        shouldApplyAllowedParents
      ) {
        updatedGraph = {
          ...updatedGraph,
          groups: updatedGraph.groups.map(g =>
            g.id === result.newGroupId
              ? {
                  ...g,
                  ...(shouldApplyLockParent && { lockParent: groupTypeDef.lockParent }),
                  ...(shouldApplyRequireGroup && { requireGroup: groupTypeDef.requireGroup }),
                  ...(shouldApplyAllowedParents && { allowedParents: groupTypeDef.allowedParents }),
                  definition: {
                    ...g.definition,
                    ...(placeholder && { placeholder }),
                    ...(fields && { fields })
                  }
                }
              : g
          )
        }
      }

      // Add the new group to the parent group
      updatedGraph = addEntityToGroup(updatedGraph, result.newGroupId, parentGroupId)

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newGroupId)
      const newGroup = updatedGraph.groups.find(g => g.id === result.newGroupId)!
      // parentGroup is already defined above, reuse it for emit
      const connectedEntities = getConnectedEntities(updatedGraph, result.newGroupId)
      emit('group-add', newGroup, parentGroup || null, connectedEntities)
    }

    function handleEmptyPlusClick(group: WorkflowGroup) {
      const visibleActions = getEmptyMenuVisibleActions(group)

      if (visibleActions.length === 1) {
        if (visibleActions[0] === 'addNode') {
          handleAddNodeToGroup(group.id)
        } else if (visibleActions[0] === 'addGroup') {
          handleAddNestedGroup(group.id)
        }
      }
    }

    function handleAddNodeAfterGroup(groupId: string) {
      const sourceGroup = findGroup(props.modelValue, groupId)
      if (!sourceGroup) return

      const parentGroup = getParentGroup(props.modelValue, groupId)

      // Determine node kind from parent group if available
      let nodeKind = ''
      if (parentGroup && parentGroup.kind && props.nodeTypes[parentGroup.kind]) {
        nodeKind = parentGroup.kind
      }

      // Calculate position: place new node below and aligned with group
      const nodeWidth = 250
      const nodeHeight = 100
      const sourceHeight = canvas.getEntityDimensions(sourceGroup).height
      const newX = sourceGroup.position.x
      const newY = sourceGroup.position.y + sourceHeight + getEntitySpacing()

      // Expand parent group if needed
      let graphWithExpandedGroup = props.modelValue
      if (parentGroup) {
        graphWithExpandedGroup = expandGroupIfNeeded(
          props.modelValue,
          parentGroup.id,
          { x: newX, y: newY },
          { w: nodeWidth, h: nodeHeight }
        )
      }

      // Create new node at calculated position
      const result = addNode(graphWithExpandedGroup, {
        position: { x: newX, y: newY },
        kind: nodeKind
      })

      // Add node to parent group if source group is in a parent group
      let updatedGraph = result.graph
      if (parentGroup) {
        updatedGraph = addEntityToGroup(updatedGraph, result.newNodeId, parentGroup.id)
      }

      // Apply lockParent/requireGroup/allowedParents defaults from node type definition
      const nodeTypeDef = nodeKind ? props.nodeTypes?.[nodeKind] : undefined
      if (
        nodeTypeDef?.lockParent !== undefined ||
        nodeTypeDef?.requireGroup !== undefined ||
        nodeTypeDef?.allowedParents !== undefined
      ) {
        updatedGraph = {
          ...updatedGraph,
          nodes: updatedGraph.nodes.map(n =>
            n.id === result.newNodeId
              ? {
                  ...n,
                  ...(nodeTypeDef.lockParent !== undefined && {
                    lockParent: nodeTypeDef.lockParent
                  }),
                  ...(nodeTypeDef.requireGroup !== undefined && {
                    requireGroup: nodeTypeDef.requireGroup
                  }),
                  ...(nodeTypeDef.allowedParents !== undefined && {
                    allowedParents: nodeTypeDef.allowedParents
                  })
                }
              : n
          )
        }
      }

      // Create edge connecting source group to new node
      updatedGraph = handleConnectNodes(
        updatedGraph,
        {
          fromNodeId: groupId,
          toNodeId: result.newNodeId
        },
        {
          edgeLocked: props.edgesLocked
        }
      )

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newNodeId)
      const newNode = updatedGraph.nodes.find(n => n.id === result.newNodeId)!
      const connectedEntities = getConnectedEntities(updatedGraph, result.newNodeId)
      emit('node-add', newNode, parentGroup || null, connectedEntities)
      const newEdge = updatedGraph.edges[updatedGraph.edges.length - 1]
      const payload = createEdgeAddPayload(updatedGraph, newEdge)
      emit('edge-add', payload)
    }

    function handleAddGroupAfterGroup(groupId: string) {
      const sourceGroup = findGroup(props.modelValue, groupId)
      if (!sourceGroup) return

      const parentGroup = getParentGroup(props.modelValue, groupId)

      // Calculate position below source group
      const sourceHeight = canvas.getEntityDimensions(sourceGroup).height
      const defaultGroupSize = { w: 290, h: 140 }
      const newX = sourceGroup.position.x
      const newY = sourceGroup.position.y + sourceHeight + getEntitySpacing()

      // Expand parent group if needed
      let graphWithExpandedGroup = props.modelValue
      if (parentGroup) {
        graphWithExpandedGroup = expandGroupIfNeeded(
          props.modelValue,
          parentGroup.id,
          { x: newX, y: newY },
          defaultGroupSize
        )
      }

      // Create new group - use same kind as parent group if available
      const groupKind = parentGroup?.kind || mergedLabels.value.defaultGroupKind
      const result = addGroup(graphWithExpandedGroup, {
        position: { x: newX, y: newY },
        kind: groupKind
      })

      // Add group to parent group if source group is in a parent group
      let updatedGraph = result.graph
      if (parentGroup) {
        updatedGraph = addEntityToGroup(updatedGraph, result.newGroupId, parentGroup.id)
      }

      // Apply lockParent/requireGroup/allowedParents defaults from group type definition if available
      const groupTypeDef = props.groupTypes?.[groupKind]
      if (
        groupTypeDef?.lockParent !== undefined ||
        groupTypeDef?.requireGroup !== undefined ||
        groupTypeDef?.allowedParents !== undefined
      ) {
        updatedGraph = {
          ...updatedGraph,
          groups: updatedGraph.groups.map(g =>
            g.id === result.newGroupId
              ? {
                  ...g,
                  ...(groupTypeDef.lockParent !== undefined && {
                    lockParent: groupTypeDef.lockParent
                  }),
                  ...(groupTypeDef.requireGroup !== undefined && {
                    requireGroup: groupTypeDef.requireGroup
                  }),
                  ...(groupTypeDef.allowedParents !== undefined && {
                    allowedParents: groupTypeDef.allowedParents
                  })
                }
              : g
          )
        }
      }

      // Create edge connecting source group to new group
      updatedGraph = handleConnectNodes(
        updatedGraph,
        {
          fromNodeId: groupId,
          toNodeId: result.newGroupId
        },
        {
          edgeLocked: props.edgesLocked
        }
      )

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newGroupId)
      const newGroup = updatedGraph.groups.find(g => g.id === result.newGroupId)!
      const connectedEntities = getConnectedEntities(updatedGraph, result.newGroupId)
      emit('group-add', newGroup, parentGroup || null, connectedEntities)
      const newEdge = updatedGraph.edges[updatedGraph.edges.length - 1]
      const payload = createEdgeAddPayload(updatedGraph, newEdge)
      emit('edge-add', payload)
    }

    function handleDeleteNode() {
      const nodeId = selectedNode.value?.id
      if (!nodeId) return
      if (selectedNode.value?.locked) return

      const nodeToDelete = selectedNode.value
      const parentGroup = getParentGroup(props.modelValue, nodeId)
      const connectedEntities = getConnectedEntities(props.modelValue, nodeId)

      const edgeIdsBefore = new Set(props.modelValue.edges.map(e => e.id))
      let updatedGraph = removeEntityEdgesAndBridge(props.modelValue, nodeId, {
        edgeLocked: props.edgesLocked
      })

      const bridgedGraph = updatedGraph
      updatedGraph = {
        ...updatedGraph,
        nodes: updatedGraph.nodes.filter(node => node.id !== nodeId)
      }

      updatedGraph = removeEntityFromAllGroups(updatedGraph, nodeId)

      if (parentGroup) {
        const dims = buildEntityDimensionsMap()
        updatedGraph = updateGroupBounds(
          updatedGraph,
          parentGroup.id,
          getGroupPadding(),
          new Set(),
          dims
        )
      }

      emit('update:selectedId', null)
      emit('update:modelValue', updatedGraph)
      emit('node-delete', nodeToDelete, parentGroup || null, connectedEntities)

      for (const edge of bridgedGraph.edges) {
        if (!edgeIdsBefore.has(edge.id)) {
          const payload = createEdgeAddPayload(updatedGraph, edge)
          emit('edge-add', payload)
        }
      }
    }

    function handleDeleteGroup() {
      const groupId = selectedGroup.value?.id
      if (!groupId) return
      if (selectedGroup.value?.locked) return

      const groupToDelete = selectedGroup.value
      const parentGroup = getParentGroup(props.modelValue, groupId)
      const connectedEntities = getConnectedEntities(props.modelValue, groupId)

      const edgeIdsBefore = new Set(props.modelValue.edges.map(e => e.id))

      // Bridge the group's own incoming→outgoing before removing anything
      let updatedGraph = removeEntityEdgesAndBridge(props.modelValue, groupId, {
        edgeLocked: props.edgesLocked
      })

      const bridgedGraph = updatedGraph

      // Get all descendants (nodes and nested groups) recursively
      const descendants = getGroupDescendants(updatedGraph, groupId)
      const allIdsToDelete = new Set([groupId, ...descendants])

      updatedGraph = {
        ...updatedGraph,
        nodes: updatedGraph.nodes.filter(node => !allIdsToDelete.has(node.id)),
        groups: updatedGraph.groups.filter(group => !allIdsToDelete.has(group.id)),
        edges: updatedGraph.edges.filter(
          edge => !allIdsToDelete.has(edge.from.entityId) && !allIdsToDelete.has(edge.to.entityId)
        )
      }

      updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)

      if (parentGroup) {
        const dims = buildEntityDimensionsMap()
        updatedGraph = updateGroupBounds(
          updatedGraph,
          parentGroup.id,
          getGroupPadding(),
          new Set(),
          dims
        )
      }

      emit('update:selectedId', null)
      emit('update:modelValue', updatedGraph)
      emit('group-delete', groupToDelete, parentGroup || null, connectedEntities)

      for (const edge of bridgedGraph.edges) {
        if (!edgeIdsBefore.has(edge.id)) {
          const payload = createEdgeAddPayload(updatedGraph, edge)
          emit('edge-add', payload)
        }
      }
    }

    function handleUpdateNode(updatedNode: WorkflowNode) {
      const updatedGraph = {
        ...props.modelValue,
        nodes: props.modelValue.nodes.map(node => (node.id === updatedNode.id ? updatedNode : node))
      }

      const parentGroup = getParentGroup(updatedGraph, updatedNode.id)
      const connectedEntities = getConnectedEntities(updatedGraph, updatedNode.id)
      emit('update:modelValue', updatedGraph)
      emit('node-update', updatedNode, parentGroup || null, connectedEntities)
    }

    function handleUpdateGroup(updatedGroup: WorkflowGroup) {
      const updatedGraph = {
        ...props.modelValue,
        groups: props.modelValue.groups.map(group =>
          group.id === updatedGroup.id ? updatedGroup : group
        )
      }

      const parentGroup = getParentGroup(updatedGraph, updatedGroup.id)
      const connectedEntities = getConnectedEntities(updatedGraph, updatedGroup.id)
      emit('update:modelValue', updatedGraph)
      emit('group-update', updatedGroup, parentGroup || null, connectedEntities)
    }

    function handleFullWidthToggle() {
      isFullWidth.value = !isFullWidth.value
      emit('fullscreen-toggle', isFullWidth.value)
    }

    function isInteractiveFocusTarget(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        return true
      }
      if (tag === 'BUTTON' || tag === 'A') return true
      return !!target.closest('button, a[href], input, select, textarea, [contenteditable="true"]')
    }

    function buildKeyboardNavEntities(): Array<{ id: string; center: Position }> {
      const g = props.modelValue
      const items: Array<{ id: string; center: Position }> = []
      for (const node of g.nodes) {
        items.push({ id: node.id, center: canvas.getEntityCenter(node) })
      }
      for (const group of g.groups) {
        items.push({ id: group.id, center: canvas.getEntityCenter(group) })
      }
      return items
    }

    function pickFirstNavEntityId(items: Array<{ id: string; center: Position }>): string | null {
      if (items.length === 0) return null
      const sorted = [...items].sort((a, b) => {
        if (a.center.y !== b.center.y) return a.center.y - b.center.y
        return a.center.x - b.center.x
      })
      return sorted[0].id
    }

    function pickLastNavEntityId(items: Array<{ id: string; center: Position }>): string | null {
      if (items.length === 0) return null
      const sorted = [...items].sort((a, b) => {
        if (a.center.y !== b.center.y) return b.center.y - a.center.y
        return b.center.x - a.center.x
      })
      return sorted[0].id
    }

    function findNextEntityInDirection(
      direction: 'up' | 'down' | 'left' | 'right',
      currentId: string | null,
      items: Array<{ id: string; center: Position }>
    ): string | null {
      if (items.length === 0) return null
      if (!currentId) return pickFirstNavEntityId(items)

      const current = items.find(i => i.id === currentId)
      if (!current) return pickFirstNavEntityId(items)

      const cx = current.center.x
      const cy = current.center.y
      const EPS = 2

      const vec =
        direction === 'up'
          ? { x: 0, y: -1 }
          : direction === 'down'
            ? { x: 0, y: 1 }
            : direction === 'left'
              ? { x: -1, y: 0 }
              : { x: 1, y: 0 }

      let best: { id: string; dist: number } | null = null

      for (const item of items) {
        if (item.id === currentId) continue
        const dx = item.center.x - cx
        const dy = item.center.y - cy
        const dot = dx * vec.x + dy * vec.y
        if (dot <= EPS) continue
        const dist = dx * dx + dy * dy
        if (!best || dist < best.dist) {
          best = { id: item.id, dist }
        }
      }

      return best?.id ?? currentId
    }

    function scrollSelectedEntityIntoView(entityId: string) {
      const root = canvasRef.value
      if (!root) return
      const el = root.querySelector<HTMLElement>(`[data-workflow-entity-id="${entityId}"]`)
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }

    function activateKeyboardSelection() {
      const id = props.selectedId
      if (!id) return
      const node = findNode(props.modelValue, id)
      if (node) {
        if (!node.readonly) {
          emit('update:selectedId', node.id)
          emit('node-click', node.id)
        }
        return
      }
      const group = findGroup(props.modelValue, id)
      if (group && !props.readonly && !group.readonly) {
        emit('update:selectedId', group.id)
        emit('group-click', group.id)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isFullWidth.value) {
        event.preventDefault()
        isFullWidth.value = false
        emit('fullscreen-toggle', isFullWidth.value)
        return
      }

      const interactive = isInteractiveFocusTarget(event.target)

      const allowKeyboardNav =
        (isViewMode.value || !props.readonly) &&
        !interactive &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey

      if (allowKeyboardNav && event.key === 'Escape' && !isFullWidth.value && props.selectedId) {
        event.preventDefault()
        emit('update:selectedId', null)
        return
      }

      if (allowKeyboardNav) {
        const navItems = buildKeyboardNavEntities()

        const arrowDir =
          event.key === 'ArrowUp'
            ? 'up'
            : event.key === 'ArrowDown'
              ? 'down'
              : event.key === 'ArrowLeft'
                ? 'left'
                : event.key === 'ArrowRight'
                  ? 'right'
                  : null

        if (arrowDir) {
          event.preventDefault()
          const nextId = findNextEntityInDirection(arrowDir, props.selectedId, navItems)
          if (nextId && nextId !== props.selectedId) {
            emit('update:selectedId', nextId)
            void nextTick(() => scrollSelectedEntityIntoView(nextId))
          }
          return
        }

        if (event.key === 'Home') {
          event.preventDefault()
          const firstId = pickFirstNavEntityId(navItems)
          if (firstId && firstId !== props.selectedId) {
            emit('update:selectedId', firstId)
            void nextTick(() => scrollSelectedEntityIntoView(firstId))
          }
          return
        }

        if (event.key === 'End') {
          event.preventDefault()
          const lastId = pickLastNavEntityId(navItems)
          if (lastId && lastId !== props.selectedId) {
            emit('update:selectedId', lastId)
            void nextTick(() => scrollSelectedEntityIntoView(lastId))
          }
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          if (!props.selectedId) return
          event.preventDefault()
          activateKeyboardSelection()
          return
        }
      }

      if (isViewMode.value || props.readonly || !props.selectedId) return

      if (interactive) return

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
      if (isViewMode.value) return

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
      if (isViewMode.value) return

      resize.handleMouseUp()
      dragging.handleMouseUp(isPointInRect)
      connections.handleMouseUp()
    }

    /**
     * Re-apply `--wf-entity-spacing` / `--wf-group-padding` from the canvas element
     * to the v-model graph. Call after replacing the graph (e.g. reset) so layout
     * matches the first paint after mount.
     */
    function syncEntitySpacingFromCss() {
      nextTick(() => {
        if (!canvasRef.value) return
        const dims = buildEntityDimensionsMap()
        const synced = normalizeCanvasEntitySpacing(
          props.modelValue,
          getEntitySpacing(),
          getGroupPadding(),
          dims
        )
        emit('update:modelValue', synced)
      })
    }

    onMounted(() => {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('keydown', handleKeyDown)

      // Static initial data does not read CSS until the canvas element exists.
      syncEntitySpacingFromCss()
    })

    onUnmounted(() => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
    })

    // Public methods exposed to parent components
    function addNewNode() {
      const result = addNode(props.modelValue)

      // Apply lockParent/requireGroup/allowedParents defaults from node type definition
      let updatedGraph = result.graph
      const node = result.graph.nodes.find(n => n.id === result.newNodeId)
      const nodeTypeDef = node?.kind ? props.nodeTypes?.[node.kind] : undefined
      if (
        nodeTypeDef?.lockParent !== undefined ||
        nodeTypeDef?.requireGroup !== undefined ||
        nodeTypeDef?.allowedParents !== undefined
      ) {
        updatedGraph = {
          ...updatedGraph,
          nodes: updatedGraph.nodes.map(n =>
            n.id === result.newNodeId
              ? {
                  ...n,
                  ...(nodeTypeDef.lockParent !== undefined && {
                    lockParent: nodeTypeDef.lockParent
                  }),
                  ...(nodeTypeDef.requireGroup !== undefined && {
                    requireGroup: nodeTypeDef.requireGroup
                  }),
                  ...(nodeTypeDef.allowedParents !== undefined && {
                    allowedParents: nodeTypeDef.allowedParents
                  })
                }
              : n
          )
        }
      }

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newNodeId)
      const newNode = updatedGraph.nodes.find(n => n.id === result.newNodeId)!
      const connectedEntities = getConnectedEntities(updatedGraph, result.newNodeId)
      emit('node-add', newNode, null, connectedEntities)
    }

    function addNewGroup(options?: { type?: string; label?: string }) {
      const result = addGroup(props.modelValue, {
        kind: options?.type,
        label: options?.label
      })

      // Apply lockParent/requireGroup/allowedParents defaults from group type definition if available
      let updatedGraph = result.graph
      const groupKind = options?.type || 'group'
      const groupTypeDef = props.groupTypes?.[groupKind]
      if (
        groupTypeDef?.lockParent !== undefined ||
        groupTypeDef?.requireGroup !== undefined ||
        groupTypeDef?.allowedParents !== undefined
      ) {
        updatedGraph = {
          ...updatedGraph,
          groups: updatedGraph.groups.map(g =>
            g.id === result.newGroupId
              ? {
                  ...g,
                  ...(groupTypeDef.lockParent !== undefined && {
                    lockParent: groupTypeDef.lockParent
                  }),
                  ...(groupTypeDef.requireGroup !== undefined && {
                    requireGroup: groupTypeDef.requireGroup
                  }),
                  ...(groupTypeDef.allowedParents !== undefined && {
                    allowedParents: groupTypeDef.allowedParents
                  })
                }
              : g
          )
        }
      }

      emit('update:modelValue', updatedGraph)
      emit('update:selectedId', result.newGroupId)
      const newGroup = updatedGraph.groups.find(g => g.id === result.newGroupId)!
      const connectedEntities = getConnectedEntities(updatedGraph, result.newGroupId)
      emit('group-add', newGroup, null, connectedEntities)
    }

    expose({
      addNewNode,
      addNewGroup,
      syncEntitySpacingFromCss
    })

    return {
      props,
      emit,
      isViewMode,
      isFullWidth,
      canvasTabIndex,
      mergedLabels,
      canvasApplicationAriaLabel,
      fullWidthToggleRecordLabel,
      getEntityA11yName,
      getPlaceholderAriaLabel,
      selectedNode,
      selectedGroup,
      canvasRef,
      nodeElements,
      canvas,
      dragging,
      connections,
      resize,
      placeholders,
      setNodeRef,
      getEdgePath,
      getNodeCssClass,
      getNodeDisplayLabel,
      getNodeDisplayLabelRight,
      getGroupDisplayLabel,
      getGroupDisplayLabelRight,
      shouldHideGroupAddNode,
      shouldHideGroupAddGroup,
      shouldHideGroupNestedAddNode,
      shouldHideGroupNestedAddGroup,
      shouldHideNodeAddNode,
      shouldHideNodeAddGroup,
      getEmptyMenuVisibleActions,
      getNodeAddNodeButtonText,
      getNodeAddGroupButtonText,
      getGroupAddNodeButtonText,
      getGroupAddGroupButtonText,
      shouldShowInputHandle,
      shouldShowOutputHandle,
      getInputHandlePosition,
      getOutputHandlePosition,
      handleCanvasClick,
      handleGroupClick,
      handleAddStep,
      closePanel,
      handleFreeOutputClick,
      handleAddNodeToGroup,
      handleAddNestedGroup,
      handleEmptyPlusClick,
      handleAddNodeAfterNode,
      handleAddGroupAfterNode,
      handleAddNodeAfterGroup,
      handleAddGroupAfterGroup,
      handleDeleteNode,
      handleDeleteGroup,
      handleUpdateNode,
      handleUpdateGroup,
      handleFullWidthToggle,
      getParentGroup,
      findNode,
      getGroupDepth,
      wouldExceedMaxDepth,
      isPointInRect
    }
  }
})
</script>

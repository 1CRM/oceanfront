<template>
  <Teleport to="body" :disabled="!isFullWidth">
    <div
      v-bind="$attrs"
      class="workflow-canvas-wrapper"
      :class="{
        'workflow-canvas-wrapper--view-mode': !isEditable,
        'workflow-canvas-wrapper--full-width': isFullWidth
      }"
      @keydown="handleKeydown"
    >
      <div
        ref="canvasRef"
        class="workflow-canvas"
        tabindex="0"
        :aria-label="LABELS.canvas"
        @mousedown="focusCanvas"
        @click="handleCanvasClick"
      >
        <div
          class="workflow-canvas__container"
          :style="{
            width: layout.containerSize.value.w + 'px',
            height: layout.containerSize.value.h + 'px'
          }"
        >
          <svg
            class="workflow-canvas__svg-layer"
            aria-hidden="true"
            :width="layout.containerSize.value.w"
            :height="layout.containerSize.value.h"
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
            <path
              v-for="arrow in layout.arrows.value"
              :key="arrow.id"
              :d="arrow.path"
              class="workflow-canvas-connector"
              marker-end="url(#arrowhead)"
            />
          </svg>

          <div class="workflow-canvas__nodes-layer">
            <div
              v-for="group in modelValue.groups"
              :key="group.id"
              :data-workflow-entity-id="group.id"
              role="group"
              :aria-label="group.label || group.id"
              class="workflow-canvas-group"
              :class="{
                'workflow-canvas-group--selected': selectedId === group.id,
                'workflow-canvas-group--dragging': dragging.draggingId.value === group.id,
                'workflow-canvas-group--dropzone':
                  dragging.overGroupId.value === group.id && !dragging.isInvalid.value,
                'workflow-canvas-group--invalid-dropzone':
                  dragging.overGroupId.value === group.id && dragging.isInvalid.value,
                'workflow-canvas-group--nested': !!getParentGroup(modelValue, group.id)
              }"
              :style="layout.getStyle(group)"
              @mousedown="dragging.handleMouseDown($event, group)"
              @click.stop="handleGroupClick(group)"
            >
              <div v-if="group.label" class="workflow-canvas-group__title">
                {{ group.label }}
              </div>

              <div v-if="group.labelRight" class="workflow-canvas-group__label-right">
                {{ group.labelRight }}
              </div>

              <div
                v-if="isEditable && showAddAfter(group)"
                class="workflow-canvas-group__hover-menu-connection"
                @mousedown.stop
              >
                <button
                  class="workflow-canvas-group__hover-menu-button"
                  type="button"
                  :title="LABELS.addNodeAfter"
                  @click.stop="insertAfter(group.id, 'node')"
                >
                  {{ kinds[group.kind].addNodeText }}
                </button>
                <button
                  v-if="canAddGroupAfter(group)"
                  class="workflow-canvas-group__hover-menu-button"
                  type="button"
                  :title="LABELS.addGroupAfter"
                  @click.stop="insertAfter(group.id, 'group')"
                >
                  {{ kinds[group.kind].addGroupText }}
                </button>
              </div>

              <div
                v-if="isEditable && kinds[group.kind] && group.children.length === 0"
                class="workflow-canvas-group__empty-container"
              >
                <div class="workflow-canvas-group__empty-plus">
                  <button
                    class="workflow-canvas-group__empty-plus-button"
                    type="button"
                    :aria-label="canAddGroupInto(group) ? LABELS.addToGroup : LABELS.addNodeToGroup"
                    @mousedown.stop
                    @click.stop="!canAddGroupInto(group) && insertInto(group.id, 'node')"
                  >
                    +
                  </button>
                  <div v-if="canAddGroupInto(group)" class="workflow-canvas-group__empty-menu">
                    <button
                      class="workflow-canvas-group__hover-menu-button"
                      type="button"
                      :title="LABELS.addNodeToGroup"
                      @click.stop="insertInto(group.id, 'node')"
                    >
                      {{ kinds[group.kind].addNodeText }}
                    </button>
                    <button
                      class="workflow-canvas-group__hover-menu-button"
                      type="button"
                      :title="LABELS.addGroupToGroup"
                      @click.stop="insertInto(group.id, 'group')"
                    >
                      {{ kinds[group.kind].addGroupText }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-for="node in modelValue.nodes"
              :key="node.id"
              :ref="el => setNodeRef(node.id, el as HTMLElement | null)"
              :data-workflow-entity-id="node.id"
              role="group"
              :aria-label="node.title || node.placeholder || node.id"
              class="workflow-canvas-node"
              :class="[
                `workflow-canvas-node--type-${node.kind}`,
                {
                  'workflow-canvas-node--selected': selectedId === node.id,
                  'workflow-canvas-node--dragging': dragging.draggingId.value === node.id,
                  'workflow-canvas-node--swap-target': dragging.swapTargetId.value === node.id
                }
              ]"
              :style="layout.getStyle(node)"
              @mousedown="dragging.handleMouseDown($event, node)"
            >
              <div v-if="node.labelRight" class="workflow-canvas-node__label-right">
                {{ node.labelRight }}
              </div>

              <WorkflowTile
                :node="node"
                :selected="selectedId === node.id"
                :dragging="dragging.draggingId.value === node.id"
                :view-mode="!isEditable"
                @menu-click="select(node.id)"
              >
                <template v-if="$slots.tile" #default>
                  <slot name="tile" :node="node" />
                </template>
              </WorkflowTile>

              <div
                v-if="isEditable && showAddAfter(node)"
                class="workflow-canvas-node__hover-menu"
                @mousedown.stop
              >
                <button
                  class="workflow-canvas-node__hover-menu-button"
                  type="button"
                  :title="LABELS.addNodeAfter"
                  @click.stop="insertAfter(node.id, 'node')"
                >
                  {{ kinds[node.kind].addNodeText }}
                </button>
                <button
                  v-if="canAddGroupAfter(node)"
                  class="workflow-canvas-node__hover-menu-button"
                  type="button"
                  :title="LABELS.addGroupAfter"
                  @click.stop="insertAfter(node.id, 'group')"
                >
                  {{ kinds[node.kind].addGroupText }}
                </button>
              </div>
            </div>

            <template v-if="isEditable && !dragging.draggingId.value">
              <div
                v-for="arrow in layout.arrows.value.filter(a => a.plus)"
                :key="'plus-' + arrow.id"
                class="workflow-canvas-plus-placeholder"
                :style="{
                  left: arrow.plus!.position.x + 'px',
                  top: arrow.plus!.position.y + 'px'
                }"
              >
                <button
                  class="workflow-canvas-plus-placeholder__button"
                  type="button"
                  :aria-label="LABELS.addStep"
                  @click.stop="insertAfter(arrow.plus!.afterId, 'node')"
                >
                  +
                </button>
              </div>
            </template>

            <div
              v-if="dragging.indicator.value"
              class="workflow-canvas-drop-indicator"
              aria-hidden="true"
              :style="{
                left: dragging.indicator.value.x + 'px',
                top: dragging.indicator.value.y + 'px',
                width: dragging.indicator.value.width + 'px'
              }"
            />
          </div>
        </div>

        <button
          class="workflow-canvas__fullwidth-toggle"
          :class="{ 'workflow-canvas__fullwidth-toggle--active': isFullWidth }"
          type="button"
          :title="LABELS.toggleFullWidth"
          :aria-label="LABELS.toggleFullWidth"
          @click.stop="setFullWidth(!isFullWidth)"
        >
          <of-icon :name="isFullWidth ? 'expand close' : 'expand open'" scale="sm" />
        </button>
      </div>

      <WorkflowConfigPanel v-if="isPanelVisible" :title="panelTitle" @close="select(null)">
        <slot name="panel" v-bind="panelScope" />
        <template #actions>
          <slot name="panel-actions" v-bind="panelScope" />
        </template>
      </WorkflowConfigPanel>
    </div>
  </Teleport>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  toRef,
  type PropType
} from 'vue'
import type {
  EntityType,
  WorkflowCanvasMode,
  WorkflowEntity,
  WorkflowGraph,
  WorkflowGroup,
  WorkflowKinds
} from '../types/workflow'
import {
  findGroup,
  findNode,
  fitsMaxGroupDepth,
  getParentGroup,
  insertEntity,
  removeEntity
} from '../utils/graph-helpers'
import { LABELS } from '../constants/labels'
import WorkflowTile from './WorkflowTile.vue'
import WorkflowConfigPanel from './WorkflowConfigPanel.vue'
import { useLayout, type DragShift, type LayoutMetrics } from '../composables/useLayout'
import { useDragging } from '../composables/useDragging'

export default defineComponent({
  name: 'WorkflowCanvas',
  components: { WorkflowTile, WorkflowConfigPanel },
  inheritAttrs: false,
  props: {
    modelValue: { type: Object as PropType<WorkflowGraph>, required: true },
    selectedId: { type: String as PropType<string | null>, default: null },
    kinds: { type: Object as PropType<WorkflowKinds>, default: () => ({}) },
    mode: { type: String as PropType<WorkflowCanvasMode>, default: 'edit' }
  },
  emits: {
    'update:modelValue': (_graph: WorkflowGraph) => true,
    'update:selectedId': (_id: string | null) => true
  },
  setup(props, { emit }) {
    const graph = toRef(props, 'modelValue')
    const isEditable = computed(() => props.mode === 'edit')
    const isFullWidth = ref(false)
    const canvasRef = ref<HTMLElement>()
    const heights = ref<Record<string, number>>({})
    const metrics = ref<LayoutMetrics>({ spacing: 50, padding: 20 })
    const shift = ref<DragShift | null>(null)

    const layout = useLayout(graph, heights, metrics, shift)

    const commit = (g: WorkflowGraph) => emit('update:modelValue', g)
    const select = (id: string | null) => {
      if (id !== props.selectedId) emit('update:selectedId', id)
    }

    const dragging = useDragging({
      graph,
      enabled: isEditable,
      canvasRef,
      rects: layout.baseRects,
      shift,
      getGroupPadding: () => metrics.value.padding,
      getMaxGroupDepth: kind => props.kinds[kind]?.maxGroupDepth,
      onCommit: commit
    })

    const selectedNode = computed(() =>
      props.selectedId ? (findNode(graph.value, props.selectedId) ?? null) : null
    )
    const selectedGroup = computed(() =>
      props.selectedId ? (findGroup(graph.value, props.selectedId) ?? null) : null
    )

    const isPanelVisible = computed(
      () =>
        isEditable.value &&
        (!!selectedNode.value || (!!selectedGroup.value && !selectedGroup.value.readonly))
    )

    const panelTitle = computed(() => {
      const node = selectedNode.value
      if (node) return node.panelTitle || node.title || node.kind
      return selectedGroup.value?.label || selectedGroup.value?.kind || ''
    })

    const showAddAfter = (entity: WorkflowEntity) => {
      const parent = getParentGroup(graph.value, entity.id)
      return (
        !!props.kinds[entity.kind] &&
        !!parent &&
        parent.children[parent.children.length - 1] === entity.id
      )
    }

    const canAddGroupInto = (group: WorkflowGroup) =>
      !!props.kinds[group.kind]?.addGroupText &&
      fitsMaxGroupDepth(graph.value, group.id, props.kinds[group.kind].maxGroupDepth)

    const canAddGroupAfter = (entity: WorkflowEntity) => {
      const parent = getParentGroup(graph.value, entity.id)
      return !!parent && canAddGroupInto(parent)
    }

    const insertAt = (group: WorkflowGroup, index: number, type: EntityType) => {
      const result = insertEntity(graph.value, type, group.kind, group.id, index)
      commit(result.graph)
      select(result.id)
    }

    const insertAfter = (id: string, type: EntityType) => {
      const parent = getParentGroup(graph.value, id)
      if (parent) insertAt(parent, parent.children.indexOf(id) + 1, type)
    }

    const insertInto = (groupId: string, type: EntityType) => {
      const group = findGroup(graph.value, groupId)
      if (group) insertAt(group, 0, type)
    }

    const deleteEntity = (id: string) => {
      if (findGroup(graph.value, id)?.readonly) return
      select(null)
      commit(removeEntity(graph.value, id))
    }

    const panelScope = computed(() => ({
      node: selectedNode.value,
      group: selectedGroup.value,
      close: () => select(null),
      remove: () => props.selectedId && deleteEntity(props.selectedId)
    }))

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(entries => {
            const next = { ...heights.value }
            for (const entry of entries) {
              const id = (entry.target as HTMLElement).dataset.workflowEntityId
              const h = (entry.target as HTMLElement).offsetHeight
              if (id && h) next[id] = h
            }
            heights.value = next
          })

    const nodeElements = new Map<string, HTMLElement>()
    const setNodeRef = (id: string, el: HTMLElement | null) => {
      const current = nodeElements.get(id)
      if (current === el) return
      if (current) resizeObserver?.unobserve(current)
      if (el) {
        nodeElements.set(id, el)
        resizeObserver?.observe(el)
      } else {
        nodeElements.delete(id)
      }
    }

    const focusCanvas = () => {
      const el = canvasRef.value
      if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true })
    }

    const handleCanvasClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target === canvasRef.value || target.classList.contains('workflow-canvas__container')) {
        select(null)
      }
    }

    const handleGroupClick = (group: WorkflowGroup) => {
      if (isEditable.value && !group.readonly && !dragging.wasDragged()) select(group.id)
    }

    const setFullWidth = (value: boolean) => {
      isFullWidth.value = value
      nextTick(() => canvasRef.value?.focus({ preventScroll: true }))
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || (event.target as HTMLElement).closest('.of-overlay')) return
      if (dragging.cancel()) event.stopPropagation()
      else if (isFullWidth.value) setFullWidth(false)
      else if (props.selectedId) select(null)
      else return
      event.preventDefault()
    }

    onMounted(() => {
      document.addEventListener('mousemove', dragging.handleMouseMove)
      document.addEventListener('mouseup', dragging.handleMouseUp)
      window.addEventListener('blur', dragging.cancel)
      if (!canvasRef.value) return
      const style = getComputedStyle(canvasRef.value)
      const readPx = (name: string, fallback: number) => {
        const value = parseFloat(style.getPropertyValue(name))
        return Number.isFinite(value) ? value : fallback
      }
      metrics.value = {
        spacing: readPx('--wf-entity-spacing', metrics.value.spacing),
        padding: readPx('--wf-group-padding', metrics.value.padding)
      }
    })

    onUnmounted(() => {
      document.removeEventListener('mousemove', dragging.handleMouseMove)
      document.removeEventListener('mouseup', dragging.handleMouseUp)
      window.removeEventListener('blur', dragging.cancel)
      resizeObserver?.disconnect()
    })

    return {
      LABELS,
      isEditable,
      isFullWidth,
      canvasRef,
      layout,
      dragging,
      isPanelVisible,
      panelTitle,
      panelScope,
      getParentGroup,
      setNodeRef,
      showAddAfter,
      canAddGroupInto,
      canAddGroupAfter,
      insertAfter,
      insertInto,
      select,
      focusCanvas,
      handleCanvasClick,
      handleGroupClick,
      handleKeydown,
      setFullWidth
    }
  }
})
</script>

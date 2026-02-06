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
          v-if="displayIcon"
          scale="sm"
          :name="displayIcon"
          class="workflow-canvas-tile__icon"
        />
        <span
          class="workflow-canvas-tile__title-text"
          :class="{ 'workflow-canvas-tile__title-text--placeholder': !hasNodeType }"
        >
          {{ displayTitle }}
        </span>
      </div>
      <of-button
        v-if="!node.readonly"
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
    <div v-if="fieldsToShow.length > 0" class="workflow-canvas-tile__content">
      <div v-for="field in fieldsToShow" :key="field.name" class="workflow-canvas-tile__field">
        <template v-if="field.type === 'toggle'">
          <label class="workflow-canvas-tile__field-label">
            {{ field.label }}:
            {{ getFieldValue(field.name) ? effectiveLabels.yes : effectiveLabels.no }}
          </label>
        </template>
        <template v-else>
          <div v-if="getFieldValue(field.name)" class="workflow-canvas-tile__field-value">
            {{ getFieldValue(field.name) }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type {
  WorkflowNode,
  NodeData,
  WorkflowCanvasLabels,
  NodeTypeConfig
} from '../types/workflow'
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
    },
    nodeTypes: {
      type: Object as () => NodeTypeConfig,
      default: () => ({})
    }
  },
  emits: ['menu-click'],
  setup(props, { emit }) {
    // Use DEFAULT_LABELS if no labels provided
    const effectiveLabels = computed(() => props.labels || DEFAULT_LABELS)

    const nodeTypeDefinition = computed(() => {
      if (!props.node.kind) return null
      return props.nodeTypes[props.node.kind] || null
    })

    const nodeData = computed(() => {
      const data = props.node.data as Record<string, any> | undefined
      return data || {}
    })

    const displayIcon = computed(() => {
      // Priority: node data icon > type definition icon
      const data = props.node.data as NodeData | undefined
      return data?.icon || nodeTypeDefinition.value?.icon
    })

    const hasNodeType = computed(() => {
      return props.node.kind && props.node.kind !== ''
    })

    const displayTitle = computed(() => {
      // If no type is set, show placeholder text
      if (!hasNodeType.value) {
        return effectiveLabels.value.selectNodeTypePlaceholder
      }
      // For backward compatibility, check data.title first, then fall back to type label or kind
      const data = props.node.data as NodeData | undefined
      return data?.title || nodeTypeDefinition.value?.label || props.node.kind
    })

    const fieldsToShow = computed(() => {
      if (!nodeTypeDefinition.value) return []
      return nodeTypeDefinition.value.fields.filter(field => field.showInTile)
    })

    const getFieldValue = (fieldName: string) => {
      return nodeData.value[fieldName] ?? ''
    }

    const handleMenuClick = () => emit('menu-click')

    return {
      effectiveLabels,
      nodeData,
      nodeTypeDefinition,
      hasNodeType,
      displayIcon,
      displayTitle,
      fieldsToShow,
      getFieldValue,
      handleMenuClick
    }
  }
})
</script>

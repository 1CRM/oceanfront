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
          v-if="displayIcon && !hasPlaceholder"
          scale="sm"
          :name="displayIcon"
          class="workflow-canvas-tile__icon"
        />
        <span
          class="workflow-canvas-tile__title-text"
          :class="{ 'workflow-canvas-tile__title-text--placeholder': hasPlaceholder }"
        >
          {{ displayTitle }}
        </span>
      </div>
      <of-button
        v-if="!viewMode && !node.readonly"
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
    <div v-if="fieldsToShow.length > 0 && !hasPlaceholder" class="workflow-canvas-tile__content">
      <div v-for="field in fieldsToShow" :key="field.name" class="workflow-canvas-tile__field">
        <!-- Custom component rendering -->
        <component
          v-if="isComponent(field.tileValue)"
          :is="field.tileValue"
          :model-value="getFieldValue(field.name)"
          @update:model-value="() => {}"
        />
        <!-- Standard field rendering -->
        <template v-else-if="field.type === 'toggle'">
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
import type { WorkflowNode, WorkflowCanvasLabels, NodeTypeConfig } from '../types/workflow'
import type { FormRecord } from 'oceanfront'
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
    },
    viewMode: {
      type: Boolean,
      default: false
    },
    record: {
      type: Object as () => FormRecord,
      required: true
    }
  },
  emits: ['menu-click'],
  setup(props, { emit }) {
    // Helper to check if field.value is a valid component
    const isComponent = (value: any): boolean => {
      if (!value) return false
      // Check if it's a component object (has render, setup, or template)
      if (typeof value === 'object' && (value.render || value.setup || value.template)) return true
      // Check if it's a function component
      if (typeof value === 'function') return true
      // Check if it's an async component
      if (value.__asyncLoader) return true
      return false
    }
    // Use DEFAULT_LABELS if no labels provided
    const effectiveLabels = computed(() => props.labels || DEFAULT_LABELS)

    const nodeTypeDefinition = computed(() => {
      if (!props.node.kind) return null
      return props.nodeTypes[props.node.kind] || null
    })

    const mergedDefinition = computed(() => {
      const base = nodeTypeDefinition.value
      const override = props.node.definition

      return {
        icon: override?.icon ?? base?.icon,
        label: override?.label ?? base?.label,
        configPanelLabel: override?.configPanelLabel ?? base?.configPanelLabel,
        tileLabel: override?.tileLabel ?? base?.tileLabel,
        placeholder: override?.placeholder ?? base?.placeholder,
        fields: override?.fields ?? base?.fields ?? [],
        cssClass: override?.cssClass ?? base?.cssClass
      }
    })

    const nodeData = computed(() => {
      const prefix = `${props.node.id}-`
      const data: Record<string, any> = {}

      Object.keys(props.record.value).forEach(key => {
        if (key.startsWith(prefix)) {
          const fieldName = key.substring(prefix.length)
          data[fieldName] = props.record.value[key]
        }
      })

      return data
    })

    const displayIcon = computed(() => {
      // Use merged definition icon
      return mergedDefinition.value.icon
    })

    const hasNodeType = computed(() => {
      return props.node.kind && props.node.kind !== ''
    })

    const hasPlaceholder = computed(() => {
      return !!mergedDefinition.value.placeholder || !hasNodeType.value
    })

    const displayTitle = computed(() => {
      // Priority 1: placeholder from merged definition
      if (mergedDefinition.value.placeholder) {
        return mergedDefinition.value.placeholder
      }

      // Priority 2: no type set
      if (!hasNodeType.value) {
        return effectiveLabels.value.selectNodeTypePlaceholder
      }

      // Priority 3: data.title
      const title = props.record.value[`${props.node.id}-title`]
      if (title) {
        return title
      }

      // Priority 4: tileLabel
      if (mergedDefinition.value.tileLabel) {
        return mergedDefinition.value.tileLabel
      }

      // Priority 5: configPanelLabel
      if (mergedDefinition.value.configPanelLabel) {
        return mergedDefinition.value.configPanelLabel
      }

      // Priority 6: label
      if (mergedDefinition.value.label) {
        return mergedDefinition.value.label
      }

      // Priority 7: kind
      return props.node.kind
    })

    const fieldsToShow = computed(() => {
      if (!mergedDefinition.value.fields) {
        return []
      }
      return mergedDefinition.value.fields.filter((field: any) => field.showInTile)
    })

    const getFieldValue = (fieldName: string) => {
      return props.record.value[`${props.node.id}-${fieldName}`] ?? ''
    }

    const handleMenuClick = () => emit('menu-click')

    return {
      effectiveLabels,
      nodeData,
      nodeTypeDefinition,
      mergedDefinition,
      hasNodeType,
      hasPlaceholder,
      displayIcon,
      displayTitle,
      fieldsToShow,
      getFieldValue,
      handleMenuClick,
      isComponent
    }
  }
})
</script>

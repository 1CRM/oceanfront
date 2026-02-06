<template>
  <of-sidebar v-if="isOpen" :model-value="true" :embed="true" class="workflow-canvas__sidebar">
    <div class="workflow-canvas__panel-default">
      <div class="workflow-canvas__panel-header">
        <h3>
          {{
            selectedNode
              ? hasNodeType
                ? nodeTypeDefinition?.label || selectedNode.kind
                : effectiveLabels.nodeDetailsHeader
              : effectiveLabels.groupDetailsHeader
          }}
        </h3>
        <button @click="emit('close')" class="workflow-canvas__panel-close" type="button">×</button>
      </div>
      <div class="workflow-canvas__panel-content">
        <div v-if="selectedNode">
          <!-- Type selector (only shown when no type is set) -->
          <of-field
            v-if="!hasNodeType"
            :label="effectiveLabels.typeLabel"
            type="select"
            :items="typeOptions"
            :model-value="selectedNode.kind"
            @update:model-value="updateNodeKind"
          />

          <!-- Dynamic fields based on node type -->
          <template v-if="nodeTypeDefinition">
            <template v-for="field in nodeTypeDefinition.fields" :key="field.name">
              <of-field
                v-bind="{
                  ...field
                }"
                :model-value="getFieldValue(field.name)"
                @update:model-value="updateNodeField(field.name, $event)"
              />
            </template>
          </template>

          <div class="workflow-canvas__panel-actions">
            <of-button
              v-if="!selectedNode.locked"
              @click="emit('delete-node')"
              variant="filled"
              tint="secondary"
            >
              {{ effectiveLabels.deleteNodeButton }}
            </of-button>
          </div>
        </div>
        <div v-if="selectedGroup">
          <of-text-field
            :label="effectiveLabels.typeLabel"
            :model-value="selectedGroup.kind"
            @update:model-value="updateGroupKind"
          />
          <of-text-field
            :label="effectiveLabels.titleLabel"
            :model-value="selectedGroup.title || ''"
            @update:model-value="updateGroupTitle"
            :placeholder="effectiveLabels.groupTitlePlaceholder"
          />
          <div class="workflow-canvas__panel-actions">
            <of-button
              v-if="!selectedGroup.locked"
              @click="emit('delete-group')"
              variant="filled"
              tint="secondary"
            >
              {{ effectiveLabels.deleteGroupButton }}
            </of-button>
          </div>
        </div>
      </div>
    </div>
  </of-sidebar>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type {
  WorkflowNode,
  WorkflowGroup,
  WorkflowGraph,
  WorkflowCanvasLabels,
  NodeTypeConfig,
  NodeFieldDefinition
} from '../types/workflow'
import { getGroupDepth } from '../utils/graph-helpers'
import { DEFAULT_LABELS } from '../constants/labels'

export default defineComponent({
  name: 'WorkflowConfigPanel',
  props: {
    selectedNode: {
      type: Object as () => WorkflowNode | null,
      default: null
    },
    selectedGroup: {
      type: Object as () => WorkflowGroup | null,
      default: null
    },
    graph: {
      type: Object as () => WorkflowGraph | null,
      default: null
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
  emits: ['close', 'delete-node', 'delete-group', 'update-node', 'update-group'],
  setup(props, { emit }) {
    // Use DEFAULT_LABELS if no labels provided
    const effectiveLabels = computed(() => props.labels || DEFAULT_LABELS)

    const isOpen = computed(() => {
      if (props.selectedNode?.readonly || props.selectedGroup?.readonly) {
        return false
      }
      return !!(props.selectedNode || props.selectedGroup)
    })

    const groupDepth = computed(() => {
      if (!props.selectedGroup || !props.graph) return undefined
      return getGroupDepth(props.graph, props.selectedGroup.id)
    })

    const getNodeData = (node: WorkflowNode) => (node.data as Record<string, any> | undefined) || {}

    const hasNodeType = computed(() => {
      return props.selectedNode && props.selectedNode.kind && props.selectedNode.kind !== ''
    })

    const nodeTypeDefinition = computed(() => {
      if (!props.selectedNode?.kind) return null
      return props.nodeTypes[props.selectedNode.kind] || null
    })

    const typeOptions = computed(() => {
      return Object.values(props.nodeTypes).map(def => ({
        value: def.type,
        text: def.label
      }))
    })

    const updateNodeKind = (value: string) => {
      if (!props.selectedNode) return
      emit('update-node', {
        ...props.selectedNode,
        kind: value,
        data: {} // Reset data when type changes
      })
    }

    const updateNodeField = (fieldName: string, value: any) => {
      if (!props.selectedNode) return
      const currentData = getNodeData(props.selectedNode)
      emit('update-node', {
        ...props.selectedNode,
        data: {
          ...currentData,
          [fieldName]: value
        }
      })
    }

    const getFieldValue = (fieldName: string) => {
      if (!props.selectedNode) return ''
      const data = getNodeData(props.selectedNode)
      return data[fieldName] ?? ''
    }

    const getSelectItems = (field: NodeFieldDefinition) => {
      // Transform options to the format expected by of-field select
      return (field.items || []).map(item => ({
        value: item.value,
        text: item.text
      }))
    }

    const updateGroupTitle = (value: string) => {
      if (!props.selectedGroup) return
      emit('update-group', {
        ...props.selectedGroup,
        title: value
      })
    }

    const updateGroupKind = (value: string) => {
      if (!props.selectedGroup) return
      emit('update-group', {
        ...props.selectedGroup,
        kind: value
      })
    }

    return {
      emit,
      effectiveLabels,
      isOpen,
      groupDepth,
      getNodeData,
      hasNodeType,
      nodeTypeDefinition,
      typeOptions,
      updateNodeKind,
      updateNodeField,
      getFieldValue,
      getSelectItems,
      updateGroupTitle,
      updateGroupKind
    }
  }
})
</script>

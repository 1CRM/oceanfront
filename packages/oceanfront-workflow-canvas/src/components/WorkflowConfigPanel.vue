<template>
  <of-sidebar v-if="isOpen" :model-value="true" :embed="true" class="workflow-canvas__sidebar">
    <div class="workflow-canvas__panel-default">
      <div class="workflow-canvas__panel-header">
        <h3>
          {{
            selectedNode ? effectiveLabels.nodeDetailsHeader : effectiveLabels.groupDetailsHeader
          }}
        </h3>
        <button @click="emit('close')" class="workflow-canvas__panel-close" type="button">×</button>
      </div>
      <div class="workflow-canvas__panel-content">
        <div v-if="selectedNode">
          <div class="workflow-canvas__panel-field">
            <label>{{ effectiveLabels.idLabel }}</label>
            <div>{{ selectedNode.id }}</div>
          </div>
          <of-text-field
            :label="effectiveLabels.typeLabel"
            class="workflow-canvas__panel-field"
            :model-value="selectedNode.kind"
            @update:model-value="updateNodeKind"
          />
          <of-text-field
            :label="effectiveLabels.titleLabel"
            class="workflow-canvas__panel-field"
            :model-value="getNodeData(selectedNode).title || ''"
            @update:model-value="updateNodeTitle"
          />
          <of-text-field
            :label="effectiveLabels.descriptionLabel"
            class="workflow-canvas__panel-field"
            :model-value="getNodeData(selectedNode).description || ''"
            @update:model-value="updateNodeDescription"
            rows="3"
          />
          <div class="workflow-canvas__panel-actions">
            <of-button @click="emit('delete-node')" variant="filled" tint="secondary">
              {{ effectiveLabels.deleteNodeButton }}
            </of-button>
          </div>
        </div>
        <div v-if="selectedGroup">
          <div class="workflow-canvas__panel-field">
            <label>{{ effectiveLabels.idLabel }}</label>
            <div>{{ selectedGroup.id }}</div>
          </div>
          <of-text-field
            :label="effectiveLabels.typeLabel"
            class="workflow-canvas__panel-field"
            :model-value="selectedGroup.kind"
            @update:model-value="updateGroupKind"
          />
          <of-text-field
            :label="effectiveLabels.titleLabel"
            class="workflow-canvas__panel-field"
            :model-value="selectedGroup.title || ''"
            @update:model-value="updateGroupTitle"
            :placeholder="effectiveLabels.groupTitlePlaceholder"
          />
          <div class="workflow-canvas__panel-field">
            <label>{{ effectiveLabels.containedItemsLabel }}</label>
            <div>{{ effectiveLabels.itemCount(selectedGroup.containedIds.length) }}</div>
          </div>
          <div class="workflow-canvas__panel-field" v-if="groupDepth !== undefined">
            <label>{{ effectiveLabels.nestingDepthLabel }}</label>
            <div>{{ effectiveLabels.nestingDepth(groupDepth) }}</div>
          </div>
          <div class="workflow-canvas__panel-field">
            <label>{{ effectiveLabels.sizeLabel }}</label>
            <div>{{ selectedGroup.size.w }} × {{ selectedGroup.size.h }}</div>
          </div>
          <div class="workflow-canvas__panel-actions">
            <of-button @click="emit('delete-group')" variant="filled" tint="secondary">
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
  NodeData,
  WorkflowCanvasLabels
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
    }
  },
  emits: ['close', 'delete-node', 'delete-group', 'update-node', 'update-group'],
  setup(props, { emit }) {
    // Use DEFAULT_LABELS if no labels provided
    const effectiveLabels = computed(() => props.labels || DEFAULT_LABELS)

    const isOpen = computed(() => !!(props.selectedNode || props.selectedGroup))

    const groupDepth = computed(() => {
      if (!props.selectedGroup || !props.graph) return undefined
      return getGroupDepth(props.graph, props.selectedGroup.id)
    })

    const getNodeData = (node: WorkflowNode) => (node.data as NodeData | undefined) || {}

    const updateNodeKind = (value: string) => {
      if (!props.selectedNode) return
      emit('update-node', {
        ...props.selectedNode,
        kind: value
      })
    }

    const updateNodeTitle = (value: string) => {
      if (!props.selectedNode) return
      const currentData = getNodeData(props.selectedNode)
      emit('update-node', {
        ...props.selectedNode,
        data: {
          ...currentData,
          title: value
        }
      })
    }

    const updateNodeDescription = (value: string) => {
      if (!props.selectedNode) return
      const currentData = getNodeData(props.selectedNode)
      emit('update-node', {
        ...props.selectedNode,
        data: {
          ...currentData,
          description: value
        }
      })
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
      effectiveLabels,
      isOpen,
      groupDepth,
      getNodeData,
      updateNodeKind,
      updateNodeTitle,
      updateNodeDescription,
      updateGroupTitle,
      updateGroupKind
    }
  }
})
</script>

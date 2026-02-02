<template>
  <of-sidebar v-if="isOpen" :model-value="true" :embed="true" class="workflow-canvas__sidebar">
    <div class="workflow-canvas__panel-default">
      <div class="workflow-canvas__panel-header">
        <h3>{{ selectedNode ? 'Node Details' : 'Group Details' }}</h3>
        <button @click="emit('close')" class="workflow-canvas__panel-close" type="button">×</button>
      </div>
      <div class="workflow-canvas__panel-content">
        <div v-if="selectedNode">
          <div class="workflow-canvas__panel-field">
            <label>ID:</label>
            <div>{{ selectedNode.id }}</div>
          </div>
          <of-text-field
            label="Type"
            class="workflow-canvas__panel-field"
            :model-value="selectedNode.kind"
            @update:model-value="updateNodeKind"
          />
          <of-text-field
            label="Title"
            class="workflow-canvas__panel-field"
            :model-value="getNodeData(selectedNode).title || ''"
            @update:model-value="updateNodeTitle"
          />
          <of-text-field
            label="Description"
            class="workflow-canvas__panel-field"
            :model-value="getNodeData(selectedNode).description || ''"
            @update:model-value="updateNodeDescription"
            rows="3"
          />
          <div class="workflow-canvas__panel-actions">
            <of-button @click="emit('delete-node')" variant="filled" tint="secondary">
              Delete Node
            </of-button>
          </div>
        </div>
        <div v-if="selectedGroup">
          <div class="workflow-canvas__panel-field">
            <label>ID:</label>
            <div>{{ selectedGroup.id }}</div>
          </div>
          <of-text-field
            label="Type"
            class="workflow-canvas__panel-field"
            :model-value="selectedGroup.kind"
            @update:model-value="updateGroupKind"
          />
          <of-text-field
            label="Title"
            class="workflow-canvas__panel-field"
            :model-value="selectedGroup.title || ''"
            @update:model-value="updateGroupTitle"
            placeholder="Enter group title"
          />
          <div class="workflow-canvas__panel-field">
            <label>Contained Items:</label>
            <div>{{ selectedGroup.containedIds.length }} {{ selectedGroup.containedIds.length === 1 ? 'item' : 'items' }}</div>
          </div>
          <div class="workflow-canvas__panel-field" v-if="groupDepth !== undefined">
            <label>Nesting Depth:</label>
            <div>{{ groupDepth === 0 ? 'Top-level' : `Level ${groupDepth}` }}</div>
          </div>
          <div class="workflow-canvas__panel-field">
            <label>Size:</label>
            <div>{{ selectedGroup.size.w }} × {{ selectedGroup.size.h }}</div>
          </div>
          <div class="workflow-canvas__panel-actions">
            <of-button @click="emit('delete-group')" variant="filled" tint="secondary">
              Delete Group
            </of-button>
          </div>
        </div>
      </div>
    </div>
  </of-sidebar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowNode, WorkflowGroup, WorkflowGraph } from '../types/workflow'
import { getGroupDepth } from '../utils/graph-helpers'

defineOptions({
  name: 'WorkflowConfigPanel'
})

const props = withDefaults(
  defineProps<{
    selectedNode?: WorkflowNode | null
    selectedGroup?: WorkflowGroup | null
    graph?: WorkflowGraph | null
  }>(),
  {
    selectedNode: null,
    selectedGroup: null,
    graph: null
  }
)

const emit = defineEmits<{
  close: []
  'delete-node': []
  'delete-group': []
  'update-node': [node: WorkflowNode]
  'update-group': [group: WorkflowGroup]
}>()

const isOpen = computed(() => !!(props.selectedNode || props.selectedGroup))

const groupDepth = computed(() => {
  if (!props.selectedGroup || !props.graph) return undefined
  return getGroupDepth(props.graph, props.selectedGroup.id)
})

interface NodeData {
  title?: string
  description?: string
}

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
</script>

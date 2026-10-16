<template>
  <div class="container">
    <h1>Workflow Canvas</h1>

    <div class="demo-actions">
      <label class="demo-control">
        <strong>Canvas Mode</strong>
        <select v-model="mode" aria-label="Canvas Mode" class="demo-mode">
          <option value="edit">Edit</option>
          <option value="view">View</option>
        </select>
      </label>
      <label class="demo-control">
        <strong>Max Group Depth</strong>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="No limit"
          aria-label="Max Group Depth"
          :value="maxGroupDepth ?? ''"
          @input="setMaxGroupDepth"
        />
      </label>
      <of-button variant="outlined" @click="reset">Reset Canvas</of-button>
    </div>

    <WorkflowCanvas
      v-model="graph"
      v-model:selected-id="selectedId"
      class="workflow-demo"
      :kinds="kinds"
      :mode="mode"
    >
      <template #tile="{ node }">
        {{ data[node.id]?.description }}
      </template>

      <template #panel="{ node, group }">
        <template v-if="node">
          <of-field
            :key="node.id + '-title'"
            :model-value="data[node.id]?.title"
            type="text"
            label="Title"
            @update:model-value="setTitle(node.id, $event)"
          />
          <of-field
            :key="node.id + '-description'"
            v-model="ensure(node.id).description"
            type="textarea"
            label="Description"
          />
        </template>
        <of-field
          v-else-if="group"
          :key="group.id + '-operator'"
          :model-value="data[group.id]?.operator ?? 'and'"
          type="select"
          label="Operator"
          :items="operators"
          @update:model-value="setOperator(group.id, $event)"
        />
      </template>

      <template #panel-actions="{ remove, close }">
        <of-button variant="text" @click="remove">Delete</of-button>
        <of-button @click="close">Done</of-button>
      </template>
    </WorkflowCanvas>

    <details class="demo-json">
      <summary>View JSON</summary>
      <pre>{{ JSON.stringify(graph, null, 2) }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  WorkflowCanvas,
  type WorkflowCanvasMode,
  type WorkflowGraph,
  type WorkflowKinds
} from 'oceanfront-workflow-canvas'
import 'oceanfront-workflow-canvas/css'

type EntityData = { title?: string; description?: string; operator?: string }

const maxGroupDepth = ref<number | null>(3)

const kinds = computed<WorkflowKinds>(() => ({
  condition: {
    addNodeText: '+ Condition',
    addGroupText: '+ Group',
    maxGroupDepth: maxGroupDepth.value ?? undefined
  },
  action: { addNodeText: '+ Action' }
}))

const setMaxGroupDepth = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  maxGroupDepth.value = value === '' ? null : Math.max(0, Math.trunc(Number(value)))
}

const operators = [
  { value: 'and', text: 'All Of' },
  { value: 'or', text: 'Any Of' }
]

const initialGraph: WorkflowGraph = {
  nodes: [
    { id: 'condition-1', kind: 'condition', title: 'Amount' },
    { id: 'condition-2', kind: 'condition', title: 'Status' },
    {
      id: 'action-1',
      kind: 'action',
      title: 'Send an Email',
      labelRight: 'After save'
    },
    {
      id: 'action-2',
      kind: 'action',
      title: 'Create a Task',
      labelRight: 'After save'
    }
  ],
  groups: [
    {
      id: 'group-condition',
      kind: 'condition',
      label: 'Conditions',
      children: ['condition-1', 'group-1'],
      readonly: true
    },
    {
      id: 'group-action',
      kind: 'action',
      label: 'Actions',
      children: ['action-1', 'action-2'],
      readonly: true
    },
    {
      id: 'group-1',
      kind: 'condition',
      label: 'Group',
      children: ['condition-2']
    }
  ]
}

const initialData: Record<string, EntityData> = {
  'condition-1': { title: 'Amount', description: 'Changed to: > 500' },
  'condition-2': { title: 'Status', description: 'Current: Closed' },
  'action-1': { title: 'Send an Email', description: 'Order confirmation' },
  'action-2': { title: 'Create a Task', description: 'Review the order' }
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const graph = ref<WorkflowGraph>(clone(initialGraph))
const data = reactive<Record<string, EntityData>>(clone(initialData))
const selectedId = ref<string | null>(null)
const mode = ref<WorkflowCanvasMode>('edit')

const ensure = (id: string) => (data[id] ??= {})

const setTitle = (id: string, title: string) => {
  ensure(id).title = title
  const node = graph.value.nodes.find((n) => n.id === id)
  if (node) node.title = title
}

const setOperator = (id: string, operator: string) => {
  ensure(id).operator = operator
  const group = graph.value.groups.find((g) => g.id === id)
  if (group)
    group.labelRight = operators.find((o) => o.value === operator)?.text
}

const reset = () => {
  graph.value = clone(initialGraph)
  Object.keys(data).forEach((key) => delete data[key])
  Object.assign(data, clone(initialData))
  selectedId.value = null
}
</script>

<style scoped>
.demo-actions {
  display: flex;
  gap: 12px;
  margin: 20px 10px;
  align-items: center;
}

.demo-mode {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.demo-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-control input {
  width: 90px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.workflow-demo {
  height: 600px;
}

.demo-json {
  margin: 16px 0;
}

summary {
  cursor: pointer;
  font-weight: 600;
  padding: 8px;
}

pre {
  padding: 16px;
  overflow-x: auto;
  font-size: 12px;
}
</style>

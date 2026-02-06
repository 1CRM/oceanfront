<template>
  <div class="container">
    <h1>Workflow Canvas</h1>

    <div class="demo-actions">
      <of-button @click="workflowCanvasRef?.addNewNode()" variant="filled">
        + Add New Node
      </of-button>
      <of-button @click="workflowCanvasRef?.addNewGroup()" variant="filled">
        + Add New Group
      </of-button>
      <of-button @click="resetCanvas" variant="outlined">
        Reset Canvas
      </of-button>
    </div>

    <div class="controls">
      <label>
        Max Group Depth:
        <input
          type="number"
          v-model.number="maxGroupDepth"
          min="0"
          placeholder="No limit"
          style="width: 80px; margin-left: 8px"
        />
        <span style="margin-left: 8px; color: #666; font-size: 13px">
          (leave empty for no limit, 0 means no nesting allowed)
        </span>
      </label>
    </div>

    <div class="workflow-demo">
      <WorkflowCanvas
        ref="workflowCanvasRef"
        v-model="workflowGraph"
        v-model:selected-id="selectedId"
        :width="1000"
        :height="600"
        :max-group-depth="maxGroupDepth"
        :node-types="nodeTypes"
        @node-add="handleNodeAdd"
        @group-add="handleGroupAdd"
        @edge-add="handleEdgeAdd"
        @node-drag-start="handleNodeDragStart"
        @node-drag-end="handleNodeDragEnd"
        @node-click="handleNodeClick"
        @node-delete="handleNodeDelete"
        @node-update="handleNodeUpdate"
        @group-drag-start="handleGroupDragStart"
        @group-drag-end="handleGroupDragEnd"
        @group-click="handleGroupClick"
        @group-delete="handleGroupDelete"
        @group-update="handleGroupUpdate"
        @group-resize-start="handleGroupResizeStart"
        @group-resize-end="handleGroupResizeEnd"
        @edge-delete="handleEdgeDelete"
        @canvas-click="handleCanvasClick"
        @entity-moved-to-group="handleEntityMovedToGroup"
      />
    </div>

    <div class="demo-info">
      <h3>Current State</h3>
      <div class="state-info">
        <div><strong>Nodes:</strong> {{ workflowGraph.nodes.length }}</div>
        <div><strong>Edges:</strong> {{ workflowGraph.edges.length }}</div>
        <div><strong>Groups:</strong> {{ workflowGraph.groups.length }}</div>
        <div><strong>Selected:</strong> {{ selectedId || 'None' }}</div>
      </div>

      <details>
        <summary>View JSON</summary>
        <pre>{{ JSON.stringify(workflowGraph, null, 2) }}</pre>
      </details>

      <details open>
        <summary>Event Log (Last 10 events)</summary>
        <div class="event-log">
          <div v-if="eventLog.length === 0" class="no-events">
            No events yet
          </div>
          <div
            v-for="(event, index) in eventLog"
            :key="index"
            class="event-item"
          >
            <span class="event-name">{{ event.name }}</span>
            <span class="event-data">{{ event.data }}</span>
            <span class="event-time">{{ event.time }}</span>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  WorkflowCanvas,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowGroup,
  type NodeTypeConfig
} from 'oceanfront-workflow-canvas'
import 'oceanfront-workflow-canvas/css'

// Node type configuration
const nodeTypes: NodeTypeConfig = {
  trigger: {
    type: 'trigger',
    label: 'Trigger',
    icon: 'hourglass',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        showInTile: true,
        placeholder: 'Enter trigger title'
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        showInTile: true,
        placeholder: 'Describe what triggers this workflow'
      },
      {
        name: 'event',
        type: 'select',
        label: 'Event Type',
        items: [
          { value: 'new_quote', text: 'New Quote' },
          { value: 'updated_quote', text: 'Updated Quote' },
          { value: 'deleted_quote', text: 'Deleted Quote' }
        ]
      }
    ]
  },
  action: {
    type: 'action',
    label: 'Action',
    icon: 'gear',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        showInTile: true,
        placeholder: 'Enter action title'
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        showInTile: true,
        placeholder: 'Describe what this action does'
      },
      {
        name: 'actionType',
        type: 'select',
        label: 'Action Type',
        items: [
          { value: 'email', text: 'Send Email' },
          { value: 'update', text: 'Update Record' },
          { value: 'create', text: 'Create Record' },
          { value: 'delete', text: 'Delete Record' }
        ]
      },
      {
        name: 'enabled',
        type: 'toggle',
        label: 'Enabled'
      }
    ]
  },
  condition: {
    type: 'condition',
    label: 'Condition',
    icon: 'help circle',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        showInTile: true,
        placeholder: 'Enter condition title'
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        showInTile: true,
        placeholder: 'Describe the condition'
      },
      {
        name: 'operator',
        type: 'select',
        label: 'Operator',
        items: [
          { value: 'equals', text: 'Equals' },
          { value: 'not_equals', text: 'Not Equals' },
          { value: 'greater_than', text: 'Greater Than' },
          { value: 'less_than', text: 'Less Than' }
        ]
      },
      {
        name: 'threshold',
        type: 'number',
        label: 'Threshold Value',
        placeholder: '0'
      }
    ]
  }
}

// Initial workflow graph state - Complex linear workflow with branches (one in, one out per node)
const initialWorkflowGraph: WorkflowGraph = {
  nodes: [
    {
      id: 'trigger-1',
      kind: 'trigger',
      position: {
        x: 100,
        y: 50
      },
      data: {
        title: 'New or Updated Quote',
        description: 'Triggers when a quote is created or modified',
        event: 'new_quote'
      },
      locked: true
    },
    {
      id: 'action-1',
      kind: 'action',
      position: {
        x: 99,
        y: 250
      },
      data: {
        title: 'Validate Quote Data',
        description: 'Checks for required fields and data integrity',
        actionType: 'update',
        enabled: true
      },
      readonly: true
    },
    {
      id: 'condition-1',
      kind: 'condition',
      position: {
        x: 101,
        y: 443
      },
      data: {
        title: 'Check Quote Value',
        description: 'Route based on quote value threshold',
        operator: 'greater_than',
        threshold: 10000
      }
    },
    {
      id: 'condition-2',
      kind: 'condition',
      position: {
        x: 838,
        y: 756
      },
      data: {
        title: 'Manager Decision',
        description: 'Wait for manager to approve or reject',
        operator: 'equals',
        threshold: 1
      }
    },
    {
      id: 'action-10',
      kind: 'action',
      position: {
        x: 468,
        y: 47
      },
      data: {
        title: 'Financial Analysis',
        description: 'Perform detailed financial review',
        actionType: 'update',
        enabled: true
      }
    },
    {
      id: 'action-11',
      kind: 'action',
      position: {
        x: 467,
        y: 219
      },
      data: {
        title: 'Request Executive Approval',
        description: 'Route to VP or C-level for approval',
        actionType: 'email',
        enabled: true
      }
    },
    {
      id: 'condition-3',
      kind: 'condition',
      position: {
        x: 469,
        y: 387
      },
      data: {
        title: 'Executive Decision',
        description: 'Wait for executive approval',
        operator: 'equals',
        threshold: 1
      }
    },
    {
      id: 'action-13',
      kind: 'action',
      position: {
        x: 470,
        y: 562
      },
      data: {
        title: 'Send Contract',
        description: 'Email contract to customer',
        actionType: 'email',
        enabled: true
      }
    },
    {
      id: 'action-15',
      kind: 'action',
      position: {
        x: 840,
        y: 45
      },
      data: {
        title: 'Log Executive Rejection',
        description: 'Record executive rejection',
        actionType: 'create',
        enabled: true
      }
    },
    {
      id: 'action-16',
      kind: 'action',
      position: {
        x: 839,
        y: 210
      },
      data: {
        title: 'Escalate Rejection',
        description: 'Notify senior management',
        actionType: 'email',
        enabled: true
      }
    },
    {
      id: 'node-1770122294598',
      kind: 'action',
      position: {
        x: 838,
        y: 377
      },
      data: {
        title: 'New Action',
        description: 'Configure this action',
        actionType: 'update',
        enabled: true
      }
    },
    {
      id: 'node-1770122302593',
      kind: 'action',
      position: {
        x: 838,
        y: 560
      },
      data: {
        title: 'New Action',
        description: 'Configure this action',
        actionType: 'update',
        enabled: true
      }
    }
  ],
  edges: [
    {
      id: 'edge-1',
      from: {
        entityId: 'trigger-1'
      },
      to: {
        entityId: 'action-1'
      },
      locked: true
    },
    {
      id: 'edge-2',
      from: {
        entityId: 'action-1'
      },
      to: {
        entityId: 'condition-1'
      }
    },
    {
      id: 'edge-12',
      from: {
        entityId: 'condition-1'
      },
      to: {
        entityId: 'action-10'
      }
    },
    {
      id: 'edge-13',
      from: {
        entityId: 'action-10'
      },
      to: {
        entityId: 'action-11'
      }
    },
    {
      id: 'edge-14',
      from: {
        entityId: 'action-11'
      },
      to: {
        entityId: 'condition-3'
      }
    },
    {
      id: 'edge-19',
      from: {
        entityId: 'action-15'
      },
      to: {
        entityId: 'action-16'
      }
    },
    {
      id: 'edge-1769669311940',
      from: {
        entityId: 'condition-3'
      },
      to: {
        entityId: 'action-13'
      }
    },
    {
      id: 'edge-1769669319694',
      from: {
        entityId: 'action-13'
      },
      to: {
        entityId: 'action-15'
      }
    },
    {
      id: 'edge-1770122310274',
      from: {
        entityId: 'node-1770122294598'
      },
      to: {
        entityId: 'node-1770122302593'
      }
    },
    {
      id: 'edge-1770122312670',
      from: {
        entityId: 'action-16'
      },
      to: {
        entityId: 'group-1770122290693'
      }
    },
    {
      id: 'edge-1770122321167',
      from: {
        entityId: 'group-5'
      },
      to: {
        entityId: 'condition-2'
      }
    }
  ],
  groups: [
    {
      id: 'group-4',
      kind: 'group',
      title: 'Executive Approval',
      position: {
        x: 447,
        y: 27
      },
      size: {
        w: 293,
        h: 655
      },
      containedIds: ['action-10', 'action-13', 'condition-3', 'action-11'],
      // locked: true,
      readonly: true
    },
    {
      id: 'group-5',
      kind: 'group',
      title: 'Executive Rejection',
      position: {
        x: 798,
        y: 25
      },
      size: {
        w: 330,
        h: 675
      },
      containedIds: ['action-15', 'group-1770122290693', 'action-16']
    },
    {
      id: 'group-1770122290693',
      kind: 'group',
      title: 'New Group',
      position: {
        x: 818,
        y: 357
      },
      size: {
        w: 290,
        h: 323
      },
      containedIds: ['node-1770122294598', 'node-1770122302593']
    }
  ]
}

// Current workflow graph
const workflowGraph = ref<WorkflowGraph>(
  JSON.parse(JSON.stringify(initialWorkflowGraph))
)

const selectedId = ref<string | null>(null)
const workflowCanvasRef = ref<InstanceType<typeof WorkflowCanvas> | null>(null)
const maxGroupDepth = ref<number | null>(null)

function resetCanvas() {
  workflowGraph.value = JSON.parse(JSON.stringify(initialWorkflowGraph))
  selectedId.value = null
}

// Event log for demonstrating all emits
interface EventLogEntry {
  name: string
  data: string
  time: string
}

const eventLog = ref<EventLogEntry[]>([])
const MAX_LOG_ENTRIES = 10

function logEvent(name: string, data: any) {
  const entry: EventLogEntry = {
    name,
    data: JSON.stringify(data),
    time: new Date().toLocaleTimeString()
  }
  eventLog.value.unshift(entry)
  if (eventLog.value.length > MAX_LOG_ENTRIES) {
    eventLog.value = eventLog.value.slice(0, MAX_LOG_ENTRIES)
  }
}

function handleNodeAdd(node: WorkflowNode) {
  logEvent('node-add', { id: node.id, kind: node.kind })
}

function handleGroupAdd(group: WorkflowGroup) {
  logEvent('group-add', { id: group.id, title: group.title })
}

function handleEdgeAdd(edge: WorkflowEdge) {
  logEvent('edge-add', {
    id: edge.id,
    from: edge.from.entityId,
    to: edge.to.entityId
  })
}

function handleNodeDragStart(nodeId: string) {
  logEvent('node-drag-start', { nodeId })
}

function handleNodeDragEnd(nodeId: string, position: { x: number; y: number }) {
  logEvent('node-drag-end', { nodeId, position })
}

function handleNodeClick(nodeId: string) {
  logEvent('node-click', { nodeId })
}

function handleNodeDelete(nodeId: string) {
  logEvent('node-delete', { nodeId })
}

function handleNodeUpdate(node: WorkflowNode) {
  logEvent('node-update', { id: node.id, kind: node.kind })
}

function handleGroupDragStart(groupId: string) {
  logEvent('group-drag-start', { groupId })
}

function handleGroupDragEnd(
  groupId: string,
  position: { x: number; y: number }
) {
  logEvent('group-drag-end', { groupId, position })
}

function handleGroupClick(groupId: string) {
  logEvent('group-click', { groupId })
}

function handleGroupDelete(groupId: string) {
  logEvent('group-delete', { groupId })
}

function handleGroupUpdate(group: WorkflowGroup) {
  logEvent('group-update', { id: group.id, title: group.title })
}

function handleGroupResizeStart(groupId: string) {
  logEvent('group-resize-start', { groupId })
}

function handleGroupResizeEnd(groupId: string, size: { w: number; h: number }) {
  logEvent('group-resize-end', { groupId, size })
}

function handleEdgeDelete(edgeId: string) {
  logEvent('edge-delete', { edgeId })
}

function handleCanvasClick() {
  logEvent('canvas-click', {})
}

function handleEntityMovedToGroup(entityId: string, groupId: string | null) {
  logEvent('entity-moved-to-group', { entityId, groupId })
}
</script>

<style scoped>
.demo-actions {
  display: flex;
  gap: 12px;
  margin: 20px 0;
}

.controls {
  margin: 20px 0;
  padding: 16px;
  border-radius: 8px;
}

.controls label {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.controls input[type='number'] {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.state-info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
}

summary {
  cursor: pointer;
  font-weight: 600;
  padding: 8px;
  border-radius: 4px;
}

pre {
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

.event-log {
  margin-top: 8px;
}

.no-events {
  padding: 16px;
  text-align: center;
  color: #999;
  font-style: italic;
}

.event-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  align-items: center;
}

.event-item:last-child {
  border-bottom: none;
}

.event-name {
  font-weight: 600;
  color: #2196f3;
  min-width: 180px;
}

.event-data {
  flex: 1;
  font-family: monospace;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-time {
  color: #999;
  font-size: 11px;
  min-width: 80px;
  text-align: right;
}
</style>

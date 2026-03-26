<template>
  <div class="container">
    <h1>Workflow Canvas</h1>

    <details class="demo-section">
      <summary>Canvas Basics</summary>

      <div class="controls">
        <div class="control-item">
          <strong>Canvas Mode:</strong>
          <select
            v-model="canvasMode"
            style="
              margin-left: 8px;
              padding: 6px 8px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 14px;
            "
          >
            <option value="view">View (Read-only)</option>
            <option value="edit">Edit (Interactive)</option>
          </select>
          <span style="margin-left: 8px; color: #666; font-size: 13px">
            (view mode: no interactions, no grid | edit mode: full editing)
          </span>
        </div>
        <div class="control-item">
          <strong>Max Group Depth:</strong>
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
        </div>
        <div class="control-item">
          <strong>Hide Empty Handles:</strong>
          <input
            type="checkbox"
            v-model="hideEmptyHandles"
            style="margin-left: 8px"
          />
          <span style="margin-left: 8px; color: #666; font-size: 13px">
            (hides input/output handles when they have no connections)
          </span>
        </div>
        <div class="control-item">
          <strong>Hide Path Add:</strong>
          <input
            type="checkbox"
            v-model="hidePathAdd"
            style="margin-left: 8px"
          />
          <span style="margin-left: 8px; color: #666; font-size: 13px">
            (hides "+" buttons on edges between nodes)
          </span>
        </div>
        <div class="control-item">
          <strong>Lock All Edges:</strong>
          <input
            type="checkbox"
            v-model="edgesLocked"
            style="margin-left: 8px"
          />
          <span style="margin-left: 8px; color: #666; font-size: 13px">
            (prevents disconnection/deletion of all edges)
          </span>
        </div>
      </div>
    </details>

    <div class="demo-actions">
      <of-button @click="addNewNodeWrapper" variant="filled">
        + Add New Node
      </of-button>
      <of-button @click="addNewGroupWrapper" variant="filled">
        + Add New Group
      </of-button>
      <of-button @click="resetCanvas" variant="outlined">
        Reset Canvas
      </of-button>
    </div>

    <div class="workflow-demo">
      <WorkflowCanvas
        ref="workflowCanvasRef"
        v-model="workflowGraph"
        v-model:selected-id="selectedId"
        :record="record"
        :mode="canvasMode"
        :width="1000"
        :height="600"
        :max-group-depth="maxGroupDepth"
        :hide-empty-handles="hideEmptyHandles"
        :hide-path-add="hidePathAdd"
        :edges-locked="edgesLocked"
        :node-types="nodeTypes"
        :group-types="groupTypes"
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
        @fullscreen-toggle="
          (isFullscreen: boolean) => console.log('Fullscreen:', isFullscreen)
        "
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
import { ref, nextTick } from 'vue'
import { makeRecord } from 'oceanfront'
import {
  WorkflowCanvas,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowGroup,
  type NodeTypeConfig,
  type GroupTypeConfig,
  type WorkflowCanvasMode,
  type ConnectedEntities,
  type EdgeAddPayload
} from 'oceanfront-workflow-canvas'
import 'oceanfront-workflow-canvas/css'

// Node type configuration
const nodeTypes: NodeTypeConfig = {
  trigger: {
    type: 'trigger',
    title: 'Trigger',
    configPanelTitle: 'Workflow Trigger Configuration',
    tileTitle: 'Trigger',
    icon: 'hourglass',
    addNodeButtonText: '+ action',
    addGroupButtonText: '+ group',
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
    title: 'Action',
    configPanelTitle: 'Action Step Configuration',
    tileTitle: 'Action',
    icon: 'gear',
    addNodeButtonText: '+ next',
    addGroupButtonText: '+ group',
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
        showInTile: false,
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
    title: 'Condition',
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

// Group type configuration
const groupTypes: GroupTypeConfig = {
  action: {
    type: 'group',
    label: 'action group type',
    addNodeButtonText: '+ step',
    addGroupButtonText: '+ subgroup',
    fields: [
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        placeholder: 'Describe this group'
      },
      {
        name: 'priority',
        type: 'select',
        label: 'Priority',
        items: [
          { value: 'low', text: 'Low' },
          { value: 'medium', text: 'Medium' },
          { value: 'high', text: 'High' }
        ]
      },
      {
        name: 'owner',
        type: 'text',
        label: 'Owner',
        placeholder: 'Enter owner name'
      },
      {
        name: 'lockParent',
        type: 'toggle',
        label: 'Lock to Parent',
        placeholder: 'Prevent moving outside parent group'
      }
    ],
    nested: {
      label: 'Sub-Group',
      placeholder: 'Configure sub-group',
      fields: [
        {
          name: 'description',
          type: 'textarea',
          label: 'Sub-Group Description',
          placeholder: 'Describe this sub-group'
        },
        {
          name: 'priority',
          type: 'select',
          label: 'Priority',
          items: [
            { value: 'low', text: 'Low' },
            { value: 'high', text: 'High' }
          ]
        }
      ]
    }
  },
  phase: {
    type: 'phase',
    label: 'Workflow Phase',
    lockParent: true, // All phase groups are locked to parent by default
    fields: [
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        placeholder: 'Describe this phase'
      },
      {
        name: 'duration',
        type: 'number',
        label: 'Estimated Duration (days)',
        placeholder: '0'
      },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        items: [
          { value: 'not_started', text: 'Not Started' },
          { value: 'in_progress', text: 'In Progress' },
          { value: 'completed', text: 'Completed' }
        ]
      },
      {
        name: 'lockParent',
        type: 'toggle',
        label: 'Lock to Parent',
        placeholder: 'Prevent moving outside parent group'
      }
    ],
    nested: {
      label: 'Sub-Phase',
      placeholder: 'Configure phase details',
      fields: [
        {
          name: 'description',
          type: 'textarea',
          label: 'Sub-Phase Description',
          placeholder: 'Describe this sub-phase'
        },
        {
          name: 'duration',
          type: 'number',
          label: 'Duration (days)',
          placeholder: '0'
        }
      ]
    }
  }
}

// Initial workflow data (separate from graph structure) - flat format
const initialRecordData: Record<string, unknown> = {
  'trigger-1-title': 'New Order',
  'trigger-1-description': 'Triggered when a customer places an order',
  'trigger-1-event': 'new_quote',
  'action-1-title': 'Validate Order',
  'action-1-description': 'Check stock and pricing',
  'action-1-actionType': 'update',
  'action-1-enabled': true,
  'condition-1-title': 'Amount > $500?',
  'condition-1-description': 'Route based on order value',
  'condition-1-operator': 'greater_than',
  'condition-1-threshold': 500,
  'action-2-title': 'Manager Approval',
  'action-2-description': 'Require manager sign-off',
  'action-2-actionType': 'create',
  'action-2-enabled': true,
  'action-3-title': 'Send Invoice',
  'action-3-description': 'Generate and send invoice to customer',
  'action-3-actionType': 'email',
  'action-3-enabled': true,
  'action-4-title': 'Auto-Approve',
  'action-4-description': 'Approve small orders automatically',
  'action-4-actionType': 'update',
  'action-4-enabled': true,
  'action-5-title': 'Send Confirmation',
  'action-5-description': 'Email order confirmation to customer',
  'action-5-actionType': 'email',
  'action-5-enabled': true,
  'action-6-title': 'Update Inventory',
  'action-6-description': 'Deduct ordered items from stock',
  'action-6-actionType': 'update',
  'action-6-enabled': true,
  'action-7-title': 'Notify Warehouse',
  'action-7-description': 'Send pick-and-pack request',
  'action-7-actionType': 'email',
  'action-7-enabled': true,
  'action-8-title': 'Log Activity',
  'action-8-description': 'Record order in audit log',
  'action-8-actionType': 'create',
  'action-8-enabled': true,
  'group-fulfillment-description': 'Post-approval fulfillment steps',
  'group-fulfillment-priority': 'high',
  'group-fulfillment-owner': 'Warehouse Team',
  'group-notifications-description': 'Customer and internal notifications',
  'group-notifications-priority': 'medium',
  'group-notifications-owner': 'Sales Team'
}

// Initial workflow graph state
const initialWorkflowGraph: WorkflowGraph = {
  nodes: [
    {
      id: 'trigger-1',
      kind: 'trigger',
      label: 'Order Entry',
      labelRight: 'v2.1',
      position: { x: 50, y: 40 }
    },
    {
      id: 'action-1',
      kind: 'action',
      label: 'Validation',
      position: { x: 50, y: 200 }
    },
    {
      id: 'condition-1',
      kind: 'condition',
      label: 'Route',
      position: { x: 50, y: 380 }
    },
    {
      id: 'action-2',
      kind: 'action',
      labelRight: 'High value',
      position: { x: 50, y: 560 }
    },
    {
      id: 'action-3',
      kind: 'action',
      position: { x: 50, y: 720 }
    },
    {
      id: 'action-4',
      kind: 'action',
      labelRight: 'Low value',
      position: { x: 340, y: 560 }
    },
    {
      id: 'action-5',
      kind: 'action',
      label: 'Step 1',
      position: { x: 450, y: 60 }
    },
    {
      id: 'action-6',
      kind: 'action',
      label: 'Step 2',
      position: { x: 450, y: 220 }
    },
    {
      id: 'action-7',
      kind: 'action',
      position: { x: 770, y: 60 }
    },
    {
      id: 'action-8',
      kind: 'action',
      position: { x: 770, y: 220 }
    }
  ],
  edges: [
    {
      id: 'edge-1',
      from: { entityId: 'trigger-1' },
      to: { entityId: 'action-1' }
    },
    {
      id: 'edge-2',
      from: { entityId: 'action-1' },
      to: { entityId: 'condition-1' }
    },
    {
      id: 'edge-3',
      from: { entityId: 'condition-1' },
      to: { entityId: 'action-2' }
    },
    {
      id: 'edge-4',
      from: { entityId: 'condition-1' },
      to: { entityId: 'action-4' }
    },
    {
      id: 'edge-5',
      from: { entityId: 'action-2' },
      to: { entityId: 'action-3' }
    },
    {
      id: 'edge-6',
      from: { entityId: 'action-5' },
      to: { entityId: 'action-6' }
    },
    {
      id: 'edge-7',
      from: { entityId: 'action-7' },
      to: { entityId: 'action-8' }
    },
    {
      id: 'edge-8',
      from: { entityId: 'action-6' },
      to: { entityId: 'action-7' }
    }
  ],
  groups: [
    {
      id: 'group-fulfillment',
      kind: 'phase',
      label: 'Fulfillment Phase',
      labelRight: 'Phase 1',
      position: { x: 430, y: 20 },
      size: { w: 630, h: 370 },
      containedIds: ['group-notifications', 'action-5', 'action-6']
    },
    {
      id: 'group-notifications',
      kind: 'action',
      label: 'Notifications',
      position: { x: 750, y: 40 },
      size: { w: 290, h: 330 },
      containedIds: ['action-7', 'action-8']
    }
  ]
}

// Current workflow graph
const workflowGraph = ref<WorkflowGraph>(
  JSON.parse(JSON.stringify(initialWorkflowGraph))
)

// Create FormRecord with initial data
const record = makeRecord(JSON.parse(JSON.stringify(initialRecordData)))

const selectedId = ref<string | null>(null)
const workflowCanvasRef = ref<
  | (InstanceType<typeof WorkflowCanvas> & {
      addNewNode?: () => void
      addNewGroup?: (options?: { type?: string; label?: string }) => void
      syncEntitySpacingFromCss?: () => void
    })
  | null
>(null)
const maxGroupDepth = ref<number | null>(null)
const hideEmptyHandles = ref(false)
const hidePathAdd = ref(false)
const edgesLocked = ref(false)
const canvasMode = ref<WorkflowCanvasMode>('edit')

// Wrapper functions for component methods
function addNewNodeWrapper() {
  workflowCanvasRef.value?.addNewNode?.()
}

function addNewGroupWrapper() {
  workflowCanvasRef.value?.addNewGroup?.()
}

function resetCanvas() {
  workflowGraph.value = JSON.parse(JSON.stringify(initialWorkflowGraph))
  // Reset record data as well
  record.value = JSON.parse(JSON.stringify(initialRecordData))
  selectedId.value = null
  nextTick(() => workflowCanvasRef.value?.syncEntitySpacingFromCss?.())
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

function handleNodeAdd(
  node: WorkflowNode,
  parent: WorkflowGroup | null,
  connected: ConnectedEntities
) {
  logEvent('node-add', {
    id: node.id,
    kind: node.kind,
    parent: parent
      ? { id: parent.id, label: parent.label, kind: parent.kind }
      : null,
    connected: {
      incoming: connected.incoming.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      })),
      outgoing: connected.outgoing.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      }))
    }
  })
}

function handleGroupAdd(
  group: WorkflowGroup,
  parent: WorkflowGroup | null,
  connected: ConnectedEntities
) {
  logEvent('group-add', {
    id: group.id,
    label: group.label,
    parent: parent
      ? { id: parent.id, label: parent.label, kind: parent.kind }
      : null,
    connected: {
      incoming: connected.incoming.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      })),
      outgoing: connected.outgoing.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      }))
    }
  })
}

function handleEdgeAdd(payload: EdgeAddPayload) {
  logEvent('edge-add', payload)
}

function handleNodeDragStart(nodeId: string) {
  logEvent('node-drag-start', { nodeId })
}

function handleNodeDragEnd(
  nodeId: string,
  position: { x: number; y: number },
  parent: WorkflowGroup | null,
  connected: ConnectedEntities
) {
  logEvent('node-drag-end', {
    nodeId,
    position,
    parent: parent
      ? { id: parent.id, label: parent.label, kind: parent.kind }
      : null,
    connected: {
      incoming: connected.incoming.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      })),
      outgoing: connected.outgoing.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      }))
    }
  })
}

function handleNodeClick(nodeId: string) {
  logEvent('node-click', { nodeId })
}

function handleNodeDelete(
  node: WorkflowNode,
  parent: WorkflowGroup | null,
  connected: ConnectedEntities
) {
  logEvent('node-delete', {
    id: node.id,
    kind: node.kind,
    parent: parent
      ? { id: parent.id, label: parent.label, kind: parent.kind }
      : null,
    connected: {
      incoming: connected.incoming.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      })),
      outgoing: connected.outgoing.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      }))
    }
  })
}

function handleNodeUpdate(
  node: WorkflowNode,
  parent: WorkflowGroup | null,
  connected: ConnectedEntities
) {
  logEvent('node-update', {
    id: node.id,
    kind: node.kind,
    parent: parent
      ? { id: parent.id, label: parent.label, kind: parent.kind }
      : null,
    connected: {
      incoming: connected.incoming.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      })),
      outgoing: connected.outgoing.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      }))
    }
  })
}

function handleGroupDragStart(groupId: string) {
  logEvent('group-drag-start', { groupId })
}

function handleGroupDragEnd(
  groupId: string,
  position: { x: number; y: number },
  parent: WorkflowGroup | null,
  connected: ConnectedEntities
) {
  logEvent('group-drag-end', {
    groupId,
    position,
    parent: parent
      ? { id: parent.id, label: parent.label, kind: parent.kind }
      : null,
    connected: {
      incoming: connected.incoming.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      })),
      outgoing: connected.outgoing.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      }))
    }
  })
}

function handleGroupClick(groupId: string) {
  logEvent('group-click', { groupId })
}

function handleGroupDelete(
  group: WorkflowGroup,
  parent: WorkflowGroup | null,
  connected: ConnectedEntities
) {
  logEvent('group-delete', {
    id: group.id,
    kind: group.kind,
    parent: parent
      ? { id: parent.id, label: parent.label, kind: parent.kind }
      : null,
    connected: {
      incoming: connected.incoming.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      })),
      outgoing: connected.outgoing.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      }))
    }
  })
}

function handleGroupUpdate(
  group: WorkflowGroup,
  parent: WorkflowGroup | null,
  connected: ConnectedEntities
) {
  // Sync lockParent from record to top-level property
  const groupData = record.value[group.id]
  if (
    groupData &&
    typeof groupData === 'object' &&
    Object.keys(groupData).length > 0 &&
    'lockParent' in groupData
  ) {
    group.lockParent = groupData.lockParent as boolean
  }

  logEvent('group-update', {
    id: group.id,
    label: group.label,
    lockParent: group.lockParent,
    parent: parent
      ? { id: parent.id, label: parent.label, kind: parent.kind }
      : null,
    connected: {
      incoming: connected.incoming.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      })),
      outgoing: connected.outgoing.map((e: WorkflowNode | WorkflowGroup) => ({
        id: e.id,
        kind: 'kind' in e ? e.kind : 'group'
      }))
    }
  })
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
:root {
  --wf-spacing: 16px;
}
.demo-actions {
  display: flex;
  gap: 12px;
  margin: 20px 10px;
  flex-wrap: wrap;
}

.demo-section {
  margin: 10px 0;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
}

.demo-section summary {
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
  color: #333;
  border-radius: 6px 6px 0 0;
  background: #f0f0f0;
  user-select: none;
  list-style: none;
}

.demo-section summary::-webkit-details-marker {
  display: none;
}

.demo-section summary::before {
  content: '▶';
  display: inline-block;
  margin-right: 8px;
  transition: transform 0.2s;
}

.demo-section[open] summary::before {
  transform: rotate(90deg);
}

.demo-section[open] summary {
  margin-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
  border-radius: 6px 6px 0 0;
}

.demo-section summary:hover {
  background: #e8e8e8;
}

.demo-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #333;
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

.control-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
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

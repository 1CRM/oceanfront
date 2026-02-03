<template>
  <div class="container">
    <h1>Workflow Canvas</h1>

    <div class="demo-actions">
      <of-button
        @click="workflowCanvasRef?.addNewNode()"
        variant="filled"
        tint="primary"
      >
        + Add New Node
      </of-button>
      <of-button
        @click="workflowCanvasRef?.addNewGroup()"
        variant="filled"
        tint="primary"
      >
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
  type WorkflowGroup
} from 'oceanfront-workflow-canvas'
import 'oceanfront-workflow-canvas/css'

// Initial workflow graph state - Complex linear workflow with branches (one in, one out per node)
const initialWorkflowGraph: WorkflowGraph = {
  nodes: [],
  edges: [],
  groups: []
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
  background: #f5f5f5;
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
  background: #f5f5f5;
  border-radius: 8px;
  margin: 16px 0;
}

summary {
  cursor: pointer;
  font-weight: 600;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

pre {
  background: #f5f5f5;
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

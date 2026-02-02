<template>
  <div class="container">
    <h1>Workflow Canvas</h1>

    <div class="demo-actions">
      <of-button @click="addNewNode" variant="filled" tint="primary">
        + Add New Node
      </of-button>
      <of-button @click="addNewGroup" variant="filled" tint="primary">
        + Add New Group
      </of-button>
      <of-button @click="resetCanvas" variant="outlined">
        Reset Canvas
      </of-button>
    </div>

    <div class="workflow-demo">
      <WorkflowCanvas
        v-model="workflowGraph"
        v-model:selected-id="selectedId"
        :width="1000"
        :height="600"
        @add-step="handleAddStep"
        @connect="handleConnect"
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
          <of-button @click="clearEventLog" variant="outlined" size="small">
            Clear Log
          </of-button>
          <div v-if="eventLog.length === 0" class="no-events">No events yet</div>
          <div v-for="(event, index) in eventLog" :key="index" class="event-item">
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
import { ref, computed, watch } from 'vue'
import {
  WorkflowCanvas,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowGroup,
  type AddStepEvent,
  type ConnectEvent,
  addEdge,
  findNode,
  addNodeToGroup
} from 'oceanfront-workflow-canvas'
import 'oceanfront-workflow-canvas/css'

// Initial workflow graph state - Complex linear workflow with branches (one in, one out per node)
// Node height = 100px, gap between nodes = 40px, so Y spacing = 140px
const initialWorkflowGraph: WorkflowGraph = {
  nodes: [
    {
      id: 'action-10',
      kind: 'action',
      position: {
        x: 148,
        y: 730
      },
      data: {
        title: 'Type',
        description: 'Value changed to: "mmm"',
        icon: 'gear'
      }
    },
    {
      id: 'action-11',
      kind: 'action',
      position: {
        x: 144,
        y: 554.5
      },
      data: {
        title: 'Contact Phone',
        description: 'Value changed to: "fff"',
        icon: 'user'
      }
    },
    {
      id: 'condition-3',
      kind: 'condition',
      position: {
        x: 145,
        y: 387.5
      },
      data: {
        title: 'Category',
        description: 'Value changed to: "fff"',
        icon: 'help circle'
      }
    },
    {
      id: 'action-13',
      kind: 'action',
      position: {
        x: 146,
        y: 234.5
      },
      data: {
        title: 'Status',
        description: 'Value changed to "ddd"',
        icon: 'email'
      }
    },
    {
      id: 'action-15',
      kind: 'action',
      position: {
        x: 160,
        y: 54.5
      },
      data: {
        title: 'Assets',
        description: 'Value changed to "aaa"',
        icon: 'gear'
      }
    },
    {
      id: 'node-1770043111576',
      kind: 'action',
      position: {
        x: 555,
        y: 107.5
      },
      data: {
        title: 'Subject',
        description: 'Value changed to: "ooo"'
      }
    },
    {
      id: 'node-1770043184121',
      kind: 'action',
      position: {
        x: 555,
        y: 254.5
      },
      data: {
        title: 'Created by',
        description: 'Value changed to: "ppp"'
      }
    },
    {
      id: 'node-1770043222729',
      kind: 'action',
      position: {
        x: 561,
        y: 450.5
      },
      data: {
        title: 'Created by',
        description: 'Value changed to: "ll"'
      }
    },
    {
      id: 'node-1770043293931',
      kind: 'action',
      position: {
        x: 549,
        y: 620.5
      },
      data: {
        title: 'Vendor RMA #',
        description: 'Value changed to: "fff"'
      }
    },
    {
      id: 'node-1770043343226',
      kind: 'action',
      position: {
        x: 549,
        y: 769.5
      },
      data: {
        title: 'Contact Phone',
        description: 'Value changed to: "fff"'
      }
    }
  ],
  edges: [
    {
      id: 'edge-1770042749417',
      from: {
        entityId: 'action-15'
      },
      to: {
        entityId: 'group-1770042668276'
      }
    },
    {
      id: 'edge-1770042895298',
      from: {
        entityId: 'group-1770042668276'
      },
      to: {
        entityId: 'action-11'
      }
    },
    {
      id: 'edge-1770042942337',
      from: {
        entityId: 'action-13'
      },
      to: {
        entityId: 'group-1770042767028'
      }
    },
    {
      id: 'edge-1770042997115',
      from: {
        entityId: 'group-5'
      },
      to: {
        entityId: 'action-10'
      }
    },
    {
      id: 'edge-1770043246438',
      from: {
        entityId: 'node-1770043111576'
      },
      to: {
        entityId: 'node-1770043184121'
      }
    },
    {
      id: 'edge-1770043251254',
      from: {
        entityId: 'group-1770043032659'
      },
      to: {
        entityId: 'node-1770043222729'
      }
    },
    {
      id: 'edge-1770043256488',
      from: {
        entityId: 'action-10'
      },
      to: {
        entityId: 'group-1770043032659'
      }
    },
    {
      id: 'edge-1770043375162',
      from: {
        entityId: 'node-1770043293931'
      },
      to: {
        entityId: 'node-1770043343226'
      }
    },
    {
      id: 'edge-1770043381753',
      from: {
        entityId: 'node-1770043222729'
      },
      to: {
        entityId: 'group-1770043280273'
      }
    }
  ],
  groups: [
    {
      id: 'group-5',
      kind: 'group',
      title: 'Group: All Of',
      position: {
        x: 85,
        y: 34.5
      },
      size: {
        w: 370,
        h: 640
      },
      containedIds: ['group-1770042668276', 'action-15', 'action-11']
    },
    {
      id: 'group-1770042668276',
      kind: 'group',
      title: 'Group: Not All Of',
      position: {
        x: 105,
        y: 214.5
      },
      size: {
        w: 330,
        h: 313
      },
      containedIds: ['group-1770042767028', 'action-13']
    },
    {
      id: 'group-1770042767028',
      kind: 'group',
      title: 'Group: All Of',
      position: {
        x: 125,
        y: 367.5
      },
      size: {
        w: 290,
        h: 140
      },
      containedIds: ['condition-3']
    },
    {
      id: 'group-1770043032659',
      kind: 'group',
      title: 'Group: All Of',
      position: {
        x: 535,
        y: 87.5
      },
      size: {
        w: 290,
        h: 287
      },
      containedIds: ['node-1770043111576', 'node-1770043184121']
    },
    {
      id: 'group-1770043280273',
      kind: 'group',
      title: 'Group: All Of',
      position: {
        x: 529,
        y: 600.5
      },
      size: {
        w: 290,
        h: 289
      },
      containedIds: ['node-1770043343226', 'node-1770043293931']
    }
  ]
}

// Current workflow graph
const workflowGraph = ref<WorkflowGraph>(
  JSON.parse(JSON.stringify(initialWorkflowGraph))
)

const selectedId = ref<string | null>(null)
const nodeConfig = ref({ title: '', description: '' })
const groupConfig = ref({ title: '' })

const selectedNode = computed(() => {
  if (!selectedId.value) return null
  return findNode(workflowGraph.value, selectedId.value)
})

const selectedGroup = computed(() => {
  if (!selectedId.value) return null
  return workflowGraph.value.groups.find(
    (g: WorkflowGroup) => g.id === selectedId.value
  )
})

// Watch selected node and update config
watch(selectedNode, (node) => {
  if (node) {
    nodeConfig.value = {
      title: (node.data as any)?.title || '',
      description: (node.data as any)?.description || ''
    }
  }
})

// Watch selected group and update config
watch(selectedGroup, (group) => {
  if (group) {
    groupConfig.value = {
      title: group.title || ''
    }
  }
})

function handleAddStep(event: AddStepEvent) {
  console.log('Add step:', event)

  const newNodeId = `node-${Date.now()}`
  const afterNode = event.afterNodeId
    ? findNode(workflowGraph.value, event.afterNodeId)
    : null

  // Find the edge from the afterNode (if it exists)
  const existingEdge = event.afterNodeId
    ? workflowGraph.value.edges.find(
        (e: WorkflowEdge) => e.from.entityId === event.afterNodeId
      )
    : null

  // Calculate position between the two nodes if there's an existing edge
  let position: { x: number; y: number }
  if (afterNode && existingEdge) {
    const toNode = findNode(workflowGraph.value, existingEdge.to.entityId)
    if (toNode) {
      // Place new node between the two connected nodes
      position = {
        x: (afterNode.position.x + toNode.position.x) / 2,
        y: (afterNode.position.y + toNode.position.y) / 2
      }
    } else {
      // Fallback: place below the afterNode
      position = { x: afterNode.position.x, y: afterNode.position.y + 150 }
    }
  } else if (afterNode) {
    // No existing edge, place below the afterNode
    position = { x: afterNode.position.x, y: afterNode.position.y + 150 }
  } else {
    // No afterNode specified, place at default position
    position = { x: 100, y: 100 }
  }

  // Create the new node
  workflowGraph.value.nodes.push({
    id: newNodeId,
    kind: 'action',
    position,
    data: {
      title: 'New Action',
      description: 'Configure this action'
    }
  })

  // If the source node is in a group, add the new node to the same group
  if (event.inGroupId) {
    workflowGraph.value = addNodeToGroup(
      workflowGraph.value,
      newNodeId,
      event.inGroupId
    )
  }

  // If there's an existing edge, we need to:
  // 1. Remove the old edge
  // 2. Create edge from afterNode to newNode
  // 3. Create edge from newNode to the original target
  if (existingEdge && event.afterNodeId) {
    const targetNodeId = existingEdge.to.entityId

    // Remove the old edge
    workflowGraph.value.edges = workflowGraph.value.edges.filter(
      (e: WorkflowEdge) => e.id !== existingEdge.id
    )

    // Add edge from afterNode to new node
    workflowGraph.value = addEdge(workflowGraph.value, {
      id: `edge-${Date.now()}-1`,
      from: { entityId: event.afterNodeId },
      to: { entityId: newNodeId }
    })

    // Add edge from new node to original target
    workflowGraph.value = addEdge(workflowGraph.value, {
      id: `edge-${Date.now()}-2`,
      from: { entityId: newNodeId },
      to: { entityId: targetNodeId }
    })
  } else if (event.afterNodeId) {
    // No existing edge, just create one from afterNode to newNode
    workflowGraph.value = addEdge(workflowGraph.value, {
      id: `edge-${Date.now()}`,
      from: { entityId: event.afterNodeId },
      to: { entityId: newNodeId }
    })
  }

  selectedId.value = newNodeId
}

function handleConnect(event: ConnectEvent) {
  console.log('Connect:', event)

  const edgeId = `edge-${Date.now()}`
  workflowGraph.value = addEdge(workflowGraph.value, {
    id: edgeId,
    from: { entityId: event.fromNodeId },
    to: { entityId: event.toNodeId }
  })
}

function addNewNode() {
  const newNodeId = `node-${Date.now()}`

  // Calculate position: find the bottommost node and place new node below it
  let maxY = 0
  workflowGraph.value.nodes.forEach((node: WorkflowNode) => {
    const nodeBottom = node.position.y + (node.size?.h || 100)
    if (nodeBottom > maxY) {
      maxY = nodeBottom
    }
  })

  // Create new node
  const newNode: WorkflowNode = {
    id: newNodeId,
    kind: 'action',
    position: { x: 100, y: maxY + 50 },
    data: {
      title: 'New Action',
      description: 'Configure this action'
    }
  }

  workflowGraph.value.nodes.push(newNode)
  selectedId.value = newNodeId
}

function addNewGroup() {
  const newGroupId = `group-${Date.now()}`

  // Calculate position: find the rightmost node/group and place new group to the right
  let maxX = 0
  workflowGraph.value.nodes.forEach((node: WorkflowNode) => {
    const nodeRight = node.position.x + (node.size?.w || 250)
    if (nodeRight > maxX) {
      maxX = nodeRight
    }
  })

  workflowGraph.value.groups.forEach((group: WorkflowGroup) => {
    const groupRight = group.position.x + group.size.w
    if (groupRight > maxX) {
      maxX = groupRight
    }
  })

  // Create new group (empty, suitable size for one node)
  workflowGraph.value.groups.push({
    id: newGroupId,
    kind: 'group',
    title: 'New Group',
    position: { x: maxX + 50, y: 100 },
    size: { w: 290, h: 140 },
    containedIds: []
  })

  selectedId.value = newGroupId
}

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

function clearEventLog() {
  eventLog.value = []
}

// Event handlers for all new emits
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

function handleGroupDragEnd(groupId: string, position: { x: number; y: number }) {
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

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
  findNode
} from 'oceanfront-workflow-canvas'
import 'oceanfront-workflow-canvas/css'

// Initial workflow graph state - Complex linear workflow with branches (one in, one out per node)
// Node height = 100px, gap between nodes = 40px, so Y spacing = 140px
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
        icon: 'hourglass'
      }
    },
    {
      id: 'action-1',
      kind: 'action',
      position: {
        x: 100,
        y: 229
      },
      data: {
        title: 'Validate Quote Data',
        description: 'Checks for required fields and data integrity',
        icon: 'gear'
      }
    },
    {
      id: 'condition-1',
      kind: 'condition',
      position: {
        x: 100,
        y: 394
      },
      data: {
        title: 'Check Quote Value',
        description: 'Route based on quote value threshold',
        icon: 'help circle'
      }
    },
    {
      id: 'condition-2',
      kind: 'condition',
      position: {
        x: 841,
        y: 402
      },
      data: {
        title: 'Manager Decision',
        description: 'Wait for manager to approve or reject',
        icon: 'help circle'
      }
    },
    {
      id: 'action-10',
      kind: 'action',
      position: {
        x: 467,
        y: 48
      },
      data: {
        title: 'Financial Analysis',
        description: 'Perform detailed financial review',
        icon: 'gear'
      }
    },
    {
      id: 'action-11',
      kind: 'action',
      position: {
        x: 467,
        y: 188
      },
      data: {
        title: 'Request Executive Approval',
        description: 'Route to VP or C-level for approval',
        icon: 'user'
      }
    },
    {
      id: 'condition-3',
      kind: 'condition',
      position: {
        x: 467,
        y: 328
      },
      data: {
        title: 'Executive Decision',
        description: 'Wait for executive approval',
        icon: 'help circle'
      }
    },
    {
      id: 'action-13',
      kind: 'action',
      position: {
        x: 467,
        y: 468
      },
      data: {
        title: 'Send Contract',
        description: 'Email contract to customer',
        icon: 'email'
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
        icon: 'gear'
      }
    },
    {
      id: 'action-16',
      kind: 'action',
      position: {
        x: 840,
        y: 185
      },
      data: {
        title: 'Escalate Rejection',
        description: 'Notify senior management',
        icon: 'email'
      }
    }
  ],
  edges: [
    {
      id: 'edge-1',
      from: {
        nodeId: 'trigger-1'
      },
      to: {
        nodeId: 'action-1'
      }
    },
    {
      id: 'edge-2',
      from: {
        nodeId: 'action-1'
      },
      to: {
        nodeId: 'condition-1'
      }
    },
    {
      id: 'edge-12',
      from: {
        nodeId: 'condition-1'
      },
      to: {
        nodeId: 'action-10'
      }
    },
    {
      id: 'edge-13',
      from: {
        nodeId: 'action-10'
      },
      to: {
        nodeId: 'action-11'
      }
    },
    {
      id: 'edge-14',
      from: {
        nodeId: 'action-11'
      },
      to: {
        nodeId: 'condition-3'
      }
    },
    {
      id: 'edge-19',
      from: {
        nodeId: 'action-15'
      },
      to: {
        nodeId: 'action-16'
      }
    },
    {
      id: 'edge-1769669311940',
      from: {
        nodeId: 'condition-3'
      },
      to: {
        nodeId: 'action-13'
      }
    },
    {
      id: 'edge-1769669319694',
      from: {
        nodeId: 'action-13'
      },
      to: {
        nodeId: 'action-15'
      }
    },
    {
      id: 'edge-1769669399303',
      from: {
        nodeId: 'action-16'
      },
      to: {
        nodeId: 'condition-2'
      }
    }
  ],
  groups: [
    {
      id: 'group-4',
      title: 'Executive Approval',
      rect: {
        x: 447,
        y: 28,
        w: 290,
        h: 560
      },
      nodeIds: ['action-10', 'action-11', 'condition-3', 'action-13']
    },
    {
      id: 'group-5',
      title: 'Executive Rejection',
      rect: {
        x: 820,
        y: 25,
        w: 290,
        h: 280
      },
      nodeIds: ['action-15', 'action-16']
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
        (e: WorkflowEdge) => e.from.nodeId === event.afterNodeId
      )
    : null

  // Calculate position between the two nodes if there's an existing edge
  let position: { x: number; y: number }
  if (afterNode && existingEdge) {
    const toNode = findNode(workflowGraph.value, existingEdge.to.nodeId)
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

  // If there's an existing edge, we need to:
  // 1. Remove the old edge
  // 2. Create edge from afterNode to newNode
  // 3. Create edge from newNode to the original target
  if (existingEdge && event.afterNodeId) {
    const targetNodeId = existingEdge.to.nodeId

    // Remove the old edge
    workflowGraph.value.edges = workflowGraph.value.edges.filter(
      (e: WorkflowEdge) => e.id !== existingEdge.id
    )

    // Add edge from afterNode to new node
    workflowGraph.value = addEdge(workflowGraph.value, {
      id: `edge-${Date.now()}-1`,
      from: { nodeId: event.afterNodeId },
      to: { nodeId: newNodeId }
    })

    // Add edge from new node to original target
    workflowGraph.value = addEdge(workflowGraph.value, {
      id: `edge-${Date.now()}-2`,
      from: { nodeId: newNodeId },
      to: { nodeId: targetNodeId }
    })
  } else if (event.afterNodeId) {
    // No existing edge, just create one from afterNode to newNode
    workflowGraph.value = addEdge(workflowGraph.value, {
      id: `edge-${Date.now()}`,
      from: { nodeId: event.afterNodeId },
      to: { nodeId: newNodeId }
    })
  }

  selectedId.value = newNodeId
}

function handleConnect(event: ConnectEvent) {
  console.log('Connect:', event)

  const edgeId = `edge-${Date.now()}`
  workflowGraph.value = addEdge(workflowGraph.value, {
    id: edgeId,
    from: { nodeId: event.fromNodeId },
    to: { nodeId: event.toNodeId }
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
    const groupRight = group.rect.x + group.rect.w
    if (groupRight > maxX) {
      maxX = groupRight
    }
  })

  // Create new group (empty, suitable size for one node)
  workflowGraph.value.groups.push({
    id: newGroupId,
    title: 'New Group',
    rect: { x: maxX + 50, y: 100, w: 290, h: 140 },
    nodeIds: []
  })

  selectedId.value = newGroupId
}

function resetCanvas() {
  workflowGraph.value = JSON.parse(JSON.stringify(initialWorkflowGraph))
  selectedId.value = null
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
</style>

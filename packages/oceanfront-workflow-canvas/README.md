# Oceanfront Workflow Canvas

A Vue 3 + TypeScript library for building Zapier-like graphical workflow builders with HTML nodes and SVG connectors.

## Features

- **Visual Workflow Builder**: Drag-and-drop interface for creating workflow graphs
- **HTML Nodes + SVG Connectors**: Clean rendering with div tiles and bezier curve connections
- **Rich Interaction Support**:
  - Select and drag nodes anywhere on the canvas
  - Connect nodes with drag-to-connect handles
  - Disconnect edges by dragging from input handles
  - Add new steps via "+" placeholders on edges
  - Group nodes in containers with automatic layout
  - Drag nodes into/out of groups
  - Reorder nodes within groups by dragging
  - Move entire groups with all contained nodes
  - Configure selected nodes/groups in a slide-out panel
  - Delete nodes and groups via configuration panel
- **Single Connection Per Port**: Each node has one input and one output - connecting a new edge automatically removes the previous one
- **Automatic Group Layout**: Nodes in groups are arranged vertically with consistent spacing
- **Framework Agnostic Data Model**: General-purpose graph structure with consumer-defined node types
- **TypeScript Support**: Fully typed API with comprehensive type definitions
- **Immutable Updates**: Helper utilities for updating graph state without mutations
- **Readonly Mode**: Disable all editing interactions for display-only views
- **Customizable Rendering**: Slot-based customization for nodes and configuration panel

## Installation

```bash
yarn add oceanfront-workflow-canvas
```

## Basic Usage

```vue
<template>
  <WorkflowCanvas
    v-model="workflowGraph"
    v-model:selectedId="selectedId"
    @add-step="handleAddStep"
    @connect="handleConnect"
    style="height: 600px; overflow: hidden;"
  >
    <!-- Optional: Custom node rendering -->
    <template #node="{ node, selected }">
      <!-- Your custom node UI -->
    </template>

    <!-- Optional: Custom configuration panel -->
    <template #panel="{ selectedNode, selectedGroup, close }">
      <!-- Your custom panel UI -->
    </template>
  </WorkflowCanvas>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WorkflowCanvas, type WorkflowGraph } from 'oceanfront-workflow-canvas'
import 'oceanfront-workflow-canvas/css'

const workflowGraph = ref<WorkflowGraph>({
  nodes: [
    {
      id: 'node-1',
      kind: 'trigger',
      position: { x: 100, y: 100 },
      data: { title: 'Start', description: 'Workflow trigger' }
    }
  ],
  edges: [],
  groups: []
})

const selectedId = ref<string | null>(null)

function handleAddStep(event) {
  // Add new node to graph
}

function handleConnect(event) {
  // Add new edge to graph
}
</script>
```

## Components

### WorkflowCanvas

Main canvas component that renders the workflow graph.

**Props:**

- `modelValue: WorkflowGraph` - The workflow graph (v-model)
- `readonly?: boolean` - Disable editing interactions (default: `false`)
- `selectedId?: string | null` - Currently selected node/group ID (v-model:selectedId)
- `width?: number` - Initial canvas width in pixels (default: `1000`)
- `height?: number` - Initial canvas height in pixels (default: `1000`)

**Events:**

- `update:modelValue` - Emitted when graph changes (node drag, group operations, edge disconnection)
- `update:selectedId` - Emitted when selection changes (node click, group click, canvas click)
- `add-step` - Emitted when + button clicked: `{ afterNodeId?: string, inGroupId?: string }`
- `connect` - Emitted when nodes connected: `{ fromNodeId: string, toNodeId: string }`

**Slots:**

- `node` - Custom node rendering
  - Props: `{ node: WorkflowNode, selected: boolean, onMenuClick: () => void }`
  - Default: Renders `WorkflowTile` component
- `panel` - Custom configuration panel
  - Props: `{ selectedNode: WorkflowNode | null, selectedGroup: WorkflowGroup | null, close: () => void }`
  - Default: Renders `WorkflowConfigPanel` with node/group info and delete buttons

### WorkflowTile

Default tile component for rendering nodes.

**Props:**

- `node: WorkflowNode` - The node to render
- `selected?: boolean` - Whether the node is selected
- `dragging?: boolean` - Whether the node is being dragged

### WorkflowPlusPlaceholder

The "+" button for adding new steps (internal component, not typically used directly).

## Type Definitions

```typescript
interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  groups: WorkflowGroup[]
  viewport?: Viewport
}

interface WorkflowNode {
  id: string
  kind: string // e.g., 'trigger', 'action', 'condition'
  position: Position
  size?: Size
  data?: unknown // consumer-owned data
}

interface WorkflowEdge {
  id: string
  from: Port
  to: Port
}

interface WorkflowGroup {
  id: string
  title?: string
  rect: Rect
  nodeIds: string[]
}
```

## Utilities

The library exports comprehensive helper functions for immutable graph updates:

```typescript
import {
  // Node operations
  findNode,
  updateNodePosition,
  updateNodesPositions,
  getNodeEdges,

  // Edge operations
  addEdge,
  removeEdge,

  // Group operations
  findGroup,
  addNodeToGroup,
  removeNodeFromGroup,
  removeNodeFromAllGroups,
  getNodeGroup,
  findGroupAtPosition,
  calculateGroupBounds,
  updateGroupBounds,
  updateAllGroupBounds,
  arrangeNodesInGroup,
  reorderNodeInGroup,
  updateGroupPosition,

  // Utility functions
  isPointInRect
} from 'oceanfront-workflow-canvas'
```

### Node Operations

**`findNode(graph, nodeId)`** - Find a node by ID

```typescript
const node = findNode(graph, 'node-1')
```

**`updateNodePosition(graph, nodeId, position)`** - Update a single node's position

```typescript
const updated = updateNodePosition(graph, 'node-1', { x: 100, y: 200 })
```

**`updateNodesPositions(graph, updates)`** - Update multiple nodes' positions at once

```typescript
const updated = updateNodesPositions(graph, [
  { nodeId: 'node-1', position: { x: 100, y: 100 } },
  { nodeId: 'node-2', position: { x: 100, y: 250 } }
])
```

**`getNodeEdges(graph, nodeId)`** - Get all edges connected to a node

```typescript
const edges = getNodeEdges(graph, 'node-1')
```

### Edge Operations

**`addEdge(graph, edge)`** - Add an edge with single connection per port enforcement

The `addEdge` utility enforces a **single connection per port** rule:

- When adding a new edge, any existing **outgoing** connection from the source node is automatically removed
- Any existing **incoming** connection to the target node is automatically removed
- This ensures each node maintains exactly one input and one output connection

```typescript
// Initial state: node-1 -> node-2
const graph = {
  nodes: [...],
  edges: [{ id: 'e1', from: { nodeId: 'node-1' }, to: { nodeId: 'node-2' } }],
  groups: []
}

// Connect node-1 to node-3 instead
const updated = addEdge(graph, {
  id: 'e2',
  from: { nodeId: 'node-1' },
  to: { nodeId: 'node-3' }
})

// Result: edge 'e1' is removed, only 'e2' remains (node-1 -> node-3)
```

**`removeEdge(graph, edgeId)`** - Remove an edge by ID

```typescript
const updated = removeEdge(graph, 'edge-1')
```

### Group Operations

**`findGroup(graph, groupId)`** - Find a group by ID

```typescript
const group = findGroup(graph, 'group-1')
```

**`addNodeToGroup(graph, nodeId, groupId)`** - Add a node to a group

```typescript
const updated = addNodeToGroup(graph, 'node-1', 'group-1')
```

**`removeNodeFromGroup(graph, nodeId, groupId)`** - Remove a node from a specific group

```typescript
const updated = removeNodeFromGroup(graph, 'node-1', 'group-1')
```

**`removeNodeFromAllGroups(graph, nodeId)`** - Remove a node from all groups

```typescript
const updated = removeNodeFromAllGroups(graph, 'node-1')
```

**`getNodeGroup(graph, nodeId)`** - Get the group containing a node

```typescript
const group = getNodeGroup(graph, 'node-1')
```

**`findGroupAtPosition(graph, position)`** - Find which group (if any) contains a point

```typescript
const group = findGroupAtPosition(graph, { x: 150, y: 200 })
```

**`calculateGroupBounds(graph, nodeIds, padding?)`** - Calculate bounding box for nodes

```typescript
const bounds = calculateGroupBounds(graph, ['node-1', 'node-2'], 20)
// Returns: { x, y, w, h }
```

**`updateGroupBounds(graph, groupId, padding?)`** - Update a group's bounds based on its nodes

```typescript
const updated = updateGroupBounds(graph, 'group-1', 20)
```

**`arrangeNodesInGroup(graph, groupId, padding?, spacing?)`** - Arrange nodes vertically in a group

```typescript
const updated = arrangeNodesInGroup(graph, 'group-1', 20, 40)
```

**`reorderNodeInGroup(graph, nodeId, newIndex)`** - Change a node's position in the group's node array

```typescript
const updated = reorderNodeInGroup(graph, 'node-1', 2)
```

**`updateGroupPosition(graph, groupId, newPosition)`** - Move a group and all its nodes

```typescript
const updated = updateGroupPosition(graph, 'group-1', { x: 200, y: 300 })
```

## Configuration Panel

The canvas includes an integrated right-side panel that automatically appears when a node or group is selected. You can customize the panel content using the `panel` slot:

```vue
<WorkflowCanvas v-model="graph" v-model:selectedId="selectedId">
  <template #panel="{ selectedNode, selectedGroup, close }">
    <div class="my-config-panel">
      <button @click="close">Close</button>
      <div v-if="selectedNode">
        <h3>Configure: {{ selectedNode.kind }}</h3>
        <!-- Your configuration form -->
      </div>
      <div v-if="selectedGroup">
        <h3>Group: {{ selectedGroup.title }}</h3>
        <!-- Group configuration -->
      </div>
    </div>
  </template>
</WorkflowCanvas>
```

If no `panel` slot is provided, a default panel (`WorkflowConfigPanel`) shows:

- Node/group information
- Delete button for nodes
- Delete button for groups
- Close button

## Interaction Guide

### Node Operations

- **Select**: Click on a node to select it and open the configuration panel
- **Drag**: Click and drag a node to move it
- **Connect**: Drag from the output handle (bottom) to another node's input handle (top)
- **Disconnect**: Drag from an input handle to disconnect and optionally reconnect elsewhere
- **Delete**: Select a node and click the delete button in the configuration panel

### Group Operations

- **Select**: Click on a group's background or title to select it
- **Drag Group**: Click and drag a group's title or background to move it (all nodes move with it)
- **Add to Group**: Drag a node's center over a group to add it to that group
- **Remove from Group**: Drag a node out of a group
- **Reorder in Group**: Drag a node over another node within the same group to reorder
- **Delete**: Select a group and click the delete button in the configuration panel

### Canvas Operations

- **Deselect**: Click on the canvas background to deselect all
- **Add Step**: Click the "+" button on an edge to add a new step between nodes

## Styling

Import the CSS in your app:

```typescript
import 'oceanfront-workflow-canvas/css'
```

The library uses CSS variables from Oceanfront for theming:

- `--of-surface` - Background colors for canvas and panels
- `--of-surface-2` - Secondary background for groups
- `--of-border` - Border colors for nodes and groups
- `--of-primary` - Accent color for selected states and handles
- `--of-text-primary` - Primary text color
- `--of-text-secondary` - Secondary text color (descriptions, labels)

**Important**: Set `overflow: hidden` on the canvas wrapper to ensure the panel slides in correctly:

```vue
<WorkflowCanvas style="height: 600px; overflow: hidden;" ... />
```

### Custom Styling

You can override the default styles by targeting the component classes:

```css
/* Custom node styling */
.workflow-canvas-node {
  border-radius: 12px;
}

.workflow-canvas-node--selected {
  box-shadow: 0 0 0 3px var(--of-primary);
}

/* Custom group styling */
.workflow-canvas-group {
  border: 2px dashed var(--of-border);
}

/* Custom connector styling */
.workflow-canvas-connector {
  stroke: var(--of-primary);
  stroke-width: 2;
}
```

## Advanced Usage

### Handling Events

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { WorkflowCanvas, addEdge, type WorkflowGraph } from 'oceanfront-workflow-canvas'

const graph = ref<WorkflowGraph>({ nodes: [], edges: [], groups: [] })
const selectedId = ref<string | null>(null)

function handleConnect(event: { fromNodeId: string; toNodeId: string }) {
  // Add edge with automatic single-connection enforcement
  graph.value = addEdge(graph.value, {
    id: `edge-${Date.now()}`,
    from: { nodeId: event.fromNodeId },
    to: { nodeId: event.toNodeId }
  })
}

function handleAddStep(event: { afterNodeId?: string; inGroupId?: string }) {
  // Create new node
  const newNode = {
    id: `node-${Date.now()}`,
    kind: 'action',
    position: { x: 100, y: 100 },
    data: { title: 'New Step' }
  }

  graph.value = {
    ...graph.value,
    nodes: [...graph.value.nodes, newNode]
  }

  // If afterNodeId is provided, connect the nodes
  if (event.afterNodeId) {
    graph.value = addEdge(graph.value, {
      id: `edge-${Date.now()}`,
      from: { nodeId: event.afterNodeId },
      to: { nodeId: newNode.id }
    })
  }
}
</script>
```

### Custom Node Rendering

```vue
<template>
  <WorkflowCanvas v-model="graph">
    <template #node="{ node, selected }">
      <div class="custom-node" :class="{ 'custom-node--selected': selected }">
        <div class="custom-node__icon">
          <component :is="getIconForKind(node.kind)" />
        </div>
        <div class="custom-node__content">
          <h4>{{ node.data.title }}</h4>
          <p>{{ node.data.description }}</p>
        </div>
      </div>
    </template>
  </WorkflowCanvas>
</template>
```

### Programmatic Graph Manipulation

```typescript
import {
  updateNodePosition,
  addEdge,
  addNodeToGroup,
  arrangeNodesInGroup,
  updateGroupPosition
} from 'oceanfront-workflow-canvas'

// Move a node
let graph = updateNodePosition(graph, 'node-1', { x: 200, y: 300 })

// Connect nodes
graph = addEdge(graph, {
  id: 'edge-1',
  from: { nodeId: 'node-1' },
  to: { nodeId: 'node-2' }
})

// Add node to group and arrange
graph = addNodeToGroup(graph, 'node-1', 'group-1')
graph = arrangeNodesInGroup(graph, 'group-1')

// Move entire group
graph = updateGroupPosition(graph, 'group-1', { x: 500, y: 200 })
```

## Testing

The library includes comprehensive tests covering:

- Component rendering and interaction
- Node and edge operations
- Group operations and layout
- Single connection per port enforcement
- Immutable graph updates

Run tests:

```bash
yarn test
```

## License

MIT

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
  - Move entire groups with all contained nodes
  - Configure selected nodes/groups in a slide-out panel
  - Delete nodes and groups via configuration panel
- **Single Connection Per Port**: Each node has one input and one output - connecting a new edge automatically removes the previous one
- **Group Connection Restrictions**: Nodes and groups in different groups cannot be connected to each other
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

Core events:
- `update:modelValue` - Emitted when graph changes (node drag, group operations, edge disconnection)
- `update:selectedId` - Emitted when selection changes (node click, group click, canvas click)
- `add-step` - Emitted when + button clicked: `{ afterNodeId?: string, inGroupId?: string }`
- `connect` - Emitted when nodes connected: `{ fromNodeId: string, toNodeId: string }`

Node events:
- `node-drag-start` - Emitted when node drag begins: `(nodeId: string)`
- `node-drag-end` - Emitted when node drag ends: `(nodeId: string, position: Position)`
- `node-click` - Emitted when node is clicked: `(nodeId: string)`
- `node-delete` - Emitted when node is deleted: `(nodeId: string)`
- `node-update` - Emitted when node is updated: `(node: WorkflowNode)`

Group events:
- `group-drag-start` - Emitted when group drag begins: `(groupId: string)`
- `group-drag-end` - Emitted when group drag ends: `(groupId: string, position: Position)`
- `group-click` - Emitted when group is clicked: `(groupId: string)`
- `group-delete` - Emitted when group is deleted: `(groupId: string)`
- `group-update` - Emitted when group is updated: `(group: WorkflowGroup)`
- `group-resize-start` - Emitted when group resize begins: `(groupId: string)`
- `group-resize-end` - Emitted when group resize ends: `(groupId: string, size: { w: number; h: number })`

Other events:
- `edge-delete` - Emitted when edge is deleted: `(edgeId: string)`
- `canvas-click` - Emitted when canvas background is clicked
- `entity-moved-to-group` - Emitted when entity is moved to/from a group: `(entityId: string, groupId: string | null)`

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

interface NodeData {
  icon?: string
  title?: string
  description?: string
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
  getEntityEdges,

  // Edge operations
  addEdge,
  removeEdge,

  // Group operations
  findGroup,
  addEntityToGroup,
  removeEntityFromGroup,
  removeEntityFromAllGroups,
  getParentGroup,
  findGroupAtPosition,
  calculateGroupBounds,
  updateGroupBounds,
  updateGroupPosition,
  getGroupDepth,

  // Validation functions
  areEntitiesInDifferentGroups,

  // Helper functions for adding nodes/groups
  handleAddStepToGraph,
  handleConnectNodes,
  addNode,
  addGroup,

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

**`getEntityEdges(graph, nodeId)`** - Get all edges connected to a node

```typescript
const edges = getEntityEdges(graph, 'node-1')
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

**`addEntityToGroup(graph, nodeId, groupId)`** - Add a node to a group

```typescript
const updated = addEntityToGroup(graph, 'node-1', 'group-1')
```

**`removeEntityFromGroup(graph, nodeId, groupId)`** - Remove a node from a specific group

```typescript
const updated = removeEntityFromGroup(graph, 'node-1', 'group-1')
```

**`removeEntityFromAllGroups(graph, nodeId)`** - Remove a node from all groups

```typescript
const updated = removeEntityFromAllGroups(graph, 'node-1')
```

**`getParentGroup(graph, nodeId)`** - Get the group containing a node

```typescript
const group = getParentGroup(graph, 'node-1')
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

**`updateGroupPosition(graph, groupId, newPosition)`** - Move a group and all its nodes

```typescript
const updated = updateGroupPosition(graph, 'group-1', { x: 200, y: 300 })
```

**`getGroupDepth(graph, groupId)`** - Get nesting depth of a group (0 = top-level)

```typescript
const depth = getGroupDepth(graph, 'group-1')
```

### Validation Functions

**`areEntitiesInDifferentGroups(graph, entityId1, entityId2)`** - Check if two entities belong to different groups

Returns `true` if the entities are in different groups, `false` if they're in the same group or both ungrouped. Useful for validating connections before creating edges.

```typescript
// Check if two nodes can be connected
const canConnect = !areEntitiesInDifferentGroups(graph, 'node-1', 'node-2')

if (canConnect) {
  graph = addEdge(graph, {
    id: 'edge-1',
    from: { entityId: 'node-1' },
    to: { entityId: 'node-2' }
  })
}
```

Note: The `WorkflowCanvas` component automatically enforces this validation when connecting nodes interactively.

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
  - Note: Connections between nodes in different groups are not allowed
- **Disconnect**: Drag from an input handle to disconnect and optionally reconnect elsewhere
- **Delete**: Select a node and click the delete button in the configuration panel

### Group Operations

- **Select**: Click on a group's background or title to select it
- **Drag Group**: Click and drag a group's title or background to move it (all nodes move with it)
- **Add to Group**: Drag a node's center over a group to add it to that group
- **Remove from Group**: Drag a node out of a group
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

#### Basic Events

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

#### Handling All Events

The canvas emits detailed events for tracking user interactions:

```vue
<template>
  <WorkflowCanvas
    v-model="graph"
    v-model:selected-id="selectedId"
    @node-drag-start="onNodeDragStart"
    @node-drag-end="onNodeDragEnd"
    @node-click="onNodeClick"
    @node-delete="onNodeDelete"
    @node-update="onNodeUpdate"
    @group-drag-start="onGroupDragStart"
    @group-drag-end="onGroupDragEnd"
    @group-click="onGroupClick"
    @group-delete="onGroupDelete"
    @group-update="onGroupUpdate"
    @group-resize-start="onGroupResizeStart"
    @group-resize-end="onGroupResizeEnd"
    @edge-delete="onEdgeDelete"
    @canvas-click="onCanvasClick"
    @entity-moved-to-group="onEntityMovedToGroup"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { WorkflowGraph, WorkflowNode, WorkflowGroup, Position } from 'oceanfront-workflow-canvas'

const graph = ref<WorkflowGraph>({ nodes: [], edges: [], groups: [] })
const selectedId = ref<string | null>(null)

// Node events
function onNodeDragStart(nodeId: string) {
  console.log('Node drag started:', nodeId)
  // Track drag state, show indicators, etc.
}

function onNodeDragEnd(nodeId: string, position: Position) {
  console.log('Node drag ended:', nodeId, position)
  // Save position to backend, log analytics, etc.
}

function onNodeClick(nodeId: string) {
  console.log('Node clicked:', nodeId)
  // Additional click handling beyond selection
}

function onNodeDelete(nodeId: string) {
  console.log('Node deleted:', nodeId)
  // Sync with backend, show notification, etc.
}

function onNodeUpdate(node: WorkflowNode) {
  console.log('Node updated:', node)
  // Sync changes to backend
}

// Group events
function onGroupDragStart(groupId: string) {
  console.log('Group drag started:', groupId)
}

function onGroupDragEnd(groupId: string, position: Position) {
  console.log('Group drag ended:', groupId, position)
}

function onGroupClick(groupId: string) {
  console.log('Group clicked:', groupId)
}

function onGroupDelete(groupId: string) {
  console.log('Group deleted:', groupId)
}

function onGroupUpdate(group: WorkflowGroup) {
  console.log('Group updated:', group)
}

function onGroupResizeStart(groupId: string) {
  console.log('Group resize started:', groupId)
}

function onGroupResizeEnd(groupId: string, size: { w: number; h: number }) {
  console.log('Group resized:', groupId, size)
}

// Other events
function onEdgeDelete(edgeId: string) {
  console.log('Edge deleted:', edgeId)
  // Sync with backend
}

function onCanvasClick() {
  console.log('Canvas clicked')
  // Clear selections, close panels, etc.
}

function onEntityMovedToGroup(entityId: string, groupId: string | null) {
  console.log('Entity moved to group:', entityId, groupId)
  // groupId is null if entity was removed from all groups
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
  addEntityToGroup,
  updateGroupPosition,
  updateGroupBounds
} from 'oceanfront-workflow-canvas'

// Move a node
let graph = updateNodePosition(graph, 'node-1', { x: 200, y: 300 })

// Connect nodes
graph = addEdge(graph, {
  id: 'edge-1',
  from: { entityId: 'node-1' },
  to: { entityId: 'node-2' }
})

// Add node to group (bounds auto-update)
graph = addEntityToGroup(graph, 'node-1', 'group-1')

// Manually update group bounds if needed
graph = updateGroupBounds(graph, 'group-1')

// Move entire group
graph = updateGroupPosition(graph, 'group-1', { x: 500, y: 200 })
```

## Architecture

The library is built with:

- **Vue 3 Composition API**: Modern reactive component design
- **Composables**: Modular logic for dragging, connections, resizing, and canvas management
- **Immutable Updates**: All helper functions return new graph objects
- **TypeScript**: Full type safety and excellent IDE support
- **CSS Variables**: Theme-friendly styling with automatic dark mode support

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

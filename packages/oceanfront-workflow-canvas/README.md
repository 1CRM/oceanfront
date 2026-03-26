# Oceanfront Workflow Canvas

A Vue 3 + TypeScript library for building graphical workflow builders with HTML nodes and SVG connectors.

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
    :record="record"
    mode="edit"
    @add-step="handleAddStep"
    @node-add="handleNodeAdd"
    @edge-add="handleEdgeAdd"
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
import { WorkflowCanvas, type WorkflowGraph, type EdgeAddPayload } from 'oceanfront-workflow-canvas'
import { makeRecord } from 'oceanfront'
import 'oceanfront-workflow-canvas/css'

const workflowGraph = ref<WorkflowGraph>({
  nodes: [
    {
      id: 'node-1',
      kind: 'trigger',
      position: { x: 100, y: 100 }
    }
  ],
  edges: [],
  groups: []
})

const record = makeRecord({
  'node-1-title': 'Start',
  'node-1-description': 'Workflow trigger'
})

const selectedId = ref<string | null>(null)

function handleAddStep(event) {
  // Add new node to graph
}

function handleNodeAdd(node, parentGroup, connectedEntities) {
  // Node was added to the graph
}

function handleEdgeAdd(payload: EdgeAddPayload) {
  // Edge was added to the graph
}
</script>
```

**Note:** The `workflowGraph` variable supports direct manipulation. You can modify nodes, edges, and groups directly, and the canvas will update automatically:

```typescript
// Example: Move a node programmatically
const node = workflowGraph.value.nodes[0]
node.position.x += 50
node.position.y += 50
// Canvas updates automatically!

// Example: Add titles to groups (shown on left and right sides of group border)
const group = workflowGraph.value.groups[0]
if (group) {
  group.label = 'Planning Phase' // Shown on left side
  group.labelRight = 'Week 1' // Shown on right side
}
```

See [Programmatic Graph Manipulation](#programmatic-graph-manipulation) for more examples.

## Working with FormRecord

The WorkflowCanvas uses a `FormRecord` from the Oceanfront library to manage all node and group data. This provides a centralized, reactive data store with built-in validation support. The record uses a flat structure where each field is stored with a key formatted as `{entityId}-{fieldName}`.

### Setting Up FormRecord

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { makeRecord } from 'oceanfront'
import { WorkflowCanvas } from 'oceanfront-workflow-canvas'

// Create the workflow graph structure
const workflowGraph = ref({
  nodes: [
    { id: 'node-1', kind: 'action', position: { x: 100, y: 100 } },
    { id: 'node-2', kind: 'action', position: { x: 100, y: 250 } }
  ],
  edges: [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }],
  groups: []
})

// Create a FormRecord with flat keys: {entityId}-{fieldName}
const record = makeRecord({
  'node-1-title': 'Send Email',
  'node-1-description': 'Send notification email to user',
  'node-1-emailAddress': 'user@example.com',
  'node-2-title': 'Update Database',
  'node-2-description': 'Mark notification as sent',
  'node-2-status': 'pending'
})
</script>

<template>
  <WorkflowCanvas v-model="workflowGraph" :record="record" mode="edit" />
</template>
```

### Accessing Node/Group Data

Data for each node or group is accessed using flat keys with the format `{entityId}-{fieldName}`:

```typescript
// Read data
const nodeTitle = record.value['node-1-title']
console.log(nodeTitle) // "Send Email"

// Update data
record.value['node-1-title'] = 'Send Welcome Email'
record.value['node-1-emailAddress'] = 'newuser@example.com'

// Add data for a new node
record.value['node-3-title'] = 'New Action'
record.value['node-3-description'] = 'Description here'
```

### Migration from node.data

**Before (deprecated):**

```typescript
// Old approach - data stored on each node
const workflowGraph = ref({
  nodes: [
    {
      id: 'node-1',
      kind: 'action',
      position: { x: 100, y: 100 },
      data: { title: 'Send Email', emailAddress: 'user@example.com' }
    }
  ],
  edges: [],
  groups: []
})

// Access data
const title = workflowGraph.value.nodes[0].data.title

// Update data
workflowGraph.value.nodes[0].data = {
  ...workflowGraph.value.nodes[0].data,
  title: 'New Title'
}
```

**After (current):**

```typescript
// New approach - flat keys in FormRecord
const workflowGraph = ref({
  nodes: [
    {
      id: 'node-1',
      kind: 'action',
      position: { x: 100, y: 100 }
      // No data property
    }
  ],
  edges: [],
  groups: []
})

const record = makeRecord({
  'node-1-title': 'Send Email',
  'node-1-emailAddress': 'user@example.com'
})

// Access data
const title = record.value['node-1-title']

// Update data
record.value['node-1-title'] = 'New Title'
```

### Benefits of FormRecord

- **Centralized Data Management**: All entity data in one place
- **Reactive Updates**: Changes automatically trigger UI updates
- **Validation Support**: Built-in field validation capabilities
- **Type Safety**: Full TypeScript support with typed record values
- **Separation of Concerns**: Graph structure separate from business data
- **Flat Structure**: Simple key-value pairs, no nested objects

## Canvas Modes

The WorkflowCanvas supports two modes via the `mode` prop:

### View Mode (Default)

View mode provides a read-only display of the workflow with no interactive elements:

```vue
<template>
  <WorkflowCanvas v-model="workflowGraph" mode="view" style="height: 600px; overflow: hidden;" />
</template>
```

**View Mode Features:**

- No grid background (solid surface color)
- No connection handles visible
- No hover menus (+ node, + group buttons)
- No resize handles on groups
- No drag and drop functionality
- No configuration panel
- All mouse interactions disabled
- Perfect for displaying workflows in reports or dashboards

### Edit Mode

Edit mode provides full interactive editing capabilities:

```vue
<template>
  <WorkflowCanvas
    v-model="workflowGraph"
    v-model:selectedId="selectedId"
    mode="edit"
    @add-step="handleAddStep"
    @node-update="handleNodeUpdate"
    style="height: 600px; overflow: hidden;"
  />
</template>
```

**Edit Mode Features:**

- Grid background for alignment
- Connection handles for creating edges
- Hover menus for adding nodes and groups
- Resize handles on groups
- Full drag and drop support
- Configuration panel for editing properties
- All interactive features enabled

### Dynamic Mode Switching

You can dynamically switch between modes:

```vue
<template>
  <div>
    <button @click="canvasMode = canvasMode === 'view' ? 'edit' : 'view'">
      Toggle Mode (Current: {{ canvasMode }})
    </button>

    <WorkflowCanvas
      v-model="workflowGraph"
      :mode="canvasMode"
      style="height: 600px; overflow: hidden;"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  WorkflowCanvas,
  type WorkflowGraph,
  type WorkflowCanvasMode
} from 'oceanfront-workflow-canvas'

const canvasMode = ref<WorkflowCanvasMode>('view')
const workflowGraph = ref<WorkflowGraph>({ nodes: [], edges: [], groups: [] })
</script>
```

## Practical Examples

### Example 1: Simple Linear Workflow

Create a basic workflow with sequential steps:

```typescript
import { ref } from 'vue'
import { makeRecord } from 'oceanfront'
import type { WorkflowGraph } from 'oceanfront-workflow-canvas'

const workflowGraph = ref<WorkflowGraph>({
  nodes: [
    {
      id: 'start',
      kind: 'trigger',
      position: { x: 100, y: 100 }
    },
    {
      id: 'validate',
      kind: 'action',
      position: { x: 100, y: 250 }
    },
    {
      id: 'save',
      kind: 'action',
      position: { x: 100, y: 400 }
    }
  ],
  edges: [
    { id: 'edge-1', from: { entityId: 'start' }, to: { entityId: 'validate' } },
    { id: 'edge-2', from: { entityId: 'validate' }, to: { entityId: 'save' } }
  ],
  groups: []
})

const record = makeRecord({
  'start-title': 'Start Workflow',
  'start-description': 'Triggered on form submission',
  'validate-title': 'Validate Data',
  'validate-description': 'Check required fields',
  'save-title': 'Save to Database',
  'save-description': 'Store validated data'
})
```

### Example 2: Workflow with Groups

Organize related steps into groups:

```typescript
const workflowGraph = ref<WorkflowGraph>({
  nodes: [
    {
      id: 'validate',
      kind: 'action',
      position: { x: 120, y: 120 }
    },
    {
      id: 'sanitize',
      kind: 'action',
      position: { x: 120, y: 240 }
    }
  ],
  edges: [{ id: 'edge-1', from: { entityId: 'validate' }, to: { entityId: 'sanitize' } }],
  groups: [
    {
      id: 'processing',
      kind: 'group',
      label: 'Data Processing',
      labelRight: 'Phase 1',
      position: { x: 100, y: 100 },
      size: { w: 290, h: 260 },
      containedIds: ['validate', 'sanitize']
    }
  ]
})

const record = makeRecord({
  'validate-title': 'Validate Input',
  'sanitize-title': 'Sanitize Data'
})
```

### Example 3: Programmatic Node Creation

Add nodes dynamically based on user actions:

```typescript
function addValidationStep() {
  const newNode = {
    id: `node-${Date.now()}`,
    kind: 'action',
    position: { x: 100, y: 300 }
  }

  // Add node data using flat keys
  record.value[`${newNode.id}-title`] = 'New Validation'
  record.value[`${newNode.id}-description`] = 'Custom validation rule'

  workflowGraph.value.nodes.push(newNode)

  // Connect to previous node if exists
  const lastNode = workflowGraph.value.nodes[workflowGraph.value.nodes.length - 2]
  if (lastNode) {
    workflowGraph.value.edges.push({
      id: `edge-${Date.now()}`,
      from: { entityId: lastNode.id },
      to: { entityId: newNode.id }
    })
  }
}
```

### Example 4: Custom Node Types with Fields

Define custom node types with configuration fields:

```typescript
const nodeTypes: NodeTypeConfig = {
  emailAction: {
    type: 'emailAction',
    title: 'Send Email',
    icon: 'mail',
    tileTitle: 'Email',
    configPanelTitle: 'Email Configuration',
    fields: [
      {
        name: 'recipient',
        type: 'text',
        label: 'Recipient Email',
        required: true,
        showInTile: true,
        placeholder: 'user@example.com'
      },
      {
        name: 'subject',
        type: 'text',
        label: 'Subject',
        required: true,
        showInTile: true
      },
      {
        name: 'body',
        type: 'textarea',
        label: 'Email Body',
        placeholder: 'Enter email content...'
      },
      {
        name: 'sendImmediately',
        type: 'toggle',
        label: 'Send Immediately'
      }
    ]
  }
}
```

### Example 5: Read-Only Workflow Display

Display a workflow without editing capabilities:

```vue
<template>
  <div class="workflow-viewer">
    <h2>Approval Workflow</h2>
    <WorkflowCanvas v-model="workflowGraph" mode="view" :width="800" :height="600" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WorkflowCanvas } from 'oceanfront-workflow-canvas'

// Load workflow from API
const workflowGraph = ref(await fetchWorkflowFromAPI())
</script>
```

### Example 6: Nested Groups

Create hierarchical workflow structures:

```typescript
const workflowGraph = ref<WorkflowGraph>({
  nodes: [
    { id: 'step1', kind: 'action', position: { x: 140, y: 140 } },
    { id: 'step2', kind: 'action', position: { x: 140, y: 260 } }
  ],
  edges: [{ id: 'edge-1', from: { entityId: 'step1' }, to: { entityId: 'step2' } }],
  groups: [
    {
      id: 'parent',
      kind: 'group',
      label: 'Main Process',
      position: { x: 50, y: 50 },
      size: { w: 400, h: 500 },
      containedIds: ['child']
    },
    {
      id: 'child',
      kind: 'group',
      label: 'Sub-Process',
      position: { x: 120, y: 120 },
      size: { w: 290, h: 260 },
      containedIds: ['step1', 'step2']
    }
  ]
})

const record = makeRecord({
  'step1-title': 'Step 1',
  'step2-title': 'Step 2'
})
```

### Example 7: Handling Events

Respond to user interactions:

```vue
<template>
  <WorkflowCanvas
    v-model="workflowGraph"
    v-model:selected-id="selectedId"
    mode="edit"
    @node-add="handleNodeAdd"
    @node-update="handleNodeUpdate"
    @node-delete="handleNodeDelete"
    @edge-add="handleEdgeAdd"
    @group-add="handleGroupAdd"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type {
  WorkflowNode,
  WorkflowGroup,
  ConnectedEntities,
  EdgeAddPayload
} from 'oceanfront-workflow-canvas'

const workflowGraph = ref({ nodes: [], edges: [], groups: [] })
const selectedId = ref<string | null>(null)

function handleNodeAdd(node: WorkflowNode, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities) {
  console.log('Node added:', node.id, 'in group:', parentGroup?.id)
}

function handleNodeUpdate(node: WorkflowNode, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities) {
  console.log('Node updated:', node.id)
}

function handleNodeDelete(node: WorkflowNode, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities) {
  console.log('Node deleted:', node.id)
}

function handleEdgeAdd(payload: EdgeAddPayload) {
  console.log('Connection created:', payload.edge.from.entityId, '->', payload.edge.to.entityId)
}

function handleGroupAdd(group: WorkflowGroup, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities) {
  console.log('Group created:', group.id)
}
</script>
```

### Example 8: Custom Styling

Apply custom styles to specific node types:

```vue
<style>
/* Custom styling for email nodes */
.workflow-canvas-node--type-emailAction {
  border-color: #4caf50;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
}

.workflow-canvas-node--type-emailAction.workflow-canvas-node--selected {
  border-color: #2e7d32;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.3);
}

/* Custom styling for groups */
.workflow-canvas-group {
  border: 2px dashed #2196f3;
  background: rgba(33, 150, 243, 0.05);
}

.workflow-canvas-group--selected {
  border-color: #1976d2;
  background: rgba(33, 150, 243, 0.1);
}
</style>
```

## Components

### WorkflowCanvas

Main canvas component that renders the workflow graph.

**Props:**

- `modelValue: WorkflowGraph` - The workflow graph (v-model)
- `record: FormRecord` (required) - Form record containing all node and group data, keyed by entity ID
- `mode?: 'view' | 'edit'` - Canvas mode (default: `'view'`)
  - `'view'`: Read-only display mode with no grid background and all interactions disabled
  - `'edit'`: Full interactive editing mode with all features enabled
- `readonly?: boolean` - Disable editing interactions (default: `false`)
- `selectedId?: string | null` - Currently selected node/group ID (v-model:selectedId)
- `width?: number` - Initial canvas width in pixels (default: `1000`)
- `height?: number` - Initial canvas height in pixels (default: `1000`)
- `maxGroupDepth?: number | null` - Maximum nesting depth for groups. `null` means unlimited (default: `null`)
- `nodeTypes?: NodeTypeConfig` - Configuration for different node types with custom fields (default: `{}`)
- `groupTypes?: GroupTypeConfig` - Configuration for different group types with custom fields (default: `{}`)
- `hideEmptyHandles?: boolean` - Hide input/output handles when they have no connections (default: `false`)
- `edgesLocked?: boolean` - If true, all edges are locked and cannot be disconnected or deleted. Newly created edges will automatically have their `locked` property set to true (default: `false`)
- `labels?: Partial<WorkflowCanvasLabels>` - Custom labels for internationalization

**Events:**

Core events:

- `update:modelValue` - Emitted when graph changes (node drag, group operations, edge disconnection)
- `update:selectedId` - Emitted when selection changes (node click, group click, canvas click)
- `add-step` - Emitted when + button clicked: `(event: AddStepEvent)` where `AddStepEvent = { afterNodeId?: string, inGroupId?: string }`

Node events:

- `node-add` - Emitted when a node is added: `(node: WorkflowNode, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities)`
- `node-drag-start` - Emitted when node drag begins: `(nodeId: string)`
- `node-drag-end` - Emitted when node drag ends: `(nodeId: string, position: Position, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities)`
- `node-click` - Emitted when node is clicked: `(nodeId: string)`
- `node-delete` - Emitted when node is deleted: `(node: WorkflowNode, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities)`
- `node-update` - Emitted when node is updated: `(node: WorkflowNode, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities)`

Group events:

- `group-add` - Emitted when a group is added: `(group: WorkflowGroup, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities)`
- `group-drag-start` - Emitted when group drag begins: `(groupId: string)`
- `group-drag-end` - Emitted when group drag ends: `(groupId: string, position: Position, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities)`
- `group-click` - Emitted when group is clicked: `(groupId: string)`
- `group-delete` - Emitted when group is deleted: `(groupId: string)`
- `group-update` - Emitted when group is updated: `(group: WorkflowGroup, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities)`
- `group-resize-start` - Emitted when group resize begins: `(groupId: string)`
- `group-resize-end` - Emitted when group resize ends: `(groupId: string, size: { w: number; h: number })`

Edge events:

- `edge-add` - Emitted when an edge is added: `(payload: EdgeAddPayload)` where `EdgeAddPayload = { edge: WorkflowEdge, from: WorkflowNode | WorkflowGroup, to: WorkflowNode | WorkflowGroup }`
- `edge-delete` - Emitted when edge is deleted: `(edgeId: string)`

Other events:

- `canvas-click` - Emitted when canvas background is clicked
- `entity-moved-to-group` - Emitted when entity is moved to/from a group: `(entityId: string, groupId: string | null)`
- `fullscreen-toggle` - Emitted when full-width toggle button is clicked: `(isFullWidth: boolean)`

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

- `node: WorkflowNode` (required) - The node to render
- `record: FormRecord` (required) - Form record containing node data
- `selected?: boolean` - Whether the node is selected (default: `false`)
- `dragging?: boolean` - Whether the node is being dragged (default: `false`)
- `nodeTypes?: NodeTypeConfig` - Node type configuration for resolving icons, titles, and fields (default: `{}`)
- `labels?: WorkflowCanvasLabels` - Custom labels for internationalization
- `viewMode?: boolean` - If true, hides interactive elements like the menu button (default: `false`)

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
  kind: string // consumer-defined type (e.g., 'trigger', 'action', 'condition')
  label?: string
  labelRight?: string
  position: Position
  size?: Size
  definition?: NodeDefinitionOverride // overrides for NodeTypeDefinition
  locked?: boolean // if true, prevents deletion
  readonly?: boolean // if true, prevents editing (hides menu and config panel)
  lockParent?: boolean // if true, prevents moving outside parent group
  allowedParents?: string[] // if set, restricts which group kinds this node can be placed into
  hideAddNode?: boolean // if true, hides "+ node" button in hover menu
  hideAddGroup?: boolean // if true, hides "+ group" button in hover menu
}

interface WorkflowEdge {
  id: string
  from: Port
  to: Port
  locked?: boolean // if true, prevents disconnection/deletion
}

interface Port {
  entityId: string // Can refer to either a node or a group
}

interface EdgeAddPayload {
  edge: WorkflowEdge
  from: WorkflowNode | WorkflowGroup
  to: WorkflowNode | WorkflowGroup
}

interface WorkflowGroup {
  id: string
  kind: string // Type of group (e.g., 'group', 'swimlane', 'phase')
  label?: string
  labelRight?: string
  position: Position
  size: Size
  containedIds: string[] // Contains both node IDs and group IDs
  definition?: GroupDefinitionOverride // overrides for GroupTypeDefinition
  locked?: boolean // if true, prevents deletion
  readonly?: boolean // if true, prevents editing (hides config panel)
  lockParent?: boolean // if true, prevents moving outside parent group
  allowedParents?: string[] // if set, restricts which group kinds this group can be placed into
  maxDepth?: number | null // if set, overrides global maxGroupDepth for this group
  hideAddNode?: boolean // if true, hides "+ node" button in connection hover menu
  hideAddGroup?: boolean // if true, hides "+ group" button in connection hover menu
  hideNestedAddNode?: boolean // if true, hides "+ node" button in empty group "+" menu
  hideNestedAddGroup?: boolean // if true, hides "+ group" button in empty group "+" menu
  nested?: NestedGroupConfig // Per-instance override for nested group configuration
}

interface ConnectedEntities {
  incoming: (WorkflowNode | WorkflowGroup)[] // Entities with edges pointing to this entity
  outgoing: (WorkflowNode | WorkflowGroup)[] // Entities this entity has edges pointing to
}
```

## Node Type Configuration

The workflow canvas uses a type system to define different kinds of nodes and their associated fields. This allows you to create strongly-typed workflow builders with custom fields for each node type.

### Defining Node Types

Node types are defined via the `nodeTypes` prop on the `WorkflowCanvas` component:

```typescript
const nodeTypes: NodeTypeConfig = {
  trigger: {
    type: 'trigger',
    title: 'Trigger',
    configPanelTitle: 'Workflow Trigger Configuration',
    tileTitle: 'Trigger',
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
        name: 'event',
        type: 'select',
        label: 'Event Type',
        items: [
          { value: 'new_quote', text: 'New Quote' },
          { value: 'updated_quote', text: 'Updated Quote' }
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
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        showInTile: true
      },
      {
        name: 'enabled',
        type: 'toggle',
        label: 'Enabled'
      }
    ]
  }
}
```

### Node Type Properties

Each node type definition supports the following properties:

**Required Properties:**

- `type: string` - Type identifier (e.g., 'trigger', 'action', 'condition')
- `title: string` - Display name used as fallback for both panel and tile
- `fields: NodeFieldDefinition[]` - Array of field definitions for this node type

**Title Properties:**

- `configPanelTitle?: string` - Title shown in the configuration panel header when a node of this type is selected
- `tileTitle?: string` - Title shown in the tile display for nodes of this type
- **Fallback behavior:** If `configPanelTitle` is missing, it falls back to `tileTitle`, then to `title`. If `tileTitle` is missing, it falls back to `configPanelTitle`, then to `title`.

**Optional Properties:**

- `icon?: string` - Default icon for this node type
- `placeholder?: string` - Placeholder text to display in tile when node is not configured
- `cssClass?: string` - Custom CSS class (defaults to `workflow-canvas-node--type-${type}`)
- `lockParent?: boolean` - If true, nodes of this type are locked to parent by default
- `allowedParents?: string[]` - If set, restricts which group kinds nodes of this type can be placed into
- `hideAddNode?: boolean` - If true, hides the "+ node" button in the hover menu
- `hideAddGroup?: boolean` - If true, hides the "+ group" button in the hover menu
- `addNodeButtonText?: string` - Custom text for the "+ node" button in the hover menu (defaults to "+ node")
- `addGroupButtonText?: string` - Custom text for the "+ group" button in the hover menu (defaults to "+ group")

### Customizing Hover Menu Button Text

You can customize the text displayed on the hover menu buttons that appear when hovering over nodes. This is useful for providing context-specific labels that match your workflow terminology:

```typescript
const nodeTypes: NodeTypeConfig = {
  trigger: {
    type: 'trigger',
    label: 'Trigger',
    addNodeButtonText: '+ action',
    addGroupButtonText: '+ phase',
    fields: [...]
  },
  action: {
    type: 'action',
    label: 'Action',
    addNodeButtonText: '+ next step',
    addGroupButtonText: '+ container',
    fields: [...]
  }
}
```

When these properties are not specified, the buttons default to displaying "+ node" and "+ group".

### Separate Labels for Panel and Tile

The workflow canvas supports separate titles for the configuration panel header and tile display. This is useful when you want a more verbose title in the config panel but a shorter title in the tile:

```typescript
{
  type: 'email',
  title: 'Email',
  configPanelTitle: 'Email Notification Configuration',
  tileTitle: 'Email',
  icon: 'envelope',
  fields: [...]
}
```

**Using the same title for both:**

```typescript
{
  type: 'action',
  title: 'Action',
  // Both configPanelTitle and tileTitle will fall back to 'Action'
  icon: 'gear',
  fields: [...]
}
```

**Different titles for panel and tile:**

```typescript
{
  type: 'condition',
  title: 'Condition',
  configPanelTitle: 'Conditional Branch Configuration',
  tileTitle: 'If/Then',
  icon: 'help circle',
  fields: [...]
}
```

### Per-Node Title Overrides

Individual nodes can override their type's titles using `node.definition`:

```typescript
const node = workflowGraph.value.nodes.find(n => n.id === 'node-123')
if (node) {
  node.definition = {
    configPanelTitle: 'Critical Email Step',
    tileTitle: 'Alert'
  }
}
```

### Node Type Lock to Parent

You can configure nodes of a specific type to be locked to their parent by default using the `lockParent` property in `NodeTypeDefinition`. This prevents nodes from being moved outside their parent group, while still allowing movement within the parent or to nested groups inside the parent.

#### Type-Level Configuration

Set a default `lockParent` value for all nodes of a specific type:

```typescript
const nodeTypes: NodeTypeConfig = {
  trigger: {
    type: 'trigger',
    label: 'Trigger',
    fields: [],
    lockParent: true // All trigger nodes are locked to parent by default
  },
  action: {
    type: 'action',
    label: 'Action',
    fields: [],
    lockParent: false // Action nodes can be moved freely (default behavior)
  }
}
```

#### Instance-Level Override

Individual nodes can override the type-level default by setting `lockParent` directly on the node instance:

```typescript
const node: WorkflowNode = {
  id: 'node-1',
  kind: 'trigger',
  position: { x: 100, y: 100 },
  lockParent: false // Override type-level setting for this instance
}
```

#### Behavior

When `lockParent` is `true`:

- The node cannot be moved to the root level (outside all groups)
- The node cannot be moved to sibling groups
- The node can still be moved within its parent group
- The node can be moved to nested groups inside the parent

#### Programmatic Example

```typescript
// Lock a specific node to its parent
const node = workflowGraph.value.nodes.find(n => n.id === 'node-456')
if (node) {
  node.lockParent = true
  // Node can now only be moved within its parent or to nested groups inside the parent
}
```

#### Priority Resolution

The `lockParent` value is resolved in this order:

1. **Instance value**: `node.lockParent` (if explicitly set)
2. **Type default**: `nodeTypes[kind].lockParent` (applied when node is created)
3. **Global default**: `undefined` (no locking)

### Node Type Allowed Parents

You can restrict which group kinds nodes of a specific type can be placed into using the `allowedParents` property in `NodeTypeDefinition`. When set, nodes can only be dropped into groups whose `kind` matches one of the allowed values.

#### Type-Level Configuration

Set a default `allowedParents` value for all nodes of a specific type:

```typescript
const nodeTypes: NodeTypeConfig = {
  trigger: {
    type: 'trigger',
    label: 'Trigger',
    fields: [],
    allowedParents: ['phase'] // Trigger nodes can only be placed inside 'phase' groups
  },
  action: {
    type: 'action',
    label: 'Action',
    fields: [],
    allowedParents: ['phase', 'swimlane'] // Action nodes can be placed in 'phase' or 'swimlane' groups
  }
}
```

#### Instance-Level Override

Individual nodes can override the type-level default by setting `allowedParents` directly on the node instance:

```typescript
const node: WorkflowNode = {
  id: 'node-1',
  kind: 'trigger',
  position: { x: 100, y: 100 },
  allowedParents: ['phase', 'group'] // Override type-level setting for this instance
}
```

#### Priority Resolution

The `allowedParents` value is resolved in this order:

1. **Instance value**: `node.allowedParents` (if explicitly set)
2. **Type default**: `nodeTypes[kind].allowedParents` (applied when node is created)
3. **Global default**: `undefined` (no restriction)

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

  // Ancestry and relationship helpers
  getGroupDescendants,
  isGroupDescendantOf,
  getConnectedEntities,
  isEntityTypeCompatibleWithGroup,

  // Layout helpers
  moveNodesBelow,

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
  edges: [{ id: 'e1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }],
  groups: []
}

// Connect node-1 to node-3 instead
const updated = addEdge(graph, {
  id: 'e2',
  from: { entityId: 'node-1' },
  to: { entityId: 'node-3' }
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

### Ancestry and Relationship Helpers

**`getGroupDescendants(graph, groupId)`** - Get all descendant entity IDs of a group (recursive)

```typescript
const descendants = getGroupDescendants(graph, 'parent-group')
// Returns: ['child-group', 'node-1', 'node-2', ...]
```

**`isGroupDescendantOf(graph, groupId, ancestorId)`** - Check if a group is a descendant of another group

```typescript
const isNested = isGroupDescendantOf(graph, 'child-group', 'parent-group')
```

**`getConnectedEntities(graph, entityId)`** - Get all entities connected to an entity via edges

```typescript
const connected = getConnectedEntities(graph, 'node-1')
// Returns: { incoming: [WorkflowNode | WorkflowGroup, ...], outgoing: [...] }
```

**`isEntityTypeCompatibleWithGroup(entityKind, group, groupTypes)`** - Check if an entity type can be placed in a group

```typescript
import type { GroupTypeConfig } from 'oceanfront-workflow-canvas'

const compatible = isEntityTypeCompatibleWithGroup('action', targetGroup, groupTypes)
```

### Layout Helpers

**`moveNodesBelow(graph, yThreshold, deltaY)`** - Move all nodes below a Y threshold by a delta amount

```typescript
const updated = moveNodesBelow(graph, 300, 150)
// All nodes with position.y >= 300 are moved down by 150px
```

### Graph Construction Helpers

**`addNode(graph, node)`** - Add a new node to the graph

```typescript
const updated = addNode(graph, {
  id: 'new-node',
  kind: 'action',
  position: { x: 100, y: 200 }
})
```

**`addGroup(graph, group)`** - Add a new group to the graph

```typescript
const updated = addGroup(graph, {
  id: 'new-group',
  kind: 'group',
  label: 'My Group',
  position: { x: 50, y: 50 },
  size: { w: 300, h: 200 },
  containedIds: []
})
```

**`handleConnectNodes(graph, fromEntityId, toEntityId)`** - Connect two entities with a new edge

```typescript
const updated = handleConnectNodes(graph, 'node-1', 'node-2')
```

### Display Helpers

The library also exports display helper functions for resolving display-related properties (labels, CSS classes, button texts) for nodes and groups, considering definition overrides and fallbacks:

```typescript
import {
  getNodeCssClass,
  getNodeDisplayLabel,
  getNodeDisplayLabelRight,
  getGroupDisplayLabel,
  getGroupDisplayLabelRight,
  shouldHideGroupAddNode,
  shouldHideGroupAddGroup,
  shouldHideGroupNestedAddNode,
  shouldHideGroupNestedAddGroup,
  shouldHideNodeAddNode,
  shouldHideNodeAddGroup,
  getNodeAddNodeButtonText,
  getNodeAddGroupButtonText,
  getGroupAddNodeButtonText,
  getGroupAddGroupButtonText
} from 'oceanfront-workflow-canvas'
```

These functions take the entity, type config, and/or labels as parameters and resolve the correct display value following the priority chain: instance override > type definition > fallback default.

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
        <h3>Group: {{ selectedGroup.label }}</h3>
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
- **Lock to Parent**: Set `lockParent: true` on a node to prevent it from being moved outside its parent group. The node can still be moved within the parent or to nested groups inside the parent, but cannot be moved to the root level or to sibling groups.

### Group Operations

- **Select**: Click on a group's background or title to select it
- **Drag Group**: Click and drag a group's title or background to move it (all nodes move with it)
- **Add to Group**: Drag a node's center over a group to add it to that group
- **Remove from Group**: Drag a node out of a group
- **Delete**: Select a group and click the delete button in the configuration panel
- **Lock to Parent**: Set `lockParent: true` on a group to prevent it from being moved outside its parent group. The group can still be moved within the parent or to nested groups inside the parent, but cannot be moved to the root level or to sibling groups.
- **Hide Add Buttons**: Use `hideAddNode`, `hideAddGroup`, `hideNestedAddNode`, and `hideNestedAddGroup` properties on groups to control which add buttons are visible.

```typescript
const group = workflowGraph.value.groups.find(g => g.id === 'group-1')
if (group) {
  group.hideAddNode = true // Hides "+ node" button in connection hover menu
  group.hideAddGroup = true // Hides "+ group" button in connection hover menu
  group.hideNestedAddNode = true // Hides "+ node" button in empty group "+" menu
  group.hideNestedAddGroup = true // Hides "+ group" button in empty group "+" menu
}
```

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

function handleAddStep(event: { afterNodeId?: string; inGroupId?: string }) {
  // Create new node
  const newNode = {
    id: `node-${Date.now()}`,
    kind: 'action',
    position: { x: 100, y: 100 }
  }

  // Add node data using flat keys
  record.value[`${newNode.id}-title`] = 'New Step'

  graph.value = {
    ...graph.value,
    nodes: [...graph.value.nodes, newNode]
  }

  // If afterNodeId is provided, connect the nodes
  if (event.afterNodeId) {
    graph.value = addEdge(graph.value, {
      id: `edge-${Date.now()}`,
      from: { entityId: event.afterNodeId },
      to: { entityId: newNode.id }
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
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowGroup,
  ConnectedEntities,
  Position
} from 'oceanfront-workflow-canvas'

const graph = ref<WorkflowGraph>({ nodes: [], edges: [], groups: [] })
const selectedId = ref<string | null>(null)

// Node events
function onNodeDragStart(nodeId: string) {
  console.log('Node drag started:', nodeId)
}

function onNodeDragEnd(nodeId: string, position: Position, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities) {
  console.log('Node drag ended:', nodeId, position, 'in group:', parentGroup?.id)
}

function onNodeClick(nodeId: string) {
  console.log('Node clicked:', nodeId)
}

function onNodeDelete(node: WorkflowNode, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities) {
  console.log('Node deleted:', node.id)
}

function onNodeUpdate(node: WorkflowNode, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities) {
  console.log('Node updated:', node)
}

// Group events
function onGroupDragStart(groupId: string) {
  console.log('Group drag started:', groupId)
}

function onGroupDragEnd(groupId: string, position: Position, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities) {
  console.log('Group drag ended:', groupId, position)
}

function onGroupClick(groupId: string) {
  console.log('Group clicked:', groupId)
}

function onGroupDelete(groupId: string) {
  console.log('Group deleted:', groupId)
}

function onGroupUpdate(group: WorkflowGroup, parentGroup: WorkflowGroup | null, connectedEntities: ConnectedEntities) {
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
}

function onCanvasClick() {
  console.log('Canvas clicked')
}

function onEntityMovedToGroup(entityId: string, groupId: string | null) {
  console.log('Entity moved to group:', entityId, groupId)
}
</script>
```

### Hide Empty Handles

You can hide input and output handles when they have no connections by setting the `hideEmptyHandles` prop to `true`. This is useful for creating cleaner workflows where handles only appear when needed.

```vue
<template>
  <WorkflowCanvas v-model="graph" :hide-empty-handles="hideEmptyHandles" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WorkflowCanvas, type WorkflowGraph } from 'oceanfront-workflow-canvas'

const graph = ref<WorkflowGraph>({
  nodes: [
    { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
    { id: 'node-2', kind: 'action', position: { x: 100, y: 250 } }
  ],
  edges: [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }],
  groups: []
})

const hideEmptyHandles = ref(true)
// node-1 will show output handle (connected)
// node-1 will hide input handle (no connection)
// node-2 will show input handle (connected)
// node-2 will hide output handle (no connection)
</script>
```

**Behavior:**

- When `hideEmptyHandles` is `false` (default): All handles are visible
- When `hideEmptyHandles` is `true`:
  - Input handles are hidden if the entity has no incoming connections
  - Output handles are hidden if the entity has no outgoing connections
  - Handles appear/disappear automatically as connections are added/removed

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
          <h4>{{ record.value[`${node.id}-title`] }}</h4>
          <p>{{ record.value[`${node.id}-description`] }}</p>
        </div>
      </div>
    </template>
  </WorkflowCanvas>
</template>
```

### Programmatic Graph Manipulation

The `WorkflowCanvas` component supports two approaches for programmatic updates:

1. **Direct Data Manipulation** (Recommended for simple updates)
2. **Helper Functions** (Recommended for complex operations)

#### Direct Data Manipulation

The `modelValue` prop supports two-way binding via `v-model`, which means you can directly modify the graph object and the canvas will automatically update. This is the simplest approach for straightforward updates:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { WorkflowCanvas, type WorkflowGraph } from 'oceanfront-workflow-canvas'

const workflowGraph = ref<WorkflowGraph>({
  nodes: [...],
  edges: [...],
  groups: [...]
})

// Direct modification - canvas updates automatically
function moveNodeProgrammatically() {
  const node = workflowGraph.value.nodes.find(n => n.id === 'node-1')
  if (node) {
    node.position.x += 100
    node.position.y += 50
  }
}

// Update node data
function updateNodeData() {
  const node = workflowGraph.value.nodes.find(n => n.id === 'node-1')
  if (node) {
    record.value[`${node.id}-title`] = 'Updated Title'
    record.value[`${node.id}-lastModified`] = new Date().toISOString()
  }
}

// Batch update positions
function moveAllNodes() {
  workflowGraph.value.nodes.forEach(node => {
    node.position.x += 20
    node.position.y += 10
  })
}

// Add node directly
function addNewNode() {
  const newNode = {
    id: `node-${Date.now()}`,
    kind: 'action',
    position: { x: 100, y: 100 }
  }
  workflowGraph.value.nodes.push(newNode)
  // Add data using flat keys
  record.value[`${newNode.id}-title`] = 'New Node'
}

// Resize group
function resizeGroup() {
  const group = workflowGraph.value.groups.find(g => g.id === 'group-1')
  if (group) {
    group.size.w += 50
    group.size.h += 30
  }
}

// Update group data
function updateGroupData() {
  const group = workflowGraph.value.groups.find(g => g.id === 'group-1')
  if (group) {
    record.value[`${group.id}-priority`] = 'high'
    record.value[`${group.id}-lastModified`] = new Date().toISOString()
  }
}

// Lock group to parent (prevent moving outside parent)
function lockGroupToParent() {
  const group = workflowGraph.value.groups.find(g => g.id === 'nested-group-1')
  if (group) {
    group.lockParent = true
    // Group can now only be moved within its parent or to nested groups inside the parent
  }
}
</script>

<template>
  <div>
    <button @click="moveNodeProgrammatically">Move Node</button>
    <button @click="updateNodeData">Update Data</button>
    <button @click="moveAllNodes">Move All Nodes</button>

    <WorkflowCanvas v-model="workflowGraph" />
  </div>
</template>
```

**Key Points:**

- All changes to `workflowGraph.value` are automatically reflected in the canvas
- You can modify positions, sizes, data, and any other properties
- Vue's reactivity system handles all updates automatically
- No need to emit events or call special update methods
- Perfect for simple, direct manipulations

#### Helper Functions (Advanced)

For complex operations that require validation or coordinated updates, use the helper functions:

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

**When to use helper functions:**

- Adding edges (enforces single connection per port)
- Group operations that require bounds recalculation
- Operations that need validation (e.g., checking if entities are in different groups)
- Complex coordinated updates across multiple entities

### Per-Node/Group Definition Overrides

The library supports per-node and per-group definition overrides, allowing individual nodes and groups to override any property from their type definitions. This includes icon, label, placeholder, fields, and CSS classes. This enables dynamic behavior based on node state, user permissions, or business logic.

#### How It Works

Type definitions are merged at render time:

1. Base type definitions come from the `nodeTypes` or `groupTypes` configuration
2. Per-node/group overrides are stored in `node.definition` or `group.definition`
3. Components merge these definitions, with overrides taking precedence
4. Any property can be overridden: `icon`, `label`, `placeholder`, `fields`, `cssClass`

#### Available Override Properties

**For Nodes (`NodeDefinitionOverride`):**

- `icon?: string` - Override the icon
- `label?: string` - Override the type label shown in config panel
- `placeholder?: string` - Override placeholder text shown in tile
- `fields?: NodeFieldDefinition[]` - Override the entire fields array
- `cssClass?: string` - Override the CSS class applied to the node

**For Groups (`GroupDefinitionOverride`):**

- `label?: string` - Override the type label shown in config panel
- `labelRight?: string` - Override the title displayed on the right side of the group border
- `fields?: GroupTypeFieldDefinition[]` - Override the entire fields array

#### Usage Examples

**Override icon for a specific node:**

```typescript
const node = workflowGraph.value.nodes.find(n => n.id === 'node-123')
if (node) {
  node.definition = {
    icon: 'star'
  }
}
```

**Override label (shown in config panel header):**

```typescript
node.definition = {
  label: 'Critical Action Node'
}
```

**Override group labelRight (shown on right side of group border):**

```typescript
const group = workflowGraph.value.groups.find(g => g.id === 'group-123')
if (group) {
  // Set directly on group
  group.labelRight = 'Phase 1'

  // Or via definition override (takes priority)
  group.definition = {
    labelRight: 'Phase 1 - Planning'
  }
}
```

**Override placeholder text (shown in tile when no type is set):**

```typescript
node.definition = {
  placeholder: 'Configure this important step'
}
```

**Override CSS class:**

```typescript
node.definition = {
  cssClass: 'workflow-canvas-node--vip'
}
```

**Override fields (make specific field readonly):**

```typescript
// Get base fields from node type
const baseFields = nodeTypes[node.kind]?.fields || []

// Create modified fields array
const customFields = baseFields.map(field =>
  field.name === 'title' ? { ...field, readonly: true } : { ...field }
)

node.definition = {
  fields: customFields
}
```

**Hide a field:**

```typescript
const baseFields = nodeTypes[node.kind]?.fields || []

node.definition = {
  fields: baseFields.map(field =>
    field.name === 'description' ? { ...field, visible: false } : { ...field }
  )
}
```

**Customize multiple field properties:**

```typescript
const baseFields = nodeTypes[node.kind]?.fields || []

node.definition = {
  fields: baseFields.map(field => {
    if (field.name === 'title') {
      return {
        ...field,
        readonly: true,
        label: 'Custom Title',
        placeholder: 'Cannot edit this field'
      }
    }
    if (field.name === 'description') {
      return { ...field, visible: false }
    }
    return field
  })
}
```

**Combine multiple overrides:**

```typescript
const baseFields = nodeTypes[node.kind]?.fields || []

node.definition = {
  icon: 'star',
  label: 'Important Step',
  placeholder: 'Configure this critical step',
  cssClass: 'workflow-canvas-node--critical',
  fields: baseFields.map(field =>
    ['title', 'description'].includes(field.name) ? { ...field, readonly: true } : field
  )
}
```

**Group definition overrides work similarly:**

```typescript
const group = workflowGraph.value.groups.find(g => g.id === 'group-456')
const baseFields = groupTypes[group.kind]?.fields || []

if (group) {
  group.definition = {
    label: 'Critical Phase',
    fields: baseFields.map(field =>
      field.name === 'description' ? { ...field, readonly: true } : field
    )
  }
}
```

**Reset definition overrides:**

```typescript
// Remove all overrides for a node
node.definition = undefined

// Or remove specific properties
if (node.definition) {
  const { label, ...rest } = node.definition
  node.definition = Object.keys(rest).length > 0 ? rest : undefined
}
```

#### Common Use Cases

**Conditional Field Visibility:**

```typescript
// Hide advanced fields for basic users
if (!user.isAdvanced) {
  const baseFields = nodeTypes[node.kind]?.fields || []

  node.definition = {
    fields: baseFields.map(field =>
      ['advancedSettings', 'debugMode'].includes(field.name) ? { ...field, visible: false } : field
    )
  }
}
```

**Permission-Based Readonly Fields:**

```typescript
// Make fields readonly for users without edit permission
if (!user.canEdit) {
  const baseFields = nodeTypes[node.kind]?.fields || []

  node.definition = {
    fields: baseFields.map(field => ({ ...field, readonly: true }))
  }
}
```

**State-Based Field Behavior:**

```typescript
// Lock fields when workflow is approved
if (workflow.status === 'approved') {
  const baseFields = nodeTypes[node.kind]?.fields || []

  node.definition = {
    fields: baseFields.map(field =>
      ['title', 'description'].includes(field.name) ? { ...field, readonly: true } : field
    )
  }
}
```

**Dynamic Field Labels:**

```typescript
// Customize field labels based on context
const baseFields = nodeTypes[node.kind]?.fields || []

node.definition = {
  fields: baseFields.map(field =>
    field.name === 'amount'
      ? {
          ...field,
          label: currency === 'USD' ? 'Amount ($)' : 'Amount (€)',
          placeholder: `Enter amount in ${currency}`
        }
      : field
  )
}
```

**Dynamic Icon and Label Based on State:**

```typescript
// Update icon and titles based on node status
if (record.value[`${node.id}-status`] === 'error') {
  node.definition = {
    icon: 'exclamation triangle',
    configPanelTitle: 'Failed Action - Review Required',
    tileTitle: 'Error',
    cssClass: 'workflow-canvas-node--error'
  }
} else if (record.value[`${node.id}-status`] === 'success') {
  node.definition = {
    icon: 'check circle',
    configPanelTitle: 'Completed Action',
    tileTitle: 'Done',
    cssClass: 'workflow-canvas-node--success'
  }
}
```

#### Type Definitions

```typescript
// Per-node type definition overrides
export interface NodeDefinitionOverride {
  icon?: string
  title?: string
  configPanelTitle?: string
  tileTitle?: string
  label?: string
  labelRight?: string
  placeholder?: string
  fields?: NodeFieldDefinition[]
  cssClass?: string
}

// Per-group type definition overrides
export interface GroupDefinitionOverride {
  label?: string
  labelRight?: string
  fields?: GroupTypeFieldDefinition[]
  placeholder?: string
  showTypeField?: boolean
  showTitleField?: boolean
}

// Usage in nodes
interface WorkflowNode {
  id: string
  kind: string
  position: Position
  definition?: NodeDefinitionOverride // Type definition overrides
  // ... other properties
}

// Usage in groups
interface WorkflowGroup {
  id: string
  kind: string
  position: Position
  size: Size
  definition?: GroupDefinitionOverride // Type definition overrides
  // ... other properties
}
```

#### Important Notes

- Definition overrides completely replace the overridden properties (not merged)
- When overriding `fields`, you must provide the complete fields array
- The `definition` property is optional - nodes/groups work without it
- Field visibility filtering happens automatically in the config panel
- Overrides affect both the configuration panel and tile display (for icon, placeholder)
- Changes to `node.definition` or `group.definition` trigger reactive updates automatically
- Use `undefined` or omit properties to fall back to the base type definition

### Nested Group Configuration

You can configure how nested groups are created within parent groups using the `nested` property. This allows you to customize the default label, placeholder, and fields for groups created using the "+ group" button inside a parent group.

#### Type-Level Configuration

Define default nested group properties in `GroupTypeDefinition`:

```typescript
const groupTypes: GroupTypeConfig = {
  phase: {
    type: 'phase',
    label: 'Phase',
    fields: [
      // ... parent field definitions
    ],
    nested: {
      label: 'Sub-Phase',
      placeholder: 'Configure sub-phase',
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
  },
  action: {
    type: 'action',
    label: 'Action Group',
    fields: [
      // ... parent field definitions
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
  }
}
```

When a user clicks the "+ group" button inside a phase group, the new nested group will be created with:

- Label: "Sub-Phase"
- Placeholder: "Configure sub-phase" (visible in the config panel)
- Fields: Custom field definitions (instead of inheriting parent's fields)

#### Instance-Level Override

Override nested configuration for specific group instances:

```typescript
const group: WorkflowGroup = {
  id: 'group-1',
  kind: 'phase',
  label: 'Planning Phase',
  position: { x: 100, y: 100 },
  size: { w: 400, h: 300 },
  containedIds: [],
  nested: {
    label: 'Custom Nested Label',
    placeholder: 'Custom placeholder',
    fields: [
      {
        name: 'customField',
        type: 'text',
        label: 'Custom Field'
      }
    ]
  }
  // ... other properties
}
```

The instance-level `nested` configuration takes precedence over the type-level configuration.

#### Fallback Behavior

If no `nested` configuration is provided (neither at type level nor instance level):

- Label defaults to: `Nested ${parentGroup.kind || 'Group'}`
- No placeholder is set
- Fields are inherited from the parent group's type definition

#### Type Definition

```typescript
export interface NestedGroupConfig {
  label?: string // Default label for nested groups
  placeholder?: string // Placeholder text for nested groups
  fields?: GroupTypeFieldDefinition[] // Field definitions for nested groups
}

export interface GroupTypeDefinition {
  type: string
  label: string
  fields: GroupTypeFieldDefinition[]
  nested?: NestedGroupConfig // Configuration for nested groups
  showTypeField?: boolean // Control visibility of type field in config panel (default: true)
  showTitleField?: boolean // Control visibility of title field in config panel (default: true)
  lockParent?: boolean // If true, groups of this type are locked to parent by default
  allowedParents?: string[] // If set, restricts which group kinds groups of this type can be placed into
  hideAddNode?: boolean // If true, hides "+ node" button in connection hover menu
  hideAddGroup?: boolean // If true, hides "+ group" button in connection hover menu
  hideNestedAddNode?: boolean // If true, hides "+ node" button in empty group "+" menu
  hideNestedAddGroup?: boolean // If true, hides "+ group" button in empty group "+" menu
  addNodeButtonText?: string // Custom text for "+ node" button in group hover menu (defaults to "+ node")
  addGroupButtonText?: string // Custom text for "+ group" button in group hover menu (defaults to "+ group")
}

export interface WorkflowGroup {
  id: string
  kind: string
  label?: string
  position: Position
  size: Size
  containedIds: string[]
  nested?: NestedGroupConfig // Per-instance override for nested config
  // ... other properties
}
```

#### Programmatic Example

```typescript
// Set custom nested config for a specific group
const group = workflowGraph.value.groups.find(g => g.id === 'group-123')
if (group) {
  group.nested = {
    label: 'Implementation Phase',
    placeholder: 'Define implementation details',
    fields: [
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        placeholder: 'Describe the implementation'
      },
      {
        name: 'assignee',
        type: 'text',
        label: 'Assignee',
        placeholder: 'Enter assignee name'
      }
    ]
  }
}

// Clear nested config to use type-level defaults
if (group.nested) {
  delete group.nested
}
```

### Group Config Panel Field Visibility

You can control the visibility of the "type" and "title" fields in the group configuration panel. This is useful when you want to simplify the UI or when these fields are not relevant for certain group types.

#### Type-Level Configuration

Control field visibility for all groups of a specific type using `GroupTypeDefinition`:

```typescript
const groupTypes: GroupTypeConfig = {
  phase: {
    type: 'phase',
    label: 'Phase',
    fields: [],
    showTypeField: false, // Hide type field for all phase groups
    showTitleField: true // Show title field (default)
  },
  swimlane: {
    type: 'swimlane',
    label: 'Swimlane',
    fields: [],
    showTypeField: false, // Hide type field
    showTitleField: false // Hide title field
  }
}
```

#### Instance-Level Override

Override visibility for specific group instances using `GroupDefinitionOverride`:

```typescript
const group: WorkflowGroup = {
  id: 'group-1',
  kind: 'phase',
  label: 'Planning Phase',
  position: { x: 100, y: 100 },
  size: { w: 400, h: 300 },
  containedIds: [],
  definition: {
    showTypeField: true, // Override type-level setting
    showTitleField: false // Hide title field for this instance only
  }
}
```

#### Priority Resolution

The visibility resolution follows this priority order:

1. **Instance override**: `group.definition.showTypeField` / `showTitleField`
2. **Type default**: `groupTypes[kind].showTypeField` / `showTitleField`
3. **Global default**: `true` (fields are visible by default)

#### Programmatic Example

```typescript
// Hide title field for a specific group instance
const group = workflowGraph.value.groups.find(g => g.id === 'group-456')
if (group) {
  group.definition = {
    ...group.definition,
    showTitleField: false // Hide title field for this group
  }
}
```

#### Type Definition

```typescript
export interface GroupDefinitionOverride {
  label?: string
  labelRight?: string
  fields?: GroupTypeFieldDefinition[]
  placeholder?: string
  showTypeField?: boolean // Override type-level setting for type field visibility
  showTitleField?: boolean // Override type-level setting for title field visibility
}

export interface GroupTypeDefinition {
  type: string
  label: string
  fields: GroupTypeFieldDefinition[]
  nested?: NestedGroupConfig
  showTypeField?: boolean // Control visibility of type field in config panel (default: true)
  showTitleField?: boolean // Control visibility of title field in config panel (default: true)
  lockParent?: boolean // If true, groups of this type are locked to parent by default
  allowedParents?: string[] // If set, restricts which group kinds groups of this type can be placed into
}
```

### Customizing Group Hover Menu Button Text

You can customize the text displayed on the hover menu buttons that appear when hovering over groups. This is useful for providing context-specific labels that match your workflow terminology:

```typescript
const groupTypes: GroupTypeConfig = {
  phase: {
    type: 'phase',
    label: 'Phase',
    addNodeButtonText: '+ task',
    addGroupButtonText: '+ sub-phase',
    fields: [...]
  },
  swimlane: {
    type: 'swimlane',
    label: 'Swimlane',
    addNodeButtonText: '+ step',
    addGroupButtonText: '+ lane',
    fields: [...]
  }
}
```

When these properties are not specified, the buttons default to displaying "+ node" and "+ group".

### Group Type Lock to Parent

You can configure groups of a specific type to be locked to their parent by default using the `lockParent` property in `GroupTypeDefinition`. This prevents groups from being moved outside their parent group, while still allowing movement within the parent or to nested groups inside the parent.

#### Type-Level Configuration

Set a default `lockParent` value for all groups of a specific type:

```typescript
const groupTypes: GroupTypeConfig = {
  phase: {
    type: 'phase',
    label: 'Phase',
    fields: [],
    lockParent: true // All phase groups are locked to parent by default
  },
  swimlane: {
    type: 'swimlane',
    label: 'Swimlane',
    fields: [],
    lockParent: false // Swimlane groups can be moved freely (default behavior)
  }
}
```

#### Instance-Level Override

Individual groups can override the type-level default by setting `lockParent` directly on the group instance:

```typescript
const group: WorkflowGroup = {
  id: 'group-1',
  kind: 'phase',
  label: 'Planning Phase',
  position: { x: 100, y: 100 },
  size: { w: 400, h: 300 },
  containedIds: [],
  lockParent: false // Override type-level setting for this instance
}
```

#### Behavior

When `lockParent` is `true`:

- The group cannot be moved to the root level (outside all groups)
- The group cannot be moved to sibling groups
- The group can still be moved within its parent group
- The group can be moved to nested groups inside the parent

#### Programmatic Example

```typescript
// Lock a specific group to its parent
const group = workflowGraph.value.groups.find(g => g.id === 'group-456')
if (group) {
  group.lockParent = true
  // Group can now only be moved within its parent or to nested groups inside the parent
}
```

#### Priority Resolution

The `lockParent` value is resolved in this order:

1. **Instance value**: `group.lockParent` (if explicitly set)
2. **Type default**: `groupTypes[kind].lockParent` (applied when group is created)
3. **Global default**: `undefined` (no locking)

### Group Type Allowed Parents

You can restrict which group kinds groups of a specific type can be placed into using the `allowedParents` property in `GroupTypeDefinition`. When set, groups can only be dropped into groups whose `kind` matches one of the allowed values.

#### Type-Level Configuration

Set a default `allowedParents` value for all groups of a specific type:

```typescript
const groupTypes: GroupTypeConfig = {
  phase: {
    type: 'phase',
    label: 'Phase',
    fields: [],
    allowedParents: ['swimlane'] // Phase groups can only be placed inside 'swimlane' groups
  },
  swimlane: {
    type: 'swimlane',
    label: 'Swimlane',
    fields: [],
    allowedParents: ['swimlane', 'group'] // Swimlane groups can be placed in 'swimlane' or 'group' groups
  }
}
```

#### Instance-Level Override

Individual groups can override the type-level default by setting `allowedParents` directly on the group instance:

```typescript
const group: WorkflowGroup = {
  id: 'group-1',
  kind: 'phase',
  label: 'Planning Phase',
  position: { x: 100, y: 100 },
  size: { w: 400, h: 300 },
  containedIds: [],
  allowedParents: ['swimlane', 'group'] // Override type-level setting for this instance
}
```

#### Priority Resolution

The `allowedParents` value is resolved in this order:

1. **Instance value**: `group.allowedParents` (if explicitly set)
2. **Type default**: `groupTypes[kind].allowedParents` (applied when group is created)
3. **Global default**: `undefined` (no restriction)

### Group Add Button Visibility

You can control the visibility of individual add buttons on groups using four separate properties. These can be set at both the type level and instance level:

- `hideAddNode` - Hides the "+ node" button in the connection hover menu
- `hideAddGroup` - Hides the "+ group" button in the connection hover menu
- `hideNestedAddNode` - Hides the "+ node" button in the empty group "+" menu
- `hideNestedAddGroup` - Hides the "+ group" button in the empty group "+" menu

#### Type-Level Configuration

```typescript
const groupTypes: GroupTypeConfig = {
  singleNode: {
    type: 'singleNode',
    label: 'Single Node Container',
    fields: [],
    hideAddGroup: true, // Hide "+ group" button in connection hover menu
    hideNestedAddGroup: true // Hide "+ group" button in empty group menu
  },
  nodesOnly: {
    type: 'nodesOnly',
    label: 'Nodes Only Group',
    fields: [],
    hideAddGroup: true,
    hideNestedAddGroup: true
  }
}
```

#### Instance-Level Override

Individual groups can override the type-level defaults:

```typescript
const group: WorkflowGroup = {
  id: 'group-1',
  kind: 'singleNode',
  label: 'Special Container',
  position: { x: 100, y: 100 },
  size: { w: 400, h: 300 },
  containedIds: [],
  hideAddNode: true, // Override: also hide "+ node" button in hover menu
  hideNestedAddNode: true // Override: also hide "+ node" button in empty group menu
}
```

#### Priority Resolution

Each property is resolved independently in this order:

1. **Instance value**: `group.hideAddNode` (if explicitly set)
2. **Type default**: `groupTypes[kind].hideAddNode` (checked at runtime)
3. **Global default**: `false` (buttons are visible by default)

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

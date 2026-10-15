# Oceanfront Workflow Canvas

A Vue 3 canvas for editing workflow structures made of HTML tiles and nested groups.
The consumer passes only the structure (which entities sit in which group, in which order);
the canvas lays everything out and draws the arrows itself. Everything inside a tile and inside
the side panel is provided through slots.

## Installation

```bash
yarn add oceanfront-workflow-canvas
```

```ts
import { WorkflowCanvas } from 'oceanfront-workflow-canvas'
import 'oceanfront-workflow-canvas/css'
```

## Usage

```vue
<template>
  <WorkflowCanvas
    v-model="graph"
    v-model:selected-id="selectedId"
    :kinds="kinds"
    mode="edit"
    style="height: 600px"
  >
    <template #tile="{ node }">
      {{ describe(node) }}
    </template>

    <template #panel="{ node, group }">
      <MyNodeForm v-if="node" :key="node.id" :node-id="node.id" />
      <MyGroupForm v-else-if="group" :key="group.id" :group-id="group.id" />
    </template>

    <template #panel-actions="{ close, remove }">
      <button @click="remove">Delete</button>
      <button @click="close">Done</button>
    </template>
  </WorkflowCanvas>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { WorkflowGraph, WorkflowKinds } from 'oceanfront-workflow-canvas'

const kinds: WorkflowKinds = {
  condition: { addNodeText: '+ Condition', addGroupText: '+ Group', maxGroupDepth: 3 },
  action: { addNodeText: '+ Action' }
}

const graph = ref<WorkflowGraph>({
  nodes: [],
  groups: [
    { id: 'conditions', kind: 'condition', label: 'Conditions', readonly: true, children: [] },
    { id: 'actions', kind: 'action', label: 'Actions', readonly: true, children: [] }
  ]
})
const selectedId = ref<string | null>(null)
</script>
```

## Props

| Prop         | Type               | Default  | Description                                    |
| ------------ | ------------------ | -------- | ---------------------------------------------- |
| `modelValue` | `WorkflowGraph`    | required | The structure (`v-model`)                      |
| `selectedId` | `string \| null`   | `null`   | Selected node or group (`v-model:selected-id`) |
| `kinds`      | `WorkflowKinds`    | `{}`     | Add-button texts and limits per entity kind    |
| `mode`       | `'edit' \| 'view'` | `'edit'` | `view` disables every editing interaction      |

Other attributes (`class`, `style`) are applied to the canvas wrapper, also in full screen.

## Events

- `update:modelValue` – emitted once per structural edit (add, delete, move, swap).
- `update:selectedId` – selection changes.

## Slots

- `tile` `{ node }` – content below the tile header. Rendered only when `node.title` is set.
- `panel` `{ node, group, close, remove }` – side panel body for the selected entity.
- `panel-actions` `{ node, group, close, remove }` – footer of the side panel.

The panel opens for any selected node and for selected groups that are not `readonly`.
It is controlled only by the selection. Give panel components a stable `key` (for example the
entity id) so they keep their state while the graph changes.

## Data model

```ts
type WorkflowNode = {
  id: string
  kind: string
  title?: string // tile header; the placeholder is shown when empty
  placeholder?: string
  panelTitle?: string // side panel title, falls back to title, then kind
  labelRight?: string // badge on the top-right border
}

type WorkflowGroup = {
  id: string
  kind: string
  children: string[] // node and group ids, top to bottom
  label?: string // badge on the top-left border
  labelRight?: string // badge on the top-right border
  readonly?: boolean // cannot be selected, dragged or deleted
}

type WorkflowGraph = { nodes: WorkflowNode[]; groups: WorkflowGroup[] }

type WorkflowKinds = Record<
  string,
  { addNodeText: string; addGroupText?: string; maxGroupDepth?: number }
>
```

## Layout

- Root groups (groups that are no one's child) are placed left to right in array order and
  connected with an arrow.
- Children are stacked top to bottom in `children` order, centered, and connected with arrows.
- Groups grow to fit their content. Node heights are measured from the rendered tiles.

## Interaction

- **Add after** – hovering the last child of a group shows its kind's add buttons
  (`addNodeText`, and `addGroupText` when set and `maxGroupDepth` allows it).
- **Add into an empty group** – the centered "+" adds directly when the kind has a single option,
  otherwise it shows a menu.
- **Insert between nodes** – the "+" on the arrow between two nodes inserts a node there.
- **Drag** – nodes and non-readonly groups can be moved into groups of the same kind, reordered
  with the insertion indicator, or swapped with a node of the same kind.
- **Delete** – via the `remove` slot function. Groups are deleted with their content.
- **Escape** – leaves full screen, otherwise clears the selection.
- **Full screen** – the toggle in the top-right corner moves the canvas to `body`.

## Styling

- `--wf-entity-spacing` – vertical gap between stacked entities (default `50px`)
- `--wf-group-padding` – padding inside groups (default `20px`)
- `--wf-sidebar-width` – side panel width (default `400px`)

Nodes get a `workflow-canvas-node--type-{kind}` class for per-kind styling.

## Development

```bash
yarn test
yarn lint
yarn build
```

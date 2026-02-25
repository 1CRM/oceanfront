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

    <details class="demo-section">
      <summary>Direct Data Manipulation Demo</summary>
      <p class="demo-description">
        These buttons demonstrate programmatic manipulation of the workflow
        graph. Changes are made directly to the
        <code>workflowGraph</code> variable, and the canvas updates
        automatically.
      </p>
      <div class="demo-actions">
        <of-button @click="moveFirstNodeProgrammatically" variant="outlined">
          Move First Node +50px
        </of-button>
        <of-button @click="updateAllNodeData" variant="outlined">
          Update All Node Data
        </of-button>
        <of-button @click="batchUpdatePositions" variant="outlined">
          Batch Move All Nodes
        </of-button>
        <of-button @click="addNodeDirectly" variant="outlined">
          Add Node Directly
        </of-button>
        <of-button @click="resizeFirstGroup" variant="outlined">
          Resize First Group
        </of-button>
        <of-button @click="updateGroupData" variant="outlined">
          Update Group Data
        </of-button>
      </div>
    </details>

    <details class="demo-section">
      <summary>Per-Node Definition Override Demo</summary>
      <p class="demo-description">
        These buttons demonstrate per-node definition overrides. Individual
        nodes can override any property from their type definition including
        fields, icon, label, placeholder, and cssClass using
        <code>node.definition</code>. Select a node after clicking to see the
        changes in the config panel.
      </p>
      <div class="demo-actions">
        <of-button @click="makeFirstNodeTitleReadonly" variant="outlined">
          Make First Node Title Readonly
        </of-button>
        <of-button @click="hideDescriptionForFirstNode" variant="outlined">
          Hide Description Field
        </of-button>
        <of-button @click="customizeLabelForFirstNode" variant="outlined">
          Customize Field Labels
        </of-button>
        <of-button @click="makeMultipleFieldsReadonly" variant="outlined">
          Multiple Fields Readonly
        </of-button>
        <of-button @click="makeFirstGroupFieldsReadonly" variant="outlined">
          Make Group Fields Readonly
        </of-button>
        <of-button @click="resetFieldConfigs" variant="outlined">
          Reset All Field Configs
        </of-button>
      </div>
    </details>

    <details class="demo-section">
      <summary>Custom Label Demo (definition.label)</summary>
      <p class="demo-description">
        These buttons demonstrate the label override feature. Use
        <code>node.definition.label</code> or
        <code>group.definition.label</code>
        to override the displayed title in tiles, group headers, and config
        panel headers. Select a node or group after clicking to see the custom
        label in action.
      </p>
      <div class="demo-actions">
        <of-button @click="setNodeLabel" variant="outlined">
          Set Custom Node Label
        </of-button>
        <of-button @click="setGroupLabel" variant="outlined">
          Set Custom Group Label
        </of-button>
        <of-button @click="clearNodeLabel" variant="outlined">
          Clear Node Label
        </of-button>
        <of-button @click="clearGroupLabel" variant="outlined">
          Clear Group Label
        </of-button>
      </div>
    </details>

    <details class="demo-section">
      <summary>Nested Group Configuration Demo</summary>
      <p class="demo-description">
        These buttons demonstrate nested group configuration with custom labels
        and placeholders. Use <code>group.nested</code> to override the default
        nested group properties from the type definition. Click "+ group" inside
        a group to see the configured label and placeholder in action.
      </p>
      <div class="demo-actions">
        <of-button @click="setCustomNestedConfig" variant="outlined">
          Set Custom Nested Config
        </of-button>
        <of-button @click="clearNestedConfig" variant="outlined">
          Clear Nested Config
        </of-button>
      </div>
    </details>

    <details class="demo-section">
      <summary>Separate Panel/Tile Labels Demo</summary>
      <p class="demo-description">
        These buttons demonstrate separate titles for config panel vs tile
        display. Use <code>node.definition.configPanelTitle</code> for the panel
        header and <code>node.definition.tileTitle</code> for the tile. Both
        fall back to <code>title</code> if not specified. Select a node after
        clicking to see the different titles in action.
      </p>
      <div class="demo-actions">
        <of-button @click="setSeparateLabels" variant="outlined">
          Set Separate Labels
        </of-button>
        <of-button @click="clearSeparateLabels" variant="outlined">
          Clear Separate Labels
        </of-button>
      </div>
    </details>

    <details class="demo-section">
      <summary>Group Field Visibility Demo</summary>
      <p class="demo-description">
        These buttons demonstrate controlling field visibility in the group
        config panel. Use <code>showTypeField</code> and
        <code>showTitleField</code> to hide/show the type and title fields. Can
        be set at type level or per-instance via <code>group.definition</code>.
        Select a group after clicking to see the changes.
      </p>
      <div class="demo-actions">
        <of-button @click="hideGroupTypeField" variant="outlined">
          Hide Type Field
        </of-button>
        <of-button @click="hideGroupTitleField" variant="outlined">
          Hide Title Field
        </of-button>
        <of-button @click="showAllGroupFields" variant="outlined">
          Show All Fields
        </of-button>
      </div>
    </details>

    <details class="demo-section">
      <summary>Per-Group Max Depth Demo</summary>
      <p class="demo-description">
        These buttons demonstrate per-group depth limits using
        <code>group.maxDepth</code>. Individual groups can override the global
        <code>maxGroupDepth</code> setting. This allows different groups to have
        different nesting restrictions.
      </p>
      <div class="demo-actions">
        <of-button @click="setGroupMaxDepth" variant="outlined">
          Set First Group Max Depth = 1
        </of-button>
        <of-button @click="clearGroupMaxDepth" variant="outlined">
          Clear Group Max Depth
        </of-button>
      </div>
    </details>

    <details class="demo-section">
      <summary>Hide Hover Menu Buttons Demo</summary>
      <p class="demo-description">
        These buttons demonstrate independent control of hover menu buttons
        using
        <code>hideAddNode</code> and <code>hideAddGroup</code>. These are simple
        boolean flags that can be set at instance level or type level. When
        true, the corresponding button is hidden from the hover menu.
      </p>
      <div class="demo-actions">
        <of-button @click="hideAddNodeForFirstNode" variant="outlined">
          Hide "+ node" for First Node
        </of-button>
        <of-button @click="hideAddGroupForFirstNode" variant="outlined">
          Hide "+ group" for First Node
        </of-button>
        <of-button @click="hideAddNodeForFirstGroup" variant="outlined">
          Hide "+ node" for First Group
        </of-button>
        <of-button @click="hideAddGroupForFirstGroup" variant="outlined">
          Hide "+ group" for First Group
        </of-button>
        <of-button @click="showAllButtons" variant="outlined">
          Show All Buttons
        </of-button>
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
        showInTile: true,
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
const initialRecordData = {
  'node-trigger-1-title': 'Quote Created',
  'node-trigger-1-description':
    'Triggered when a new quote is created in the system',
  'node-trigger-1-event': 'new_quote',
  'node-action-1-title': 'Validate Quote',
  'node-action-1-description': 'Check if quote meets minimum requirements',
  'node-action-1-actionType': 'update',
  'node-action-1-enabled': true,
  'node-condition-1-title': 'Amount > $10,000?',
  'node-condition-1-description': 'Check if quote amount exceeds threshold',
  'node-condition-1-operator': 'greater_than',
  'node-condition-1-threshold': 10000,
  'node-action-2-title': 'Notify Sales Manager',
  'node-action-2-description': 'Send notification for high-value quotes',
  'node-action-2-actionType': 'email',
  'node-action-2-enabled': true,
  'node-action-3-title': 'Create Approval Task',
  'node-action-3-description': 'Require manager approval for large quotes',
  'node-action-3-actionType': 'create',
  'node-action-3-enabled': true,
  'node-action-4-title': 'Auto-Approve Quote',
  'node-action-4-description': 'Automatically approve standard quotes',
  'node-action-4-actionType': 'update',
  'node-action-4-enabled': true,
  'node-action-5-title': 'Update CRM',
  'node-action-5-description': 'Sync quote data to CRM system',
  'node-action-5-actionType': 'update',
  'node-action-5-enabled': true,
  'node-action-6-title': 'Generate PDF',
  'node-action-6-description': 'Create PDF document for quote',
  'node-action-6-actionType': 'create',
  'node-action-6-enabled': true,
  'node-action-7-title': 'Email Customer',
  'node-action-7-description': 'Send quote to customer email',
  'node-action-7-actionType': 'email',
  'node-action-7-enabled': true,
  'node-action-8-title': 'Log Activity',
  'node-action-8-description': 'Record quote activity in audit log',
  'node-action-8-actionType': 'create',
  'node-action-8-enabled': true,
  'node-action-9-title': 'Archive Old Quotes',
  'node-action-9-description': 'Move expired quotes to archive',
  'node-action-9-actionType': 'update',
  'node-action-9-enabled': false,
  'group-processing-main-description':
    'Main processing phase for quote handling',
  'group-processing-main-duration': 2,
  'group-processing-main-status': 'in_progress',
  'group-processing-main-lockParent': true,
  'group-processing-sub-description': 'Handle all customer notifications',
  'group-processing-sub-priority': 'high',
  'group-processing-sub-owner': 'Sales Team',
  'group-admin-description': 'Background administrative operations',
  'group-admin-priority': 'low',
  'group-admin-owner': 'System Admin'
}

// Initial workflow graph state - Comprehensive demo showcasing various features
const initialWorkflowGraph: WorkflowGraph = {
  nodes: [
    {
      id: 'node-trigger-1',
      kind: 'trigger',
      position: {
        x: 49,
        y: 39
      }
    },
    {
      id: 'node-action-1',
      kind: 'action',
      position: {
        x: 48,
        y: 232
      }
    },
    {
      id: 'node-condition-1',
      kind: 'condition',
      position: {
        x: 48,
        y: 451
      }
    },
    {
      id: 'node-action-2',
      kind: 'action',
      position: {
        x: 50,
        y: 651
      }
    },
    {
      id: 'node-action-3',
      kind: 'action',
      position: {
        x: 50,
        y: 878
      }
    },
    {
      id: 'node-action-4',
      kind: 'action',
      position: {
        x: 340,
        y: 651
      }
    },
    {
      id: 'node-action-5',
      kind: 'action',
      position: {
        x: 421,
        y: 85
      }
    },
    {
      id: 'node-action-6',
      kind: 'action',
      position: {
        x: 422,
        y: 284
      }
    },
    {
      id: 'node-action-7',
      kind: 'action',
      position: {
        x: 771,
        y: 80
      }
    },
    {
      id: 'node-action-8',
      kind: 'action',
      position: {
        x: 773,
        y: 273
      }
    },
    {
      id: 'node-action-9',
      kind: 'action',
      position: {
        x: 792,
        y: 651
      }
    }
  ],
  edges: [
    {
      id: 'edge-1',
      from: {
        entityId: 'node-trigger-1'
      },
      to: {
        entityId: 'node-action-1'
      }
    },
    {
      id: 'edge-2',
      from: {
        entityId: 'node-action-1'
      },
      to: {
        entityId: 'node-condition-1'
      }
    },
    {
      id: 'edge-3',
      from: {
        entityId: 'node-condition-1'
      },
      to: {
        entityId: 'node-action-2'
      }
    },
    {
      id: 'edge-4',
      from: {
        entityId: 'node-condition-1'
      },
      to: {
        entityId: 'node-action-4'
      }
    },
    {
      id: 'edge-5',
      from: {
        entityId: 'node-action-2'
      },
      to: {
        entityId: 'node-action-3'
      }
    },
    {
      id: 'edge-6',
      from: {
        entityId: 'node-action-5'
      },
      to: {
        entityId: 'node-action-6'
      }
    },
    {
      id: 'edge-7',
      from: {
        entityId: 'node-action-7'
      },
      to: {
        entityId: 'node-action-8'
      }
    },
    {
      id: 'edge-8',
      from: {
        entityId: 'node-action-6'
      },
      to: {
        entityId: 'node-action-7'
      }
    }
  ],
  groups: [
    {
      id: 'group-processing-main',
      kind: 'phase',
      label: 'Quote Processing Phase',
      labelRight: 'Phase 1',
      position: {
        x: 401,
        y: 40
      },
      size: {
        w: 662,
        h: 445
      },
      containedIds: ['group-processing-sub', 'node-action-5', 'node-action-6']
    },
    {
      id: 'group-processing-sub',
      kind: 'action',
      label: 'Notification Actions',
      position: {
        x: 745,
        y: 60
      },
      size: {
        w: 298,
        h: 405
      },
      containedIds: ['node-action-7', 'node-action-8']
    },
    {
      id: 'group-admin',
      kind: 'action',
      label: 'Administrative Tasks',
      position: {
        x: 766,
        y: 617
      },
      size: {
        w: 298,
        h: 207
      },
      maxDepth: 0,
      containedIds: []
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
    })
  | null
>(null)
const maxGroupDepth = ref<number | null>(null)
const hideEmptyHandles = ref(true)
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
}

// Direct data manipulation functions - demonstrating programmatic graph updates
function moveFirstNodeProgrammatically() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    node.position.x += 50
    node.position.y += 50
    logEvent('programmatic-move', {
      nodeId: node.id,
      newPosition: { x: node.position.x, y: node.position.y }
    })
  }
}

function updateAllNodeData() {
  const timestamp = new Date().toISOString()
  // Update data in record using flat keys
  workflowGraph.value.nodes.forEach((node) => {
    record.value[`${node.id}-lastUpdated`] = timestamp
    record.value[`${node.id}-programmaticallyModified`] = true
  })
  logEvent('programmatic-update-all', {
    count: workflowGraph.value.nodes.length,
    timestamp
  })
}

function batchUpdatePositions() {
  workflowGraph.value.nodes.forEach((node, index) => {
    node.position.x += index % 2 === 0 ? 20 : -20
    node.position.y += 10
  })
  logEvent('programmatic-batch-move', {
    count: workflowGraph.value.nodes.length
  })
}

function addNodeDirectly() {
  const newNode: WorkflowNode = {
    id: `node-${Date.now()}-programmatic`,
    kind: 'action',
    position: {
      x: Math.random() * 500 + 50,
      y: Math.random() * 300 + 50
    }
  }
  // Add data to record using flat keys
  record.value[`${newNode.id}-title`] = 'Programmatically Added Node'
  record.value[`${newNode.id}-description`] =
    'This node was added by directly modifying the graph data'
  record.value[`${newNode.id}-createdAt`] = new Date().toISOString()
  workflowGraph.value.nodes.push(newNode)
  logEvent('programmatic-add-node', {
    nodeId: newNode.id,
    position: newNode.position
  })
}

function resizeFirstGroup() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    group.size.w += 50
    group.size.h += 30
    logEvent('programmatic-resize-group', {
      groupId: group.id,
      newSize: { w: group.size.w, h: group.size.h }
    })
  }
}

function updateGroupData() {
  const timestamp = new Date().toISOString()
  workflowGraph.value.groups.forEach((group) => {
    record.value[group.id] = {
      ...(record.value[group.id] || {}),
      lastModified: timestamp,
      programmaticallyUpdated: true
    }
  })
  logEvent('programmatic-update-groups', {
    count: workflowGraph.value.groups.length,
    timestamp
  })
}

// Per-node definition override functions
function makeFirstNodeTitleReadonly() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    const baseFields = nodeTypes[node.kind]?.fields || []

    // Create a copy of base fields with title field set to readonly
    const overrideFields = baseFields.map((field) =>
      field.name === 'title' ? { ...field, readonly: true } : { ...field }
    )

    node.definition = {
      ...node.definition,
      fields: overrideFields
    }

    logEvent('make-field-readonly', { nodeId: node.id, field: 'title' })
  }
}

function hideDescriptionForFirstNode() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    const baseFields = nodeTypes[node.kind]?.fields || []

    // Create a copy of base fields with description field hidden
    const overrideFields = baseFields.map((field) =>
      field.name === 'description' ? { ...field, visible: false } : { ...field }
    )

    node.definition = {
      ...node.definition,
      fields: overrideFields
    }
    logEvent('hide-field', { nodeId: node.id, field: 'description' })
  }
}

function customizeLabelForFirstNode() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    const baseFields = nodeTypes[node.kind]?.fields || []

    // Create a copy of base fields with title field customized
    const overrideFields = baseFields.map((field) =>
      field.name === 'title'
        ? {
            ...field,
            label: 'Custom Title Label',
            placeholder: 'Enter custom title here',
            required: true
          }
        : { ...field }
    )

    node.definition = {
      ...node.definition,
      fields: overrideFields
    }
    logEvent('customize-field-label', { nodeId: node.id, field: 'title' })
  }
}

function makeMultipleFieldsReadonly() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    const baseFields = nodeTypes[node.kind]?.fields || []

    // Create a copy of base fields with multiple fields set to readonly
    const readonlyFields = ['title', 'description', 'event']
    const overrideFields = baseFields.map((field) =>
      readonlyFields.includes(field.name)
        ? { ...field, readonly: true }
        : { ...field }
    )

    node.definition = {
      ...node.definition,
      fields: overrideFields
    }
    logEvent('make-multiple-fields-readonly', { nodeId: node.id })
  }
}

function makeFirstGroupFieldsReadonly() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    const baseFields = groupTypes[group.kind]?.fields || []

    // Create a copy of base fields with multiple fields set to readonly
    const readonlyFields = ['description', 'priority']
    const overrideFields = baseFields.map((field) =>
      readonlyFields.includes(field.name)
        ? { ...field, readonly: true }
        : { ...field }
    )

    group.definition = {
      ...group.definition,
      fields: overrideFields
    }
    logEvent('make-group-fields-readonly', { groupId: group.id })
  }
}

function resetFieldConfigs() {
  workflowGraph.value.nodes.forEach((node) => {
    if (node.definition) {
      node.definition = undefined
    }
  })
  workflowGraph.value.groups.forEach((group) => {
    if (group.definition) {
      group.definition = undefined
    }
  })
  logEvent('reset-field-configs', {
    nodesReset: workflowGraph.value.nodes.length,
    groupsReset: workflowGraph.value.groups.length
  })
}

// Custom label functions
function setNodeLabel() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    node.definition = {
      ...node.definition,
      title: 'Custom Node Label via definition.title'
    }
    logEvent('set-node-label', { nodeId: node.id })
  }
}

function setGroupLabel() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    group.definition = {
      ...group.definition,
      label: 'Custom Group Label via definition.label'
    }
    logEvent('set-group-label', { groupId: group.id })
  }
}

function clearNodeLabel() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    if (node.definition?.title) {
      const { title: _title, ...rest } = node.definition
      node.definition = Object.keys(rest).length > 0 ? rest : undefined
      logEvent('clear-node-label', { nodeId: node.id })
    }
  }
}

function clearGroupLabel() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    if (group.definition?.label) {
      const { label: _label, ...rest } = group.definition
      group.definition = Object.keys(rest).length > 0 ? rest : undefined
      logEvent('clear-group-label', { groupId: group.id })
    }
  }
}

function setCustomNestedConfig() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    group.nested = {
      label: 'Custom Nested Group',
      placeholder: 'Custom placeholder text',
      fields: [
        {
          name: 'customField',
          type: 'text',
          label: 'Custom Field',
          placeholder: 'Enter custom value'
        }
      ]
    }
    logEvent('set-nested-config', { groupId: group.id })
  }
}

function clearNestedConfig() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    if (group.nested) {
      delete group.nested
      logEvent('clear-nested-config', { groupId: group.id })
    }
  }
}

// Separate Panel/Tile Labels functions
function setSeparateLabels() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    node.definition = {
      ...node.definition,
      configPanelTitle: 'Detailed Configuration Panel Title',
      tileTitle: 'Short Tile'
    }
    logEvent('set-separate-labels', { nodeId: node.id })
  }
}

function clearSeparateLabels() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    if (node.definition) {
      const {
        configPanelTitle: _configPanelTitle,
        tileTitle: _tileTitle,
        ...rest
      } = node.definition
      node.definition = Object.keys(rest).length > 0 ? rest : undefined
      logEvent('clear-separate-labels', { nodeId: node.id })
    }
  }
}

// Hide Hover Menu functions
function hideAddNodeForFirstNode() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    node.hideAddNode = true
    logEvent('hide-add-node-button', { nodeId: node.id })
  }
}

function hideAddGroupForFirstNode() {
  if (workflowGraph.value.nodes.length > 0) {
    const node = workflowGraph.value.nodes[0]
    node.hideAddGroup = true
    logEvent('hide-add-group-button', { nodeId: node.id })
  }
}

function hideAddNodeForFirstGroup() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    group.hideAddNode = true
    logEvent('hide-add-node-button-group', { groupId: group.id })
  }
}

function hideAddGroupForFirstGroup() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    group.hideAddGroup = true
    logEvent('hide-add-group-button-group', { groupId: group.id })
  }
}

function showAllButtons() {
  workflowGraph.value.nodes.forEach((node) => {
    node.hideAddNode = undefined
    node.hideAddGroup = undefined
  })
  workflowGraph.value.groups.forEach((group) => {
    group.hideAddNode = undefined
    group.hideAddGroup = undefined
  })
  logEvent('show-all-buttons', {
    nodesReset: workflowGraph.value.nodes.length,
    groupsReset: workflowGraph.value.groups.length
  })
}

// Group Field Visibility functions
function hideGroupTypeField() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    group.definition = {
      ...group.definition,
      showTypeField: false
    }
    logEvent('hide-group-type-field', { groupId: group.id })
  }
}

function hideGroupTitleField() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    group.definition = {
      ...group.definition,
      showTitleField: false
    }
    logEvent('hide-group-title-field', { groupId: group.id })
  }
}

function showAllGroupFields() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    if (group.definition) {
      const {
        showTypeField: _showTypeField,
        showTitleField: _showTitleField,
        ...rest
      } = group.definition
      group.definition = Object.keys(rest).length > 0 ? rest : undefined
      logEvent('show-all-group-fields', { groupId: group.id })
    }
  }
}

// Per-Group Max Depth functions
function setGroupMaxDepth() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    group.maxDepth = 1
    logEvent('set-group-max-depth', { groupId: group.id, maxDepth: 1 })
  }
}

function clearGroupMaxDepth() {
  if (workflowGraph.value.groups.length > 0) {
    const group = workflowGraph.value.groups[0]
    group.maxDepth = null
    logEvent('clear-group-max-depth', { groupId: group.id })
  }
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

function handleGroupDelete(groupId: string) {
  logEvent('group-delete', { groupId })
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

.demo-description {
  padding: 0 10px;
  margin-bottom: 16px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.demo-description code {
  background: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  color: #d63384;
  border: 1px solid #e0e0e0;
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

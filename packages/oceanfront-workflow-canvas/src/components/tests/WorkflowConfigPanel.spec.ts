import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { makeRecord } from 'oceanfront'
import WorkflowConfigPanel from '../WorkflowConfigPanel.vue'
import type {
  WorkflowNode,
  WorkflowGroup,
  WorkflowGraph,
  NodeTypeConfig,
  GroupTypeConfig
} from '../../types/workflow'
import { DEFAULT_LABELS } from '../../constants/labels'

describe('WorkflowConfigPanel', () => {
  const mockNodeTypes: NodeTypeConfig = {
    trigger: {
      type: 'trigger',
      title: 'Trigger',
      configPanelTitle: 'Trigger Configuration',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description'
        }
      ]
    }
  }

  const mockGroupTypes: GroupTypeConfig = {
    group: {
      type: 'group',
      label: 'Group',
      fields: [
        {
          name: 'description',
          type: 'textarea',
          label: 'Description'
        }
      ]
    }
  }

  const mockGraph: WorkflowGraph = {
    nodes: [],
    edges: [],
    groups: []
  }

  describe('panel visibility', () => {
    it('is hidden when no node or group is selected', () => {
      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: null,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      expect(wrapper.find('.workflow-canvas__sidebar').exists()).toBe(false)
    })

    it('is visible when a node is selected', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      expect(wrapper.find('.workflow-canvas__sidebar').exists()).toBe(true)
    })

    it('is visible when a group is selected', () => {
      const group: WorkflowGroup = {
        id: 'group-1',
        kind: 'group',
        label: 'Test Group',
        position: { x: 0, y: 0 },
        size: { w: 300, h: 200 },
        containedIds: []
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: null,
          selectedGroup: group,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      expect(wrapper.find('.workflow-canvas__sidebar').exists()).toBe(true)
    })

    it('is hidden for readonly nodes', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        readonly: true
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      expect(wrapper.find('.workflow-canvas__sidebar').exists()).toBe(false)
    })
  })

  describe('node configuration', () => {
    it('displays node type selector when node has no type', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: '',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      // Should show type selector
      const fields = wrapper.findAll('[type="select"]')
      expect(fields.length).toBeGreaterThan(0)
    })

    it('displays node fields when node has a type', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        },
        global: {
          stubs: {
            'of-field': { template: '<label>{{ label }}</label>', props: ['label'] }
          }
        }
      })

      // Should display fields from type definition
      expect(wrapper.text()).toContain('Title')
      expect(wrapper.text()).toContain('Description')
    })

    it('uses configPanelTitle for panel title', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      expect(wrapper.find('.workflow-canvas__panel-header h3').text()).toBe('Trigger Configuration')
    })

    it('shows delete button for non-locked nodes', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      const deleteButton = wrapper.find('.workflow-canvas__panel-actions of-button')
      expect(deleteButton.exists()).toBe(true)
    })

    it('hides delete button for locked nodes', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        locked: true
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      const deleteButton = wrapper.find('.workflow-canvas__panel-actions of-button')
      expect(deleteButton.exists()).toBe(false)
    })

    it('emits delete-node event when delete button is clicked', async () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      await wrapper.find('.workflow-canvas__panel-actions of-button').trigger('click')
      expect(wrapper.emitted('delete-node')).toBeTruthy()
    })
  })

  describe('group configuration', () => {
    it('displays group label field', () => {
      const group: WorkflowGroup = {
        id: 'group-1',
        kind: 'group',
        label: 'Test Group',
        position: { x: 0, y: 0 },
        size: { w: 300, h: 200 },
        containedIds: []
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: null,
          selectedGroup: group,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        },
        global: {
          stubs: {
            'of-text-field': { template: '<label>{{ label }}</label>', props: ['label'] }
          }
        }
      })

      expect(wrapper.text()).toContain('Title')
    })

    it('displays group type fields', () => {
      const group: WorkflowGroup = {
        id: 'group-1',
        kind: 'group',
        label: 'Test Group',
        position: { x: 0, y: 0 },
        size: { w: 300, h: 200 },
        containedIds: []
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: null,
          selectedGroup: group,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        },
        global: {
          stubs: {
            'of-field': { template: '<label>{{ label }}</label>', props: ['label'] }
          }
        }
      })

      expect(wrapper.text()).toContain('Description')
    })

    it('shows delete button for non-locked groups', () => {
      const group: WorkflowGroup = {
        id: 'group-1',
        kind: 'group',
        label: 'Test Group',
        position: { x: 0, y: 0 },
        size: { w: 300, h: 200 },
        containedIds: []
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: null,
          selectedGroup: group,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      const deleteButton = wrapper.find('.workflow-canvas__panel-actions of-button')
      expect(deleteButton.exists()).toBe(true)
    })

    it('hides delete button for locked groups', () => {
      const group: WorkflowGroup = {
        id: 'group-1',
        kind: 'group',
        label: 'Test Group',
        position: { x: 0, y: 0 },
        size: { w: 300, h: 200 },
        containedIds: [],
        locked: true
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: null,
          selectedGroup: group,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      const deleteButton = wrapper.find('.workflow-canvas__panel-actions of-button')
      expect(deleteButton.exists()).toBe(false)
    })
  })

  describe('definition overrides', () => {
    it('uses node definition field overrides', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        definition: {
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Custom Title Label',
              readonly: true
            }
          ]
        }
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        },
        global: {
          stubs: {
            'of-field': { template: '<label>{{ label }}</label>', props: ['label'] }
          }
        }
      })

      expect(wrapper.text()).toContain('Custom Title Label')
    })

    it('filters out hidden fields', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        definition: {
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Title',
              visible: false
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Description',
              visible: true
            }
          ]
        }
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        },
        global: {
          stubs: {
            'of-field': { template: '<label>{{ label }}</label>', props: ['label'] }
          }
        }
      })

      expect(wrapper.text()).not.toContain('Title')
      expect(wrapper.text()).toContain('Description')
    })
  })

  describe('close button', () => {
    it('emits close event when close button is clicked', async () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowConfigPanel, {
        props: {
          selectedNode: node,
          selectedGroup: null,
          graph: mockGraph,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          groupTypes: mockGroupTypes,
          record: makeRecord()
        }
      })

      await wrapper.find('.workflow-canvas__panel-close').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })
})

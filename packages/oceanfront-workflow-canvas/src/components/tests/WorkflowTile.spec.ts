import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkflowTile from '../WorkflowTile.vue'
import type { WorkflowNode, NodeTypeConfig } from '../../types/workflow'
import { DEFAULT_LABELS } from '../../constants/labels'

describe('WorkflowTile', () => {
  const mockNodeTypes: NodeTypeConfig = {
    trigger: {
      type: 'trigger',
      label: 'Trigger',
      icon: 'hourglass',
      tileLabel: 'Workflow Trigger',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          showInTile: true
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
          showInTile: true
        }
      ]
    },
    action: {
      type: 'action',
      label: 'Action',
      icon: 'gear',
      fields: []
    }
  }

  describe('rendering', () => {
    it('renders node with type', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        data: { title: 'Test Node' }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.workflow-canvas-tile').exists()).toBe(true)
    })

    it('displays node icon from type definition', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      const icon = wrapper.find('.workflow-canvas-tile__icon')
      expect(icon.exists()).toBe(true)
    })

    it('displays node title from data', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        data: { title: 'My Custom Title' }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.text()).toContain('My Custom Title')
    })

    it('displays placeholder when node has no type', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: '',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      const titleText = wrapper.find('.workflow-canvas-tile__title-text')
      expect(titleText.classes()).toContain('workflow-canvas-tile__title-text--placeholder')
    })

    it('applies selected class when selected', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: true,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.find('.workflow-canvas-tile').classes()).toContain(
        'workflow-canvas-tile--selected'
      )
    })

    it('applies dragging class when dragging', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: true,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.find('.workflow-canvas-tile').classes()).toContain(
        'workflow-canvas-tile--dragging'
      )
    })
  })

  describe('fields display', () => {
    it('displays fields marked as showInTile', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          title: 'Test Title',
          description: 'Test Description'
        }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      const content = wrapper.find('.workflow-canvas-tile__content')
      expect(content.exists()).toBe(true)
      expect(content.text()).toContain('Test Description')
    })

    it('does not display fields not marked as showInTile', () => {
      const nodeTypes: NodeTypeConfig = {
        action: {
          type: 'action',
          label: 'Action',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Title',
              showInTile: false
            }
          ]
        }
      }

      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'action',
        position: { x: 0, y: 0 },
        data: { title: 'Hidden Title' }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes,
          viewMode: false
        }
      })

      const content = wrapper.find('.workflow-canvas-tile__content')
      expect(content.exists()).toBe(false)
    })
  })

  describe('definition overrides', () => {
    it('uses definition icon override', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        definition: {
          icon: 'custom-icon'
        }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      // Icon should use the override
      expect(wrapper.vm.displayIcon).toBe('custom-icon')
    })

    it('uses definition placeholder override', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        definition: {
          placeholder: 'Custom Placeholder'
        }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.text()).toContain('Custom Placeholder')
    })

    it('uses definition label override', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        definition: {
          label: 'Custom Label'
        }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.text()).toContain('Custom Label')
    })
  })

  describe('menu button', () => {
    it('shows menu button when not in view mode', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.find('.workflow-canvas-tile__menu').exists()).toBe(true)
    })

    it('hides menu button in view mode', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: true
        }
      })

      expect(wrapper.find('.workflow-canvas-tile__menu').exists()).toBe(false)
    })

    it('hides menu button for readonly nodes', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        readonly: true
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.find('.workflow-canvas-tile__menu').exists()).toBe(false)
    })

    it('emits menu-click event when menu button is clicked', async () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      await wrapper.find('.workflow-canvas-tile__menu').trigger('click')
      expect(wrapper.emitted('menu-click')).toBeTruthy()
    })
  })

  describe('title display priority', () => {
    it('uses placeholder when defined', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        data: { title: 'Data Title' },
        definition: {
          placeholder: 'Placeholder Text'
        }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.text()).toContain('Placeholder Text')
      expect(wrapper.text()).not.toContain('Data Title')
    })

    it('uses data.title when no placeholder', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 },
        data: { title: 'Data Title' }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.text()).toContain('Data Title')
    })

    it('uses tileLabel when no data.title', () => {
      const node: WorkflowNode = {
        id: 'node-1',
        kind: 'trigger',
        position: { x: 0, y: 0 }
      }

      const wrapper = mount(WorkflowTile, {
        props: {
          node,
          selected: false,
          dragging: false,
          labels: DEFAULT_LABELS,
          nodeTypes: mockNodeTypes,
          viewMode: false
        }
      })

      expect(wrapper.text()).toContain('Workflow Trigger')
    })
  })
})

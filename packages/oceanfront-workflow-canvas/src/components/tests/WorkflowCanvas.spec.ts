import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, h, nextTick, onMounted } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { components } from 'oceanfront'
import WorkflowCanvas from '../WorkflowCanvas.vue'
import type { WorkflowGraph, WorkflowKinds } from '../../types/workflow'

const kinds: WorkflowKinds = {
  condition: { addNodeText: '+ Condition', addGroupText: '+ Group' },
  action: { addNodeText: '+ Action' }
}

const createGraph = (): WorkflowGraph => ({
  nodes: [
    { id: 'c1', kind: 'condition', title: 'First' },
    { id: 'c2', kind: 'condition' },
    { id: 'a1', kind: 'action' }
  ],
  groups: [
    {
      id: 'conditions',
      kind: 'condition',
      children: ['c1', 'c2'],
      readonly: true,
      label: 'Conditions'
    },
    { id: 'actions', kind: 'action', children: ['a1'], readonly: true },
    { id: 'empty', kind: 'action', children: [] }
  ]
})

let wrapper: VueWrapper<any>

const mountCanvas = (
  props: Record<string, unknown> = {},
  slots: Record<string, any> = {},
  global: Record<string, unknown> = {}
) => {
  wrapper = mount(WorkflowCanvas, {
    attachTo: document.body,
    global,
    props: {
      modelValue: createGraph(),
      kinds,
      selectedId: null,
      'onUpdate:modelValue': (g: WorkflowGraph) => wrapper.setProps({ modelValue: g }),
      'onUpdate:selectedId': (id: string | null) => wrapper.setProps({ selectedId: id }),
      ...props
    },
    slots
  })
  return wrapper
}

const lastGraph = () => wrapper.props('modelValue') as WorkflowGraph
const children = (id: string) => lastGraph().groups.find(g => g.id === id)!.children
const entity = (id: string) => wrapper.find(`[data-workflow-entity-id="${id}"]`)
const keydown = async (key: string) => {
  wrapper
    .find('.workflow-canvas')
    .element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  await nextTick()
}
const drag = async (from: [number, number], to: [number, number], id: string) => {
  await entity(id).trigger('mousedown', { button: 0, clientX: from[0], clientY: from[1] })
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: to[0], clientY: to[1] }))
  document.dispatchEvent(new MouseEvent('mouseup'))
  await nextTick()
}

describe('WorkflowCanvas', () => {
  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  describe('rendering', () => {
    it('renders nodes, groups and derived arrows', () => {
      mountCanvas()
      expect(wrapper.findAll('.workflow-canvas-node')).toHaveLength(3)
      expect(wrapper.findAll('.workflow-canvas-group')).toHaveLength(3)
      expect(wrapper.findAll('path.workflow-canvas-connector')).toHaveLength(3)
      expect(entity('conditions').find('.workflow-canvas-group__title').text()).toBe('Conditions')
    })

    it('positions entities from the structure', () => {
      mountCanvas()
      expect(entity('c1').attributes('style')).toContain('left: 70px; top: 70px')
      expect(entity('c2').attributes('style')).toContain('top: 210px')
      expect(entity('actions').attributes('style')).toContain('left: 500px')
    })

    it('passes nodes to the tile slot', () => {
      mountCanvas({}, { tile: ({ node }: any) => h('span', { class: 'tile' }, node.id) })
      expect(entity('c1').find('.tile').text()).toBe('c1')
      expect(entity('c2').find('.tile').exists()).toBe(false)
    })

    it('does not emit on mount', async () => {
      mountCanvas()
      await nextTick()
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  describe('adding', () => {
    it('shows the add-after menu only on the last child', () => {
      mountCanvas()
      expect(entity('c1').find('.workflow-canvas-node__hover-menu').exists()).toBe(false)
      expect(entity('c2').find('.workflow-canvas-node__hover-menu').exists()).toBe(true)
      expect(entity('a1').findAll('.workflow-canvas-node__hover-menu-button')).toHaveLength(1)
      expect(
        entity('conditions').find('.workflow-canvas-group__hover-menu-connection').exists()
      ).toBe(false)
    })

    it('adds a node after the last child and selects it', async () => {
      mountCanvas()
      await entity('c2').find('.workflow-canvas-node__hover-menu-button').trigger('click')
      const added = lastGraph().nodes.find(n => !['c1', 'c2', 'a1'].includes(n.id))!
      expect(added.kind).toBe('condition')
      expect(children('conditions')).toEqual(['c1', 'c2', added.id])
      expect(wrapper.props('selectedId')).toBe(added.id)
    })

    it('does not start a drag from the add-after menu', async () => {
      mountCanvas()
      const button = entity('c2').find('.workflow-canvas-node__hover-menu-button')
      await button.trigger('mousedown', { button: 0, clientX: 100, clientY: 250 })
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 50 }))
      document.dispatchEvent(new MouseEvent('mouseup'))
      await nextTick()
      expect(entity('c2').classes()).not.toContain('workflow-canvas-node--dragging')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('adds a nested group after the last child', async () => {
      mountCanvas()
      await entity('c2').findAll('.workflow-canvas-node__hover-menu-button')[1].trigger('click')
      const added = lastGraph().groups.find(
        g => !['conditions', 'actions', 'empty'].includes(g.id)
      )!
      expect(added).toMatchObject({ kind: 'condition', children: [] })
      expect(children('conditions')[2]).toBe(added.id)
    })

    it('hides add-group when maxGroupDepth is reached', () => {
      mountCanvas({ kinds: { ...kinds, condition: { ...kinds.condition, maxGroupDepth: 0 } } })
      expect(entity('c2').findAll('.workflow-canvas-node__hover-menu-button')).toHaveLength(1)
    })

    it('adds directly to an empty group with a single option', async () => {
      mountCanvas()
      expect(entity('empty').find('.workflow-canvas-group__empty-menu').exists()).toBe(false)
      await entity('empty').find('.workflow-canvas-group__empty-plus-button').trigger('click')
      expect(children('empty')).toHaveLength(1)
    })

    it('inserts a node between two nodes with the plus button', async () => {
      mountCanvas()
      await wrapper.find('.workflow-canvas-plus-placeholder__button').trigger('click')
      const ids = children('conditions')
      expect(ids).toHaveLength(3)
      expect([ids[0], ids[2]]).toEqual(['c1', 'c2'])
    })
  })

  describe('dragging', () => {
    it('reorders nodes inside a group', async () => {
      mountCanvas()
      const graph = createGraph()
      graph.nodes.push({ id: 'c3', kind: 'condition' })
      graph.groups[0].children.push('c3')
      await wrapper.setProps({ modelValue: graph })
      await drag([80, 80], [80, 415], 'c1')
      expect(children('conditions')).toEqual(['c2', 'c3', 'c1'])
    })
  })

  describe('panel', () => {
    it('opens for a node from the tile menu with the panel slots', async () => {
      mountCanvas(
        {},
        {
          panel: ({ node }: any) => h('div', { class: 'panel-body' }, node?.id),
          'panel-actions': ({ close }: any) => h('button', { class: 'panel-close', onClick: close })
        }
      )
      await entity('c1').find('.workflow-canvas-tile__menu').trigger('click')
      expect(wrapper.props('selectedId')).toBe('c1')
      expect(wrapper.find('.workflow-canvas__panel-header h3').text()).toBe('First')
      expect(wrapper.find('.panel-body').text()).toBe('c1')

      await wrapper.find('.panel-close').trigger('click')
      expect(wrapper.props('selectedId')).toBeNull()
      expect(wrapper.find('.panel-body').exists()).toBe(false)
    })

    it('does not open for readonly groups', async () => {
      mountCanvas()
      await entity('conditions').trigger('click')
      expect(wrapper.props('selectedId')).toBeNull()
      await wrapper.setProps({ selectedId: 'conditions' })
      expect(wrapper.find('.workflow-canvas__sidebar').exists()).toBe(false)
    })

    it('opens for editable groups', async () => {
      mountCanvas()
      await entity('empty').trigger('click')
      expect(wrapper.props('selectedId')).toBe('empty')
      expect(wrapper.find('.workflow-canvas__sidebar').exists()).toBe(true)
    })

    it('does not open a group after dragging it', async () => {
      mountCanvas()
      await drag([960, 60], [990, 90], 'empty')
      await entity('empty').trigger('click')
      expect(wrapper.props('selectedId')).toBeNull()
    })

    it('opens a group when the pointer barely moves during the click', async () => {
      mountCanvas()
      await drag([960, 60], [962, 61], 'empty')
      await entity('empty').trigger('click')
      expect(wrapper.props('selectedId')).toBe('empty')
    })

    it('does not re-emit the selection when reopening the selected node', async () => {
      mountCanvas({ selectedId: 'c1' })
      await entity('c1').find('.workflow-canvas-tile__menu').trigger('click')
      expect(wrapper.emitted('update:selectedId')).toBeUndefined()
    })

    it('keeps panel content mounted while the graph changes', async () => {
      let mounts = 0
      const Field = defineComponent({
        setup: () => {
          onMounted(() => mounts++)
          return () => h('input', { class: 'panel-input' })
        }
      })
      mountCanvas({ selectedId: 'c1' }, { panel: () => h(Field) })
      await nextTick()
      const graph = lastGraph()
      await wrapper.setProps({
        modelValue: {
          ...graph,
          nodes: graph.nodes.map(n => (n.id === 'c1' ? { ...n, title: 'Changed' } : n))
        }
      })
      await nextTick()
      expect(mounts).toBe(1)
    })

    it('removes the selected entity via the panel scope', async () => {
      mountCanvas(
        { selectedId: 'c1' },
        {
          'panel-actions': ({ remove }: any) =>
            h('button', { class: 'panel-delete', onClick: remove })
        }
      )
      await wrapper.find('.panel-delete').trigger('click')
      expect(lastGraph().nodes.find(n => n.id === 'c1')).toBeUndefined()
      expect(children('conditions')).toEqual(['c2'])
      expect(wrapper.props('selectedId')).toBeNull()
    })
  })

  describe('keyboard', () => {
    it('clears the selection on Escape', async () => {
      mountCanvas({ selectedId: 'c1' })
      await keydown('Escape')
      expect(wrapper.props('selectedId')).toBeNull()
    })

    it('ignores other keys and Escape from the panel', async () => {
      mountCanvas({ selectedId: 'c1' }, {}, { components: { OfOverlay: components.OfOverlay } })
      await keydown('Delete')
      await keydown('ArrowDown')
      wrapper
        .find('.workflow-canvas__sidebar')
        .element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await nextTick()
      expect(wrapper.props('selectedId')).toBe('c1')
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  describe('full width', () => {
    it('teleports to body and exits on Escape', async () => {
      const host = document.createElement('div')
      document.body.appendChild(host)
      wrapper = mount(WorkflowCanvas, {
        attachTo: host,
        props: {
          modelValue: createGraph(),
          kinds,
          class: 'host-class',
          selectedId: 'c1',
          'onUpdate:selectedId': (id: string | null) => wrapper.setProps({ selectedId: id })
        }
      })
      const root = () => document.querySelector('.workflow-canvas-wrapper') as HTMLElement
      expect(host.contains(root())).toBe(true)
      expect(root().classList).toContain('host-class')

      await wrapper.find('.workflow-canvas__fullwidth-toggle').trigger('click')
      expect(root().parentElement).toBe(document.body)
      expect(root().classList).toContain('workflow-canvas-wrapper--full-width')

      root()
        .querySelector('.workflow-canvas')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await nextTick()
      expect(root().classList).not.toContain('workflow-canvas-wrapper--full-width')
      expect(wrapper.props('selectedId')).toBe('c1')
    })
  })

  describe('view mode', () => {
    it('hides editing affordances and the panel', () => {
      mountCanvas({ mode: 'view', selectedId: 'c1' })
      expect(wrapper.find('.workflow-canvas-wrapper').classes()).toContain(
        'workflow-canvas-wrapper--view-mode'
      )
      expect(wrapper.find('.workflow-canvas-node__hover-menu').exists()).toBe(false)
      expect(wrapper.find('.workflow-canvas-plus-placeholder').exists()).toBe(false)
      expect(wrapper.find('.workflow-canvas-group__empty-container').exists()).toBe(false)
      expect(wrapper.find('.workflow-canvas-tile__menu').exists()).toBe(false)
      expect(wrapper.find('.workflow-canvas__sidebar').exists()).toBe(false)
    })
  })
})

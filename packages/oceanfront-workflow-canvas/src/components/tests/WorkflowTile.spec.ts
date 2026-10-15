import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkflowTile from '../WorkflowTile.vue'
import type { WorkflowNode } from '../../types/workflow'

const node = (patch: Partial<WorkflowNode> = {}): WorkflowNode => ({
  id: 'n1',
  kind: 'condition',
  ...patch
})

describe('WorkflowTile', () => {
  it('renders the title', () => {
    const wrapper = mount(WorkflowTile, { props: { node: node({ title: 'Status' }) } })
    const title = wrapper.find('.workflow-canvas-tile__title-text')
    expect(title.text()).toBe('Status')
    expect(title.classes()).not.toContain('workflow-canvas-tile__title-text--placeholder')
  })

  it('renders the placeholder when there is no title', () => {
    const wrapper = mount(WorkflowTile, { props: { node: node({ placeholder: 'Select field' }) } })
    const title = wrapper.find('.workflow-canvas-tile__title-text')
    expect(title.text()).toBe('Select field')
    expect(title.classes()).toContain('workflow-canvas-tile__title-text--placeholder')
  })

  it('renders slot content only when the node has a title', () => {
    const slots = { default: '<span class="tile-body">body</span>' }
    expect(
      mount(WorkflowTile, { props: { node: node() }, slots })
        .find('.tile-body')
        .exists()
    ).toBe(false)
    const wrapper = mount(WorkflowTile, { props: { node: node({ title: 'T' }) }, slots })
    expect(wrapper.find('.workflow-canvas-tile__field .tile-body').exists()).toBe(true)
  })

  it('omits the content block without a slot', () => {
    const wrapper = mount(WorkflowTile, { props: { node: node({ title: 'T' }) } })
    expect(wrapper.find('.workflow-canvas-tile__content').exists()).toBe(false)
  })

  it('emits menu-click from the menu button', async () => {
    const wrapper = mount(WorkflowTile, { props: { node: node() } })
    await wrapper.find('.workflow-canvas-tile__menu').trigger('click')
    expect(wrapper.emitted('menu-click')).toHaveLength(1)
  })

  it('hides the menu in view mode', () => {
    const wrapper = mount(WorkflowTile, { props: { node: node(), viewMode: true } })
    expect(wrapper.find('.workflow-canvas-tile__menu').exists()).toBe(false)
  })
})

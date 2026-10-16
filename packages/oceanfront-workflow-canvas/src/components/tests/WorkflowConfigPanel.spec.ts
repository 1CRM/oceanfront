import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { components } from 'oceanfront'
import WorkflowConfigPanel from '../WorkflowConfigPanel.vue'

describe('WorkflowConfigPanel', () => {
  it('renders the title, content and actions', () => {
    const wrapper = mount(WorkflowConfigPanel, {
      props: { title: 'Condition' },
      slots: {
        default: '<div class="body">body</div>',
        actions: '<button class="save">Save</button>'
      }
    })
    expect(wrapper.find('.workflow-canvas__panel-header h3').text()).toBe('Condition')
    expect(wrapper.find('.workflow-canvas__panel-content .body').exists()).toBe(true)
    expect(wrapper.find('.workflow-canvas__panel-actions .save').exists()).toBe(true)
  })

  it('emits close from the close button', async () => {
    const wrapper = mount(WorkflowConfigPanel)
    await wrapper.find('.workflow-canvas__panel-close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('stays open when focus leaves or Escape is pressed', async () => {
    vi.useFakeTimers()
    const outside = document.createElement('input')
    document.body.appendChild(outside)
    const wrapper = mount(WorkflowConfigPanel, {
      attachTo: document.body,
      global: { components: { OfOverlay: components.OfOverlay } },
      slots: { default: '<input class="inner" />' }
    })
    const inner = wrapper.find('.inner').element as HTMLInputElement
    inner.focus()
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    outside.focus()
    inner.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }))
    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.workflow-canvas__panel-header').isVisible()).toBe(true)
    expect(wrapper.find('.of-overlay').classes()).not.toContain('of--capture')
    wrapper.unmount()
    outside.remove()
    vi.useRealTimers()
  })
})

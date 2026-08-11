import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { OfIcon } from '../Icon'
import OfTabs from '../Tabs.vue'

test('displays message', () => {
  const wrapper = mount(OfTabs, {
    props: {
      items: ['One', 'Two']
    },
    global: {
      components: {
        OfIcon
      }
    }
  })

  expect(wrapper.text()).toContain('Two')
})

test('renders item postfix', () => {
  const wrapper = mount(OfTabs, {
    props: {
      items: [
        {
          text: 'Contacts',
          key: 0,
          postfix: h('div', { class: 'new-record-button' }, 'create')
        }
      ]
    },
    global: {
      components: {
        OfIcon
      }
    }
  })

  expect(wrapper.find('.of-tab-postfix').exists()).toBe(true)
  expect(wrapper.find('.new-record-button').text()).toBe('create')
})

test('Tab on last tab moves focus into postfix without clearing focusedTabKey', async () => {
  const wrapper = mount(OfTabs, {
    attachTo: document.body,
    props: {
      items: [
        { text: 'One' },
        {
          text: 'Two',
          postfix: h(
            'button',
            { type: 'button', class: 'create-btn' },
            'create'
          )
        }
      ]
    },
    global: {
      components: {
        OfIcon
      }
    }
  })

  const tabs = wrapper.findAll('[role="tab"]')
  const lastTab = tabs[tabs.length - 1]
  const postfixButton = wrapper.find('.create-btn')

  ;(lastTab.element as HTMLElement).focus()
  // Flush onFocusTab's deferred focusTab()/openFocusedSubMenu()
  await nextTick()
  await nextTick()
  expect(wrapper.vm.focusedTabKey).toBe(1)
  expect(document.activeElement).toBe(lastTab.element)

  await lastTab.trigger('keydown', { key: 'Tab', shiftKey: false })
  await nextTick()

  expect(document.activeElement).toBe(postfixButton.element)
  expect(wrapper.vm.focusedTabKey).toBe(1)

  wrapper.unmount()
})

test('Tab from last-tab postfix clears focusedTabKey so focus can leave', async () => {
  const wrapper = mount(OfTabs, {
    attachTo: document.body,
    props: {
      items: [
        { text: 'One' },
        {
          text: 'Two',
          postfix: h(
            'button',
            { type: 'button', class: 'create-btn' },
            'create'
          )
        }
      ]
    },
    global: {
      components: {
        OfIcon
      }
    }
  })

  const tabs = wrapper.findAll('[role="tab"]')
  const lastTab = tabs[tabs.length - 1]
  const postfixButton = wrapper.find('.create-btn')

  ;(lastTab.element as HTMLElement).focus()
  await nextTick()
  await nextTick()

  await lastTab.trigger('keydown', { key: 'Tab', shiftKey: false })
  await nextTick()
  expect(document.activeElement).toBe(postfixButton.element)
  expect(wrapper.vm.focusedTabKey).toBe(1)

  // keydown on postfix must bubble to the tab header navigate handler
  await postfixButton.trigger('keydown', { key: 'Tab', shiftKey: false })
  await nextTick()

  expect(wrapper.vm.focusedTabKey).toBeUndefined()

  wrapper.unmount()
})

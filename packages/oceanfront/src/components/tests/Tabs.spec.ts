import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { vi } from 'vitest'
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

test('Shift+Tab from tab header focuses previous tab postfix when present', async () => {
  const wrapper = mount(OfTabs, {
    attachTo: document.body,
    props: {
      items: [
        {
          text: 'One',
          postfix: h(
            'button',
            { type: 'button', class: 'create-btn' },
            'create'
          )
        },
        { text: 'Two' }
      ]
    },
    global: {
      components: {
        OfIcon
      }
    }
  })

  const tabs = wrapper.findAll('[role="tab"]')
  const secondTab = tabs[1]
  const postfixButton = wrapper.find('.create-btn')

  ;(secondTab.element as HTMLElement).focus()
  await nextTick()
  await nextTick()
  expect(wrapper.vm.focusedTabKey).toBe(1)
  expect(document.activeElement).toBe(secondTab.element)

  await secondTab.trigger('keydown', { key: 'Tab', shiftKey: true })
  await nextTick()
  await nextTick()

  expect(document.activeElement).toBe(postfixButton.element)
  expect(wrapper.vm.focusedTabKey).toBe(0)

  wrapper.unmount()
})

test('Shift+Tab reveals previous tab before focusing its postfix', async () => {
  // App submenu CSS hides create buttons with display:none until the tab is
  // .of--focused / :focus-within. focusedTabKey must be updated before focus(),
  // otherwise focus is a no-op and the following Shift+Tab skips the postfix.
  const wrapper = mount(OfTabs, {
    attachTo: document.body,
    props: {
      items: [
        {
          text: 'One',
          postfix: h('div', { class: 'new-record-button' }, [
            h('button', { type: 'button', class: 'create-btn' }, 'create')
          ])
        },
        { text: 'Two' }
      ]
    },
    global: {
      components: {
        OfIcon
      }
    }
  })

  const tabs = wrapper.findAll('[role="tab"]')
  const secondTab = tabs[1]
  const postfixButton = wrapper.find('.create-btn')
  const focusSpy = vi
    .spyOn(postfixButton.element as HTMLElement, 'focus')
    .mockImplementation(function (this: HTMLElement, ...args) {
      expect(wrapper.vm.focusedTabKey).toBe(0)
      expect(tabs[0].classes()).toContain('of--focused')
      return HTMLElement.prototype.focus.apply(this, args as [])
    })

  ;(secondTab.element as HTMLElement).focus()
  await nextTick()
  await nextTick()
  expect(wrapper.vm.focusedTabKey).toBe(1)

  await secondTab.trigger('keydown', { key: 'Tab', shiftKey: true })
  await nextTick()
  await nextTick()

  expect(focusSpy).toHaveBeenCalled()
  expect(document.activeElement).toBe(postfixButton.element)
  expect(wrapper.vm.focusedTabKey).toBe(0)

  focusSpy.mockRestore()
  wrapper.unmount()
})

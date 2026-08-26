import { mount } from '@vue/test-utils'
import {
  Comment,
  Fragment,
  createVNode,
  defineComponent,
  h,
  nextTick
} from 'vue'
import { describe, expect, it } from 'vitest'
import DataTable from '../DataTable.vue'
import { Oceanfront } from '../../index'

const CellIcon = defineComponent({
  name: 'CellIcon',
  render: () => h('i', { class: 'icon' })
})

const LinkWidget = defineComponent({
  name: 'LinkWidget',
  props: { text: { type: String, required: true } },
  render() {
    return h('a', { class: 'of-link', href: '#' }, this.text)
  }
})

/**
 * The shape the list view pre-builds for a link cell: the widget sits inside a
 * fragment, next to the module icon.
 */
const cell = (text: string) => ({
  value: h('div', { class: 'add-fields' }, [
    h('div', { class: 'add-icon' }, [
      h(CellIcon),
      h(Fragment, null, [h(LinkWidget, { key: text, text })])
    ]),
    createVNode(Comment)
  ])
})

const headers = [
  { value: 'name', text: 'Name' },
  { value: 'city', text: 'City' }
]

const makeItems = () => [
  { id: '1', name: cell('Ada Lovelace'), city: cell('Vancouver') },
  { id: '2', name: cell('Alan Turing'), city: cell('Victoria') }
]

describe('turning infinite scroll on and off over rows that are already rendered', () => {
  it('keeps the cell content', async () => {
    const items = makeItems()
    const wrapper = mount(DataTable, {
      props: { headers, items, rowsSelector: true },
      global: { plugins: [Oceanfront] }
    })
    await nextTick()

    expect(wrapper.findAll('a.of-link')).toHaveLength(4)

    // The list view flips both of these together when the option comes on.
    await wrapper.setProps({ infiniteScrollActive: true, rowKey: 'id' })
    await nextTick()
    await nextTick()

    expect(wrapper.findAll('a.of-link')).toHaveLength(4)
    expect(wrapper.html()).toContain('Ada Lovelace')

    await wrapper.setProps({ infiniteScrollActive: false, rowKey: undefined })
    await nextTick()
    await nextTick()

    expect(wrapper.findAll('a.of-link')).toHaveLength(4)
    expect(wrapper.html()).toContain('Ada Lovelace')
  })
})

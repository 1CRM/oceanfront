import { flushPromises, mount } from '@vue/test-utils'
import { Fragment, Suspense, defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import OfDataType from '../DataType/DataType'
import { cloneRenderTree } from '../../lib/datatype'

/**
 * A list view builds a cell once and hands the same tree back on every render,
 * so rendering must not consume it: the row is mounted again whenever the list
 * is rekeyed or a window scrolls it out and back.
 */
const cachedCell = () =>
  ({
    value: h('div', { class: 'add-fields' }, [
      h(Fragment, null, [h('a', { href: '#' }, 'Ada Lovelace')]),
      h('div', { class: 'postfix' }, [h('div', { class: 'title' }, 'CTO')])
    ])
  }) as any

const Widget = () => h('span', { class: 'widget' }, 'Ada Lovelace')

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
 * Name, select, email, and most other list-view formatters are async setup
 * components stored in the row. Cloning a spent one with `cloneVNode` keeps
 * Vue's resolved subtree, so the remounted cell is empty.
 */
const AsyncName = defineComponent({
  props: { text: { type: String, required: true } },
  async setup(props) {
    await Promise.resolve()
    return () => h('a', { class: 'of-link', href: '#' }, props.text)
  }
})

const cachedAsyncCell = () =>
  ({
    value: h('div', { class: 'add-fields' }, [
      h(Fragment, null, [
        h(AsyncName, { key: 'Ada Lovelace', text: 'Ada Lovelace' })
      ])
    ])
  }) as any

/**
 * The shape a list-view name cell actually has: module icon plus a link widget
 * inside a fragment. Those are the pieces that go missing when infinite
 * scrolling is turned on over rows that were already on screen.
 */
const cachedComponentCell = () =>
  ({
    value: h('div', { class: 'add-fields' }, [
      h('div', { class: 'add-icon' }, [
        h(CellIcon),
        h(Fragment, null, [
          h(LinkWidget, { key: 'Ada Lovelace', text: 'Ada Lovelace' })
        ])
      ])
    ])
  }) as any

/** Widget cells wrap their content in a suspense boundary, passed as a slot. */
const cachedWidgetCell = () =>
  ({
    value: h('div', { class: 'add-fields' }, [
      h(Suspense, null, { default: h(Widget) })
    ])
  }) as any

/** The slot may just as well be the function Vue expects, not a bare tree. */
const cachedFunctionSlotCell = () =>
  ({
    value: h('div', { class: 'add-fields' }, [
      h(Suspense, null, { default: () => h(Widget) })
    ])
  }) as any

const Host = defineComponent({
  props: {
    cell: { type: Object, required: true },
    shown: { type: Boolean, default: true }
  },
  render() {
    return h(
      'div',
      null,
      this.shown ? [h(OfDataType, { value: this.cell })] : []
    )
  }
})

const remount = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.setProps({ shown: false })
  await wrapper.setProps({ shown: true })
}

describe('OfDataType', () => {
  it('leaves the cached tree unmounted, so it can be rendered again', async () => {
    const cell = cachedCell()
    const children = cell.value.children as any[]
    const originalChildren = children.slice()

    const wrapper = mount(Host, { props: { cell } })
    const first = wrapper.html()

    expect(first).toContain('Ada Lovelace')
    // Mounting records the DOM on the vnodes it is given and rewrites their
    // children in place, which is what would leave the cached tree spent.
    expect(cell.value.el).toBe(null)
    expect(children).toEqual(originalChildren)

    await remount(wrapper)
    expect(wrapper.html()).toBe(first)
  })

  it('renders a cached tree whose content is held in a slot again', async () => {
    const wrapper = mount(Host, { props: { cell: cachedWidgetCell() } })

    const first = wrapper.html()
    await remount(wrapper)

    expect(wrapper.html()).toBe(first)
    expect(first).toContain('Ada Lovelace')
  })

  it('renders a cached tree whose slot is a function again', async () => {
    const wrapper = mount(Host, { props: { cell: cachedFunctionSlotCell() } })

    const first = wrapper.html()
    await remount(wrapper)

    expect(wrapper.html()).toBe(first)
    expect(first).toContain('Ada Lovelace')
  })

  it('carries the slot flags Vue set over to the copy', () => {
    const slot = Object.assign(() => h(Widget), { _: 1, _ns: true })
    const tree = h(Suspense, null, { default: slot }) as any
    tree.children._ = 1

    const slots = (cloneRenderTree(tree) as any).children

    expect(slots.default).not.toBe(slot)
    expect(slots.default._).toBe(1)
    expect(slots.default._ns).toBe(true)
    expect(slots._).toBe(1)
  })

  it('patches a spent tree when the same cell starts cloning in place', async () => {
    const cell = cachedComponentCell()
    const Host = defineComponent({
      props: {
        cell: { type: Object, required: true },
        clone: { type: Boolean, default: false }
      },
      render() {
        const tree = this.clone
          ? cloneRenderTree(this.cell.value)
          : this.cell.value
        return h('div', null, [tree])
      }
    })
    const wrapper = mount(Host, { props: { cell, clone: false } })
    expect(wrapper.findAll('a.of-link')).toHaveLength(1)
    expect(wrapper.find('i.icon').exists()).toBe(true)

    await wrapper.setProps({ clone: true })
    expect(wrapper.findAll('a.of-link')).toHaveLength(1)
    expect(wrapper.find('i.icon').exists()).toBe(true)
    expect(wrapper.html()).toContain('Ada Lovelace')
  })

  it('renders a spent async formatter again, the way a paged name cell is spent', async () => {
    const cell = cachedAsyncCell()
    const spent = mount({
      render: () => h(Suspense, null, { default: () => cell.value })
    })
    await flushPromises()
    expect(spent.html()).toContain('Ada Lovelace')
    expect(cell.value.el).not.toBe(null)
    spent.unmount()

    const wrapper = mount({
      render: () =>
        h(Suspense, null, {
          default: () => h(OfDataType, { value: cell })
        })
    })
    await flushPromises()
    expect(wrapper.findAll('a.of-link')).toHaveLength(1)
    expect(wrapper.html()).toContain('Ada Lovelace')
  })

  it('renders a tree Vue already mounted, the way a paged list spends its cells', async () => {
    const cell = cachedComponentCell()
    const spent = mount({ render: () => cell.value })
    expect(spent.html()).toContain('Ada Lovelace')
    expect(spent.find('i.icon').exists()).toBe(true)
    expect(cell.value.el).not.toBe(null)
    spent.unmount()

    const wrapper = mount(Host, { props: { cell } })
    expect(wrapper.find('a.of-link').exists()).toBe(true)
    expect(wrapper.find('i.icon').exists()).toBe(true)

    await remount(wrapper)
    expect(wrapper.findAll('a.of-link')).toHaveLength(1)
    expect(wrapper.html()).toContain('Ada Lovelace')
  })

  it('hands a value that is not a tree straight through', () => {
    const value = { value: 'Ada Lovelace' } as any

    expect(cloneRenderTree(value.value)).toBe(value.value)
    expect(mount(Host, { props: { cell: value } }).html()).toContain(
      'Ada Lovelace'
    )
  })
})

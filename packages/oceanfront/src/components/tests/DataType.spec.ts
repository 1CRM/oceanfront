import { mount } from '@vue/test-utils'
import {
  Fragment,
  Suspense,
  defineComponent,
  h,
  provide,
  shallowRef
} from 'vue'
import { describe, expect, it } from 'vitest'
import OfDataType from '../DataType/DataType'
import { cloneRenderTree, reuseRenderTreesKey } from '../../lib/datatype'

/**
 * An infinite list view builds a cell once and hands the same tree back on every
 * render, so rendering must not consume it: the window mounts a row again every
 * time it scrolls back into view.
 */
const cachedCell = () =>
  ({
    value: h('div', { class: 'add-fields' }, [
      h(Fragment, null, [h('a', { href: '#' }, 'Ada Lovelace')]),
      h('div', { class: 'postfix' }, [h('div', { class: 'title' }, 'CTO')])
    ])
  }) as any

const Widget = () => h('span', { class: 'widget' }, 'Ada Lovelace')

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
    shown: { type: Boolean, default: true },
    reuse: { type: Boolean, default: true }
  },
  setup(props) {
    if (props.reuse) provide(reuseRenderTreesKey, shallowRef(true))
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

  it('hands the tree straight through when nothing asks for reuse', () => {
    const cell = cachedCell()

    const wrapper = mount(Host, { props: { cell, reuse: false } })

    expect(wrapper.html()).toContain('Ada Lovelace')
    // Copying costs a walk of the tree, so a table that renders each cell once
    // pays nothing: the vnode it was given is the one that gets mounted.
    expect(cell.value.el).not.toBe(null)
  })
})

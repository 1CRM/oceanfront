import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, afterEach } from 'vitest'
import { computed, h, isVNode, nextTick, provide, ref } from 'vue'
import OfDataType from '../../components/DataType/DataType'
import {
  createVirtualCellCache,
  dataTableVirtualScrollKey,
  freshVNode,
  wrapFreshVNode
} from '../virtual_scroll_vnode'

describe('virtual_scroll_vnode', () => {
  it('freshVNode returns a new tree that does not share the source vnode', () => {
    const source = h('span', { class: 'cell' }, 'Account')
    const cloned = freshVNode(source) as any
    expect(isVNode(cloned)).toBe(true)
    expect(cloned).not.toBe(source)
    expect(cloned.type).toBe('span')
    expect(cloned.children).toBe('Account')
  })

  it('preserves vnode keys so remounts reuse async cell instances', () => {
    const Comp = {
      name: 'NamedCell',
      setup: () => () => h('a', { class: 'of-link' }, 'Ada')
    }
    const source = h(Comp, { key: 'name-Ada', label: 'Ada' })
    expect(source.key).toBe('name-Ada')

    const cloned = freshVNode(source) as any
    expect(cloned).not.toBe(source)
    expect(cloned.key).toBe('name-Ada')
    expect(cloned.props).not.toBe(source.props)
  })

  it('wrapFreshVNode always clones even without Suspense', () => {
    const source = h('div', null, 'value')
    const wrapped = wrapFreshVNode(source, false) as any
    expect(isVNode(wrapped)).toBe(true)
    expect(wrapped).not.toBe(source)
    expect(wrapped.type).toBe('div')
  })

  it('wrapFreshVNode for virtual scroll mounts one cell tree keyed by source identity', () => {
    const source = h('div', null, 'value')
    const wrapped = wrapFreshVNode(source, true) as any
    expect(isVNode(wrapped)).toBe(true)
    expect(wrapped.type).toHaveProperty('name', 'OfVirtualCellMount')
    expect(typeof wrapped.key).toBe('number')
    const again = wrapFreshVNode(source, true) as any
    expect(again.key).toBe(wrapped.key)
  })

  it('does not share props with the source, so remounts cannot mutate the cache', () => {
    const source = h('div', { class: 'add-fields' }, [
      h('a', { class: 'of-link' }, 'Ada'),
      h('div', { class: 'postfix' }, 'Title')
    ])
    const cloned = freshVNode(source) as any
    expect(cloned.props).not.toBe(source.props)
    expect(cloned.children).not.toBe(source.children)
    cloned.props.class = 'mutated'
    expect(source.props?.class).toBe('add-fields')
    expect((source.children as any[]).length).toBe(2)
  })

  it('flattens nested children arrays so cloned add-fields is not a fragment nest', () => {
    const name = h('a', { key: 'name-Ada', class: 'of-link' }, 'Ada')
    const source = h('div', { class: 'add-fields' }, [
      [name],
      h('div', { class: 'postfix' }, 'Title')
    ])
    expect(Array.isArray((source.children as any[])[0])).toBe(true)

    const cloned = freshVNode(source) as any
    expect(cloned.children.map((child: any) => Array.isArray(child))).toEqual([
      false,
      false
    ])
    expect(cloned.children).toHaveLength(2)
    expect(cloned.children[0].type).toBe('a')
    expect(cloned.children[0].key).toBe('name-Ada')
    expect(cloned.children[1].props.class).toBe('postfix')
  })

  it('createVirtualCellCache reuses the wrapped vnode while source is unchanged', () => {
    const wrap = createVirtualCellCache()
    const source = h('div', null, 'value')
    const first = wrap(source)
    const second = wrap(source)
    expect(second).toBe(first)
    expect(wrap(h('div', null, 'other'))).not.toBe(first)
  })
})

const setupCounts = { asyncName: 0 }

const AsyncName = {
  name: 'AsyncName',
  props: { label: { type: String, required: true } },
  async setup(props: { label: string }) {
    setupCounts.asyncName += 1
    await Promise.resolve()
    return () => [h('a', { class: 'of-link' }, props.label), undefined]
  }
}

const SlowName = {
  name: 'SlowName',
  props: { label: { type: String, required: true } },
  async setup(props: { label: string }) {
    await new Promise((resolve) => setTimeout(resolve, 30))
    return () => [h('a', { class: 'of-link' }, props.label), undefined]
  }
}

const cellValue = (label: string, Name: any = AsyncName) => ({
  value: h('div', { class: 'add-fields' }, [
    [h(Name, { key: `name-${label}`, label })],
    h('div', { class: 'postfix' }, 'Title')
  ])
})

const provideVirtualScroll = () =>
  provide(
    dataTableVirtualScrollKey,
    computed(() => true)
  )

const mountCell = (initial = 'Ada', Name: any = AsyncName) => {
  const tick = ref(0)
  const current = ref(cellValue(initial, Name))
  const Host = {
    setup() {
      provideVirtualScroll()
      return () =>
        h('div', { 'data-tick': tick.value }, [
          h(OfDataType, { value: current.value })
        ])
    }
  }
  return { wrapper: mount(Host, { attachTo: document.body }), tick, current }
}

afterEach(() => {
  document.body.innerHTML = ''
  setupCounts.asyncName = 0
})

describe('OfDataType virtual-scroll cells', () => {
  it('keeps a single name link when the parent re-renders', async () => {
    const { wrapper, tick } = mountCell()
    await flushPromises()
    expect(wrapper.findAll('a.of-link')).toHaveLength(1)
    expect(wrapper.get('a.of-link').text()).toBe('Ada')

    const dataType = wrapper.findComponent(OfDataType)
    const mountedTree = (dataType.vm as any).$.subTree

    tick.value += 1
    await nextTick()
    await flushPromises()

    expect((dataType.vm as any).$.subTree).toBe(mountedTree)
    expect(wrapper.findAll('a.of-link')).toHaveLength(1)
    expect(wrapper.get('a.of-link').text()).toBe('Ada')
  })

  it('replaces the name when the formatted value changes, without merging', async () => {
    const { wrapper, current } = mountCell('Ada')
    await flushPromises()
    expect(wrapper.get('a.of-link').text()).toBe('Ada')

    current.value = cellValue('Bea')
    await nextTick()
    await flushPromises()

    const links = wrapper.findAll('a.of-link')
    expect(links).toHaveLength(1)
    expect(links[0].text()).toBe('Bea')
  })

  it('does not merge names when the value is swapped before async setup resolves', async () => {
    const { wrapper, current } = mountCell('Ada')
    await nextTick()
    current.value = cellValue('Bea')
    await flushPromises()

    const links = wrapper.findAll('a.of-link')
    expect(links.map((link) => link.text())).toEqual(['Bea'])
  })

  it('does not accumulate leftover name links across rapid parent re-renders', async () => {
    const { wrapper, tick } = mountCell()
    for (let i = 0; i < 8; i++) {
      tick.value += 1
      await nextTick()
    }
    await flushPromises()

    expect(wrapper.findAll('a.of-link').map((link) => link.text())).toEqual([
      'Ada'
    ])
    expect(setupCounts.asyncName).toBe(1)
  })

  it('does not append a newly loaded name into an already rendered row', async () => {
    const rows = ref([cellValue('Ada')])
    const Host = {
      setup() {
        provideVirtualScroll()
        return () =>
          h(
            'div',
            rows.value.map((value, index) =>
              h('div', { class: 'row', key: index }, [h(OfDataType, { value })])
            )
          )
      }
    }
    const wrapper = mount(Host, { attachTo: document.body })
    await flushPromises()
    expect(
      wrapper
        .findAll('.row')
        .map((row) => row.findAll('a.of-link').map((link) => link.text()))
    ).toEqual([['Ada']])

    rows.value = [...rows.value, cellValue('Bea')]
    await nextTick()
    await flushPromises()

    expect(
      wrapper
        .findAll('.row')
        .map((row) => row.findAll('a.of-link').map((link) => link.text()))
    ).toEqual([['Ada'], ['Bea']])
    wrapper.unmount()
  })
})

describe('OfDataType virtual-scroll cells with slow async names', () => {
  it('keeps one name when the parent re-renders while setup is still pending', async () => {
    const { wrapper, tick } = mountCell('Ada', SlowName)
    for (let i = 0; i < 6; i++) {
      tick.value += 1
      await nextTick()
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
    await flushPromises()

    expect(wrapper.findAll('a.of-link').map((link) => link.text())).toEqual([
      'Ada'
    ])
    wrapper.unmount()
  })
})

import { describe, expect, it } from 'vitest'
import { h, isVNode } from 'vue'
import { freshVNode, wrapFreshVNode } from '../virtual_scroll_vnode'

describe('virtual_scroll_vnode', () => {
  it('freshVNode returns a new tree that does not share the source vnode', () => {
    const source = h('span', { class: 'cell' }, 'Account')
    const cloned = freshVNode(source) as any
    expect(isVNode(cloned)).toBe(true)
    expect(cloned).not.toBe(source)
    expect(cloned.type).toBe('span')
    expect(cloned.children).toBe('Account')
  })

  it('wrapFreshVNode always clones even without Suspense', () => {
    const source = h('div', null, 'value')
    const wrapped = wrapFreshVNode(source, false) as any
    expect(isVNode(wrapped)).toBe(true)
    expect(wrapped).not.toBe(source)
    expect(wrapped.type).toBe('div')
  })

  it('wrapFreshVNode with Suspense wraps a fresh default slot', () => {
    const source = h('div', null, 'value')
    const wrapped = wrapFreshVNode(source, true) as any
    expect(isVNode(wrapped)).toBe(true)
    expect(wrapped.type).toHaveProperty('name', 'Suspense')
  })
})

import { VNode, h, isVNode } from 'vue'

export interface DataTypeValue {
  value: string | number
  class?: string | string[]
  format?: string | object
  params?: any
}

const cloneChildren = (children: VNode['children']): VNode['children'] => {
  if (Array.isArray(children))
    return children.map((child) => cloneRenderTree(child)) as VNode[]
  if (children && typeof children === 'object') {
    // Slots object, as in h(Suspense, null, { default: ... }). Slot functions
    // may hand back a captured tree, so the result needs copying as well.
    // Both the object and the functions on it carry flags Vue set and reads
    // back while patching (`_`, `_ctx`, `_ns`), so they are carried over rather
    // than dropped by starting from an empty object and a bare wrapper.
    const slots: Record<string, any> = { ...children }
    for (const name in children as object) {
      const slot = (children as Record<string, any>)[name]
      if (typeof slot === 'function')
        slots[name] = Object.assign(
          (...args: any[]) => cloneRenderTree(slot(...args)),
          slot
        )
      else slots[name] = cloneRenderTree(slot)
    }
    return slots as VNode['children']
  }
  return children
}

/**
 * Returns a private copy of a render tree that is kept in data.
 *
 * Mounting records the DOM node on a VNode and rewrites the children arrays it
 * is handed, so the same tree cannot be rendered twice. A tree that lives in
 * data outlives the row that renders it — the row is remounted when a list is
 * rekeyed, when a window scrolls it out and back, or when a table switches
 * between paging and endless scrolling — so it is copied on every render.
 * `cloneVNode` is not enough: it copies the instance, the DOM, and a
 * suspense-resolved subtree (`ssContent`) from a tree that has already been
 * mounted, which is how list-view cells that are async setup formatters go
 * blank. `h()` builds a vnode that was never mounted. Values that are not
 * trees are returned as they are and cost one check.
 */
export const cloneRenderTree = <T>(value: T): T => {
  if (Array.isArray(value))
    return value.map((entry) => cloneRenderTree(entry)) as unknown as T
  if (!isVNode(value)) return value
  const vnode = value as VNode
  const props: Record<string, unknown> | null = vnode.props
    ? { ...vnode.props }
    : vnode.key != null
      ? {}
      : null
  if (props && vnode.key != null) props.key = vnode.key
  return h(
    vnode.type as any,
    props,
    cloneChildren(vnode.children) as any
  ) as unknown as T
}

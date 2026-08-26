import { InjectionKey, Ref, VNode, cloneVNode, isVNode, shallowRef } from 'vue'

export interface DataTypeValue {
  value: string | number
  class?: string | string[]
  format?: string | object
  params?: any
}

/**
 * Set by a table whose rows are rendered from pre-built cells more than once,
 * so those cells are copied rather than consumed. Off everywhere else: copying
 * costs a walk of the tree on every render.
 */
export const reuseRenderTreesKey: InjectionKey<Readonly<Ref<boolean>>> =
  Symbol('ofReuseRenderTrees')

export const noReuseRenderTrees: Readonly<Ref<boolean>> = shallowRef(false)

/**
 * Returns a private copy of a render tree that is kept in data.
 *
 * Mounting records the DOM node on a VNode and rewrites the children arrays it
 * is handed, so the same tree cannot be rendered twice. Callers that pre-build
 * their cells and render them repeatedly — a virtualized list view, as its rows
 * scroll out of the window and back in — need the nested children copied too,
 * not just the root.
 */
export const cloneRenderTree = <T>(value: T): T => {
  if (Array.isArray(value))
    return value.map((entry) => cloneRenderTree(entry)) as unknown as T
  if (!isVNode(value)) return value
  const cloned = cloneVNode(value as VNode)
  const children = cloned.children
  if (Array.isArray(children)) {
    cloned.children = children.map((child) => cloneRenderTree(child))
  } else if (children && typeof children === 'object') {
    // Slots object, as in h(Suspense, null, { default: ... }). Slot functions
    // may hand back a captured tree, so the result needs copying as well.
    // Both the object and the functions on it carry flags Vue set and reads
    // back while patching (`_`, `_ctx`, `_ns`), so they are carried over rather
    // than dropped by starting from an empty object and a bare wrapper.
    const slots: Record<string, any> = { ...children }
    for (const name in children) {
      const slot = (children as Record<string, any>)[name]
      if (typeof slot === 'function')
        slots[name] = Object.assign(
          (...args: any[]) => cloneRenderTree(slot(...args)),
          slot
        )
      else slots[name] = cloneRenderTree(slot)
    }
    cloned.children = slots
  }
  return cloned as unknown as T
}

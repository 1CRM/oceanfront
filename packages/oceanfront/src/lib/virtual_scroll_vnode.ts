import { ComputedRef, InjectionKey, Ref, VNode, h, isVNode } from 'vue'

/**
 * Provided by `DataTable` (true only when its `virtualScroll` prop is on) so
 * `of-data-type`/`of-link` know whether they need the `freshVNode` rebuild.
 * Classic (non-virtual) tables, and every other `of-data-type` consumer,
 * fall back to `false` and render cached VNodes/arrays as-is, same as before
 * virtual scroll existed.
 */
export const dataTableVirtualScrollKey: InjectionKey<
  Ref<boolean> | ComputedRef<boolean>
> = Symbol('dataTableVirtualScroll')

/**
 * Rebuilds a VNode tree so it can be mounted again. VNodes are single-use;
 * cells cached in `formattedRecords` need a fresh tree each time virtual
 * scrolling remounts a row, or they render blank.
 */
export function freshVNode(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((child) => freshVNode(child))
  }
  if (!isVNode(input)) {
    return input
  }

  const node = input as VNode
  const children = node.children
  let newChildren: unknown = children

  if (Array.isArray(children) || isVNode(children)) {
    newChildren = freshVNode(children)
  } else if (children && typeof children === 'object') {
    const slots: Record<string, unknown> = {}
    for (const key of Object.keys(children as object)) {
      const slot = (children as Record<string, unknown>)[key]
      if (typeof slot === 'function') {
        slots[key] = (...args: unknown[]) =>
          freshVNode((slot as (...a: unknown[]) => unknown)(...args))
      } else {
        // Vue may store a VNode directly as slot content (e.g. Suspense default).
        slots[key] = () => freshVNode(slot)
      }
    }
    newChildren = slots
  }

  return h(node.type as any, node.props, newChildren as any)
}

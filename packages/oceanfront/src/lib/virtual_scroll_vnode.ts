import {
  ComputedRef,
  InjectionKey,
  Ref,
  Suspense,
  VNode,
  computed,
  h,
  isVNode,
  toRaw
} from 'vue'

/**
 * Provided by DataTable when `virtualScroll` is on.
 * Classic tables (and other consumers) fall back to false.
 */
export const dataTableVirtualScrollKey: InjectionKey<
  Ref<boolean> | ComputedRef<boolean>
> = Symbol('dataTableVirtualScroll')

/** Shared inject fallback for non-virtual descendants. */
export const notVirtualScroll = computed(() => false)

/**
 * Rebuilds a VNode tree so it can be mounted again. Cached cell VNodes are
 * single-use; remounts (virtual window moves, or leaving virtual scroll for a
 * classic body) need a fresh tree or they render blank.
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
        slots[key] = () => freshVNode(slot)
      }
    }
    newChildren = slots
  }

  return h(node.type as any, node.props, newChildren as any)
}

/**
 * Clone cached cell VNodes for remount safety.
 * When `withSuspense` is set (virtual scroll), wrap in Suspense so async cell
 * trees can remount cleanly with the virtual window.
 */
export function wrapFreshVNode(input: unknown, withSuspense = false): unknown {
  if (!(isVNode(input) || Array.isArray(input))) return input
  if (!withSuspense) return freshVNode(toRaw(input))
  return h(Suspense, null, { default: () => freshVNode(toRaw(input)) as any })
}

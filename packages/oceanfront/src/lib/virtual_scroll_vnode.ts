import {
  ComputedRef,
  InjectionKey,
  PropType,
  Ref,
  Suspense,
  VNode,
  computed,
  defineComponent,
  h,
  isVNode,
  toRaw
} from 'vue'

/** Provided by DataTable when `virtualScroll` is on. */
export const dataTableVirtualScrollKey: InjectionKey<
  Ref<boolean> | ComputedRef<boolean>
> = Symbol('dataTableVirtualScroll')

export const notVirtualScroll = computed(() => false)

/** Clone a VNode tree so a cached cell can remount. Nested child arrays are flattened. */
export function freshVNode(input: unknown): unknown {
  if (Array.isArray(input)) {
    const flat: unknown[] = []
    for (const child of input) {
      if (child == null || child === false) continue
      const cloned = freshVNode(child)
      if (Array.isArray(cloned)) flat.push(...cloned)
      else flat.push(cloned)
    }
    return flat
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

  const props = node.props ? { ...node.props } : null
  const cloned = h(node.type as any, props, newChildren as any) as VNode
  cloned.key = node.key
  if (node.ref != null) (cloned as any).ref = node.ref
  return cloned
}

let nextSourceId = 1
const sourceIds = new WeakMap<object, number>()
const sourceKey = (source: object): number => {
  let id = sourceIds.get(source)
  if (id == null) {
    id = nextSourceId++
    sourceIds.set(source, id)
  }
  return id
}

/** Clone the cached cell once per mount. A new source identity remounts via key. */
const OfVirtualCellMount = defineComponent({
  name: 'OfVirtualCellMount',
  inheritAttrs: false,
  props: {
    source: {
      type: [Object, Array] as PropType<VNode | VNode[]>,
      required: true
    }
  },
  setup(props) {
    const tree = freshVNode(toRaw(props.source))
    const vnode = h(Suspense, { timeout: 0 }, { default: () => tree as any })
    return () => vnode
  }
})

/**
 * Clone cached cell VNodes for remount safety.
 * With `withSuspense` (virtual scroll), callers that re-render often must reuse
 * the returned vnode while `source` is unchanged.
 */
export function wrapFreshVNode(input: unknown, withSuspense = false): unknown {
  if (!(isVNode(input) || Array.isArray(input))) return input
  const source = toRaw(input) as object
  if (!withSuspense) return freshVNode(source)
  return h(OfVirtualCellMount, {
    key: sourceKey(source),
    source: source as any
  })
}

/** Reuse the mounted cell vnode across parent re-renders while `source` is unchanged. */
export const createVirtualCellCache = () => {
  const cellCache: { source: unknown; vnode: unknown } = {
    source: null,
    vnode: null
  }
  return (input: unknown) => {
    if (!(isVNode(input) || Array.isArray(input))) return input
    if (cellCache.source === input && cellCache.vnode) return cellCache.vnode
    cellCache.source = input
    cellCache.vnode = wrapFreshVNode(input, true)
    return cellCache.vnode
  }
}

import {
  ComponentInternalInstance,
  computed,
  ComputedRef,
  getCurrentInstance,
  inject,
  InjectionKey,
  onUnmounted,
  provide,
  reactive,
  watch
} from 'vue'

const NAV_GROUP = 'ofnavgrp' as unknown as InjectionKey<NavGroup>

export function provideNavGroup(grp: NavGroup | null): void {
  provide(NAV_GROUP, grp as any)
}

export function useNavGroup(): NavGroup | null {
  const grp = inject(NAV_GROUP, null) || null
  const inst = getCurrentInstance()
  if (grp && inst) {
    return new NavGroupProxy(grp, inst)
  }
  return grp
}

export type NavGroupTarget = {
  isCurrent?: boolean
  readonly isDisabled?: boolean
  readonly isFocused?: boolean
  readonly elt?: any
  readonly id?: string
  readonly focus?: () => void
}

export type NavGroupUnregister = {
  unregister(): void
}

export type NavGroup = {
  readonly isFocused: ComputedRef<boolean>
  register(target: NavGroupTarget): NavGroupUnregister | null
  navigate(evt: KeyboardEvent): boolean
}

interface NavComponent extends ComponentInternalInstance {
  _navItems?: NavGroupUnregister[]
}

class NavGroupProxy implements NavGroup {
  _grp: NavGroup
  _inst: NavComponent

  constructor(grp: NavGroup, inst: ComponentInternalInstance) {
    this._grp = grp
    this._inst = inst
  }

  get isFocused() {
    return this._grp.isFocused
  }

  register(target: NavGroupTarget): NavGroupUnregister | null {
    const inst = this._inst
    const unreg = this._grp.register(target)
    if (unreg) {
      if (!inst._navItems) {
        inst._navItems = []
        onUnmounted(() => {
          if (inst._navItems) {
            for (const item of inst._navItems) {
              item.unregister() // unregister
            }
          }
        }, inst)
      }
      inst._navItems.push(unreg)
    }
    return unreg
  }

  navigate(evt: KeyboardEvent): boolean {
    return this._grp.navigate(evt)
  }
}

export function reactiveNavGroup(): NavGroup {
  const items = reactive(new Set<NavGroupTarget>())
  const orderedItems = computed(() =>
    [...items].sort((a, b) => {
      const ia = a.elt
      const ib = b.elt
      if (!ia) {
        return ib ? 1 : 0
      }
      if (!ib) return -1
      const cmp = ia.compareDocumentPosition(ib)
      if (cmp == 4 || cmp == 16) return -1
      if (cmp == 2 || cmp == 8) return 1
      return 0
    })
  )
  const scan = computed(() => {
    let first
    let lastActive
    let lastFocused
    for (const [idx, item] of orderedItems.value.entries()) {
      if (item.isDisabled) continue
      if (first === undefined) first = idx
      if (item.isFocused) lastFocused = idx
      if (item.isCurrent) lastActive = idx
    }
    const current = lastFocused ?? lastActive ?? first
    return { lastFocused, lastActive, first, current }
  })
  const isFocused = computed(() => {
    const idx = scan.value.current
    return (idx !== undefined && orderedItems.value[idx]?.isFocused) || false
  })
  watch(
    () => scan.value,
    (scan) => {
      for (const [idx, item] of orderedItems.value.entries()) {
        const current = idx === scan.current
        if (item.isCurrent !== current) item.isCurrent = current
      }
    }
  )

  return {
    isFocused,
    register(target: NavGroupTarget): NavGroupUnregister | null {
      items.add(target)
      return {
        unregister: () => items.delete(target)
      }
    },
    navigate(event: KeyboardEvent): boolean {
      const ordered = orderedItems.value
      const scanVal = scan.value
      if (!ordered.length || scanVal.current === undefined) return false
      const key = event.key
      let target = null
      if (key === 'ArrowDown' || key === 'ArrowRight') {
        target = 'next'
      } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
        target = 'previous'
      } else if (event) return false

      if (target) {
        if (event) event.preventDefault()
        let idx = scanVal.current
        const offs = target === 'next' ? 1 : -1
        let focus: (() => void) | undefined
        while (true) {
          idx += offs
          if (idx < 0) idx = ordered.length - 1
          else if (idx >= ordered.length) idx = 0
          if (idx === scanVal.current) return false // looped around
          if (
            ordered[idx] &&
            !ordered[idx].isDisabled &&
            (focus = ordered[idx].focus) &&
            ordered[idx].elt.clientHeight != 0
          ) {
            focus()
            return true
          }
        }
      }
      return false
    }
  }
}

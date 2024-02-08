/* eslint-disable vue/prefer-import-from-vue */

import {
  Ref,
  ToRef,
  shallowRef,
  shallowReadonly,
  toRef,
  triggerRef,
  unref,
} from 'vue'
import { hasOwn } from '@vue/shared'

export {
  hasOwn,
  isArray,
  isFunction,
  isPromise,
  isObject,
  looseEqual,
} from '@vue/shared'

export const isDigit = (s: string): boolean => s >= '0' && s <= '9'

export const isPrimitive = (val: unknown): val is Primitive => {
  const tval = typeof val
  return (
    val === null ||
    tval === 'boolean' ||
    tval === 'number' ||
    tval === 'string' ||
    tval === 'bigint' ||
    tval === 'symbol'
  )
}

export type Primitive = boolean | null | number | string | bigint | symbol

type Head<T extends any[]> = T extends [infer X, ...any[]] ? X : never

type Tail<T extends any[]> = ((...x: T) => void) extends (
  x: any,
  ...xs: infer XS
) => void
  ? XS
  : never

type OverrideProps<B, U> = Pick<B, Exclude<keyof B, keyof U>> & U

// NB: no proper support for recursive conditional types yet
export type Override<B, U extends any[]> = {
  0: B
  1: OverrideProps<B, Override<Head<U>, Tail<U>>>
}[U extends [any, ...any[]] ? 1 : 0]

export function extendReactive<T extends object, U extends object>(
  base: T,
  ...updates: U[]
): Override<T, typeof updates> {
  updates.reverse()
  return new Proxy(base, {
    get(target: T, key: string, _receiver: object): any {
      for (const upd of updates) {
        if (Reflect.has(upd, key)) {
          return unref((upd as any)[key])
        }
      }
      return unref((target as any)[key])
    },
    getOwnPropertyDescriptor(target: T, key: string) {
      for (const upd of updates) {
        const desc = Reflect.getOwnPropertyDescriptor(upd, key)
        if (desc) return desc
      }
      return Reflect.getOwnPropertyDescriptor(target, key)
    },
    has(target: T, key: string): boolean {
      for (const upd of updates) {
        if (Reflect.has(upd, key)) return true
      }
      return Reflect.has(target, key)
    },
    ownKeys(target: T): (string | symbol)[] {
      const keys: Set<string | symbol> = new Set(Reflect.ownKeys(target))
      for (const upd of updates) {
        Reflect.ownKeys(upd).forEach((k) => keys.add(k))
      }
      return [...keys]
    },
    set(target: T, key: string, value: any, _receiver: object): boolean {
      for (const upd of updates) {
        Reflect.set(upd, key, value)
        return true
      }
      Reflect.set(target, key, value)
      return true
    },
    deleteProperty(target: T, key: string): boolean {
      for (const upd of updates) {
        Reflect.deleteProperty(upd, key)
        return true
      }
      Reflect.deleteProperty(target, key)
      return true
    },
  })
}

export function extractRefs<T extends object, K extends keyof T>(
  props: T,
  names: K[]
): { [k in K]: ToRef<T[k]> } {
  const ret: any = {}
  if (names) {
    for (const k of names) {
      ret[k] = toRef(props, k)
    }
  }
  return ret as { [k in K]: ToRef<T[k]> }
}

export function restrictProps<T extends object, K extends keyof T>(
  base: T,
  names: K[],
  ifDefined?: boolean
): { [k in K]: T[k] } {
  const props = new Set<any>(names)
  const limitProps = props.size > 0
  return new Proxy(base, {
    get(target: T, key: string, _receiver: object): any {
      if (!limitProps || props.has(key)) {
        return Reflect.get(target, key)
      }
    },
    getOwnPropertyDescriptor(target: T, key: string) {
      if (!limitProps || props.has(key)) {
        return Reflect.getOwnPropertyDescriptor(target, key)
      }
    },
    has(target: T, key: string): boolean {
      let result = props.has(key) && hasOwn(target, key)
      if (ifDefined && (target as any)[key] === undefined) result = false
      return result
    },
    ownKeys(target: T): (string | symbol)[] {
      let result = Reflect.ownKeys(target).filter(
        (k) => !limitProps || props.has(k)
      )
      if (ifDefined) {
        result = result.filter((k) => (target as any)[k] !== undefined)
      }
      return result
    },
    set(target: T, key: string, value: any, _receiver: object): boolean {
      if (!limitProps || props.has(key)) Reflect.set(target, key, value)
      return true
    },
    deleteProperty(target: T, key: string): boolean {
      if (!limitProps || props.has(key)) delete (target as any)[key]
      return true
    },
  })
}

export function definedProps<T extends object, K extends keyof T>(
  base: T
): { [k2 in K]: T[K] } {
  return new Proxy(base, {
    getOwnPropertyDescriptor(target: T, key: string) {
      let desc = Reflect.getOwnPropertyDescriptor(target, key)
      if (desc && (target as any)[key] === undefined) desc = undefined
      return desc
    },
    has(target: T, key: string): boolean {
      return hasOwn(target, key) && target[key] !== undefined
    },
    ownKeys(target: T): (string | symbol)[] {
      return Reflect.ownKeys(target).filter(
        (k) => (target as any)[k] !== undefined
      )
    },
  })
}

export function removeEmpty(obj: Record<string, any>): Record<string, any> {
  if (obj) {
    for (const k of Object.keys(obj)) {
      const val = obj[k]
      if (val == null) delete obj[k]
    }
  }
  return obj
}

const readonlyUnrefHandlers = {
  get(target: Ref, key: string, _receiver: object): any {
    const result = Reflect.get(target.value, key)
    return result
  },
  has(target: Ref, key: string | number | symbol): boolean {
    return Reflect.has(target.value, key)
  },
  ownKeys(target: Ref): (string | symbol)[] {
    return Reflect.ownKeys(target.value)
  },
  set(_target: Ref, _key: string, _value: any, _receiver: object): boolean {
    if (__DEV__) {
      console.warn('Cannot assign to readonly ref')
    }
    return true
  },
  deleteProperty(_target: Ref, _key: string): boolean {
    if (__DEV__) {
      console.warn('Cannot delete property of readonly ref')
    }
    return true
  },
}

export function readonlyUnref<T>(val: Ref<T>): T {
  return new Proxy(val, readonlyUnrefHandlers) as any as T
}

type EltPos = { x: number; y: number; width: number; height: number }

const eltPos = (elt: Element): EltPos => {
  const sz = elt.getBoundingClientRect()
  return { x: sz.x, y: sz.y, width: sz.width, height: sz.height }
}

const scrollEvent = (evt: Event) => {
  const reg = evt && evt.target && scrollWatching.get(evt.target as Element)
  if (reg) {
    for (const w of reg) {
      if (!w._scrolled()) {
        reg.delete(w)
      }
    }
    if (!reg.size) {
      scrollWatching.delete(evt.target as Element)
    }
  }
}

const scrollWatching: WeakMap<
  Element,
  Set<PositionObserverImpl>
> = new WeakMap()

export interface PositionObserver {
  observe(target: Element, opts?: any): void
  unobserve(target: Element): void
  readonly positions: Ref<Map<Element, EltPos>>
  disconnect(): void
}

class PositionObserverImpl implements PositionObserver {
  _native?: ResizeObserver
  _options: WatchPositionOpts
  _polling: any
  _positions: Ref<Map<Element, EltPos>>

  constructor(opts?: WatchPositionOpts) {
    const pos = shallowRef(new Map())
    if (typeof ResizeObserver !== 'undefined') {
      this._native = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const estyle = window.getComputedStyle(entry.target, null)
          pos.value.set(entry.target, {
            x: entry.contentRect.x,
            y: entry.contentRect.y,
            width:
              entry.contentRect.width +
              parseInt(estyle.paddingLeft, 10) +
              parseInt(estyle.paddingRight, 10),
            height:
              entry.contentRect.height +
              parseInt(estyle.paddingTop, 10) +
              parseInt(estyle.paddingBottom, 10),
          })
        }
        triggerRef(pos)
      })
    }
    this._options = opts || {}
    this._positions = pos
  }

  _poll() {
    const elts = this._positions.value
    let changed = false
    for (const [target, pos] of elts) {
      if (!document.body.contains(target)) {
        elts.delete(target)
        changed = true
        continue
      }
      const newPos = eltPos(target)
      if (
        newPos.x != pos.x ||
        newPos.y != pos.y ||
        newPos.width != pos.width ||
        newPos.height != pos.height
      ) {
        elts.set(target, newPos)
        changed = true
      }
    }
    if (changed) {
      triggerRef(this._positions)
    }
    if (elts.size > 0 && !this._native) {
      this._polling = window.setTimeout(this._poll.bind(this), 1000)
    } else {
      this._polling = undefined
    }
  }

  _scrolled(): boolean {
    if (this._polling) {
      clearTimeout(this._polling)
    }
    if (this._positions.value.size > 0) {
      this._polling = window.setTimeout(this._poll.bind(this), 0)
      return true
    } else {
      return false
    }
  }

  observe(target: Element, _opts?: any) {
    if (target) {
      this._positions.value.set(target, eltPos(target))
      if (this._options.scroll) {
        let parent = target.parentElement
        while (parent && parent instanceof HTMLElement) {
          let reg = scrollWatching.get(parent)
          if (!reg) {
            reg = new Set()
            scrollWatching.set(parent, reg)
            parent.addEventListener('scroll', scrollEvent, { passive: true })
          }
          reg.add(this)
          parent = parent.parentElement
        }
      }
      if (this._native) {
        this._native.observe(target, { box: 'border-box' })
      } else if (!this._polling) {
        // first timeout is short to handle initial re-layout
        this._polling = window.setTimeout(this._poll.bind(this), 50)
      }
      if (this._options.immediate) {
        triggerRef(this._positions)
      }
    }
  }

  unobserve(target: Element) {
    if (target) {
      this._positions.value.delete(target)
    }
  }

  get positions(): Ref<Map<Element, EltPos>> {
    return shallowReadonly(this._positions)
  }

  disconnect() {
    if (this._polling) {
      clearTimeout(this._polling)
      this._polling = undefined
    }
    this._native?.disconnect()
    this._positions.value.clear()
  }
}

export type WatchPositionOpts = {
  immediate?: boolean
  scroll?: boolean
}

export const watchPosition = (
  options?: WatchPositionOpts
): PositionObserver => {
  return new PositionObserverImpl(options)
}

type throttleFunc<T> = {
  cancel: () => void
  (input: T): void
}

export const throttle = <T>(
  inteval: number,
  handler: (input: T) => void
): throttleFunc<T> => {
  let timeout: number | null = null
  const func = (input: T) => {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      handler(input)
    }, inteval) as any as number
  }
  func.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
  }
  return func
}
export type Scale = 'nm' | 'sm' | 'lg'

export const scaleClass = (size: string | undefined) => {
  switch (size) {
    case 'sm':
      return { 'of--small': true }
    case 'lg':
      return { 'of--large': true }
    default:
      return {}
  }
}

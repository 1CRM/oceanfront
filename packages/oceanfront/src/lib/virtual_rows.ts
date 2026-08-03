import {
  ComputedRef,
  Ref,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'
import {
  ScrollRoot,
  findScrollParent,
  getScrollTop,
  setScrollTop
} from './scroll_dom'
import { createScrollSpeedLimit } from './scroll_speed_limit'
import { computeVirtualWindow } from './virtual_range'

export const VIRTUAL_ROWS_DEFAULT_OVERSCAN = 10
/** How long after the last scroll/resize event to keep `isScrolling` true. */
export const VIRTUAL_ROWS_SCROLL_IDLE_MS = 150
/** Visible-range start snaps to multiples of this many rows. */
export const VIRTUAL_ROWS_RANGE_STEP = 5
/** Hard cap on scroll speed while a virtualized table is on screen. */
export const VIRTUAL_ROWS_MAX_SCROLL_SPEED_PX_PER_SEC = 4000

export interface VirtualRowsRange {
  start: number
  end: number
  total: number
}

export interface UseVirtualRowsOptions {
  /** When false, no listeners are attached and range emits are suppressed. */
  enabled?: ComputedRef<boolean> | Ref<boolean>
  /** Scrollable element that owns the virtualized content. */
  containerRef: Ref<HTMLElement | null | undefined>
  /** Total logical row count (may exceed the number of rows currently loaded). */
  totalCount: ComputedRef<number> | Ref<number>
  /** Fixed row height in pixels (all rows must share this height). */
  rowHeight: ComputedRef<number> | Ref<number>
  /** Extra rows rendered above/below the visible viewport. */
  overscan?: number
  onRangeChange?: (range: VirtualRowsRange) => void
}

export interface UseVirtualRowsReturn {
  rangeStart: ComputedRef<number>
  rangeEnd: ComputedRef<number>
  topSpacerHeight: ComputedRef<number>
  bottomSpacerHeight: ComputedRef<number>
  /** True during a scroll/resize burst; meant for a transient `will-change` toggle. */
  isScrolling: ComputedRef<boolean>
  scrollToIndex: (index: number) => void
  /** Re-measures the container; call after the container ref changes or on demand. */
  refresh: () => void
}

/**
 * Fixed-row-height windowing for very large lists.
 *
 * The container isn't assumed to own the scrollbar — its height grows with
 * the virtual content so a real scrollbar can live on the page/app shell.
 * Position is read via `getBoundingClientRect()` against the viewport, and
 * scroll/resize are observed on `window` (capture phase).
 */
export function useVirtualRows(
  options: UseVirtualRowsOptions
): UseVirtualRowsReturn {
  const overscan = options.overscan ?? VIRTUAL_ROWS_DEFAULT_OVERSCAN
  const rangeStep = Math.max(1, VIRTUAL_ROWS_RANGE_STEP)
  const isEnabled = () => options.enabled?.value !== false

  const scrolledPast = ref(0)
  const viewportHeight = ref(0)
  const isScrolling = ref(false)

  let onScreen = false
  let scrollRoot: ScrollRoot = window
  let attachedEl: HTMLElement | null = null
  let resizeObserver: ResizeObserver | undefined
  let measureScheduled = false
  let scrollIdleTimer: ReturnType<typeof setTimeout> | undefined

  // rAF-batched so a fling does at most one measure + reactive update per frame.
  const scheduleMeasure = () => {
    if (!isEnabled() || measureScheduled) return
    measureScheduled = true
    requestAnimationFrame(() => {
      measureScheduled = false
      measure()
    })
  }

  const measure = () => {
    const el = options.containerRef.value
    if (!el || typeof window === 'undefined' || !isEnabled()) return
    const rect = el.getBoundingClientRect()
    const winHeight =
      window.innerHeight || document.documentElement.clientHeight || 0
    onScreen = rect.bottom > 0 && rect.top < winHeight
    scrolledPast.value = Math.max(0, -rect.top)
    viewportHeight.value = Math.max(
      0,
      Math.min(rect.bottom, winHeight) - Math.max(rect.top, 0)
    )
  }

  const markScrolling = () => {
    isScrolling.value = true
    if (scrollIdleTimer !== undefined) clearTimeout(scrollIdleTimer)
    scrollIdleTimer = setTimeout(() => {
      isScrolling.value = false
    }, VIRTUAL_ROWS_SCROLL_IDLE_MS)
  }

  const speedLimit = createScrollSpeedLimit({
    maxPxPerSec: VIRTUAL_ROWS_MAX_SCROLL_SPEED_PX_PER_SEC,
    getScrollRoot: () => scrollRoot,
    containerEl: () => options.containerRef.value,
    isOnScreen: () => isEnabled() && onScreen,
    onWheelClamp: () => {
      markScrolling()
      scheduleMeasure()
    }
  })

  const onScroll = () => {
    if (!isEnabled()) return
    speedLimit.handleScroll()
    markScrolling()
    scheduleMeasure()
  }
  const onWheel = (e: WheelEvent) => {
    if (!isEnabled()) return
    speedLimit.handleWheel(e)
  }
  const onResize = () => scheduleMeasure()

  const attach = (el: HTMLElement | null | undefined) => {
    if (!el || typeof window === 'undefined' || !isEnabled()) return
    if (attachedEl === el) return
    detach()
    attachedEl = el
    scrollRoot = findScrollParent(el)
    speedLimit.reset()
    window.addEventListener('scroll', onScroll, {
      passive: true,
      capture: true
    })
    // Non-passive: may preventDefault to enforce the speed cap.
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    window.addEventListener('resize', onResize, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => scheduleMeasure())
      resizeObserver.observe(el)
    }
    measure()
  }

  const detach = (_el?: HTMLElement | null | undefined) => {
    if (!attachedEl || typeof window === 'undefined') return
    window.removeEventListener('scroll', onScroll, { capture: true })
    window.removeEventListener('wheel', onWheel, { capture: true })
    window.removeEventListener('resize', onResize)
    resizeObserver?.disconnect()
    resizeObserver = undefined
    if (scrollIdleTimer !== undefined) clearTimeout(scrollIdleTimer)
    attachedEl = null
    onScreen = false
    isScrolling.value = false
  }

  const syncAttachment = () => {
    if (isEnabled()) attach(options.containerRef.value)
    else detach()
  }

  onMounted(syncAttachment)
  onBeforeUnmount(() => detach())
  watch(
    () => [options.containerRef.value, options.enabled?.value] as const,
    () => syncAttachment()
  )

  const windowState = computed(() => {
    if (!isEnabled()) {
      return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 }
    }
    return computeVirtualWindow({
      scrolledPast: scrolledPast.value,
      viewportHeight: viewportHeight.value,
      rowHeight: options.rowHeight.value,
      totalCount: options.totalCount.value,
      overscan,
      rangeStep
    })
  })

  const rangeStart = computed(() => windowState.value.start)
  const rangeEnd = computed(() => windowState.value.end)
  const topSpacerHeight = computed(() => windowState.value.topSpacer)
  const bottomSpacerHeight = computed(() => windowState.value.bottomSpacer)

  watch(
    [rangeStart, rangeEnd, options.totalCount, () => options.enabled?.value],
    ([start, end, total]) => {
      if (!isEnabled()) return
      options.onRangeChange?.({ start, end, total })
    },
    { immediate: true, flush: 'post' }
  )

  const scrollToIndex = (index: number) => {
    const el = options.containerRef.value
    if (!el || typeof window === 'undefined' || !isEnabled()) return
    const rowHeightPx = Math.max(1, options.rowHeight.value || 1)
    const root = scrollRoot || findScrollParent(el)
    const containerRect = el.getBoundingClientRect()
    if (root === window) {
      const containerDocTop = containerRect.top + window.scrollY
      setScrollTop(root, containerDocTop + Math.max(0, index) * rowHeightPx)
      return
    }
    const rootEl = root as HTMLElement
    const rootRect = rootEl.getBoundingClientRect()
    setScrollTop(
      root,
      getScrollTop(rootEl) +
        (containerRect.top - rootRect.top) +
        Math.max(0, index) * rowHeightPx
    )
  }

  return {
    rangeStart,
    rangeEnd,
    topSpacerHeight,
    bottomSpacerHeight,
    isScrolling: computed(() => isEnabled() && isScrolling.value),
    scrollToIndex,
    refresh: measure
  }
}

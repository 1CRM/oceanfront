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
import { RowMetrics } from './virtual_row_heights'

export const VIRTUAL_ROWS_DEFAULT_OVERSCAN = 10
export const VIRTUAL_ROWS_SCROLL_IDLE_MS = 150
export const VIRTUAL_ROWS_RANGE_STEP = 5
export const VIRTUAL_ROWS_MAX_SCROLL_SPEED_PX_PER_SEC = 4000

export interface VirtualRowsRange {
  start: number
  end: number
  total: number
}

export interface UseVirtualRowsOptions {
  enabled?: ComputedRef<boolean> | Ref<boolean>
  containerRef: Ref<HTMLElement | null | undefined>
  totalCount: ComputedRef<number> | Ref<number>
  /** Row-height source: fixed math or a measured variable-height cache. */
  metrics: ComputedRef<RowMetrics> | Ref<RowMetrics>
  overscan?: number
  onRangeChange?: (range: VirtualRowsRange) => void
}

export interface UseVirtualRowsReturn {
  rangeStart: ComputedRef<number>
  rangeEnd: ComputedRef<number>
  topSpacerHeight: ComputedRef<number>
  bottomSpacerHeight: ComputedRef<number>
  isScrolling: ComputedRef<boolean>
  scrollToIndex: (index: number) => void
  refresh: () => void
}

/**
 * Fixed-row-height windowing. The container must grow with content; vertical
 * scroll lives on the page/app shell (or a parent), never on the container.
 * `scrolledPast` is how far the container top has moved above the viewport
 * (`max(0, -rect.top)`). If the container itself is the scrollport, that
 * stays 0 and the window never advances.
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
  let wheelTarget: EventTarget | null = null
  let resizeObserver: ResizeObserver | undefined
  let measureScheduled = false
  let scrollIdleTimer: ReturnType<typeof setTimeout> | undefined

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
    // Stuck ListView headers add padding-top after taking header cells out of
    // flow. Row/spacer content starts after that padding, so subtract it from
    // scrolledPast or the window starts too early once the header pins.
    const padTop = parseFloat(getComputedStyle(el).paddingTop) || 0
    onScreen = rect.bottom > 0 && rect.top < winHeight
    scrolledPast.value = Math.max(0, -rect.top - padTop)
    viewportHeight.value = Math.max(
      0,
      Math.min(rect.bottom, winHeight) - Math.max(rect.top, 0)
    )
    syncWheelListener()
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

  // Non-passive capture wheel is expensive and can reshape input meant for
  // other scroll boxes. Keep it on the real scroll root, and only while the
  // virtual list intersects the viewport.
  const removeWheelListener = () => {
    if (!wheelTarget) return
    wheelTarget.removeEventListener('wheel', onWheel as EventListener, {
      capture: true
    })
    wheelTarget = null
  }

  const syncWheelListener = () => {
    if (typeof window === 'undefined') return
    const shouldListen = !!attachedEl && isEnabled() && onScreen
    const nextTarget: EventTarget | null = shouldListen ? scrollRoot : null
    if (wheelTarget === nextTarget) return
    removeWheelListener()
    if (!nextTarget) return
    nextTarget.addEventListener('wheel', onWheel as EventListener, {
      passive: false,
      capture: true
    })
    wheelTarget = nextTarget
  }

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
    window.addEventListener('resize', onResize, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => scheduleMeasure())
      resizeObserver.observe(el)
    }
    measure()
  }

  const detach = (_el?: HTMLElement | null | undefined) => {
    if (!attachedEl || typeof window === 'undefined') return
    removeWheelListener()
    window.removeEventListener('scroll', onScroll, { capture: true })
    window.removeEventListener('resize', onResize)
    resizeObserver?.disconnect()
    resizeObserver = undefined
    if (scrollIdleTimer !== undefined) clearTimeout(scrollIdleTimer)
    speedLimit.reset()
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
    const metrics = options.metrics.value
    // Read `.version` so cache mutations (rows measured after render) mark
    // this computed dirty even though `metrics` itself is the same object.
    metrics.version.value
    return computeVirtualWindow({
      scrolledPast: scrolledPast.value,
      viewportHeight: viewportHeight.value,
      metrics,
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

  // Best-effort: jumps to the offset the current metrics predict for `index`.
  // For never-rendered rows under variable-height mode this uses the
  // estimate and refines once those rows render and get measured — the same
  // limitation every variable-size virtualizer has.
  const scrollToIndex = (index: number) => {
    const el = options.containerRef.value
    if (!el || typeof window === 'undefined' || !isEnabled()) return
    const targetOffset = Math.max(
      0,
      options.metrics.value.offsetOf(Math.max(0, index))
    )
    const root = scrollRoot || findScrollParent(el)
    const containerRect = el.getBoundingClientRect()
    if (root === window) {
      const containerDocTop = containerRect.top + window.scrollY
      setScrollTop(root, containerDocTop + targetOffset)
      speedLimit.reset()
      measure()
      return
    }
    const rootEl = root as HTMLElement
    const rootRect = rootEl.getBoundingClientRect()
    setScrollTop(
      root,
      getScrollTop(rootEl) + (containerRect.top - rootRect.top) + targetOffset
    )
    speedLimit.reset()
    measure()
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

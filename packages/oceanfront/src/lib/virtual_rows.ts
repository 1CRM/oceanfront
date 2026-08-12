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
  getScrollRange,
  getScrollTop,
  setScrollTop
} from './scroll_dom'
import {
  MAX_RENDERED_ROWS,
  computeVirtualWindow,
  isActivelyWindowing
} from './virtual_range'
import { RowMetrics } from './virtual_row_heights'

export const VIRTUAL_ROWS_DEFAULT_OVERSCAN = 10
/** Scroll is considered settled this long after the last scroll event. */
export const VIRTUAL_SCROLL_SETTLE_MS = 120
/**
 * How far one scroll sample may advance, as a fraction of the viewport, before
 * it counts toward fling mode.
 *
 * Deliberately a distance and not a px/ms speed: samples arrive no faster than
 * the main thread can build a window, so a speed would divide by that build
 * time and read an expensive window as a *slow* scroll — putting a fling on
 * the one path it cannot afford. A full viewport keeps ordinary wheel steps
 * (and a single laggy frame) from tripping fling mode.
 */
export const VIRTUAL_SCROLL_FAST_JUMP_RATIO = 1
/** Consecutive oversized jumps required before fling mode engages. */
export const VIRTUAL_SCROLL_FAST_SAMPLES = 2
export const VIRTUAL_ROWS_RANGE_STEP = 5

export interface VirtualRowsRange {
  start: number
  end: number
  total: number
  /** False while a scroll gesture is still in flight. */
  settled: boolean
}

export interface UseVirtualRowsOptions {
  enabled?: ComputedRef<boolean> | Ref<boolean>
  containerRef: Ref<HTMLElement | null | undefined>
  totalCount: ComputedRef<number> | Ref<number>
  /** Row-height source: fixed math or a measured variable-height store. */
  metrics: ComputedRef<RowMetrics> | Ref<RowMetrics>
  overscan?: number
  maxRenderedRows?: number
  onRangeChange?: (range: VirtualRowsRange) => void
}

export interface UseVirtualRowsReturn {
  /** Window to render, and to report upwards for loading. */
  rangeStart: ComputedRef<number>
  rangeEnd: ComputedRef<number>
  /** Spacer heights holding the space of everything outside the window. */
  topSpacerHeight: ComputedRef<number>
  bottomSpacerHeight: ComputedRef<number>
  isScrolling: ComputedRef<boolean>
  /**
   * True only while sustained large jumps are still arriving. Consumers swap
   * to skeletons for that window so the main thread is not rebuilding full
   * rows mid-fling; the first ordinary sample clears it again.
   */
  isFastScrolling: ComputedRef<boolean>
  /** True once the scroll gesture has stopped; gate data fetching on this. */
  settled: ComputedRef<boolean>
  /** Pixels of the container scrolled above the viewport (for viewport-only math). */
  scrolledPast: ComputedRef<number>
  viewportHeight: ComputedRef<number>
  scrollToIndex: (index: number) => void
  scrollToOffset: (offset: number) => void
  /**
   * Shifts the scroll root by `delta` px so rows on screen stay put after
   * measurements above the window changed the list's height.
   */
  compensateScroll: (delta: number) => void
}

/**
 * Row windowing for a container that grows with its content. Vertical scroll
 * lives on the page/app shell (or a parent), never on the container, so
 * `scrolledPast` is how far the container top moved above the viewport
 * (`max(0, -rect.top)`). If the container itself is the scrollport, that stays
 * 0 and the window never advances.
 *
 * Native scrolling is never intercepted. The window always tracks the scroll
 * position so the viewport never goes blank. During sustained large jumps
 * `isFastScrolling` asks the consumer for cheap placeholders instead of full
 * rows — that is what keeps a fling from falling behind into bare spacers —
 * and the first ordinary sample clears it so loaded data is not left hidden.
 * `settled` holds off data fetching until the gesture ends.
 */
export function useVirtualRows(
  options: UseVirtualRowsOptions
): UseVirtualRowsReturn {
  const baseOverscan = options.overscan ?? VIRTUAL_ROWS_DEFAULT_OVERSCAN
  const maxRenderedRows = options.maxRenderedRows ?? MAX_RENDERED_ROWS
  const rangeStep = Math.max(1, VIRTUAL_ROWS_RANGE_STEP)
  const isEnabled = () => options.enabled?.value !== false

  const scrolledPast = ref(0)
  const viewportHeight = ref(0)
  const isScrolling = ref(false)
  const isFastScrolling = ref(false)

  let scrollRoot: ScrollRoot = window
  let attachedEl: HTMLElement | null = null
  let resizeObserver: ResizeObserver | undefined
  let measureScheduled = false
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  let lastOffset = 0
  let lastScrollRange = 0
  let hasOffsetSample = false
  let fastJumpStreak = 0
  let pendingCompensation = 0
  let compensationScheduled = false
  // `padTop` needs a style read, which is too expensive to repeat on every
  // scroll event. Anything that can change it also changes the container's
  // border-box height, so the resize paths below mark it stale.
  let padTop = 0
  let padTopStale = true
  // The position we last moved the scroll to ourselves, or null. Its event
  // arrives a frame later and is recognised by value, not by count: row
  // measurements make us correct the offset constantly, so dismissing "the next
  // event" blindly would discard the user's own scrolling in the same frame.
  let programmaticScrollTop: number | null = null

  const readPadTop = (el: HTMLElement) => {
    padTop = parseFloat(getComputedStyle(el).paddingTop) || 0
    padTopStale = false
    return padTop
  }

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
    // Row/spacer content starts after the container's own padding, so subtract
    // it from scrolledPast or a padded container starts its window too early.
    if (padTopStale) readPadTop(el)
    scrolledPast.value = Math.max(0, -rect.top - padTop)
    viewportHeight.value = Math.max(
      0,
      Math.min(rect.bottom, winHeight) - Math.max(rect.top, 0)
    )
  }

  /**
   * Takes the current offset as the baseline for the next jump, without
   * judging it. Used wherever the offset moved for a reason other than the
   * user: measuring that against the previous sample would report a fling that
   * nobody performed.
   */
  const baselineScrollJump = () => {
    lastOffset = scrolledPast.value
    lastScrollRange = getScrollRange(scrollRoot)
    hasOffsetSample = true
  }

  /**
   * Decides from the distance one user sample covered whether this is a fling.
   *
   * However much the scrollable distance changed is discounted from the jump
   * first: changing the list's height drags the offset along on its own, as the
   * browser clamps it to the new maximum or anchors it to keep what is on
   * screen in place. Counting that as a gesture closes a loop, because
   * placeholders are only as tall as the height the spacers assume for them —
   * so flagging a fling changes the height, which moves the offset again. Past
   * the last row, where the bottom spacer is gone and a height change lands
   * entirely on the offset, the loop sustains itself and the table shakes.
   */
  const trackScrollJump = () => {
    const viewport = viewportHeight.value
    if (hasOffsetSample && viewport > 0) {
      const layoutMoved = Math.abs(getScrollRange(scrollRoot) - lastScrollRange)
      const jumped = Math.abs(scrolledPast.value - lastOffset)
      const fastAt = viewport * VIRTUAL_SCROLL_FAST_JUMP_RATIO
      if (jumped > layoutMoved + fastAt) {
        fastJumpStreak += 1
        if (fastJumpStreak >= VIRTUAL_SCROLL_FAST_SAMPLES)
          isFastScrolling.value = true
      } else {
        // No hysteresis: holding placeholders past the fling looks like loaded
        // rows turning back into skeletons.
        fastJumpStreak = 0
        isFastScrolling.value = false
      }
    }
    baselineScrollJump()
  }

  const markScrolling = () => {
    isScrolling.value = true
    if (settleTimer !== undefined) clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      isScrolling.value = false
      isFastScrolling.value = false
      fastJumpStreak = 0
      // Re-measure so the settled window is emitted with full overscan, from
      // a padding value that is guaranteed current.
      padTopStale = true
      measure()
      baselineScrollJump()
    }, VIRTUAL_SCROLL_SETTLE_MS)
  }

  // Measured synchronously rather than in a rAF: the offset is already
  // laid out by the time this fires, and deferring it would render every
  // window one frame behind the scroll position.
  const onScroll = () => {
    if (!isEnabled()) return
    // Our own corrections must not read as user scrolling; that would keep the
    // list unsettled and postpone loading for no reason. Only the event that
    // lands exactly where we put it is ours — if the position has moved on, the
    // user is scrolling and this is their sample to judge.
    if (programmaticScrollTop !== null) {
      const landed = getScrollTop(scrollRoot) === programmaticScrollTop
      programmaticScrollTop = null
      if (landed) {
        measure()
        baselineScrollJump()
        return
      }
    }
    markScrolling()
    measure()
    trackScrollJump()
  }
  const onResize = () => {
    padTopStale = true
    scheduleMeasure()
  }

  const withScrollAdjust = (fn: () => void) => {
    fn()
    programmaticScrollTop = getScrollTop(scrollRoot)
    // Give up on the expected event after a frame so a coalesced write can
    // never swallow a real user scroll.
    requestAnimationFrame(() => {
      programmaticScrollTop = null
    })
  }

  const flushCompensation = () => {
    compensationScheduled = false
    const delta = pendingCompensation
    pendingCompensation = 0
    if (!delta || !isEnabled() || !attachedEl) return
    withScrollAdjust(() =>
      setScrollTop(scrollRoot, Math.max(0, getScrollTop(scrollRoot) + delta))
    )
    measure()
    baselineScrollJump()
  }

  const compensateScroll = (delta: number) => {
    if (!delta || !isEnabled()) return
    pendingCompensation += delta
    if (compensationScheduled) return
    compensationScheduled = true
    requestAnimationFrame(flushCompensation)
  }

  const attach = (el: HTMLElement | null | undefined) => {
    if (!el || typeof window === 'undefined' || !isEnabled()) return
    if (attachedEl === el) return
    detach()
    attachedEl = el
    scrollRoot = findScrollParent(el)
    window.addEventListener('scroll', onScroll, {
      passive: true,
      capture: true
    })
    window.addEventListener('resize', onResize, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onResize)
      resizeObserver.observe(el)
    }
    padTopStale = true
    measure()
    baselineScrollJump()
  }

  const detach = () => {
    if (!attachedEl || typeof window === 'undefined') return
    window.removeEventListener('scroll', onScroll, { capture: true })
    window.removeEventListener('resize', onResize)
    resizeObserver?.disconnect()
    resizeObserver = undefined
    if (settleTimer !== undefined) clearTimeout(settleTimer)
    attachedEl = null
    isScrolling.value = false
    isFastScrolling.value = false
    pendingCompensation = 0
    hasOffsetSample = false
    fastJumpStreak = 0
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
    if (!isEnabled()) return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 }
    const metrics = options.metrics.value
    // Read `.version` so height mutations (rows measured after render) mark
    // this computed dirty even though `metrics` itself is the same object.
    metrics.version.value
    return computeVirtualWindow({
      scrolledPast: scrolledPast.value,
      viewportHeight: viewportHeight.value,
      metrics,
      totalCount: options.totalCount.value,
      // Overscan is runway for real rows; mid-fling only the viewport matters.
      overscan: isFastScrolling.value ? 0 : baseOverscan,
      rangeStep,
      maxRenderedRows
    })
  })

  const rangeStart = computed(() => windowState.value.start)
  const rangeEnd = computed(() => windowState.value.end)
  const topSpacerHeight = computed(() => windowState.value.topSpacer)
  const bottomSpacerHeight = computed(() => windowState.value.bottomSpacer)
  const settled = computed(() => !isScrolling.value)

  watch(
    [rangeStart, rangeEnd, options.totalCount, settled, () => isEnabled()],
    ([start, end, total, isSettled]) => {
      if (!isEnabled()) return
      options.onRangeChange?.({ start, end, total, settled: isSettled })
    },
    { immediate: true, flush: 'post' }
  )

  /** Scrolls so `offset` px of the container sit above the viewport top. */
  const scrollToOffset = (offset: number) => {
    const el = options.containerRef.value
    if (!el || typeof window === 'undefined' || !isEnabled()) return
    const target = Math.max(0, offset)
    const rect = el.getBoundingClientRect()
    const pad = readPadTop(el)
    withScrollAdjust(() => {
      if (scrollRoot === window) {
        setScrollTop(scrollRoot, rect.top + window.scrollY + pad + target)
        return
      }
      const rootEl = scrollRoot as HTMLElement
      const rootRect = rootEl.getBoundingClientRect()
      setScrollTop(
        scrollRoot,
        getScrollTop(rootEl) + (rect.top - rootRect.top) + pad + target
      )
    })
    measure()
    baselineScrollJump()
  }

  // Best-effort: jumps to the offset the current metrics predict for `index`.
  // For never-rendered rows under variable-height mode this uses the
  // estimate and refines once those rows render and get measured — the same
  // limitation every variable-size virtualizer has.
  const scrollToIndex = (index: number) => {
    scrollToOffset(options.metrics.value.offsetOf(Math.max(0, index)))
  }

  return {
    rangeStart,
    rangeEnd,
    topSpacerHeight,
    bottomSpacerHeight,
    isScrolling: computed(
      () =>
        isEnabled() &&
        isScrolling.value &&
        isActivelyWindowing(
          rangeStart.value,
          rangeEnd.value,
          options.totalCount.value
        )
    ),
    isFastScrolling: computed(() => isEnabled() && isFastScrolling.value),
    settled,
    scrolledPast: computed(() => scrolledPast.value),
    viewportHeight: computed(() => viewportHeight.value),
    scrollToIndex,
    scrollToOffset,
    compensateScroll
  }
}

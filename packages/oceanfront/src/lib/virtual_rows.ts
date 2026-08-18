import {
  ComputedRef,
  Ref,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'
import { RowMetrics } from './virtual_row_heights'

export const VIRTUAL_ROWS_DEFAULT_OVERSCAN = 5
/** Extra overscan while flinging. Placeholders are recycled, so a wider window is cheap. */
export const VIRTUAL_ROWS_FLING_OVERSCAN = 30
/** Fraction of fling overscan kept behind the scroll direction (covers reversals). */
export const VIRTUAL_ROWS_FLING_TRAILING_RATIO = 0.25
/** Offset change below this is noise, not a change of direction. */
export const DIRECTION_EPSILON_PX = 4
export const VIRTUAL_SCROLL_SETTLE_MS = 120
export const VIRTUAL_SCROLL_SETTLE_MAX_MS = 400
/** Settle delay is at least this multiple of the gap between scroll samples. */
export const VIRTUAL_SCROLL_SETTLE_SAMPLE_FACTOR = 1.5
/** Gaps longer than this start a new gesture and are not averaged into sample cost. */
export const VIRTUAL_SCROLL_SAMPLE_GAP_MAX_MS = 1000
/**
 * Jump size, as a fraction of the viewport, that counts toward fling mode.
 * Distance, not speed: sample timing follows window-build cost, so a px/ms
 * threshold would treat an expensive window as slow.
 */
export const VIRTUAL_SCROLL_FAST_JUMP_RATIO = 1
export const VIRTUAL_SCROLL_FAST_SAMPLES = 2
export const VIRTUAL_ROWS_RANGE_STEP = 5

/** Cap on overscan, not the visible viewport — a tall screen may show more rows than this. */
export const MAX_RENDERED_ROWS = 80

export type ScrollRoot = HTMLElement | Window

const isScrollableOverflow = (overflow: string) =>
  overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'

/** Nearest scrolling ancestor, or `window`. Starts at `parentElement` so `el` itself is never the root. */
export const findScrollParent = (el: HTMLElement): ScrollRoot => {
  let parent = el.parentElement
  while (parent) {
    const style = window.getComputedStyle(parent)
    if (
      isScrollableOverflow(style.overflowY) &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return window
}

export const getScrollTop = (root: ScrollRoot): number =>
  root === window ? window.scrollY : (root as HTMLElement).scrollTop

export const getScrollRange = (root: ScrollRoot): number => {
  if (root === window) {
    const doc = document.documentElement
    const height = window.innerHeight || doc.clientHeight || 0
    return Math.max(0, (doc.scrollHeight || 0) - height)
  }
  const el = root as HTMLElement
  return Math.max(0, el.scrollHeight - el.clientHeight)
}

/** Visible height of the scroll root, not of any particular child on screen. */
export const getScrollViewport = (root: ScrollRoot): number =>
  root === window
    ? window.innerHeight || document.documentElement.clientHeight || 0
    : (root as HTMLElement).clientHeight

export const setScrollTop = (root: ScrollRoot, top: number): void => {
  if (root === window) {
    window.scrollTo({ top, behavior: 'auto' })
  } else {
    ;(root as HTMLElement).scrollTop = top
  }
}

/** Fling detection and adaptive settle delay from scroll-sample distances. */
const createScrollGesture = () => {
  let lastOffset = 0
  let lastScrollRange = 0
  let hasOffsetSample = false
  let fastJumpStreak = 0
  let sampleIntervalMs = 0
  let lastSampleAt = 0
  let hasSampleTime = false

  const baseline = (offset: number, scrollRange: number) => {
    lastOffset = offset
    lastScrollRange = scrollRange
    hasOffsetSample = true
  }

  /** True once consecutive oversized jumps have engaged fling mode. */
  const trackJump = (
    offset: number,
    viewport: number,
    scrollRange: number
  ): boolean => {
    let engaged = false
    if (hasOffsetSample && viewport > 0) {
      const layoutMoved = Math.abs(scrollRange - lastScrollRange)
      const jumped = Math.abs(offset - lastOffset)
      const fastAt = viewport * VIRTUAL_SCROLL_FAST_JUMP_RATIO
      if (jumped > layoutMoved + fastAt) {
        fastJumpStreak += 1
        if (fastJumpStreak >= VIRTUAL_SCROLL_FAST_SAMPLES) engaged = true
      } else {
        fastJumpStreak = 0
      }
    }
    baseline(offset, scrollRange)
    return engaged
  }

  const trackSample = (now: number) => {
    const gap = hasSampleTime ? now - lastSampleAt : 0
    lastSampleAt = now
    hasSampleTime = true
    if (gap <= 0 || gap > VIRTUAL_SCROLL_SAMPLE_GAP_MAX_MS) return
    sampleIntervalMs = sampleIntervalMs
      ? sampleIntervalMs * 0.6 + gap * 0.4
      : gap
  }

  const settleDelay = () =>
    Math.min(
      VIRTUAL_SCROLL_SETTLE_MAX_MS,
      Math.max(
        VIRTUAL_SCROLL_SETTLE_MS,
        Math.round(sampleIntervalMs * VIRTUAL_SCROLL_SETTLE_SAMPLE_FACTOR)
      )
    )

  const resetFling = () => {
    fastJumpStreak = 0
  }

  const reset = () => {
    hasOffsetSample = false
    fastJumpStreak = 0
    sampleIntervalMs = 0
    lastSampleAt = 0
    hasSampleTime = false
  }

  return { baseline, trackJump, trackSample, settleDelay, resetFling, reset }
}

export interface VirtualWindowInput {
  scrolledPast: number
  viewportHeight: number
  metrics: RowMetrics
  totalCount: number
  overscan: number
  /** Rows of overscan above the viewport. Defaults to `overscan`. */
  overscanLead?: number
  /** Rows of overscan below the viewport. Defaults to `overscan`. */
  overscanTrail?: number
  /** Snap range start to multiples of this many rows (fewer range-change events). */
  rangeStep: number
  /** Defaults to `MAX_RENDERED_ROWS`. */
  maxRenderedRows?: number
}

export interface VirtualWindow {
  start: number
  end: number
  topSpacer: number
  bottomSpacer: number
}

/**
 * Rows covering the viewport plus overscan, and spacers for everything outside.
 * The cap only trims overscan. Spacers span the whole list so scroll height stays stable.
 */
export function computeVirtualWindow(input: VirtualWindowInput): VirtualWindow {
  const total = Math.max(0, input.totalCount)
  const step = Math.max(1, input.rangeStep)
  const overscan = Math.max(0, input.overscan)
  const cap = Math.max(1, input.maxRenderedRows ?? MAX_RENDERED_ROWS)
  const metrics = input.metrics

  if (total <= 0) return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 }

  const firstVisible = metrics.indexAtOffset(input.scrolledPast, total)
  const lastVisible = metrics.indexAtOffset(
    input.scrolledPast + Math.max(0, input.viewportHeight),
    total
  )
  const coreEnd = Math.min(total, lastVisible + 1)
  const coreCount = Math.max(1, coreEnd - firstVisible)

  const leadWanted = Math.max(0, input.overscanLead ?? overscan)
  const trailWanted = Math.max(0, input.overscanTrail ?? overscan)
  const wanted = leadWanted + trailWanted
  const budget = Math.max(0, cap - coreCount)
  // Share a tight budget in proportion so asymmetric (fling) overscan is not recentered.
  const lead =
    wanted > budget && wanted
      ? Math.floor((budget * leadWanted) / wanted)
      : leadWanted
  const trail = wanted > budget ? budget - lead : trailWanted

  const start = Math.floor(Math.max(0, firstVisible - lead) / step) * step
  let end = Math.min(total, coreEnd + trail)
  // Snap-to-step can inflate the window; trim trailing overscan only, keep the viewport.
  if (end - start > cap) end = Math.max(coreEnd, start + cap)
  end = Math.max(start, Math.min(total, end))

  return {
    start,
    end,
    topSpacer: metrics.offsetOf(start),
    bottomSpacer: Math.max(
      0,
      metrics.totalHeight(total) - metrics.offsetOf(end)
    )
  }
}

/** True when the rendered window is a proper subset of the list. */
export const isActivelyWindowing = (
  start: number,
  end: number,
  total: number
): boolean => total > 0 && (start > 0 || end < total)

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
  metrics: ComputedRef<RowMetrics> | Ref<RowMetrics>
  overscan?: number
  maxRenderedRows?: number
  onRangeChange?: (range: VirtualRowsRange) => void
}

export interface UseVirtualRowsReturn {
  rangeStart: ComputedRef<number>
  rangeEnd: ComputedRef<number>
  topSpacerHeight: ComputedRef<number>
  bottomSpacerHeight: ComputedRef<number>
  isScrolling: ComputedRef<boolean>
  isFastScrolling: ComputedRef<boolean>
  settled: ComputedRef<boolean>
  scrolledPast: ComputedRef<number>
  viewportHeight: ComputedRef<number>
  scrollToIndex: (index: number) => void
  scrollToOffset: (offset: number) => void
  compensateScroll: (delta: number) => void
}

/**
 * Row windowing for a container that grows with its content. Scroll lives on
 * a parent (or the page), so `scrolledPast` is how far the container top moved
 * above the viewport.
 */
export function useVirtualRows(
  options: UseVirtualRowsOptions
): UseVirtualRowsReturn {
  const baseOverscan = options.overscan ?? VIRTUAL_ROWS_DEFAULT_OVERSCAN
  const maxRenderedRows = options.maxRenderedRows ?? MAX_RENDERED_ROWS
  const rangeStep = Math.max(1, VIRTUAL_ROWS_RANGE_STEP)
  const isEnabled = () => options.enabled?.value !== false
  const gesture = createScrollGesture()

  const scrolledPast = ref(0)
  const viewportHeight = ref(0)
  const isScrolling = ref(false)
  const isFastScrolling = ref(false)
  const scrollDirection = ref(1)

  let scrollRoot: ScrollRoot = window
  let attachedEl: HTMLElement | null = null
  let resizeObserver: ResizeObserver | undefined
  let measureScheduled = false
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  let followRaf = 0
  let pendingCompensation = 0
  let compensationScheduled = false
  let padTop = 0
  let padTopStale = true
  let programmaticScrollTop: number | null = null

  const readPadTop = (el: HTMLElement) => {
    padTop = parseFloat(getComputedStyle(el).paddingTop) || 0
    padTopStale = false
    return padTop
  }

  const resolveScrollRoot = (el: HTMLElement) => {
    scrollRoot = findScrollParent(el)
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
    if (padTopStale) readPadTop(el)
    const nextOffset = Math.max(0, -rect.top - padTop)
    const moved = nextOffset - scrolledPast.value
    if (Math.abs(moved) >= DIRECTION_EPSILON_PX) {
      scrollDirection.value = moved > 0 ? 1 : -1
    }
    scrolledPast.value = nextOffset
    viewportHeight.value = Math.max(
      0,
      Math.min(rect.bottom, winHeight) - Math.max(rect.top, 0)
    )
  }

  const baselineScrollJump = () => {
    gesture.baseline(scrolledPast.value, getScrollRange(scrollRoot))
  }

  const stopFollow = () => {
    if (!followRaf) return
    cancelAnimationFrame(followRaf)
    followRaf = 0
  }

  const followScroll = () => {
    followRaf = 0
    if (!isEnabled() || !isScrolling.value) return
    measure()
    followRaf = requestAnimationFrame(followScroll)
  }

  const startFollow = () => {
    if (followRaf || typeof requestAnimationFrame === 'undefined') return
    followRaf = requestAnimationFrame(followScroll)
  }

  const nowMs = () =>
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now()

  const markScrolling = () => {
    gesture.trackSample(nowMs())
    isScrolling.value = true
    startFollow()
    if (settleTimer !== undefined) clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      isScrolling.value = false
      isFastScrolling.value = false
      gesture.resetFling()
      padTopStale = true
      measure()
      baselineScrollJump()
    }, gesture.settleDelay())
  }

  const onScroll = () => {
    if (!isEnabled()) return
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
    if (
      gesture.trackJump(
        scrolledPast.value,
        getScrollViewport(scrollRoot),
        getScrollRange(scrollRoot)
      )
    ) {
      isFastScrolling.value = true
    }
  }

  const onResize = () => {
    padTopStale = true
    if (attachedEl) resolveScrollRoot(attachedEl)
    scheduleMeasure()
  }

  const withScrollAdjust = (fn: () => void) => {
    fn()
    programmaticScrollTop = getScrollTop(scrollRoot)
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
    resolveScrollRoot(el)
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
    stopFollow()
    attachedEl = null
    isScrolling.value = false
    isFastScrolling.value = false
    pendingCompensation = 0
    gesture.reset()
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
    metrics.version.value
    const fling = isFastScrolling.value
    const overscan = fling ? VIRTUAL_ROWS_FLING_OVERSCAN : baseOverscan
    const behind = fling
      ? Math.ceil(overscan * VIRTUAL_ROWS_FLING_TRAILING_RATIO)
      : overscan
    const goingDown = scrollDirection.value >= 0
    return computeVirtualWindow({
      scrolledPast: scrolledPast.value,
      viewportHeight: viewportHeight.value,
      metrics,
      totalCount: options.totalCount.value,
      overscan,
      overscanLead: goingDown ? behind : overscan,
      overscanTrail: goingDown ? overscan : behind,
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

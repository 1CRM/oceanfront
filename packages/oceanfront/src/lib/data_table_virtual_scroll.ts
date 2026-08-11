import { ComputedRef, Ref, computed, ref, watch, watchEffect } from 'vue'
import { findScrollParent, getScrollTop, setScrollTop } from './scroll_dom'
import { VirtualRowsRange, useVirtualRows } from './virtual_rows'
import {
  VIRTUAL_BODY_MAX_SKELETON_ROWS,
  clampVirtualRangeToLoaded,
  hasUnloadedRowsInViewport,
  safeScrolledPastBounds
} from './virtual_range'
import {
  RowMetrics,
  createFixedRowMetrics,
  createRowHeightCache
} from './virtual_row_heights'

export interface UseDataTableVirtualScrollOptions {
  containerRef: Ref<HTMLDivElement | undefined>
  enabled: ComputedRef<boolean>
  rows: ComputedRef<any[]>
  density: ComputedRef<number>
  rowHeightOverride: ComputedRef<number | undefined>
  totalRows: ComputedRef<number | undefined>
  /**
   * Absolute index of virtual row 0. Lets the table span only a sliding
   * resident window while row data stays at absolute sparse offsets.
   */
  rowIndexOffset?: ComputedRef<number> | Ref<number>
  onRangeChange?: (range: VirtualRowsRange) => void
}

export interface UseDataTableVirtualScrollReturn {
  rangeStart: ComputedRef<number>
  rangeEnd: ComputedRef<number>
  topSpacer: ComputedRef<number>
  bottomSpacer: ComputedRef<number>
  isScrolling: ComputedRef<boolean>
  fixedRowHeight: ComputedRef<boolean>
  rowHeightVar: ComputedRef<string | undefined>
  rowIndexOffset: ComputedRef<number>
  /** Feeds a rendered row's real height back into the variable-height cache. */
  reportRowHeight: (index: number, height: number) => void
  scrollToIndex: (index: number) => void
}

const estimateRowHeight = (density: number) => {
  const vpadRem = [0.5, 0.4, 0.25, 0.1][density] ?? 0.25
  return Math.round(16 * vpadRem * 2 + 24)
}

/**
 * DataTable adapter: row-height tracking + virtual windowing hooks.
 *
 * `virtual-row-height` (rowHeightOverride) is an explicit "rows are single
 * line / uniform height" contract from the consumer — it stays O(1) fixed
 * math with no measurement. Otherwise, rows are auto-measured per-render
 * (via `reportRowHeight`, fed by a `ResizeObserver` in
 * `TableVirtualBody.vue`) and tracked in a `RowHeightCache` so wrapped
 * multiline rows get correct spacers/scroll math even though rows aren't a
 * uniform height.
 */
export function useDataTableVirtualScroll(
  options: UseDataTableVirtualScrollOptions
): UseDataTableVirtualScrollReturn {
  const rowHeightCache = createRowHeightCache(
    estimateRowHeight(options.density.value)
  )
  const rowIndexOffset = computed(() =>
    Math.max(0, options.rowIndexOffset?.value ?? 0)
  )

  // Reference-equality watch: fires on a genuine data reload/sort (new
  // array) or a density change, not on in-place sparse-array hole fills
  // used by chunked/infinite loading — so measured heights survive
  // incremental loads instead of being thrown away on every chunk.
  watch([options.rows, options.density], () => {
    if (!options.enabled.value) return
    rowHeightCache.reset(estimateRowHeight(options.density.value))
  })

  const metrics = computed<RowMetrics>(() =>
    options.rowHeightOverride.value != null
      ? createFixedRowMetrics(options.rowHeightOverride.value)
      : rowHeightCache
  )

  const reportRowHeight = (index: number, height: number) => {
    if (!options.enabled.value || options.rowHeightOverride.value != null)
      return
    rowHeightCache.setSize(index, height)
  }

  const totalCount = computed(
    () => options.totalRows.value ?? options.rows.value.length
  )

  // Freeze page scroll once the viewport reaches unloaded rows (after we
  // rewind to the safe edge). Prevents flings through empty placeholders.
  const scrollLocked = ref(false)

  const virtualRows = useVirtualRows({
    enabled: options.enabled,
    containerRef: options.containerRef,
    totalCount,
    metrics,
    scrollLocked,
    onRangeChange: (range) => {
      const offset = rowIndexOffset.value
      options.onRangeChange?.({
        start: range.start + offset,
        end: range.end + offset,
        total: range.total
      })
    }
  })

  const clampedRange = computed(() =>
    clampVirtualRangeToLoaded({
      start: virtualRows.rangeStart.value,
      end: virtualRows.rangeEnd.value,
      rows: options.rows.value,
      rowIndexOffset: rowIndexOffset.value,
      maxSkeletonRows: VIRTUAL_BODY_MAX_SKELETON_ROWS
    })
  )

  const rangeStart = computed(() => clampedRange.value.start)
  const rangeEnd = computed(() => clampedRange.value.end)

  // Spacers follow the clamped window so skipped holes become spacer space
  // only briefly — scroll rewind below keeps them off-screen.
  const topSpacer = computed(() => metrics.value.offsetOf(rangeStart.value))
  const bottomSpacer = computed(() =>
    Math.max(
      0,
      metrics.value.totalHeight(totalCount.value) -
        metrics.value.offsetOf(rangeEnd.value)
    )
  )

  let correctingScroll = false
  const rewindToSafeScroll = () => {
    if (!options.enabled.value || correctingScroll) return
    const el = options.containerRef.value
    if (!el) return

    metrics.value.version.value
    const bounds = safeScrolledPastBounds({
      viewportHeight: virtualRows.viewportHeight.value,
      metrics: metrics.value,
      totalCount: totalCount.value,
      rows: options.rows.value,
      rowIndexOffset: rowIndexOffset.value,
      maxSkeletonRows: VIRTUAL_BODY_MAX_SKELETON_ROWS
    })
    const past = virtualRows.scrolledPast.value
    const excess =
      past > bounds.max
        ? past - bounds.max
        : past < bounds.min
          ? past - bounds.min
          : null
    if (excess == null) return

    const root = findScrollParent(el)
    correctingScroll = true
    setScrollTop(root, Math.max(0, getScrollTop(root) - excess))
    correctingScroll = false
    scrollLocked.value = true
    virtualRows.refresh()
  }

  watch(
    [
      virtualRows.scrolledPast,
      virtualRows.viewportHeight,
      totalCount,
      rowIndexOffset,
      options.rows,
      options.enabled
    ],
    () => rewindToSafeScroll(),
    // Sync so a fast fling cannot paint a frame of empty spacer before rewind.
    { flush: 'sync' }
  )

  watchEffect(() => {
    if (!options.enabled.value) {
      scrollLocked.value = false
      return
    }
    metrics.value.version.value
    // Lock only for on-screen holes. `didClamp` can stay true when overscan
    // peeks past a skeleton tail while the viewport itself is fully loaded —
    // OR-ing it here would freeze scroll at the top / mid-list incorrectly.
    scrollLocked.value = hasUnloadedRowsInViewport({
      scrolledPast: virtualRows.scrolledPast.value,
      viewportHeight: virtualRows.viewportHeight.value,
      metrics: metrics.value,
      totalCount: totalCount.value,
      rows: options.rows.value,
      rowIndexOffset: rowIndexOffset.value
    })
  })

  // When the sliding window origin moves, drop stale local height keys and
  // shift scrollTop so the same absolute rows stay in view.
  watch(rowIndexOffset, (next, prev) => {
    if (!options.enabled.value || prev === undefined || next === prev) return
    const deltaRows = next - prev
    const el = options.containerRef.value
    if (el) {
      // Measure evicted leading height before resetting the cache. Variable-
      // height lists diverge from estimate*rows and would jump otherwise.
      const heightDelta =
        deltaRows > 0
          ? metrics.value.offsetOf(deltaRows)
          : deltaRows *
            (options.rowHeightOverride.value ??
              estimateRowHeight(options.density.value))
      const root = findScrollParent(el)
      setScrollTop(root, Math.max(0, getScrollTop(root) - heightDelta))
    }
    if (options.rowHeightOverride.value == null) {
      rowHeightCache.reset(estimateRowHeight(options.density.value))
    }
    virtualRows.refresh()
  })

  const fixedRowHeight = computed(
    () => options.enabled.value && !!options.rowHeightOverride.value
  )

  const scrollToIndex = (index: number) => {
    virtualRows.scrollToIndex(Math.max(0, index - rowIndexOffset.value))
  }

  return {
    rangeStart,
    rangeEnd,
    topSpacer,
    bottomSpacer,
    isScrolling: virtualRows.isScrolling,
    fixedRowHeight,
    rowHeightVar: computed(() =>
      fixedRowHeight.value ? options.rowHeightOverride.value + 'px' : undefined
    ),
    rowIndexOffset,
    reportRowHeight,
    scrollToIndex
  }
}

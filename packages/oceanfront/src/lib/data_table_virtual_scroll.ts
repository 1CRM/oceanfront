import { ComputedRef, Ref, computed, watch } from 'vue'
import { VirtualRowsRange, useVirtualRows } from './virtual_rows'
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
 * multiline rows get correct spacers/scroll math instead of assuming every
 * row shares one fixed height.
 */
export function useDataTableVirtualScroll(
  options: UseDataTableVirtualScrollOptions
): UseDataTableVirtualScrollReturn {
  const rowHeightCache = createRowHeightCache(
    estimateRowHeight(options.density.value)
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

  const virtualRows = useVirtualRows({
    enabled: options.enabled,
    containerRef: options.containerRef,
    totalCount: computed(
      () => options.totalRows.value ?? options.rows.value.length
    ),
    metrics,
    onRangeChange: options.onRangeChange
  })

  const fixedRowHeight = computed(
    () => options.enabled.value && !!options.rowHeightOverride.value
  )

  return {
    rangeStart: virtualRows.rangeStart,
    rangeEnd: virtualRows.rangeEnd,
    topSpacer: virtualRows.topSpacerHeight,
    bottomSpacer: virtualRows.bottomSpacerHeight,
    isScrolling: virtualRows.isScrolling,
    fixedRowHeight,
    rowHeightVar: computed(() =>
      fixedRowHeight.value ? options.rowHeightOverride.value + 'px' : undefined
    ),
    reportRowHeight,
    scrollToIndex: virtualRows.scrollToIndex
  }
}

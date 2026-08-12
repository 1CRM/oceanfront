import { ComputedRef, Ref, computed, watch } from 'vue'
import { VirtualRowsRange, useVirtualRows } from './virtual_rows'
import {
  RowHeightSnapshot,
  RowMetrics,
  createFixedRowMetrics,
  createRowHeightStore
} from './virtual_row_heights'

export interface UseDataTableVirtualScrollOptions {
  containerRef: Ref<HTMLDivElement | undefined>
  enabled: ComputedRef<boolean>
  rows: ComputedRef<any[]>
  density: ComputedRef<number>
  rowHeightOverride: ComputedRef<number | undefined>
  totalRows: ComputedRef<number | undefined>
  /**
   * Measurements to start from, so a revisited list keeps the heights (and
   * therefore the scroll offset) it had before.
   */
  rowHeights?: ComputedRef<RowHeightSnapshot | undefined>
  /**
   * Bumping this discards all measurements — for changes that reshuffle which
   * record sits at which index (sort, filter, module).
   */
  heightsKey?: ComputedRef<string | number | undefined>
  onRangeChange?: (range: VirtualRowsRange) => void
}

export interface UseDataTableVirtualScrollReturn {
  /** Window to render; during a fling the body fills it with skeletons. */
  rangeStart: ComputedRef<number>
  rangeEnd: ComputedRef<number>
  topSpacer: ComputedRef<number>
  bottomSpacer: ComputedRef<number>
  isScrolling: ComputedRef<boolean>
  /** True while flinging: body fills the window with cheap skeletons. */
  isFastScrolling: ComputedRef<boolean>
  fixedRowHeight: ComputedRef<boolean>
  rowHeightVar: ComputedRef<string | undefined>
  /**
   * Height a row occupies: its measurement when it has one, otherwise the
   * estimate the spacer math assumes. Always a number, so a placeholder can
   * never disagree with the height its index was budgeted.
   */
  rowHeightAt: (index: number) => number
  /** Feeds a rendered row's real height back into the height store. */
  reportRowHeight: (index: number, height: number) => void
  scrollToIndex: (index: number) => void
  scrollToOffset: (offset: number) => void
  scrollOffset: ComputedRef<number>
  rowHeightsSnapshot: () => RowHeightSnapshot
}

const estimateRowHeight = (density: number) => {
  const vpadRem = [0.5, 0.4, 0.25, 0.1][density] ?? 0.25
  return Math.round(16 * vpadRem * 2 + 24)
}

/**
 * DataTable adapter: row-height tracking + virtual windowing.
 *
 * `virtual-row-height` (rowHeightOverride) is an explicit "rows are single
 * line / uniform height" contract from the consumer — it stays O(1) fixed
 * math with no measurement. Otherwise rows are auto-measured per render (via
 * `reportRowHeight`, fed by a `ResizeObserver` in `TableVirtualBody.vue`) and
 * kept in a `RowHeightStore` keyed by absolute index, so unloaded and evicted
 * rows still reserve exactly the space they had.
 */
export function useDataTableVirtualScroll(
  options: UseDataTableVirtualScrollOptions
): UseDataTableVirtualScrollReturn {
  const heightStore = createRowHeightStore(
    estimateRowHeight(options.density.value)
  )
  heightStore.hydrate(options.rowHeights?.value)

  // Only a genuine re-indexing of the list (sort/filter/module) invalidates
  // measurements. Chunk loading and eviction leave them alone — that is what
  // keeps revisited regions jump-free.
  watch([options.heightsKey, options.density], () => {
    if (!options.enabled.value) return
    heightStore.reset(estimateRowHeight(options.density.value))
    heightStore.hydrate(options.rowHeights?.value)
  })

  const metrics = computed<RowMetrics>(() =>
    options.rowHeightOverride.value != null
      ? createFixedRowMetrics(options.rowHeightOverride.value)
      : heightStore
  )

  const totalCount = computed(
    () => options.totalRows.value ?? options.rows.value.length
  )

  const virtualRows = useVirtualRows({
    enabled: options.enabled,
    containerRef: options.containerRef,
    totalCount,
    metrics,
    onRangeChange: options.onRangeChange
  })

  const reportRowHeight = (index: number, height: number) => {
    if (!options.enabled.value || options.rowHeightOverride.value != null)
      return
    const delta = heightStore.setSize(index, height)
    // A row above the window changing height moves everything below it,
    // including what the user is looking at. Cancel that out.
    if (delta && index < virtualRows.rangeStart.value) {
      virtualRows.compensateScroll(delta)
    }
  }

  const fixedRowHeight = computed(
    () => options.enabled.value && !!options.rowHeightOverride.value
  )

  return {
    rangeStart: virtualRows.rangeStart,
    rangeEnd: virtualRows.rangeEnd,
    topSpacer: virtualRows.topSpacerHeight,
    bottomSpacer: virtualRows.bottomSpacerHeight,
    isScrolling: virtualRows.isScrolling,
    isFastScrolling: virtualRows.isFastScrolling,
    fixedRowHeight,
    rowHeightVar: computed(() =>
      fixedRowHeight.value ? options.rowHeightOverride.value + 'px' : undefined
    ),
    rowHeightAt: (index) =>
      options.rowHeightOverride.value ??
      heightStore.getSize(index) ??
      heightStore.estimatedSize(),
    reportRowHeight,
    scrollToIndex: virtualRows.scrollToIndex,
    scrollToOffset: virtualRows.scrollToOffset,
    scrollOffset: virtualRows.scrolledPast,
    rowHeightsSnapshot: () => heightStore.snapshot()
  }
}

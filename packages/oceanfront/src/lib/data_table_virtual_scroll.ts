import { ComputedRef, Ref, computed, provide, watch } from 'vue'
import { VirtualRowsRange, useVirtualRows } from './virtual_rows'
import {
  RowHeightSnapshot,
  RowMetrics,
  createFixedRowMetrics,
  createRowHeightStore
} from './virtual_row_heights'
import { dataTableVirtualScrollKey } from './virtual_scroll_vnode'

export interface UseDataTableVirtualScrollOptions {
  containerRef: Ref<HTMLDivElement | undefined>
  enabled: ComputedRef<boolean>
  rows: ComputedRef<any[]>
  density: ComputedRef<number>
  rowHeightOverride: ComputedRef<number | undefined>
  totalRows: ComputedRef<number | undefined>
  rowHeights?: ComputedRef<RowHeightSnapshot | undefined>
  heightsKey?: ComputedRef<string | number | undefined>
  onRangeChange?: (range: VirtualRowsRange) => void
  /** Cap on remembered row measurements. */
  maxTrackedRowHeights?: number
}

export interface DataTableScrollState {
  offset: number
  start: number
  end: number
  rowHeights: RowHeightSnapshot
}

export interface UseDataTableVirtualScrollReturn {
  rangeStart: ComputedRef<number>
  rangeEnd: ComputedRef<number>
  topSpacer: ComputedRef<number>
  bottomSpacer: ComputedRef<number>
  isScrolling: ComputedRef<boolean>
  isFastScrolling: ComputedRef<boolean>
  fixedRowHeight: ComputedRef<boolean>
  rowHeightVar: ComputedRef<string | undefined>
  tableClass: ComputedRef<Record<string, boolean>>
  rowHeightAt: (index: number) => number
  reportRowHeight: (index: number, height: number) => void
  scrollToIndex: (index: number) => void
  scrollToOffset: (offset: number) => void
  scrollOffset: ComputedRef<number>
  rowHeightsSnapshot: () => RowHeightSnapshot
  getScrollState: () => DataTableScrollState
}

/** Vertical cell padding (rem) per density; keep in sync with `--table-cell-vpad`. */
const DENSITY_CELL_VPAD_REM = [0.5, 0.4, 0.25, 0.1] as const
const ROW_CONTENT_HEIGHT_PX = 24

export const estimateRowHeight = (density: number) => {
  const vpadRem = DENSITY_CELL_VPAD_REM[density] ?? 0.25
  return Math.round(16 * vpadRem * 2 + ROW_CONTENT_HEIGHT_PX)
}

export function useDataTableVirtualScroll(
  options: UseDataTableVirtualScrollOptions
): UseDataTableVirtualScrollReturn {
  provide(dataTableVirtualScrollKey, options.enabled)

  const heightStore = createRowHeightStore(
    estimateRowHeight(options.density.value),
    options.maxTrackedRowHeights
  )
  heightStore.hydrate(options.rowHeights?.value)

  watch([options.heightsKey, options.density], () => {
    if (!options.enabled.value) return
    heightStore.reset(estimateRowHeight(options.density.value))
    heightStore.hydrate(options.rowHeights?.value)
  })

  watch(
    () => options.rowHeights?.value,
    (snapshot) => {
      if (!options.enabled.value) return
      heightStore.hydrate(snapshot)
    }
  )

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
    const { delta, evicted } = heightStore.setSize(index, height)
    const start = virtualRows.rangeStart.value
    let shift = 0
    if (delta && index < start) shift += delta
    for (const [idx, evictionDelta] of evicted) {
      if (evictionDelta && idx < start) shift += evictionDelta
    }
    if (shift) virtualRows.compensateScroll(shift)
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
    tableClass: computed(() => ({
      'of--virtual-scroll': options.enabled.value,
      'of--scrolling': virtualRows.isScrolling.value,
      'of--fixed-row-height': fixedRowHeight.value
    })),
    rowHeightAt: (index) =>
      options.rowHeightOverride.value ??
      heightStore.getSize(index) ??
      heightStore.estimatedSize(),
    reportRowHeight,
    scrollToIndex: virtualRows.scrollToIndex,
    scrollToOffset: virtualRows.scrollToOffset,
    scrollOffset: virtualRows.scrolledPast,
    rowHeightsSnapshot: () => heightStore.snapshot(),
    getScrollState: () => ({
      offset: virtualRows.scrolledPast.value,
      start: virtualRows.rangeStart.value,
      end: virtualRows.rangeEnd.value,
      rowHeights: heightStore.snapshot()
    })
  }
}

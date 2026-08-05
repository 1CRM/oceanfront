import {
  ComputedRef,
  Ref,
  computed,
  nextTick,
  onMounted,
  ref,
  watch
} from 'vue'
import { VirtualRowsRange, useVirtualRows } from './virtual_rows'

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
  scrollToOffset: (offset: number) => void
}

const estimateRowHeight = (density: number) => {
  const vpadRem = [0.5, 0.4, 0.25, 0.1][density] ?? 0.25
  return Math.round(16 * vpadRem * 2 + 24)
}

/** DataTable adapter: row-height measurement + virtual windowing hooks. */
export function useDataTableVirtualScroll(
  options: UseDataTableVirtualScrollOptions
): UseDataTableVirtualScrollReturn {
  const measuredRowHeight = ref<number | undefined>(undefined)

  const rowHeight = computed(
    () =>
      options.rowHeightOverride.value ??
      measuredRowHeight.value ??
      estimateRowHeight(options.density.value)
  )

  const measureRowHeight = () => {
    if (!options.enabled.value) return
    const cell = options.containerRef.value?.querySelector(
      '.of-data-table-row:not(.of-data-table-row-skeleton) > [role="cell"]'
    ) as HTMLElement | null
    const height = cell?.getBoundingClientRect().height
    if (height && height > 0) measuredRowHeight.value = height
  }

  onMounted(measureRowHeight)
  watch([options.rows, options.density], () => {
    if (options.enabled.value) nextTick().then(measureRowHeight)
  })

  const virtualRows = useVirtualRows({
    enabled: options.enabled,
    containerRef: options.containerRef,
    totalCount: computed(
      () => options.totalRows.value ?? options.rows.value.length
    ),
    rowHeight,
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
    scrollToOffset: virtualRows.scrollToOffset
  }
}

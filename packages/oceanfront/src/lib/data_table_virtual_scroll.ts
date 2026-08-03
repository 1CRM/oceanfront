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
  /** Explicit row height override (px); when unset, height is measured. */
  rowHeightOverride: ComputedRef<number | undefined>
  /** Total logical row count; defaults to `rows.length` when unset. */
  totalRows: ComputedRef<number | undefined>
  onRangeChange?: (range: VirtualRowsRange) => void
}

export interface UseDataTableVirtualScrollReturn {
  rangeStart: ComputedRef<number>
  rangeEnd: ComputedRef<number>
  topSpacer: ComputedRef<number>
  bottomSpacer: ComputedRef<number>
  isScrolling: ComputedRef<boolean>
  /** Whether the grid's row tracks should be pinned to a fixed height. */
  fixedRowHeight: ComputedRef<boolean>
  /** `--of-table-row-height` value, only set when `fixedRowHeight` is true. */
  rowHeightVar: ComputedRef<string | undefined>
}

const estimateRowHeight = (density: number) => {
  const vpadRem = [0.5, 0.4, 0.25, 0.1][density] ?? 0.25
  return Math.round(16 * vpadRem * 2 + 24)
}

/**
 * DataTable virtual-scroll wiring: row-height measurement, windowing, and
 * CSS hooks. Kept out of DataTable.vue's selection/drag/sort setup.
 */
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
    isScrolling: computed(
      () => options.enabled.value && virtualRows.isScrolling.value
    ),
    fixedRowHeight,
    rowHeightVar: computed(() =>
      fixedRowHeight.value ? options.rowHeightOverride.value + 'px' : undefined
    )
  }
}

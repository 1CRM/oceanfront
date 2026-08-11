import { Ref, ref } from 'vue'

/**
 * Read-only row-metrics interface used by the pure virtual-window math
 * (`virtual_range.ts`). Two implementations exist: a fixed-height one
 * (O(1) `index * height` math, used when `virtual-row-height` is set) and a
 * measured cache (`createRowHeightCache`) for the default auto-measured
 * path, where rows may wrap to different heights.
 */
export interface RowMetrics {
  /** Read inside a `computed()` to subscribe to cache mutations. */
  version: Ref<number>
  /** Row index whose [top, top+height) span contains `offset`, clamped to [0, count-1]. */
  indexAtOffset(offset: number, count: number): number
  /** Top pixel offset of `index` (i.e. cumulative height of all rows before it). */
  offsetOf(index: number): number
  /** Total height of `count` rows. */
  totalHeight(count: number): number
}

const staticVersion = ref(0)

/** O(1) uniform-height metrics: the `virtual-row-height` fast path. */
export function createFixedRowMetrics(height: number): RowMetrics {
  const rowHeight = Math.max(1, height || 1)
  return {
    version: staticVersion,
    indexAtOffset: (offset, count) => {
      if (count <= 0) return 0
      const idx = Math.floor(Math.max(0, offset) / rowHeight)
      return Math.max(0, Math.min(count - 1, idx))
    },
    offsetOf: (index) => Math.max(0, index) * rowHeight,
    totalHeight: (count) => Math.max(0, count) * rowHeight
  }
}

/**
 * Variable-row-height cache for the auto-measured virtual-scroll path.
 *
 * Modeled on react-window/react-virtualized's `CellMeasurerCache`: only
 * rows that have actually been rendered get a real measurement
 * (`sizeMap`); everything else falls back to `estimatedSize`. Cumulative
 * offsets are built lazily, forward from the last computed index, so cost
 * scales with how far a user has actually scrolled rather than with total
 * row count (no dense array sized to the full row count, no per-scroll
 * O(n) walk).
 */
export function createRowHeightCache(estimatedSize: number): RowMetrics & {
  setSize(index: number, size: number): void
  reset(estimatedSize: number): void
} {
  let estimate = Math.max(1, estimatedSize || 1)
  const sizeMap = new Map<number, number>()
  // offsetCache[i] = top offset of row i, valid for i in [0, lastComputedIndex].
  let offsetCache: number[] = []
  let lastComputedIndex = -1
  // Sum of (measuredSize - estimate) over every entry in sizeMap, kept up to
  // date in O(1) per setSize call. Lets totalHeight() answer in O(1) without
  // walking the (possibly huge) unrendered tail of the list, while still
  // reflecting rows that were measured before ever being folded into
  // offsetCache (e.g. right after their first render, before any offsetOf
  // call has walked that far).
  let measuredDeltaSum = 0
  const version = ref(0)

  const sizeOf = (index: number) => sizeMap.get(index) ?? estimate

  /** Extends offsetCache up to (and including) `index`, forward from lastComputedIndex. */
  const ensureComputed = (index: number) => {
    if (index <= lastComputedIndex) return
    let offset =
      lastComputedIndex >= 0
        ? offsetCache[lastComputedIndex] + sizeOf(lastComputedIndex)
        : 0
    for (let i = lastComputedIndex + 1; i <= index; i++) {
      offsetCache[i] = offset
      offset += sizeOf(i)
    }
    lastComputedIndex = index
  }

  const offsetOf = (index: number): number => {
    const idx = Math.max(0, index)
    if (idx === 0) return 0
    ensureComputed(idx)
    return offsetCache[idx]
  }

  const totalHeight = (count: number): number => {
    const total = Math.max(0, count)
    return total * estimate + measuredDeltaSum
  }

  const indexAtOffset = (offset: number, count: number): number => {
    const total = Math.max(0, count)
    if (total <= 0) return 0
    const clampedOffset = Math.max(0, offset)
    const knownEnd =
      lastComputedIndex >= 0
        ? offsetCache[lastComputedIndex] + sizeOf(lastComputedIndex)
        : 0
    if (lastComputedIndex >= 0 && clampedOffset < knownEnd) {
      // Binary search over the monotonically increasing computed prefix.
      let lo = 0
      let hi = lastComputedIndex
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (offsetCache[mid] <= clampedOffset) lo = mid
        else hi = mid - 1
      }
      return Math.min(total - 1, lo)
    }
    // Beyond the computed range: extrapolate at `estimate` px/row.
    const extra = Math.floor((clampedOffset - knownEnd) / estimate)
    const idx =
      (lastComputedIndex >= 0 ? lastComputedIndex + 1 : 0) + Math.max(0, extra)
    return Math.max(0, Math.min(total - 1, idx))
  }

  const setSize = (index: number, size: number) => {
    const idx = Math.max(0, Math.floor(index))
    const clean = Math.max(1, size || 1)
    const prev = sizeMap.get(idx)
    if (prev === clean) return
    sizeMap.set(idx, clean)
    measuredDeltaSum += clean - (prev ?? estimate)
    if (idx <= lastComputedIndex) {
      // Invalidate the cached offsets from this row forward; they'll be
      // rebuilt lazily the next time something past this point is queried.
      lastComputedIndex = idx - 1
    }
    version.value++
  }

  const reset = (nextEstimate: number) => {
    estimate = Math.max(1, nextEstimate || 1)
    sizeMap.clear()
    offsetCache = []
    lastComputedIndex = -1
    measuredDeltaSum = 0
    version.value++
  }

  return {
    version,
    indexAtOffset,
    offsetOf,
    totalHeight,
    setSize,
    reset
  }
}

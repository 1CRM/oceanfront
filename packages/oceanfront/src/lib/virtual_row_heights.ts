import { Ref, ref } from 'vue'

/** Cap on remembered row measurements; oldest entries are dropped first. */
export const MAX_TRACKED_ROW_HEIGHTS = 20000

/**
 * Read-only row-metrics interface used by the pure virtual-window math
 * (`virtual_range.ts`). Two implementations exist: a fixed-height one
 * (O(1) `index * height` math, used when `virtual-row-height` is set) and a
 * measured store (`createRowHeightStore`) for the default auto-measured
 * path, where rows may wrap to different heights.
 */
export interface RowMetrics {
  /** Read inside a `computed()` to subscribe to store mutations. */
  version: Ref<number>
  /** Row index whose [top, top+height) span contains `offset`, clamped to [0, count-1]. */
  indexAtOffset(offset: number, count: number): number
  /** Top pixel offset of `index` (i.e. cumulative height of all rows before it). */
  offsetOf(index: number): number
  /** Total height of `count` rows. */
  totalHeight(count: number): number
}

/** Serializable measurements, for restoring a list at the same scroll offset. */
export interface RowHeightSnapshot {
  estimate: number
  sizes: [number, number][]
}

export interface RowHeightStore extends RowMetrics {
  /** Records a measured height; returns the pixel delta it added to the list. */
  setSize(index: number, size: number): number
  /** Measured height of `index`, or `undefined` when it was never rendered. */
  getSize(index: number): number | undefined
  /** Height assumed for never-measured rows; what the spacer math is built on. */
  estimatedSize(): number
  reset(estimatedSize?: number): void
  snapshot(): RowHeightSnapshot
  hydrate(snapshot: RowHeightSnapshot | undefined): void
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
 * Variable-row-height store for the auto-measured virtual-scroll path.
 *
 * Heights are keyed by *absolute* row index and are never dropped when the
 * row data itself is evicted — that is what keeps a revisited region at the
 * height it had before, so a skeleton can hold the exact space its record
 * used to occupy.
 *
 * Only rows that have actually been rendered get a real measurement
 * (`sizeMap`); everything else falls back to `estimate`. Cumulative offsets
 * are built lazily, forward from the last computed index, so cost scales
 * with how far a user has actually scrolled rather than with total row count
 * (no dense array sized to the full row count, no per-scroll O(n) walk).
 */
export function createRowHeightStore(estimatedSize: number): RowHeightStore {
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

  const invalidateFrom = (index: number) => {
    if (index <= lastComputedIndex) lastComputedIndex = index - 1
  }

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

  const dropOldestEntries = () => {
    const excess = sizeMap.size - MAX_TRACKED_ROW_HEIGHTS
    if (excess <= 0) return
    let dropped = 0
    // Map iterates in insertion order, so this drops least recently measured.
    for (const [idx, size] of sizeMap) {
      sizeMap.delete(idx)
      measuredDeltaSum -= size - estimate
      invalidateFrom(idx)
      if (++dropped >= excess) break
    }
  }

  const setSize = (index: number, size: number): number => {
    const idx = Math.max(0, Math.floor(index))
    const clean = Math.max(1, size || 1)
    const prev = sizeMap.get(idx)
    if (prev === clean) return 0
    const delta = clean - (prev ?? estimate)
    sizeMap.set(idx, clean)
    measuredDeltaSum += delta
    invalidateFrom(idx)
    dropOldestEntries()
    version.value++
    return delta
  }

  const reset = (nextEstimate?: number) => {
    estimate = Math.max(1, nextEstimate || estimate)
    sizeMap.clear()
    offsetCache = []
    lastComputedIndex = -1
    measuredDeltaSum = 0
    version.value++
  }

  const snapshot = (): RowHeightSnapshot => ({
    estimate,
    sizes: Array.from(sizeMap.entries())
  })

  const hydrate = (snap: RowHeightSnapshot | undefined) => {
    if (!snap?.sizes?.length) return
    reset(snap.estimate)
    for (const [idx, size] of snap.sizes) {
      if (!Number.isFinite(idx) || !Number.isFinite(size)) continue
      const key = Math.max(0, Math.floor(idx))
      const clean = Math.max(1, size)
      sizeMap.set(key, clean)
      measuredDeltaSum += clean - estimate
    }
    dropOldestEntries()
    version.value++
  }

  return {
    version,
    indexAtOffset,
    offsetOf,
    totalHeight,
    getSize: (index) => sizeMap.get(Math.max(0, Math.floor(index))),
    estimatedSize: () => estimate,
    setSize,
    reset,
    snapshot,
    hydrate
  }
}

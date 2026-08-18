import { Ref, ref } from 'vue'

/** Cap on remembered row measurements; oldest entries are dropped first. */
export const MAX_TRACKED_ROW_HEIGHTS = 20000

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

/** Result of recording a row height, including any LRU drops it triggered. */
export type RowSizeUpdate = {
  /** Pixel delta applied to the measured row (0 if unchanged). */
  delta: number
  /** LRU-evicted rows as [index, list-height delta]. */
  evicted: [number, number][]
}

export interface RowHeightStore extends RowMetrics {
  /** Records a measured height; returns that row's delta plus any LRU evictions. */
  setSize(index: number, size: number): RowSizeUpdate
  /** Measured height of `index`, or `undefined` when it was never rendered. */
  getSize(index: number): number | undefined
  /** Height assumed for never-measured rows; what the spacer math is built on. */
  estimatedSize(): number
  reset(estimatedSize?: number): void
  snapshot(): RowHeightSnapshot
  hydrate(snapshot: RowHeightSnapshot | undefined): void
}

const staticVersion = ref(0)

/** Uniform-height metrics: the `virtual-row-height` fast path. */
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

/** Measured heights keyed by absolute index; unmeasured rows use `estimate`. */
export function createRowHeightStore(
  estimatedSize: number,
  maxTracked = MAX_TRACKED_ROW_HEIGHTS
): RowHeightStore {
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

  /** Shift cached tops after `index` so the computed prefix stays valid. */
  const applySizeDeltaToCache = (index: number, delta: number) => {
    if (delta === 0 || index >= lastComputedIndex) return
    for (let i = index + 1; i <= lastComputedIndex; i++) {
      offsetCache[i] += delta
    }
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

  const dropOldestEntries = (): [number, number][] => {
    const excess = sizeMap.size - maxTracked
    if (excess <= 0) return []
    const evicted: [number, number][] = []
    let dropped = 0
    // Map iterates in insertion order, so this drops least recently measured.
    for (const [idx, size] of sizeMap) {
      const droppedDelta = size - estimate
      sizeMap.delete(idx)
      measuredDeltaSum -= droppedDelta
      applySizeDeltaToCache(idx, -droppedDelta)
      evicted.push([idx, -droppedDelta])
      if (++dropped >= excess) break
    }
    return evicted
  }

  const setSize = (index: number, size: number): RowSizeUpdate => {
    const idx = Math.max(0, Math.floor(index))
    const clean = Math.max(1, size || 1)
    const prev = sizeMap.get(idx)
    if (prev === clean) return { delta: 0, evicted: [] }
    const delta = clean - (prev ?? estimate)
    sizeMap.set(idx, clean)
    measuredDeltaSum += delta
    applySizeDeltaToCache(idx, delta)
    const evicted = dropOldestEntries()
    version.value++
    return { delta, evicted }
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

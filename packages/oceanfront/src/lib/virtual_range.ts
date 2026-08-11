/** Pure virtual-scroll window math, backed by a `RowMetrics` height source. */

import { RowMetrics, createFixedRowMetrics } from './virtual_row_heights'

export interface VirtualWindowInput {
  scrolledPast: number
  viewportHeight: number
  metrics: RowMetrics
  totalCount: number
  overscan: number
  /** Snap range start to multiples of this many rows (fewer range-change events). */
  rangeStep: number
}

export interface VirtualWindow {
  start: number
  end: number
  topSpacer: number
  bottomSpacer: number
}

export function computeVirtualWindow(input: VirtualWindowInput): VirtualWindow {
  const total = Math.max(0, input.totalCount)
  const step = Math.max(1, input.rangeStep)
  const overscan = Math.max(0, input.overscan)
  const metrics = input.metrics

  if (total <= 0) {
    return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 }
  }

  const startIdx = metrics.indexAtOffset(input.scrolledPast, total)
  const start =
    Math.floor(Math.min(total, Math.max(0, startIdx - overscan)) / step) * step
  const endIdx =
    metrics.indexAtOffset(input.scrolledPast + input.viewportHeight, total) +
    1 +
    overscan
  const end = Math.max(start, Math.min(total, endIdx))

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

/**
 * True when the rendered window is a proper subset of the list.
 *
 * Used to enable scroll-related listeners only while virtualization is
 * actually trimming rows. When every row is already in the window, those
 * listeners would only fight the browser.
 */
export const isActivelyWindowing = (
  start: number,
  end: number,
  total: number
): boolean => total > 0 && (start > 0 || end < total)

/** Max shimmer rows shown while chunked data is still loading. */
export const VIRTUAL_BODY_MAX_SKELETON_ROWS = 3

export interface UnloadedViewportInput {
  scrolledPast: number
  viewportHeight: number
  metrics: RowMetrics
  totalCount: number
  rows: ArrayLike<unknown>
  /** Absolute index of virtual row 0 when the table uses a sliding window. */
  rowIndexOffset?: number
}

/**
 * True when the on-screen window (no overscan) still contains unloaded holes.
 * Used to freeze page scroll at the loading edge without locking early when
 * overscan merely peeks at a skeleton tail below the fold.
 */
export const hasUnloadedRowsInViewport = (
  input: UnloadedViewportInput
): boolean => {
  const offset = Math.max(0, input.rowIndexOffset ?? 0)
  const core = computeVirtualWindow({
    scrolledPast: input.scrolledPast,
    viewportHeight: input.viewportHeight,
    metrics: input.metrics,
    totalCount: input.totalCount,
    overscan: 0,
    rangeStep: 1
  })
  for (let i = core.start; i < core.end; i++) {
    if (input.rows[i + offset] == null) return true
  }
  return false
}

/**
 * Pick at most `max` missing indices from a virtual window to render as
 * skeleton rows.
 *
 * `rowIndexOffset` maps local virtual indices to absolute sparse-array offsets.
 */
export const pickSkeletonIndices = (
  indices: readonly number[],
  rows: ArrayLike<unknown>,
  max = VIRTUAL_BODY_MAX_SKELETON_ROWS,
  rowIndexOffset = 0
): Set<number> => {
  const limit = Math.max(0, max)
  const offset = Math.max(0, rowIndexOffset)
  const chosen = new Set<number>()
  if (limit === 0) return chosen
  for (const idx of indices) {
    if (rows[idx + offset] != null) continue
    chosen.add(idx)
    if (chosen.size >= limit) break
  }
  return chosen
}

export type ClampVirtualRangeInput = {
  start: number
  end: number
  rows: ArrayLike<unknown>
  rowIndexOffset?: number
  maxSkeletonRows?: number
}

/**
 * Keep a virtual window from spanning more than `maxSkeletonRows` holes.
 * Extra unloaded indices are pushed into the spacers by shrinking start/end so
 * fast flings cannot paint a long run of empty rows.
 */
export const clampVirtualRangeToLoaded = (
  input: ClampVirtualRangeInput
): { start: number; end: number; didClamp: boolean } => {
  const offset = Math.max(0, input.rowIndexOffset ?? 0)
  const maxSk = Math.max(
    0,
    input.maxSkeletonRows ?? VIRTUAL_BODY_MAX_SKELETON_ROWS
  )
  let start = Math.max(0, input.start)
  let end = Math.max(start, input.end)
  let didClamp = false

  // Drop excess leading holes (keep at most maxSk before the first loaded row).
  let firstLoaded = start
  while (firstLoaded < end && input.rows[firstLoaded + offset] == null) {
    firstLoaded++
  }
  const leadingHoles = firstLoaded - start
  if (leadingHoles > maxSk) {
    start = firstLoaded - maxSk
    didClamp = true
  }

  // After that, stop at the first hole that would exceed the skeleton budget.
  let holes = 0
  let cut = end
  for (let i = start; i < end; i++) {
    if (input.rows[i + offset] != null) continue
    holes++
    if (holes > maxSk) {
      cut = i
      didClamp = true
      break
    }
  }
  end = Math.max(start, cut)
  return { start, end, didClamp }
}

export type SafeScrollBoundsInput = {
  viewportHeight: number
  metrics: RowMetrics
  totalCount: number
  rows: ArrayLike<unknown>
  rowIndexOffset?: number
  maxSkeletonRows?: number
}

/**
 * Scroll offsets where the viewport can only reach loaded rows plus a short
 * skeleton edge — used to rewind fast flings before empty rows appear.
 */
export const safeScrolledPastBounds = (
  input: SafeScrollBoundsInput
): { min: number; max: number } => {
  const offset = Math.max(0, input.rowIndexOffset ?? 0)
  const maxSk = Math.max(
    0,
    input.maxSkeletonRows ?? VIRTUAL_BODY_MAX_SKELETON_ROWS
  )
  const total = Math.max(0, input.totalCount)
  const metrics = input.metrics
  const vh = Math.max(0, input.viewportHeight)

  if (total <= 0) return { min: 0, max: 0 }

  let firstLoaded = 0
  while (firstLoaded < total && input.rows[firstLoaded + offset] == null) {
    firstLoaded++
  }
  const minIdx = Math.max(0, firstLoaded - maxSk)

  let seenLoaded = false
  let edgeHoles = 0
  let limitIdx = total
  for (let i = 0; i < total; i++) {
    const missing = input.rows[i + offset] == null
    if (!seenLoaded) {
      if (!missing) seenLoaded = true
      continue
    }
    if (!missing) continue
    edgeHoles++
    if (edgeHoles > maxSk) {
      limitIdx = i
      break
    }
  }

  const min = metrics.offsetOf(minIdx)
  const max = Math.max(min, metrics.offsetOf(limitIdx) - vh)
  return { min, max }
}

/** Test helper: fixed-height bounds without wiring a full metrics cache. */
export const safeScrolledPastBoundsForRowHeight = (
  rowHeight: number,
  input: Omit<SafeScrollBoundsInput, 'metrics'>
) =>
  safeScrolledPastBounds({
    ...input,
    metrics: createFixedRowMetrics(rowHeight)
  })

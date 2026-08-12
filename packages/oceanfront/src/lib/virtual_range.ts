/** Pure virtual-scroll window math, backed by a `RowMetrics` height source. */

import { RowMetrics } from './virtual_row_heights'

/**
 * Hard cap on rows kept in the DOM at once. The window is always a slice of
 * this size or smaller, whatever the viewport height or scroll speed, so row
 * count never becomes the reason a frame is dropped.
 */
export const MAX_RENDERED_ROWS = 200

export interface VirtualWindowInput {
  scrolledPast: number
  viewportHeight: number
  metrics: RowMetrics
  totalCount: number
  overscan: number
  /** Snap range start to multiples of this many rows (fewer range-change events). */
  rangeStep: number
  /** Defaults to `MAX_RENDERED_ROWS`. */
  maxRenderedRows?: number
}

export interface VirtualWindow {
  start: number
  end: number
  topSpacer: number
  bottomSpacer: number
}

/**
 * Rows covering the viewport, padded with overscan up to the render cap, plus
 * the spacer heights that hold the space of everything outside the window.
 *
 * Spacers always span the *whole* list (`totalCount`), never just the loaded
 * part, so total scroll height stays stable and the body can never collapse
 * mid-scroll.
 */
export function computeVirtualWindow(input: VirtualWindowInput): VirtualWindow {
  const total = Math.max(0, input.totalCount)
  const step = Math.max(1, input.rangeStep)
  const overscan = Math.max(0, input.overscan)
  const cap = Math.max(1, input.maxRenderedRows ?? MAX_RENDERED_ROWS)
  const metrics = input.metrics

  if (total <= 0) return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 }

  const firstVisible = metrics.indexAtOffset(input.scrolledPast, total)
  const lastVisible = metrics.indexAtOffset(
    input.scrolledPast + Math.max(0, input.viewportHeight),
    total
  )
  const coreCount = Math.max(1, lastVisible - firstVisible + 1)

  // Spend whatever the cap leaves after the viewport itself on overscan,
  // split evenly above/below so scrolling either way has some runway.
  const budget = Math.max(0, cap - coreCount)
  const lead = Math.min(overscan, Math.floor(budget / 2))
  const trail = Math.min(overscan, budget - lead)

  const start = Math.floor(Math.max(0, firstVisible - lead) / step) * step
  let end = Math.min(total, lastVisible + 1 + trail)
  // Snapping start down to `step` can push the window past the cap.
  if (end - start > cap) end = start + cap
  end = Math.max(start, Math.min(total, end))

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

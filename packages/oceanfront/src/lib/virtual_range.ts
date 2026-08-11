/** Pure virtual-scroll window math, backed by a `RowMetrics` height source. */

import { RowMetrics } from './virtual_row_heights'

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

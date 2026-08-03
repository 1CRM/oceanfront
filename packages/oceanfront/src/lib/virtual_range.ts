/**
 * Pure fixed-row-height window math for virtual scrolling.
 * Kept separate from DOM/listener wiring in `virtual_rows.ts`.
 */

export interface VirtualWindowInput {
  scrolledPast: number
  viewportHeight: number
  rowHeight: number
  totalCount: number
  overscan: number
  /** Visible-range start snaps to multiples of this many rows. */
  rangeStep: number
}

export interface VirtualWindow {
  start: number
  end: number
  topSpacer: number
  bottomSpacer: number
}

export function computeVirtualWindow(input: VirtualWindowInput): VirtualWindow {
  const rowHeight = Math.max(1, input.rowHeight || 1)
  const total = Math.max(0, input.totalCount)
  const step = Math.max(1, input.rangeStep)

  if (total <= 0) {
    return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 }
  }

  const first = Math.floor(input.scrolledPast / rowHeight) - input.overscan
  const start = Math.floor(Math.min(total, Math.max(0, first)) / step) * step
  const visibleCount =
    Math.ceil(input.viewportHeight / rowHeight) + input.overscan * 2
  const end = Math.max(start, Math.min(total, start + visibleCount))

  return {
    start,
    end,
    topSpacer: start * rowHeight,
    bottomSpacer: Math.max(0, total - end) * rowHeight
  }
}

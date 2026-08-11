import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  VIRTUAL_BODY_MAX_SKELETON_ROWS,
  clampVirtualRangeToLoaded,
  computeVirtualWindow,
  hasUnloadedRowsInViewport,
  isActivelyWindowing,
  pickSkeletonIndices,
  safeScrolledPastBoundsForRowHeight
} from '../virtual_range'
import { RowMetrics, createFixedRowMetrics } from '../virtual_row_heights'

/** Deterministic RowMetrics built from an explicit list of row heights, for tests. */
function metricsFromHeights(heights: number[]): RowMetrics {
  const offsets: number[] = []
  let running = 0
  for (const h of heights) {
    offsets.push(running)
    running += h
  }
  const total = running
  return {
    version: ref(0),
    offsetOf: (index) =>
      offsets[Math.max(0, Math.min(heights.length - 1, index))] ?? total,
    totalHeight: () => total,
    indexAtOffset: (offset, count) => {
      const clamped = Math.max(0, offset)
      let idx = 0
      for (let i = 0; i < heights.length; i++) {
        if (offsets[i] <= clamped) idx = i
        else break
      }
      return Math.max(0, Math.min(count - 1, idx))
    }
  }
}

describe('computeVirtualWindow', () => {
  it('returns an empty window when there are no rows', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 0,
      viewportHeight: 500,
      metrics,
      totalCount: 0,
      overscan: 5,
      rangeStep: 5
    })
    expect(result).toEqual({ start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 })
  })

  it('matches the old fixed-height math for uniform rows', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 400, // row 10
      viewportHeight: 200, // ~5 rows visible
      metrics,
      totalCount: 1000,
      overscan: 10,
      rangeStep: 5
    })
    // indexAtOffset(400) = 10; start = max(0, 10 - overscan(10)) snapped to 5 => 0
    expect(result.start).toBe(0)
    // endIdx = indexAtOffset(400+200=600) + 1 + overscan(10) = 15 + 1 + 10 = 26
    expect(result.end).toBe(26)
    expect(result.topSpacer).toBe(0)
    expect(result.bottomSpacer).toBe((1000 - 26) * 40)
  })

  it('scrolled deep into a uniform list still snaps/overscans like the fixed-height math', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 4000, // row 100
      viewportHeight: 200,
      metrics,
      totalCount: 1000,
      overscan: 10,
      rangeStep: 5
    })
    // indexAtOffset(4000) = 100; start = max(0, 100 - 10) snapped to 5 => 90
    expect(result.start).toBe(90)
    expect(result.topSpacer).toBe(90 * 40)
    // endIdx = indexAtOffset(4200) + 1 + overscan(10) = 105 + 1 + 10 = 116
    expect(result.end).toBe(116)
    expect(result.bottomSpacer).toBe((1000 - 116) * 40)
  })

  it('accounts for wrapped rows of varying height instead of assuming uniform rows', () => {
    // 10 rows: every 3rd row wraps to 120px, others are 40px.
    const heights = [40, 40, 120, 40, 40, 120, 40, 40, 120, 40]
    const metrics = metricsFromHeights(heights)
    const total = heights.reduce((a, b) => a + b, 0)

    // Scroll to just past row 0+1 (80px), viewport shows a couple rows.
    const result = computeVirtualWindow({
      scrolledPast: 80,
      viewportHeight: 160,
      metrics,
      totalCount: heights.length,
      overscan: 1,
      rangeStep: 1
    })

    // offsets: [0,40,80,200,240,280,400,440,480,600]
    // indexAtOffset(80) => row 2 (offset 80 is the start of the 120px row).
    // start = max(0, 2 - overscan(1)) = 1
    expect(result.start).toBe(1)
    expect(result.topSpacer).toBe(metrics.offsetOf(1))
    // indexAtOffset(80+160=240) => row 4 (offset 240 is exactly the start of row 4).
    // endIdx = 4 + 1 + overscan(1) = 6
    expect(result.end).toBe(6)
    expect(result.bottomSpacer).toBe(total - metrics.offsetOf(6))
  })

  it('never lets end fall below start even with a large overscan', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 0,
      viewportHeight: 10,
      metrics,
      totalCount: 3,
      overscan: 100,
      rangeStep: 1
    })
    expect(result.end).toBeGreaterThanOrEqual(result.start)
    expect(result.end).toBeLessThanOrEqual(3)
  })
})

describe('isActivelyWindowing', () => {
  it('is false when the rendered window already covers every row', () => {
    // Short list / all records visible: scroll listeners would only fight native scroll.
    expect(isActivelyWindowing(0, 12, 12)).toBe(false)
    expect(isActivelyWindowing(0, 0, 0)).toBe(false)
  })

  it('is true when rows exist outside the rendered window', () => {
    expect(isActivelyWindowing(0, 40, 200)).toBe(true)
    expect(isActivelyWindowing(50, 200, 200)).toBe(true)
    expect(isActivelyWindowing(20, 60, 200)).toBe(true)
  })
})

describe('hasUnloadedRowsInViewport', () => {
  const metrics = createFixedRowMetrics(40)

  it('is false when overscan would see a skeleton tail but the viewport does not', () => {
    // 100 loaded rows + 3 skeleton tail slots. Viewport still fully in loaded
    // rows; only an overscan window would reach the holes.
    const rows: unknown[] = Array.from({ length: 100 }, (_, i) => ({ id: i }))
    expect(
      hasUnloadedRowsInViewport({
        scrolledPast: 70 * 40,
        viewportHeight: 20 * 40,
        metrics,
        totalCount: 103,
        rows
      })
    ).toBe(false)
  })

  it('is true once unloaded rows enter the on-screen window', () => {
    const rows: unknown[] = Array.from({ length: 100 }, (_, i) => ({ id: i }))
    expect(
      hasUnloadedRowsInViewport({
        scrolledPast: 95 * 40,
        viewportHeight: 10 * 40,
        metrics,
        totalCount: 103,
        rows
      })
    ).toBe(true)
  })

  it('stays false mid-list even when overscan clamp cuts a skeleton tail', () => {
    // Callers must lock on viewport holes only — not clampVirtualRangeToLoaded.didClamp.
    const rows: unknown[] = Array.from({ length: 100 }, (_, i) => ({ id: i }))
    const totalCount = 110
    expect(
      hasUnloadedRowsInViewport({
        scrolledPast: 70 * 40,
        viewportHeight: 20 * 40,
        metrics,
        totalCount,
        rows
      })
    ).toBe(false)
    expect(
      clampVirtualRangeToLoaded({
        start: 60,
        end: 110,
        rows,
        maxSkeletonRows: 3
      }).didClamp
    ).toBe(true)
  })
})

describe('pickSkeletonIndices', () => {
  it('caps shimmer rows even when the window has many unloaded holes', () => {
    const rows: unknown[] = []
    rows[0] = { id: 'a' }
    rows[1] = { id: 'b' }
    const indices = Array.from({ length: 41 }, (_, i) => i)

    const skeleton = pickSkeletonIndices(indices, rows)

    expect(skeleton.size).toBe(VIRTUAL_BODY_MAX_SKELETON_ROWS)
    expect([...skeleton]).toEqual([2, 3, 4])
  })

  it('maps local indices through a sliding-window row offset', () => {
    const rows: unknown[] = []
    rows[20] = { id: 'a' }
    const skeleton = pickSkeletonIndices([0, 1, 2, 3, 4, 5], rows, 3, 17)
    expect([...skeleton]).toEqual([0, 1, 2])
  })

  it('returns no skeleton indices when every visible row is loaded', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(pickSkeletonIndices([0, 1, 2], rows).size).toBe(0)
  })
})

describe('clampVirtualRangeToLoaded', () => {
  it('cuts the window so a fast fling cannot expose more than max skeletons', () => {
    const rows: unknown[] = Array.from({ length: 20 }, (_, i) => ({ id: i }))
    // holes from 20 onward
    const result = clampVirtualRangeToLoaded({
      start: 10,
      end: 50,
      rows,
      maxSkeletonRows: 3
    })
    expect(result).toEqual({ start: 10, end: 23, didClamp: true })
  })

  it('trims excess leading holes down to the skeleton budget', () => {
    const rows: unknown[] = []
    for (let i = 20; i < 40; i++) rows[i] = { id: i }
    const result = clampVirtualRangeToLoaded({
      start: 0,
      end: 40,
      rows,
      maxSkeletonRows: 3
    })
    expect(result.start).toBe(17)
    expect(result.didClamp).toBe(true)
  })
})

describe('safeScrolledPastBounds', () => {
  it('rewinds scroll so the viewport bottom cannot pass the skeleton edge', () => {
    const rows: unknown[] = Array.from({ length: 20 }, (_, i) => ({ id: i }))
    const bounds = safeScrolledPastBoundsForRowHeight(40, {
      viewportHeight: 200,
      totalCount: 40,
      rows,
      maxSkeletonRows: 3
    })
    // Showable through local index 23 (20..22 skeletons); bottom at 23*40.
    expect(bounds.max).toBe(23 * 40 - 200)
    expect(bounds.min).toBe(0)
  })
})

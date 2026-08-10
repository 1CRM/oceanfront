import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { computeVirtualWindow } from '../virtual_range'
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

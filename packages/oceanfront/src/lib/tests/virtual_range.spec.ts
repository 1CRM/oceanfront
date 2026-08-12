import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  MAX_RENDERED_ROWS,
  computeVirtualWindow,
  isActivelyWindowing
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
    expect(result).toEqual({
      start: 0,
      end: 0,
      topSpacer: 0,
      bottomSpacer: 0
    })
  })

  it('covers the viewport plus overscan for uniform rows', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 400, // row 10
      viewportHeight: 200, // rows 10..15
      metrics,
      totalCount: 1000,
      overscan: 10,
      rangeStep: 5
    })
    // start = max(0, 10 - overscan 10) snapped to 5 => 0
    expect(result.start).toBe(0)
    expect(result.end).toBe(26)
    expect(result.topSpacer).toBe(0)
    expect(result.bottomSpacer).toBe((1000 - 26) * 40)
  })

  it('spacers always span the whole list, not just loaded rows', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 4000,
      viewportHeight: 200,
      metrics,
      totalCount: 50000,
      overscan: 10,
      rangeStep: 5
    })
    const windowHeight = (result.end - result.start) * 40
    expect(result.topSpacer + windowHeight + result.bottomSpacer).toBe(
      50000 * 40
    )
  })

  it('never renders more than MAX_RENDERED_ROWS rows', () => {
    const metrics = createFixedRowMetrics(20)
    // 4000px viewport of 20px rows = 200 visible rows, plus overscan.
    const result = computeVirtualWindow({
      scrolledPast: 20000,
      viewportHeight: 4000,
      metrics,
      totalCount: 100000,
      overscan: 50,
      rangeStep: 5
    })
    expect(result.end - result.start).toBeLessThanOrEqual(MAX_RENDERED_ROWS)
  })

  it('honours an explicit lower render cap', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 4000,
      viewportHeight: 800,
      metrics,
      totalCount: 10000,
      overscan: 30,
      rangeStep: 5,
      maxRenderedRows: 40
    })
    expect(result.end - result.start).toBeLessThanOrEqual(40)
  })

  it('splits a tight render budget between leading and trailing overscan', () => {
    const metrics = createFixedRowMetrics(40)
    const result = computeVirtualWindow({
      scrolledPast: 4000, // row 100
      viewportHeight: 200, // rows 100..105 = 6 rows
      metrics,
      totalCount: 1000,
      overscan: 10,
      rangeStep: 1,
      maxRenderedRows: 10
    })
    // 10 - 6 visible = 4 rows of budget, 2 above and 2 below.
    expect(result.start).toBe(98)
    expect(result.end).toBe(108)
  })

  it('accounts for wrapped rows of varying height instead of assuming uniform rows', () => {
    // 10 rows: every 3rd row wraps to 120px, others are 40px.
    const heights = [40, 40, 120, 40, 40, 120, 40, 40, 120, 40]
    const metrics = metricsFromHeights(heights)
    const total = heights.reduce((a, b) => a + b, 0)

    const result = computeVirtualWindow({
      scrolledPast: 80,
      viewportHeight: 160,
      metrics,
      totalCount: heights.length,
      overscan: 1,
      rangeStep: 1
    })

    // offsets: [0,40,80,200,240,280,400,440,480,600]
    // indexAtOffset(80) => row 2, one row of leading overscan => 1
    expect(result.start).toBe(1)
    expect(result.topSpacer).toBe(metrics.offsetOf(1))
    // indexAtOffset(240) => row 4, +1 +1 trailing overscan => 6
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
    expect(isActivelyWindowing(0, 12, 12)).toBe(false)
    expect(isActivelyWindowing(0, 0, 0)).toBe(false)
  })

  it('is true when rows exist outside the rendered window', () => {
    expect(isActivelyWindowing(0, 40, 200)).toBe(true)
    expect(isActivelyWindowing(50, 200, 200)).toBe(true)
    expect(isActivelyWindowing(20, 60, 200)).toBe(true)
  })
})

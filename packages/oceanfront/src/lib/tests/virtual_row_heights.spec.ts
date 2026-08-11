import { describe, expect, it } from 'vitest'
import {
  createFixedRowMetrics,
  createRowHeightCache
} from '../virtual_row_heights'

describe('createFixedRowMetrics', () => {
  it('computes uniform index*height math', () => {
    const metrics = createFixedRowMetrics(40)
    expect(metrics.offsetOf(0)).toBe(0)
    expect(metrics.offsetOf(5)).toBe(200)
    expect(metrics.totalHeight(10)).toBe(400)
    expect(metrics.indexAtOffset(0, 10)).toBe(0)
    expect(metrics.indexAtOffset(199, 10)).toBe(4)
    expect(metrics.indexAtOffset(200, 10)).toBe(5)
  })

  it('clamps index to [0, count-1]', () => {
    const metrics = createFixedRowMetrics(40)
    expect(metrics.indexAtOffset(-100, 10)).toBe(0)
    expect(metrics.indexAtOffset(100000, 10)).toBe(9)
    expect(metrics.indexAtOffset(0, 0)).toBe(0)
  })
})

describe('createRowHeightCache', () => {
  it('matches index*estimate before anything is measured', () => {
    const cache = createRowHeightCache(40)
    expect(cache.offsetOf(0)).toBe(0)
    expect(cache.offsetOf(5)).toBe(200)
    expect(cache.totalHeight(10)).toBe(400)
    expect(cache.indexAtOffset(199, 10)).toBe(4)
    expect(cache.indexAtOffset(200, 10)).toBe(5)
  })

  it('reflects mixed 1-line/3-line row heights once measured', () => {
    const cache = createRowHeightCache(40)
    // Rows: 0=40 (1 line), 1=120 (3 lines wrapped), 2=40, 3=40
    cache.setSize(0, 40)
    cache.setSize(1, 120)
    cache.setSize(2, 40)
    cache.setSize(3, 40)

    expect(cache.offsetOf(0)).toBe(0)
    expect(cache.offsetOf(1)).toBe(40)
    expect(cache.offsetOf(2)).toBe(160)
    expect(cache.offsetOf(3)).toBe(200)
    expect(cache.totalHeight(4)).toBe(240)

    // Offset that would land mid-row-1 in fixed-height math (40px) actually
    // still belongs to row 1 since it wrapped to 120px.
    expect(cache.indexAtOffset(60, 4)).toBe(1)
    expect(cache.indexAtOffset(159, 4)).toBe(1)
    expect(cache.indexAtOffset(160, 4)).toBe(2)
  })

  it('extrapolates unmeasured rows beyond the measured prefix using the estimate', () => {
    const cache = createRowHeightCache(40)
    cache.setSize(0, 120)
    // Row 0 measured (120px); rows 1..99 never rendered, fall back to 40px estimate.
    expect(cache.offsetOf(1)).toBe(120)
    expect(cache.totalHeight(100)).toBe(120 + 99 * 40)
    expect(cache.indexAtOffset(120 + 40 * 5, 100)).toBe(1 + 5)
  })

  it('bumps version on every mutating call', () => {
    const cache = createRowHeightCache(40)
    const v0 = cache.version.value
    cache.setSize(2, 80)
    expect(cache.version.value).toBeGreaterThan(v0)
    const v1 = cache.version.value
    // Setting the same size again is a no-op, no version bump.
    cache.setSize(2, 80)
    expect(cache.version.value).toBe(v1)
    cache.reset(50)
    expect(cache.version.value).toBeGreaterThan(v1)
  })

  it('invalidates and recomputes cached offsets when an earlier index is remeasured', () => {
    const cache = createRowHeightCache(40)
    cache.setSize(0, 40)
    cache.setSize(1, 40)
    cache.setSize(2, 40)
    // Force offsets [0..2] to be computed.
    expect(cache.offsetOf(2)).toBe(80)

    // Row 0 rewraps to 3 lines after a resize; everything after it shifts.
    cache.setSize(0, 120)
    expect(cache.offsetOf(0)).toBe(0)
    expect(cache.offsetOf(1)).toBe(120)
    expect(cache.offsetOf(2)).toBe(160)
    expect(cache.totalHeight(3)).toBe(200)
  })

  it('reset clears measured sizes and restores the estimate baseline', () => {
    const cache = createRowHeightCache(40)
    cache.setSize(0, 120)
    cache.setSize(1, 120)
    expect(cache.totalHeight(2)).toBe(240)

    cache.reset(50)
    expect(cache.totalHeight(2)).toBe(100)
    expect(cache.offsetOf(1)).toBe(50)
  })

  it('offsetOf and indexAtOffset round-trip for a mixed-height list', () => {
    const cache = createRowHeightCache(40)
    const heights = [40, 40, 120, 40, 80, 40, 120, 40, 40, 40]
    heights.forEach((h, i) => cache.setSize(i, h))
    const count = heights.length

    let running = 0
    for (let i = 0; i < count; i++) {
      expect(cache.offsetOf(i)).toBe(running)
      // Any offset within [running, running+height) should resolve back to i.
      expect(cache.indexAtOffset(running, count)).toBe(i)
      expect(cache.indexAtOffset(running + heights[i] - 1, count)).toBe(i)
      running += heights[i]
    }
    expect(cache.totalHeight(count)).toBe(running)
  })

  it('reports measured leading height for eviction scroll adjust (not estimate*rows)', () => {
    const estimate = 40
    const cache = createRowHeightCache(estimate)
    // Evicting local rows 0..4 must subtract their measured sum before reset.
    cache.setSize(0, 40)
    cache.setSize(1, 120)
    cache.setSize(2, 40)
    cache.setSize(3, 80)
    cache.setSize(4, 40)
    const deltaRows = 5
    expect(cache.offsetOf(deltaRows)).toBe(320)
    expect(cache.offsetOf(deltaRows)).not.toBe(deltaRows * estimate)
  })
})

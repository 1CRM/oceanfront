import { describe, expect, it } from 'vitest'
import {
  createFixedRowMetrics,
  createRowHeightStore
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

describe('createRowHeightStore', () => {
  it('matches index*estimate before anything is measured', () => {
    const store = createRowHeightStore(40)
    expect(store.offsetOf(0)).toBe(0)
    expect(store.offsetOf(5)).toBe(200)
    expect(store.totalHeight(10)).toBe(400)
    expect(store.indexAtOffset(199, 10)).toBe(4)
    expect(store.indexAtOffset(200, 10)).toBe(5)
    expect(store.getSize(3)).toBeUndefined()
    // What a placeholder for an unmeasured row must be sized to, so the row
    // occupies exactly the space the spacer math budgeted for it.
    expect(store.estimatedSize()).toBe(40)
  })

  it('reflects mixed 1-line/3-line row heights once measured', () => {
    const store = createRowHeightStore(40)
    // Rows: 0=40 (1 line), 1=120 (3 lines wrapped), 2=40, 3=40
    store.setSize(0, 40)
    store.setSize(1, 120)
    store.setSize(2, 40)
    store.setSize(3, 40)

    expect(store.offsetOf(0)).toBe(0)
    expect(store.offsetOf(1)).toBe(40)
    expect(store.offsetOf(2)).toBe(160)
    expect(store.offsetOf(3)).toBe(200)
    expect(store.totalHeight(4)).toBe(240)

    // Offset that would land mid-row-1 in fixed-height math (40px) actually
    // still belongs to row 1 since it wrapped to 120px.
    expect(store.indexAtOffset(60, 4)).toBe(1)
    expect(store.indexAtOffset(159, 4)).toBe(1)
    expect(store.indexAtOffset(160, 4)).toBe(2)
  })

  it('keeps heights of far-apart absolute indices independently', () => {
    const store = createRowHeightStore(40)
    store.setSize(12, 100)
    store.setSize(9000, 90)
    expect(store.getSize(12)).toBe(100)
    expect(store.getSize(9000)).toBe(90)
    // Only the two measured rows deviate from the estimate.
    expect(store.totalHeight(10000)).toBe(10000 * 40 + 60 + 50)
  })

  it('returns the pixel delta a measurement added, for scroll compensation', () => {
    const store = createRowHeightStore(40)
    expect(store.setSize(3, 100)).toEqual({ delta: 60, evicted: [] })
    expect(store.setSize(3, 120)).toEqual({ delta: 20, evicted: [] })
    expect(store.setSize(3, 120)).toEqual({ delta: 0, evicted: [] })
  })

  it('extrapolates unmeasured rows beyond the measured prefix using the estimate', () => {
    const store = createRowHeightStore(40)
    store.setSize(0, 120)
    // Row 0 measured (120px); rows 1..99 never rendered, fall back to 40px estimate.
    expect(store.offsetOf(1)).toBe(120)
    expect(store.totalHeight(100)).toBe(120 + 99 * 40)
    expect(store.indexAtOffset(120 + 40 * 5, 100)).toBe(1 + 5)
  })

  it('bumps version on every mutating call', () => {
    const store = createRowHeightStore(40)
    const v0 = store.version.value
    store.setSize(2, 80)
    expect(store.version.value).toBeGreaterThan(v0)
    const v1 = store.version.value
    // Setting the same size again is a no-op, no version bump.
    store.setSize(2, 80)
    expect(store.version.value).toBe(v1)
    store.reset(50)
    expect(store.version.value).toBeGreaterThan(v1)
  })

  it('invalidates and recomputes cached offsets when an earlier index is remeasured', () => {
    const store = createRowHeightStore(40)
    store.setSize(0, 40)
    store.setSize(1, 40)
    store.setSize(2, 40)
    // Force offsets [0..2] to be computed.
    expect(store.offsetOf(2)).toBe(80)

    // Row 0 rewraps to 3 lines after a resize; everything after it shifts.
    store.setSize(0, 120)
    expect(store.offsetOf(0)).toBe(0)
    expect(store.offsetOf(1)).toBe(120)
    expect(store.offsetOf(2)).toBe(160)
    expect(store.totalHeight(3)).toBe(200)
  })

  it('reset clears measured sizes and restores the estimate baseline', () => {
    const store = createRowHeightStore(40)
    store.setSize(0, 120)
    store.setSize(1, 120)
    expect(store.totalHeight(2)).toBe(240)

    store.reset(50)
    expect(store.totalHeight(2)).toBe(100)
    expect(store.offsetOf(1)).toBe(50)
  })

  it('reset without an argument keeps the current estimate', () => {
    const store = createRowHeightStore(32)
    store.setSize(0, 120)
    store.reset()
    expect(store.totalHeight(2)).toBe(64)
  })

  it('offsetOf and indexAtOffset round-trip for a mixed-height list', () => {
    const store = createRowHeightStore(40)
    const heights = [40, 40, 120, 40, 80, 40, 120, 40, 40, 40]
    heights.forEach((h, i) => store.setSize(i, h))
    const count = heights.length

    let running = 0
    for (let i = 0; i < count; i++) {
      expect(store.offsetOf(i)).toBe(running)
      // Any offset within [running, running+height) should resolve back to i.
      expect(store.indexAtOffset(running, count)).toBe(i)
      expect(store.indexAtOffset(running + heights[i] - 1, count)).toBe(i)
      running += heights[i]
    }
    expect(store.totalHeight(count)).toBe(running)
  })

  it('round-trips measurements through a snapshot', () => {
    const store = createRowHeightStore(40)
    const heights: Record<number, number> = { 0: 40, 1: 120, 700: 80 }
    for (const [idx, h] of Object.entries(heights)) store.setSize(+idx, h)
    const snapshot = store.snapshot()
    expect(snapshot.estimate).toBe(40)
    expect(snapshot.sizes).toEqual([
      [0, 40],
      [1, 120],
      [700, 80]
    ])

    const restored = createRowHeightStore(999)
    restored.hydrate(snapshot)
    expect(restored.getSize(1)).toBe(120)
    expect(restored.getSize(700)).toBe(80)
    expect(restored.offsetOf(2)).toBe(160)
    expect(restored.totalHeight(1000)).toBe(store.totalHeight(1000))
  })

  it('hydrating an empty snapshot leaves the store untouched', () => {
    const store = createRowHeightStore(40)
    store.setSize(0, 100)
    store.hydrate(undefined)
    store.hydrate({ estimate: 10, sizes: [] })
    expect(store.getSize(0)).toBe(100)
    expect(store.totalHeight(2)).toBe(140)
  })

  it('indexAtOffset still uses remaining measurements after LRU eviction of earlier rows', () => {
    const estimate = 40
    const measured = 80
    const tracked = 8
    const store = createRowHeightStore(estimate, tracked)

    for (let i = 0; i < tracked; i++) store.setSize(i, measured)
    // Fold the prefix into offsetCache, as if the user had scrolled through it.
    expect(store.offsetOf(tracked - 1)).toBe((tracked - 1) * measured)

    // One more measurement evicts the oldest entry (row 0, insertion order).
    const result = store.setSize(tracked, measured)
    expect(result.delta).toBe(measured - estimate)
    expect(result.evicted).toEqual([[0, estimate - measured]])
    expect(store.getSize(0)).toBeUndefined()
    expect(store.getSize(1)).toBe(measured)
    expect(store.getSize(tracked)).toBe(measured)

    const count = tracked + 100
    // Row 0 now uses the estimate; rows 1..tracked stay measured.
    // Windowing calls indexAtOffset before offsetOf, so do not rebuild first.
    const topOfLast = estimate + (tracked - 1) * measured
    expect(store.indexAtOffset(topOfLast, count)).toBe(tracked)
    expect(store.indexAtOffset(topOfLast - 1, count)).toBe(tracked - 1)
    expect(store.offsetOf(tracked)).toBe(topOfLast)
  })

  it('indexAtOffset reflects an earlier remeasure without waiting for offsetOf', () => {
    const store = createRowHeightStore(40)
    store.setSize(0, 40)
    store.setSize(1, 40)
    store.setSize(2, 40)
    expect(store.offsetOf(2)).toBe(80)

    store.setSize(0, 120)
    expect(store.indexAtOffset(120, 3)).toBe(1)
    expect(store.indexAtOffset(159, 3)).toBe(1)
    expect(store.indexAtOffset(160, 3)).toBe(2)
  })

  it('reports measured leading height instead of estimate*rows', () => {
    const estimate = 40
    const store = createRowHeightStore(estimate)
    store.setSize(0, 40)
    store.setSize(1, 120)
    store.setSize(2, 40)
    store.setSize(3, 80)
    store.setSize(4, 40)
    expect(store.offsetOf(5)).toBe(320)
    expect(store.offsetOf(5)).not.toBe(5 * estimate)
  })
})

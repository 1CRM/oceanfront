import { describe, expect, it } from 'vitest'
import {
  DataTableHeader,
  firstLoadedRow,
  resolveDataTableColumnTrack,
  sumTotalColumnsSignature
} from '../datatable'

describe('resolveDataTableColumnTrack', () => {
  it('defaults missing widths to auto (content-sized)', () => {
    expect(resolveDataTableColumnTrack(undefined)).toBe('auto')
    expect(resolveDataTableColumnTrack(null)).toBe('auto')
    expect(resolveDataTableColumnTrack('')).toBe('auto')
  })

  it('uses minmax(0, 1fr) for missing widths when ignoring content min', () => {
    expect(
      resolveDataTableColumnTrack(undefined, { ignoreContentMin: true })
    ).toBe('minmax(0, 1fr)')
  })

  it('maps percentages and unitless numbers to fr tracks', () => {
    expect(resolveDataTableColumnTrack('30%')).toBe('30fr')
    expect(resolveDataTableColumnTrack(30)).toBe('30fr')
    expect(resolveDataTableColumnTrack('12.5')).toBe('12.5fr')
  })

  it('wraps fr tracks in minmax(0, …) when ignoring content min', () => {
    expect(resolveDataTableColumnTrack('30%', { ignoreContentMin: true })).toBe(
      'minmax(0, 30fr)'
    )
    expect(resolveDataTableColumnTrack(30, { ignoreContentMin: true })).toBe(
      'minmax(0, 30fr)'
    )
  })

  it('passes through absolute CSS lengths unchanged', () => {
    expect(resolveDataTableColumnTrack('115px')).toBe('115px')
    expect(resolveDataTableColumnTrack('12em')).toBe('12em')
    expect(
      resolveDataTableColumnTrack('115px', { ignoreContentMin: true })
    ).toBe('115px')
  })

  it('treats non-numeric percentages as missing', () => {
    expect(resolveDataTableColumnTrack('%')).toBe('auto')
    expect(resolveDataTableColumnTrack('%', { ignoreContentMin: true })).toBe(
      'minmax(0, 1fr)'
    )
  })
})

describe('firstLoadedRow', () => {
  it('returns undefined for empty/nullish input', () => {
    expect(firstLoadedRow(undefined)).toBeUndefined()
    expect(firstLoadedRow(null)).toBeUndefined()
    expect(firstLoadedRow([])).toBeUndefined()
  })

  it('returns rows[0] for a dense array', () => {
    const rows = [{ id: 1 }, { id: 2 }]
    expect(firstLoadedRow(rows)).toBe(rows[0])
  })

  it('returns the first present index in a sparse array with a hole at 0', () => {
    const rows: any[] = []
    rows[5] = { id: 5 }
    rows[10] = { id: 10 }
    rows.length = 11
    expect(firstLoadedRow(rows)).toBe(rows[5])
  })

  it('returns undefined when every slot is a hole', () => {
    const rows: any[] = new Array(5)
    expect(firstLoadedRow(rows)).toBeUndefined()
  })
})

describe('sumTotalColumnsSignature', () => {
  const columns: DataTableHeader[] = [
    { text: 'Name', value: 'name' },
    { text: 'Amount', value: 'amount', sum_total: true }
  ]

  it('returns a stable zeroed key for a missing rows array', () => {
    expect(sumTotalColumnsSignature(undefined, [1], columns)).toBe('0:0:0')
  })

  it('reflects total length, loaded count, and content in the key', () => {
    const rows = [{ amount: { rawValue: 10 } }, { amount: { rawValue: 20 } }]
    const sig = sumTotalColumnsSignature(rows, [1], columns)
    expect(sig.startsWith('2:2:')).toBe(true)
  })

  it('skips sparse holes without counting them as loaded', () => {
    const rows: any[] = []
    rows[0] = { amount: { rawValue: 10 } }
    rows[3] = { amount: { rawValue: 20 } }
    rows.length = 4
    const sig = sumTotalColumnsSignature(rows, [1], columns)
    // length=4, loaded=2 (holes at 1,2 skipped by forEach)
    expect(sig.startsWith('4:2:')).toBe(true)
  })

  it('changes signature when a measured cell value changes', () => {
    const colsIdx = [1]
    const before = sumTotalColumnsSignature(
      [{ amount: { rawValue: 10 } }],
      colsIdx,
      columns
    )
    const after = sumTotalColumnsSignature(
      [{ amount: { rawValue: 99 } }],
      colsIdx,
      columns
    )
    expect(before).not.toBe(after)
  })

  it('handles array-valued cells (e.g. multi-currency totals)', () => {
    const rows = [
      {
        amount: [{ rawValue: 5 }, { value: 7 }]
      }
    ]
    const sig = sumTotalColumnsSignature(rows, [1], columns)
    expect(sig.startsWith('1:1:')).toBe(true)
  })

  it('is a no-op signature when there are no sum-total columns', () => {
    const rows = [{ amount: { rawValue: 10 } }]
    expect(sumTotalColumnsSignature(rows, [], columns)).toBe('1:1:0')
  })
})

import { describe, expect, it } from 'vitest'
import {
  DataTableHeader,
  firstLoadedRow,
  resolveSumTotalFormat,
  selectClassicPageRows,
  sumTotalColumnsSignature
} from '../datatable'

describe('selectClassicPageRows', () => {
  it('returns a dense page from a dense array', () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    expect(selectClassicPageRows(rows, 1, 2)).toEqual([
      { item: rows[1], index: 1 },
      { item: rows[2], index: 2 }
    ])
  })

  it('skips sparse holes without backfilling later indices', () => {
    const rows: any[] = []
    rows[0] = undefined
    rows[1] = { id: 1 }
    rows[2] = undefined
    rows[5] = { id: 5 }
    rows.length = 10

    // Page size 3 walks slots 0,1,2 — only slot 1 is present.
    expect(selectClassicPageRows(rows, 0, 3)).toEqual([
      { item: rows[1], index: 1 }
    ])
  })

  it('does not iterate the full sparse length when pageSize is small', () => {
    const rows: any[] = []
    rows[500] = { id: 500 }
    rows.length = 1000
    expect(selectClassicPageRows(rows, 0, 5)).toEqual([])
  })

  it('returns empty for missing input or non-positive page size', () => {
    expect(selectClassicPageRows(undefined, 0, 10)).toEqual([])
    expect(selectClassicPageRows([{ id: 1 }], 0, 0)).toEqual([])
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

describe('resolveSumTotalFormat', () => {
  it('prefers column.total_format', () => {
    expect(
      resolveSumTotalFormat(
        { total_format: { type: 'number' } },
        [{ amount: { totalFormat: { type: 'currency' } } }],
        'amount'
      )
    ).toEqual({ type: 'number' })
  })

  it('uses column.currency when sample cells have no format', () => {
    const rows: any[] = []
    rows[20] = { amount: { rawValue: 12.5, value: 12.5 } }
    expect(
      resolveSumTotalFormat({ currency: { symbol: '$' } }, rows, 'amount')
    ).toEqual({ type: 'currency' })
  })

  it('scans sparse resident rows for totalFormat after index 0 is evicted', () => {
    const rows: any[] = []
    rows[0] = { amount: { rawValue: '' } } // present but no format metadata
    rows[25] = { amount: { rawValue: 10, totalFormat: { type: 'currency' } } }
    expect(resolveSumTotalFormat({}, rows, 'amount')).toEqual({
      type: 'currency'
    })
  })

  it('keeps the previously rendered total format when no sample remains', () => {
    expect(
      resolveSumTotalFormat({}, [], 'amount', { type: 'currency' })
    ).toEqual({ type: 'currency' })
  })

  it('returns {} when nothing usable is available', () => {
    expect(resolveSumTotalFormat({}, undefined, 'amount')).toEqual({})
  })
})

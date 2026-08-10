export interface DataTableHeader {
  text: string
  value: string
  align?: 'start' | 'center' | 'end'
  format?: string
  sortable?: boolean
  filterable?: boolean
  divider?: boolean
  class?: string | string[]
  width?: string | number
  filter?: (value: any, search: string, item: any) => boolean // provide via formatter?
  sort?: 'asc' | 'desc' // provide via formatter?
  extra_sort_fields?: { label: string; value: string; order?: string }[]
  editable?: boolean | string
  sum_total?: boolean
}

/**
 * Resolve a header width into a CSS grid track size.
 *
 * Plain `Nfr` is `minmax(auto, Nfr)`: the track's floor is content-based. Under
 * virtual scroll only the current row window is in the DOM, so that floor
 * jumps as different cells mount and columns visibly resize. When
 * `ignoreContentMin` is set, use `minmax(0, …)` so tracks stay proportional to
 * the container (and explicit px/em widths stay absolute) regardless of which
 * rows are rendered.
 */
export const resolveDataTableColumnTrack = (
  width: string | number | null | undefined,
  options?: { ignoreContentMin?: boolean }
): string => {
  const ignoreContentMin = !!options?.ignoreContentMin
  if (width == null || width === '') {
    return ignoreContentMin ? 'minmax(0, 1fr)' : 'auto'
  }
  const w = width.toString()
  if (w.endsWith('%') || w.match(/^[0-9]+(\.[0-9]*)?$/)) {
    const widthNumber = parseFloat(w)
    if (isNaN(widthNumber)) {
      return ignoreContentMin ? 'minmax(0, 1fr)' : 'auto'
    }
    const fr = widthNumber + 'fr'
    return ignoreContentMin ? `minmax(0, ${fr})` : fr
  }
  return w
}

/**
 * First loaded (non-hole) row in a possibly sparse rows array.
 *
 * Sparse virtual-scroll arrays may have a hole at index 0 after eviction.
 * `for...in` visits only present indices, unlike `Array#some`, which walks
 * the full sparse length (tens of thousands of empty slots) on every
 * computed re-run.
 */
export const firstLoadedRow = (rows: any[] | null | undefined): any => {
  if (!rows?.length) return undefined
  // Dense / common case (and the pre-virtual-scroll check).
  if (0 in rows) return rows[0]
  for (const key in rows) {
    if (Object.prototype.hasOwnProperty.call(rows, key)) {
      return (rows as any)[key]
    }
  }
  return undefined
}

/** Format metadata a sum-total cell carries for the totals row. */
export const cellSumTotalFormat = (cell: any): any => {
  if (!cell || typeof cell !== 'object') return undefined
  if (Array.isArray(cell)) {
    for (let i = 0; i < cell.length; i++) {
      const fmt = cell[i]?.format ?? cell[i]?.totalFormat
      if (fmt) return fmt
    }
    return undefined
  }
  return cell.format ?? cell.totalFormat
}

const isUsableSumTotalFormat = (format: any): boolean => {
  if (format == null || format === '') return false
  if (typeof format === 'string') return true
  if (typeof format !== 'object') return false
  if (format.type) return true
  return Object.keys(format).length > 0
}

/**
 * Resolve the display format for a DataTable totals-row cell.
 *
 * ListView stores currency format on cells as `totalFormat` (not always on
 * `format`), and under virtual scroll early rows may be evicted — so the first
 * loaded row is not a reliable sample. Prefer column-level hints (including
 * `currency`, which ListView attaches for sum_total currency fields) and scan
 * all resident rows before falling back to the previously rendered total.
 */
export const resolveSumTotalFormat = (
  column: any,
  rows: any[] | null | undefined,
  fieldName: string,
  previousFormat?: any
): any => {
  if (isUsableSumTotalFormat(column?.total_format)) {
    return column.total_format
  }
  // `currency` on the header survives sparse-row eviction; use it even when no
  // resident sample cell still carries totalFormat/format.
  if (column?.currency) {
    return { type: 'currency' }
  }
  if (rows) {
    for (const key in rows) {
      if (!Object.prototype.hasOwnProperty.call(rows, key)) continue
      const row = (rows as any)[key]
      if (row == null) continue
      const fmt = cellSumTotalFormat(row[fieldName])
      if (isUsableSumTotalFormat(fmt)) return fmt
    }
  }
  if (isUsableSumTotalFormat(previousFormat)) return previousFormat
  return {}
}

/**
 * Cheap change-detection key for a sparse virtual-scroll rows array's
 * sum-total columns, used to decide when totals need recomputing without
 * deep-walking the (possibly huge) sparse array on every chunk load.
 *
 * Length alone misses hole fills (`items[i] = row` with length unchanged),
 * so this keys off loaded-row count plus a rolling content signature over
 * just the sum-total column values. `Array#forEach` skips sparse holes but
 * still walks the array natively, so fills/evictions invalidate the key
 * without ever touching empty slots in JS.
 */
export const sumTotalColumnsSignature = (
  rows: any[] | null | undefined,
  sumTotalColumnIndexes: number[],
  columns: DataTableHeader[]
): string => {
  if (!rows) return '0:0:0'
  let loaded = 0
  let contentSig = 0
  rows.forEach((row: any) => {
    if (row == null) return
    loaded++
    for (let c = 0; c < sumTotalColumnIndexes.length; c++) {
      const fieldName = columns[sumTotalColumnIndexes[c]]?.value
      if (!fieldName) continue
      const cell = row[fieldName]
      if (Array.isArray(cell)) {
        for (let j = 0; j < cell.length; j++) {
          const fieldValue = cell[j]?.rawValue ?? cell[j]?.value
          const n = +fieldValue
          if (!isNaN(n)) contentSig = (contentSig * 33 + n) | 0
        }
      } else {
        const fieldValue = cell?.rawValue ?? cell?.value ?? cell
        const n = +fieldValue
        if (!isNaN(n)) contentSig = (contentSig * 33 + n) | 0
      }
    }
  })
  return `${rows.length}:${loaded}:${contentSig}`
}

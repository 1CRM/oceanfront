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
  total_format?: any
  currency?: { symbol?: string }
}

/** Indexes of the columns that carry a total, in header order. */
export const sumTotalColumnIndexes = (
  headers: DataTableHeader[] | undefined
): number[] =>
  headers?.flatMap((hdr, index) => (hdr.sum_total ? [index] : [])) ?? []

/** Running total of one column, plus the label its cells carry, if any. */
type ColumnTotal = {
  value: number
  values: Record<string, any>[]
  label: string
}

const sumColumn = (
  items: Record<string, any>[] | undefined,
  fieldName: string
): ColumnTotal => {
  const total: ColumnTotal = { value: 0, values: [], label: '' }

  for (const item of items ?? []) {
    const cell = item[fieldName]
    if (!Array.isArray(cell)) {
      total.label = cell?.label
      const amount = cell?.rawValue ?? cell?.value ?? cell
      if (!isNaN(+amount)) total.value += +amount
      continue
    }
    // One amount per currency: each position accumulates separately, and
    // non-numeric entries shift the ones after them down.
    let skipped = 0
    cell.forEach((entry: any, index: number) => {
      const amount = entry?.rawValue ?? entry?.value ?? ''
      if (isNaN(+amount)) {
        skipped++
        return
      }
      const slot = total.values[index - skipped]
      if (slot) slot.value += +amount
      else {
        total.label = entry?.label
        total.values.push({ ...entry, value: +amount })
      }
    })
  }

  return total
}

/**
 * Adds the `sum_total` columns up over `items`, producing the row the totals
 * line is rendered from.
 *
 * The result is itself a valid `items` entry, so partial totals can be fed
 * straight back in and combined: a caller that only holds part of the list —
 * a virtualized one — totals each part as it arrives and adds those together.
 */
export const sumTotalsRow = (
  headers: DataTableHeader[],
  items: Record<string, any>[] | undefined,
  totalColumns: number[],
  totalLabel: string
): Record<string, any> => {
  const row: Record<string, any> = { nested: null, draggable: false }
  if (!headers.length) return row
  let label = ''

  for (const col of totalColumns) {
    const fieldName = headers[col].value
    const total = sumColumn(items, fieldName)
    label = total.label
    row[fieldName] = total.values.length
      ? total.values
      : {
          value: total.value || '',
          format:
            headers[col]?.total_format ??
            items?.[0]?.[fieldName]?.format ??
            items?.[0]?.[fieldName]?.totalFormat ??
            {},
          params: headers[col]?.currency
            ? { symbol: headers[col].currency?.symbol }
            : {}
        }
  }

  return { ...row, [headers[0].value]: label || totalLabel, editable: false }
}

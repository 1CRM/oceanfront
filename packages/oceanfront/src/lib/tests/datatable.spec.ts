import {
  DataTableHeader,
  sumTotalColumnIndexes,
  sumTotalsRow
} from '../datatable'

const headers = [
  { text: 'Name', value: 'name' },
  { text: 'Balance', value: 'balance', sum_total: true },
  { text: 'Owner', value: 'owner' }
] as DataTableHeader[]

const row = (name: string, balance: number) => ({
  name: { value: name },
  balance: {
    value: `$${balance}`,
    rawValue: balance,
    format: { type: 'currency' }
  }
})

test('reports which columns carry a total', () => {
  expect(sumTotalColumnIndexes(headers)).toEqual([1])
  expect(sumTotalColumnIndexes(undefined)).toEqual([])
})

test('adds the totalled columns up over the rows', () => {
  const total = sumTotalsRow(
    headers,
    [row('a', 10), row('b', 32.5)],
    [1],
    'Total'
  )

  expect(total.balance.value).toEqual(42.5)
  expect(total.balance.format).toEqual({ type: 'currency' })
  expect(total.name).toEqual('Total')
  expect(total.editable).toEqual(false)
})

test('skips cells that hold no number, and leaves a zero total empty', () => {
  const rows = [row('a', 10), { name: { value: 'b' }, balance: { value: '—' } }]

  expect(sumTotalsRow(headers, rows, [1], 'Total').balance.value).toEqual(10)
  expect(sumTotalsRow(headers, [], [1], 'Total').balance.value).toEqual('')
})

// What lets a caller that only holds part of the list total each part as it
// arrives: the result has to be usable as input.
test('totals of totals match totalling the rows in one go', () => {
  const first = [row('a', 10), row('b', 20)]
  const second = [row('c', 5.5)]

  const combined = sumTotalsRow(
    headers,
    [
      sumTotalsRow(headers, first, [1], ''),
      sumTotalsRow(headers, second, [1], '')
    ],
    [1],
    'Total'
  )

  expect(combined.balance.value).toEqual(
    sumTotalsRow(headers, [...first, ...second], [1], 'Total').balance.value
  )
  expect(combined.name).toEqual('Total')
})

test('accumulates each currency of a multi-value cell separately', () => {
  const multi = (usd: number, eur: number) => ({
    name: { value: 'x' },
    balance: [
      { label: 'Amounts', rawValue: usd },
      { label: 'Amounts', rawValue: eur }
    ]
  })

  const total = sumTotalsRow(
    headers,
    [multi(1, 2), multi(10, 20)],
    [1],
    'Total'
  )

  expect(total.balance.map((cell: any) => cell.value)).toEqual([11, 22])
  // A label carried by the cells names the row in place of the fallback.
  expect(total.name).toEqual('Amounts')
})

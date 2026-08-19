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

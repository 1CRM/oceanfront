export interface ItemList {
  avatarKey?: string
  disabledKey?: string
  iconKey?: string
  specialKey?: string
  textKey?: string
  postfixKey?: string
  valueKey?: string
  selectedTextKey?: string
  classKey?: string
  class?: string
  count?: number
  // details?: (key: any) => VNode
  error?: string // maybe multiple messages, maybe hint as well
  // format?:  formatter for values
  filter?: (query: string) => any[] | ItemList
  items: any[]
  loading?: boolean | string // string for placeholder message
  lookup?: (key: any) => any
}

export interface Item {
  value: string | number
  text: string | number
}

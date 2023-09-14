import { markRaw } from 'vue'
import { Config, ConfigManager } from './config'
import { FormRecord } from './records'
import { readonlyUnref } from './util'

export type ItemsProp = ItemList | string | any[]

export interface ItemList {
  avatarKey?: string
  disabledKey?: string
  iconKey?: string
  specialKey?: string
  textKey?: string
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
  value: String | Number
  text: String | Number
}
export const transformItemsList = (
  mgr: ItemsState,
  source?: string | any[] | ItemList,
  name?: string,
  record?: FormRecord
): ItemList => {
  const result: ItemList = {
    disabledKey: 'disabled',
    items: [],
    specialKey: 'special',
    textKey: 'text',
    selectedTextKey: 'selectedText',
    valueKey: 'value',
    iconKey: 'icon',
    classKey: 'class',
  }
  let items
  if (name && record) {
    items = record.metadata[name]?.items
  }
  if (!items) items = source
  const list = mgr.getItemList(items)
  if (list) {
    Object.assign(result, list)
  }
  return result
}

export function makeItemList(items?: any[] | ItemList): ItemList {
  if (Array.isArray(items)) {
    return {
      items,
    }
  } else if (typeof items !== 'object' || !Array.isArray(items.items)) {
    return {
      error: 'Error loading items',
      items: [],
    }
  }
  return markRaw(items)
}

export function makeItems(
  items: String | Number | Number[] | String[] | Item[]
): Item[] {
  if (typeof items === 'string' || typeof items === 'number') {
    return [
      {
        value: items,
        text: items,
      },
    ]
  }
  if (Array.isArray(items)) {
    const newItems: Item[] = []
    items.forEach((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        newItems.push({
          value: item,
          text: item,
        })
      } else {
        if (!((item as Item).value && (item as Item).text)) {
          throw 'Object properties is wrong'
        }
        newItems.push(item as Item)
      }
    })
    return newItems
  }
  return []
}

export interface ItemsState {
  getItemList(items?: ItemsProp): ItemList | undefined
}

class ItemsManager implements ItemsState {
  readonly lists: Record<string, ItemList> = {}
  // constructor(_config: Config) {}

  getItemList(items?: ItemsProp): ItemList | undefined {
    // FIXME may also load from language manager
    if (typeof items === 'string') return this.lists[items]
    else return makeItemList(items)
  }
}

const configManager = new ConfigManager('ofitm', ItemsManager)

export function registerItemList(name: string, items: any[] | ItemList): void {
  configManager.extendingManager.lists[name] = makeItemList(items)
}

export function useItems(config?: Config): ItemsState {
  const mgr = configManager.inject(config)
  return readonlyUnref(mgr)
}

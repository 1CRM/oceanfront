<template>
  <div
    :class="[tableClass, { drag: drag }]"
    :style="columnsStyle"
    :id="outerId"
    ref="tableElt"
  >
    <div class="of-data-table-header">
      <div v-if="draggable"></div>
      <div v-if="rowsSelector" class="of-data-table-rows-selector">
        <slot name="header-rows-selector">
          <of-button
            variant="text"
            class="header-rows-selector"
            keep-text-color
            split
            :items="selectRowsItems"
          >
            <of-field
              type="toggle"
              variant="basic"
              :class="['row-selector', 'header']"
              v-model="headerRowsSelectorChecked"
              :mode="selectLocked ? 'disabled' : 'editable'"
              :locked="selectLocked"
              @update:model-value="onUpdateHeaderRowsSelector"
            />
          </of-button>
        </slot>
        <slot name="header-first-cell" />
      </div>
      <div
        v-for="(col, idx) of columns"
        :class="[
          col.class,
          {
            sortable: col.sortable !== false,
            [sort.order]: sort.column === col.value,
          },
        ]"
        :key="idx"
      >
        <span
          v-if="col.sortable !== false"
          :id="createColId(idx)"
          :tabindex="col.sortable !== false ? '0' : undefined"
          @mouseenter="
            col.extra_sort_fields
              ? sortColEnter('#' + createColId(idx), col.extra_sort_fields)
              : null
          "
          @mouseleave="col.extra_sort_fields ? sortColLeave() : null"
          @click="onSort(col.value)"
          @keydown.enter.prevent="onSort(col.value)"
        >
          {{ col.text }}
          <of-icon
            :name="
              sort.order == RowSortOrders.desc && sort.column == col.value
                ? 'select down'
                : 'select up'
            "
          />
        </span>
        <div v-else>
          {{ col.text }}
        </div>
      </div>
    </div>
    <template :key="rowidx" v-for="(row, rowidx) of rows">
      <div
        class="of-data-table-row"
        @mousemove="dragMouseMove($event, rowidx)"
        :class="{
          selected:
            rowsRecord.value[row.id] ||
            (highlited.type === 'item' && highlited.itemIdx === rowidx),
          odd: rowidx % 2 != 0,
          nested: row.nested,
          dragging:
            draggingItem.type === 'item' && draggingItem.itemIdx === rowidx,
        }"
      >
        <div
          v-if="draggable"
          @mousedown="dragMouseDown($event, rowidx)"
          class="grab-button"
        >
          <of-icon name="menu"></of-icon>
        </div>
        <div v-if="rowsSelector">
          <slot name="rows-selector" :record="rowsRecord" :item="row">
            <of-field
              type="toggle"
              variant="basic"
              class="row-selector"
              :locked="selectLocked"
              :mode="selectLocked ? 'disabled' : 'editable'"
              :record="selectLocked ? undefined : rowsRecord"
              :model-value="selectLocked ? true : rowsRecord.value[row.id]"
              :name="row.id"
            />
          </slot>
          <slot name="first-cell" :record="rowsRecord" :item="row" />
        </div>
        <div v-for="(col, colidx) of columns" :class="col.class" :key="colidx">
          <of-data-type :value="row[col.value]"></of-data-type>
        </div>
      </div>

      <div
        v-for="(subrow, subidx) of row.subitems"
        class="of-data-table-row"
        @mousemove="dragMouseMoveNested($event, subidx, rowidx)"
        :key="subidx"
        :class="{
          selected:
            rowsRecord.value[subrow.id] ||
            (highlited.itemIdx === rowidx &&
              highlited.subitems.includes(subidx)),
          odd: subidx % 2 != 0,
          nested: true,
          dragging: highlight(rowidx, subidx),
        }"
      >
        <div
          @mousedown="dragMouseDown($event, rowidx, subidx)"
          v-if="draggable"
          class="grab-button"
        >
          <of-icon name="menu"></of-icon>
        </div>
        <div v-if="rowsSelector">
          <slot name="rows-selector" :record="rowsRecord" :item="subrow">
            <of-field
              type="toggle"
              variant="basic"
              class="row-selector"
              :locked="selectLocked"
              :mode="selectLocked ? 'disabled' : 'editable'"
              :record="selectLocked ? undefined : rowsRecord"
              :model-value="selectLocked ? true : rowsRecord.value[subrow.id]"
              :name="subrow.id"
            />
          </slot>
          <slot name="first-cell" :record="rowsRecord" :item="subrow" />
        </div>
        <div v-for="(col, colidx) of columns" :class="col.class" :key="colidx">
          <svg
            v-if="col.value === 'name'"
            width="20px"
            height="20px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-labelledby="previousAltIconTitle"
            stroke="#000000"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            color="#000000"
          >
            <title id="previousAltIconTitle">Previous</title>
            <path d="M8 4L4 8L8 12" />
            <path
              d="M4 8H14.5C17.5376 8 20 10.4624 20 13.5V13.5C20 16.5376 17.5376 19 14.5 19H5"
            />
          </svg>
          <of-data-type :value="subrow[col.value]"></of-data-type>
        </div>
      </div>
    </template>

    <template v-if="footerRows.length">
      <div
        class="of-data-table-footer"
        v-for="(row, rowidx) of footerRows"
        :key="rowidx"
      >
        <div v-if="draggable"></div>
        <div :class="{ first: rowidx == 0 }" v-if="rowsSelector">&nbsp;</div>
        <div
          v-for="(col, colidx) of columns"
          :class="[col.class, rowidx == 0 ? 'first' : undefined]"
          :key="colidx"
        >
          <of-format :type="col.format" :value="row[col.value]" />
        </div>
      </div>
    </template>
    <of-overlay
      :active="sortPopupOpened"
      :capture="false"
      :shade="false"
      :target="sortPopupTarget"
    >
      <of-option-list
        @mouseenter="sortPopupEnter()"
        @mouseleave="sortPopupLeave()"
        @click="onSort"
        class="of-extra-sort-popup of--elevated-1"
        :items="selectedColFields"
      />
    </of-overlay>

    <div
      v-if="draggable && drag"
      class="drag-position-handler"
      :style="{ top: arrowTop + 'px' }"
    >
      <div class="drag-pointers-handler">
        <div class="drag-position-pointer" :class="{ nested: currentNested }">
          <svg
            fill="#000000"
            width="30px"
            height="30px"
            viewBox="0 0 32 32"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>next</title>
            <path d="M0 24.781v-17.594l15.281 8.813z"></path>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { FormRecord, makeRecord } from '../lib/records'
import {
  computed,
  defineComponent,
  ref,
  watch,
  PropType,
  ComputedRef,
  Ref,
  shallowRef,
  reactive,
} from 'vue'
import { DataTableHeader } from '../lib/datatable'
import { useThemeOptions } from '../lib/theme'
import { OfIcon } from './Icon'

enum RowsSelectorValues {
  Page = 'page',
  All = 'all',
  DeselectAll = 'deselect-all',
}

enum RowSortOrders {
  asc = 'asc',
  desc = 'desc',
  noOrder = '',
}

interface ExtraSortField {
  label: string
  value: string
  order?: string
}

const showSelector = (hasSelector: boolean, rows: any[]): boolean => {
  let issetId = false
  if (rows && rows.hasOwnProperty(0) && rows[0].hasOwnProperty('id')) {
    issetId = true
  }
  return (hasSelector && issetId) ?? false
}

let sysDataTableIndex = 0

export default defineComponent({
  name: 'OfDataTable',
  components: { OfIcon },
  // components: { OfFormat },
  props: {
    footerItems: { type: Array as PropType<any[]>, default: () => [] },
    headers: { type: Array, default: () => [] } as any as object &
      PropType<DataTableHeader[]>,
    items: { type: Array, default: () => [] } as any as object &
      PropType<Record<string, any>>,
    itemsCount: [String, Number],
    itemsPerPage: [String, Number],
    page: [String, Number],
    rowsSelector: Boolean,
    resetSelection: Boolean,
    selectAll: Boolean,
    draggable: Boolean,
    density: [String, Number],
  },
  emits: {
    'rows-selected': null,
    'rows-select-all': null,
    'rows-select-page': null,
    'rows-deselect-all': null,
    'rows-sorted': null,
    'rows-moved': null,
  },
  setup(props, ctx) {
    const themeOptions = useThemeOptions()
    const sort = ref({ column: '', order: '' })
    const items = ref(props.items || [])
    const tableElt = shallowRef<HTMLDivElement | undefined>()
    const drag = ref(false)
    let dragStartX = 0
    const currentNested = ref(false)
    const draggingItem = reactive({ itemIdx: -1, subitemIdx: -1, type: 'item' })
    const currentDragPosition = reactive({ itemIdx: -1, subitemIdx: -1 })
    const highlited = ref({ type: 'item', itemIdx: -1, subitems: [] })
    const arrowTop = ref(0)
    const orderAndCheck = (
      item: any,
      idx: number,
      selectedValues: Record<string, any>
    ) => {
      item.order = item.hasOwnProperty('order') ? item.order : idx
      item.selected =
        item.selected || (selectedValues && selectedValues[item.id])
          ? selectedValues[item.id]
          : !!(selectedValues && selectedValues[RowsSelectorValues.All])
      return item
    }
    const rows = computed(() => {
      const result = []
      let count = perPage.value
      let propItems = items.value
      let selectedRecords = rowsRecord.value?.value
      for (
        let idx = iterStart.value;
        count > 0 && idx < propItems.length;
        idx++
      ) {
        let item: any = propItems[idx]
        item = orderAndCheck(item, idx, selectedRecords)
        if (item.subitems) {
          for (let subIdx = 0; subIdx < item.subitems.length; subIdx++) {
            let subitem: any = item.subitems[subIdx]
            subitem = orderAndCheck(subitem, subIdx, selectedRecords)
            item.subitems[subIdx] = subitem
          }
        }
        result.push(item)
      }
      return result
    })
    const changeNeeded = (destination: {
      itemIdx: number
      subitemIdx: number
    }) => {
      return (
        destination.itemIdx !== currentDragPosition.itemIdx ||
        destination.subitemIdx !== currentDragPosition.subitemIdx
      )
    }

    const checkDragAvailability = (destination: {
      itemIdx: number
      subitemIdx: number
    }) => {
      return (
        destination.itemIdx >= 0 &&
        (draggingItem.type === 'subitem' ||
          destination.itemIdx !== draggingItem.itemIdx ||
          destination.subitemIdx === -1)
      )
    }

    const setDraggingPosition = (data: {
      itemIdx: number
      subitemIdx: number
    }) => {
      currentDragPosition.itemIdx = data.itemIdx
      currentDragPosition.subitemIdx = data.subitemIdx
    }

    const setNestedValue = () => {
      currentNested.value = currentDragPosition.subitemIdx > -1
    }
    const removeSubitem = (itemIdx: number, subitemIdx: number) => {
      let subitems =
        items.value[itemIdx].subitems?.filter((value: any, index: number) => {
          return index !== subitemIdx
        }) || []
      for (let i = 0; i < subitems?.length; i++) {
        let newItem: any = subitems[i]
        newItem.order = i
        subitems[i] = newItem
      }
      items.value[itemIdx].subitems = subitems
    }
    const addSubitem = (itemIdx: number, subitemIdx: number, item: any) => {
      item.order = subitemIdx
      let subitems = items.value[itemIdx].subitems || []
      let orderUp = item.subitems?.length ? item.subitems.length + 1 : 1
      if (subitems.length > subitemIdx) {
        for (let i = subitemIdx; i < subitems.length; i++) {
          let newItem: any = subitems[i]
          newItem.order += orderUp
          subitems[i] = newItem
        }
      }
      if (item.subitems?.length) {
        for (let i = 0; i < item.subitems.length; i++) {
          let newItem = item.subitems[i]
          newItem.order = subitemIdx + i + 1
          subitems.push(newItem)
        }
        item.subitems = []
      }
      subitems.push(item)
      subitems.sort((a: any, b: any) => a.order - b.order)
      items.value[itemIdx].subitems = subitems
    }
    const dragMouseMove = (event: any, idx: number) => {
      if (drag.value) {
        let table_div = tableElt.value as HTMLDivElement | null
        if (!table_div) return
        let ofx = event.offsetX
        let ofy = event.offsetY
        let pagex = event.pageX
        let height = event.target
          .closest('.of-data-table-row')
          .querySelector('.of--align-start')
          .getBoundingClientRect().height
        let checkNested = pagex - dragStartX > 30
        let checkDestination = { itemIdx: -1, subitemIdx: -1 }
        if (ofy < height / 2) {
          if (checkNested && idx > 0) {
            checkDestination.itemIdx = idx - 1
            checkDestination.subitemIdx =
              items.value[idx - 1].subitems?.length || 0
          } else {
            checkDestination.itemIdx = idx
          }
        } else {
          if (
            draggingItem.itemIdx !== idx ||
            !items.value[idx].subitems?.length
          ) {
            if (checkNested) {
              checkDestination.itemIdx = idx
              checkDestination.subitemIdx = 0
            } else {
              checkDestination.itemIdx = idx + 1
            }
          }
        }
        if (
          changeNeeded(checkDestination) &&
          checkDragAvailability(checkDestination)
        ) {
          setDraggingPosition(checkDestination)
          fixArrow(
            event.target,
            checkDestination.itemIdx > idx ||
              (checkDestination.itemIdx === idx &&
                checkDestination.subitemIdx > -1)
          )
          setNestedValue()
        }
      }
      return true
    }
    const removeItem = (idx: number) => {
      items.value = items.value.filter((v: any, i: number) => {
        return i !== idx
      })
      for (let i = 0; i < items.value.length; i++) {
        let newItem: any = items.value[i]
        newItem.order = i
        items.value[i] = newItem
      }
    }
    const highlightItems = (
      type: string,
      itemIdx: number,
      subitemIdx = -1,
      length = -1
    ) => {
      let res = { type: type, itemIdx: itemIdx, subitems: [] }
      if (type === 'item') {
        if (length) {
          for (let i = 0; i < length; i++) {
            res.subitems.push(i as never)
          }
        }
      } else {
        for (let i = 0; i < length; i++) {
          res.subitems.push((i + subitemIdx) as never)
        }
      }
      highlited.value = res
    }
    const addItem = (idx: number, item: any) => {
      item.order = idx
      if (items.value.length > idx) {
        for (let i = idx; i < items.value.length; i++) {
          let newItem: any = items.value[i]
          newItem.order += 1
          items.value[i] = newItem
        }
      }
      items.value.push(item)
      items.value.sort((a: any, b: any) => a.order - b.order)
    }
    const dragMouseMoveNested = (
      event: MouseEvent,
      idx: number,
      parentIdx: number
    ) => {
      if (drag.value) {
        let table_div = tableElt.value as HTMLDivElement | null
        if (!table_div) return
        let ofy = event.offsetY
        let pagex = event.pageX
        let target = event.target as HTMLDivElement
        let height =
          target
            ?.closest('.of-data-table-row')
            ?.querySelector('.of--align-start')
            ?.getBoundingClientRect().height || 0
        let subitemCount = items.value[parentIdx].subitems?.length || 0
        let checkDestination = { itemIdx: -1, subitemIdx: -1 }
        let checkNested = pagex - dragStartX > 30
        if (
          parentIdx === draggingItem.itemIdx &&
          draggingItem.type === 'item'
        ) {
          if (idx === subitemCount - 1 && ofy >= height / 2) {
            checkDestination.itemIdx = parentIdx + 1
            checkDestination.subitemIdx = -1
          }
        } else {
          if (ofy < height / 2) {
            if (idx === subitemCount - 1 && !checkNested) {
              checkDestination.itemIdx = parentIdx + 1
              checkDestination.subitemIdx = -1
            } else {
              checkDestination.itemIdx = parentIdx
              checkDestination.subitemIdx = idx
            }
          } else {
            if (idx < subitemCount - 1 || checkNested) {
              checkDestination.itemIdx = parentIdx
              checkDestination.subitemIdx = idx + 1
            } else {
              checkDestination.itemIdx = parentIdx + 1
              checkDestination.subitemIdx = -1
            }
          }
        }
        if (
          changeNeeded(checkDestination) &&
          checkDragAvailability(checkDestination)
        ) {
          setDraggingPosition(checkDestination)
          fixArrow(
            event.target as HTMLDivElement,
            checkDestination.itemIdx > parentIdx ||
              checkDestination.subitemIdx > idx
          )
          setNestedValue()
        }
      }
      return true
    }
    const outerId = computed(() => {
      return 'of-data-table-' + ++sysDataTableIndex
    })

    const dragMouseDown = (
      event: MouseEvent,
      itemIdx: number,
      subitemIdx = -1
    ) => {
      drag.value = true
      highlited.value = { type: 'item', itemIdx: -1, subitems: []}
      fixArrow(event.target as HTMLDivElement)
      draggingItem.itemIdx = itemIdx
      draggingItem.subitemIdx = subitemIdx
      draggingItem.type = subitemIdx > -1 ? 'subitem' : 'item'
      currentNested.value = subitemIdx > -1
      currentDragPosition.itemIdx = itemIdx
      currentDragPosition.subitemIdx = subitemIdx
      dragStartX = event.pageX
    }
    document.addEventListener('mouseup', () => {
      if (drag.value) {
        drag.value = false
        if (draggingItem.type === 'item') {
          if (draggingItem.itemIdx < currentDragPosition.itemIdx) {
            currentDragPosition.itemIdx--
          }
          let item = items.value[draggingItem.itemIdx]
          let highlightLength = item.subitems ? item.subitems.length : 0
          removeItem(draggingItem.itemIdx)
          if (currentDragPosition.subitemIdx === -1) {
            addItem(currentDragPosition.itemIdx, item)
            highlightItems(
              'item',
              currentDragPosition.itemIdx,
              0,
              highlightLength
            )
          } else {
            addSubitem(
              currentDragPosition.itemIdx,
              currentDragPosition.subitemIdx,
              item
            )
            highlightItems(
              'subitem',
              currentDragPosition.itemIdx,
              currentDragPosition.subitemIdx,
              highlightLength + 1
            )
          }
        } else {
          let item =
            items.value[draggingItem.itemIdx]?.subitems[draggingItem.subitemIdx]
          removeSubitem(draggingItem.itemIdx, draggingItem.subitemIdx)
          if (currentDragPosition.subitemIdx > -1) {
            if (
              currentDragPosition.itemIdx === draggingItem.itemIdx &&
              draggingItem.subitemIdx < currentDragPosition.subitemIdx
            ) {
              currentDragPosition.subitemIdx--
            }
            addSubitem(
              currentDragPosition.itemIdx,
              currentDragPosition.subitemIdx,
              item
            )
            highlightItems(
              'subitem',
              currentDragPosition.itemIdx,
              currentDragPosition.subitemIdx,
              1
            )
          } else {
            addItem(currentDragPosition.itemIdx, item)
            highlightItems('item', currentDragPosition.itemIdx)
          }
        }
        currentDragPosition.subitemIdx = -1
        currentDragPosition.itemIdx = -1
        draggingItem.itemIdx = -1
        draggingItem.subitemIdx = -1
        draggingItem.type = 'item'
        ctx.emit('rows-moved', items.value)
      }
    })

    const fixArrow = (el: HTMLDivElement, point_next = false) => {
      let elem = el
        ?.closest('.of-data-table-row')
        ?.querySelector('.of--align-start')
        ?.getBoundingClientRect()
      if (!elem) return
      let elem_top = elem.top
      let table_top = tableElt?.value?.getBoundingClientRect().top
      if (!table_top) return
      if (point_next) {
        arrowTop.value = elem_top - table_top + elem.height
      } else {
        arrowTop.value = elem_top - table_top
      }
    }

    const sortPopupCloseTimerId = ref()
    const sortPopupOpenTimerId = ref()
    const sortPopupChangeTimerId = ref()
    const sortPopupOpened = ref(false)
    const sortPopupTarget = ref('')
    const selectedColFields: Ref<Object[]> = ref([])
    const selectLocked = ref(false)

    const createColId = (idx: number) => outerId.value + '-header-' + idx

    const sortColLeave = () => {
      clearTimeout(sortPopupChangeTimerId.value)
      clearTimeout(sortPopupOpenTimerId.value)
      if (sortPopupOpened.value !== true) return
      sortPopupCloseTimerId.value = window.setTimeout(() => {
        closeSortPopup()
      }, 500)
    }

    const sortColEnter = (
      target: string,
      extraSortFields: ExtraSortField[]
    ) => {
      clearTimeout(sortPopupCloseTimerId.value)
      sortPopupChangeTimerId.value = window.setTimeout(
        () => {
          setSelectedColFields(extraSortFields)
          sortPopupTarget.value = target
        },
        sortPopupOpened.value ? 500 : 0
      )
      if (sortPopupOpened.value !== true) {
        clearTimeout(sortPopupOpenTimerId.value)
        sortPopupOpenTimerId.value = window.setTimeout(() => {
          openSortPopup()
        }, 500)
      }
    }

    const setSelectedColFields = (extraSortFields: ExtraSortField[]) => {
      selectedColFields.value = []
      for (const field of extraSortFields) {
        const item = {
          value: field.value,
          text: field.label,
        }
        const itemAsc = {
          icon: 'select up',
          selected:
            sort.value.column === field.value &&
            sort.value.order === RowSortOrders.asc,
          order: RowSortOrders.asc,
        }
        const itemDesc = {
          icon: 'select down',
          selected:
            sort.value.column === field.value &&
            sort.value.order === RowSortOrders.desc,
          order: RowSortOrders.desc,
        }
        selectedColFields.value.push({ ...itemDesc, ...item })
        selectedColFields.value.push({ ...itemAsc, ...item })
      }
    }

    const sortPopupEnter = () => {
      clearTimeout(sortPopupCloseTimerId.value)
    }
    const sortPopupLeave = () => {
      sortColLeave()
    }
    const openSortPopup = () => {
      sortPopupOpened.value = true
    }
    const closeSortPopup = () => {
      sortPopupOpened.value = false
    }

    const columns = computed(() => {
      const cols: any[] = []
      for (const hdr of props.headers as DataTableHeader[]) {
        const align = hdr.align
        const cls = ['of--align-' + (align || 'start'), hdr.class]
        if (typeof hdr.sort === 'string') {
          setSort(hdr.value, hdr.sort)
        }
        cols.push(Object.assign({}, hdr, { align, class: cls }))
      }
      return cols
    })
    const perPage = computed(
      () => parseInt(props.itemsPerPage as any, 10) || 10
    )
    const page = ref(0)
    // What was this?
    /*
    const pageCount = computed(() => {
      let count = parseInt(props.itemsCount ?? props.items?.length, 10) || 0
      return Math.ceil(count / perPage.value)
    })
    */
    watch(
      () => props.page,
      (p) => (page.value = parseInt(p as string, 10) || 1), // FIXME check in range
      { immediate: true }
    )
    const iterStart = computed(() => {
      if (props.itemsCount != null) return 0 // external navigation
      return Math.max(0, perPage.value * (page.value - 1))
    })
    const columnsStyle = computed(() => {
      const dragWidth = props.draggable ? '50px ' : ''
      const selectorWidth = showSelector(props.rowsSelector, rows.value)
        ? 'min-content'
        : ''
      const widths = props.headers
        ?.map((h) => {
          if (!h.width) return 'auto'
          const w = h.width.toString()
          if (w.endsWith('%') || w.match(/^[0-9]+(\.[0-9]*)?$/)) {
            const widthNumber = parseFloat(w)
            if (isNaN(widthNumber)) return 'auto'
            return '' + widthNumber + 'fr'
          }
          return w
        })
        .join(' ')
      return {
        '--of-table-columns': `${dragWidth} ${selectorWidth} ${widths}`,
      }
    })

    const footerRows = computed(() => {
      return props.footerItems
    })

    const rowsSelector = computed(() =>
      showSelector(props.rowsSelector, rows.value)
    )
    const selectAll = computed(() => props.selectAll)
    const rowsRecord: ComputedRef<FormRecord> = computed(() => {
      let ids: any = {}

      if (selectAll.value) {
        ids = { all: true }
      } else {
        if (rowsSelector.value) {
          for (const row of rows.value) {
            ids[row.id] = row.selected || false
            if (row.subitems) {
              for (const subrow of row.subitems) {
                ids[subrow.id] = subrow.selected || false
              }
            }
          }
        }
      }
      return makeRecord(ids)
    })
    watch(
      () => rowsRecord.value.value,
      (val) => {
        ctx.emit('rows-selected', val)
        headerRowsSelectorChecked.value = true
        for (const [id, checked] of Object.entries(val)) {
          if (id !== RowsSelectorValues.All && !checked) {
            headerRowsSelectorChecked.value = false
          }
        }
      },
      { deep: true }
    )
    watch(
      () => props.resetSelection,
      (val) => {
        if (val) selectRows(RowsSelectorValues.DeselectAll)
      }
    )
    const selectRows = function (val: any) {
      if (!rows.value) return false
      const checked = val == RowsSelectorValues.DeselectAll ? false : true
      headerRowsSelectorChecked.value = checked

      if (val === RowsSelectorValues.All) {
        for (const row of rows.value) {
          rowsRecord.value.value[row.id] = true
          if (row.subitems) {
            for (const subrow of row.subitems) {
              rowsRecord.value.value[subrow.id] = true
            }
          }
        }
        selectLocked.value = true
        ctx.emit('rows-select-all')
      } else {
        delete rowsRecord.value.value[RowsSelectorValues.All]
        selectLocked.value = false
        if (val == RowsSelectorValues.DeselectAll) {
          ctx.emit('rows-deselect-all')
        } else if (val == RowsSelectorValues.Page) {
          ctx.emit('rows-select-page')
        }
        for (const row of rows.value) {
          rowsRecord.value.value[row.id] = checked
          if (row.subitems) {
            for (const subrow of row.subitems) {
              rowsRecord.value.value[subrow.id] = checked
            }
          }
        }
      }
    }
    const headerRowsSelectorChecked = ref(false)
    const onUpdateHeaderRowsSelector = function (val: any) {
      let select = val
        ? RowsSelectorValues.Page
        : RowsSelectorValues.DeselectAll
      selectRows(select)
    }
    const highlight = (parentIdx: number, idx: number) => {
      if (draggingItem.type === 'item') {
        return draggingItem.itemIdx === parentIdx
      } else {
        return (
          draggingItem.itemIdx === parentIdx && draggingItem.subitemIdx === idx
        )
      }
    }
    const selectRowsItems = [
      {
        key: 'page',
        text: 'Select Page',
        value: () => selectRows(RowsSelectorValues.Page),
      },
      {
        key: 'all',
        text: 'Select All',
        value: () => selectRows(RowsSelectorValues.All),
      },
      {
        key: 'clear',
        text: 'Deselect All',
        value: () => selectRows(RowsSelectorValues.DeselectAll),
      },
    ]

    const setSort = function (column: string, order: string) {
      sort.value.order = order
      sort.value.column = column
    }

    const onSort = function (
      column: string,
      field: ExtraSortField | undefined = undefined
    ) {
      closeSortPopup()
      const autoOrder =
        sort.value.order == RowSortOrders.noOrder ||
        sort.value.column !== column
          ? RowSortOrders.asc
          : sort.value.order == RowSortOrders.asc
          ? RowSortOrders.desc
          : RowSortOrders.asc

      setSort(column, field?.order || autoOrder)
      selectRows(RowsSelectorValues.DeselectAll)
      ctx.emit('rows-sorted', sort.value)
    }
    const density = computed(() => {
      let d = props.density
      if (d === 'default') {
        d = undefined
      } else if (typeof d === 'string') {
        d = parseInt(d, 10)
        if (isNaN(d)) d = undefined
      }
      if (typeof d !== 'number') {
        d = themeOptions.defaultDensity
      }
      if (typeof d !== 'number') {
        d = 2
      }
      return Math.max(0, Math.min(3, d || 0))
    })

    const tableClass = computed(() => [
      'of-data-table',
      'of--density-' + density.value,
    ])

    return {
      columns,
      footerRows,
      rows,
      rowsSelector,
      highlited,
      draggingItem,
      rowsRecord,
      highlight,
      selectRowsItems,
      selectRows,
      onUpdateHeaderRowsSelector,
      headerRowsSelectorChecked,
      columnsStyle,
      onSort,
      sort,
      tableElt,
      arrowTop,
      currentNested,
      dragMouseDown,
      dragMouseMove,
      dragMouseMoveNested,
      tableClass,
      outerId,
      RowSortOrders,
      sortPopupTarget,
      sortPopupOpened,
      selectedColFields,
      selectLocked,
      createColId,
      drag,
      sortColEnter,
      sortColLeave,
      sortPopupEnter,
      sortPopupLeave,
    }
  },
})
</script>
<style lang="scss">
.of-data-table {
  .of-data-table-row.dragging > div {
    background-color: var(--of-inverse-tint) !important;
  }
  .grab-button {
    cursor: grab;
  }
  position: relative;
  .drag-position-handler {
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    border-top: 3px solid #4c4c4c8f;
    .drag-pointers-handler {
      position: relative;
      .drag-position-pointer {
        left: 30px;
        position: absolute;
        line-height: 1;
        transform: translateY(-50%);
        &.nested {
          left: 60px;
        }
      }
    }
  }
  &.drag {
    * {
      cursor: grabbing !important;
    }
    user-select: none;
  }
}
</style>

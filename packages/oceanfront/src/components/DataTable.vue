<template>
  <div
    :class="[tableClass, { drag: dragInProgress }, { editable: editable }]"
    :style="columnsStyle"
    :id="outerId"
    ref="tableElt"
  >
    <div class="of-data-table-header">
      <div v-if="draggable"></div>
      <div v-if="addRowsSelector" class="of-data-table-rows-selector">
        <slot name="header-rows-selector">
          <of-button
            variant="text"
            class="header-rows-selector"
            keep-text-color
            split
            tabindex="-1"
            :items="selectRowsItems"
          >
            <of-field
              type="toggle"
              variant="basic"
              :class="['row-selector', 'header']"
              v-model="headerRowsSelectorChecked"
              :mode="selectLocked ? 'disabled' : 'editable'"
              :locked="selectLocked"
              :aria-label="selectRowsItems.find((r) => r.key === 'page')?.text"
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
            [sort.order]: sort.column === col.value
          }
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
      <of-table-row
        :row="row"
        :drag-info="{
          draggable: draggable,
          dragInProgress: dragInProgress,
          nestedIndicator: nestedIndicator,
          currentCoords,
          nested: draggingOptions.nested,
          currentCanBeNested:
            draggingOptions.nested &&
            (draggingOptions.allNested || currentCanBeNested),
          draggingItem,
          nestedLimit: draggingOptions.nestedLimit,
          allParent: draggingOptions.allParent,
          listedRows,
          tableLeft,
          highlightLastMoved,
          currentInnerDepth
        }"
        :coords="[rowidx]"
        :point-next="[rowidx + 1]"
        v-on="dragEvents"
        :rows-selector="addRowsSelector"
        :select-locked="selectLocked"
        :edit-type="editType"
        :editable="editable"
        :show-old-values="showOldValues"
        :columns="columns"
        :rows-record="rowsRecord"
        :idx="rowidx"
        :is-touchable="isTouchable"
        @update:row="updateRow"
        @update:field="updateField"
      >
        <template #rows-selector>
          <slot name="rows-selector" :record="rowsRecord" :item="row" />
        </template>
        <template #first-cell>
          <slot name="first-cell" :record="rowsRecord" :item="row" />
        </template>
      </of-table-row>
    </template>
    <of-table-row
      v-if="sumTotalColumns.length"
      :total-amount="true"
      :row="sumTotals"
      :drag-info="{
        draggable: draggable,
        dragInProgress: dragInProgress,
        nestedIndicator: nestedIndicator,
        currentCoords,
        nested: draggingOptions.nested,
        currentCanBeNested:
          draggingOptions.nested &&
          (draggingOptions.allNested || currentCanBeNested),
        draggingItem,
        nestedLimit: draggingOptions.nestedLimit,
        allParent: draggingOptions.allParent,
        listedRows,
        tableLeft,
        highlightLastMoved,
        currentInnerDepth
      }"
      :coords="[rows.length + 1]"
      :point-next="[rows.length + 1]"
      v-on="dragEvents"
      :rows-selector="addRowsSelector"
      :edit-type="editType"
      :show-old-values="showOldValues"
      :columns="columns"
      :rows-record="rowsRecord"
      :idx="rows.length + 1"
      :is-touchable="isTouchable"
      @update:row="updateRow"
    >
      <template #rows-selector>
        <div />
      </template>
    </of-table-row>
    <template v-if="footerRows?.length">
      <div
        class="of-data-table-footer"
        v-for="(row, rowidx) of footerRows"
        :key="rowidx"
      >
        <div v-if="draggable"></div>
        <div :class="{ first: rowidx == 0 }" v-if="addRowsSelector">&nbsp;</div>
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
      v-if="draggable && dragInProgress"
      class="drag-position-handler"
      :style="{ top: arrowTop + 'px' }"
    >
      <div class="drag-pointers-handler">
        <div class="drag-position-pointer" :style="{ left: dragLeft }">
          <svg
            width="15"
            height="18"
            viewBox="0 0 15 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 17.2327V0.738281L14.3259 9.00047L0 17.2327Z"
              fill="black"
            />
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
  reactive
} from 'vue'
import { DataTableHeader } from '../lib/datatable'
import { useThemeOptions } from '../lib/theme'
import { OfIcon } from './Icon'
import { OfOverlay } from './Overlay'
import OfOptionList from './OptionList.vue'
import { OfField } from './Field'
import { OfButton } from './Button'
import OfTableRow from './TableRow.vue'

enum RowsSelectorValues {
  Page = 'page',
  All = 'all',
  DeselectAll = 'deselect-all',
  DeselectPage = 'deselect-page'
}

enum RowSortOrders {
  asc = 'asc',
  desc = 'desc',
  noOrder = ''
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
  components: {
    OfTableRow,
    OfButton,
    OfField,
    OfOptionList,
    OfOverlay,
    OfIcon
  },
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
    dragOptions: {
      type: Object as any,
      required: false
    },
    editable: {
      type: Boolean,
      default: false
    },
    editType: {
      type: String,
      default: 'inline'
    },
    showOldValues: {
      type: Boolean,
      default: false
    },
    nestedIndicator: {
      type: String,
      default: 'name'
    },
    density: [String, Number]
  },
  emits: {
    'rows-selected': null,
    'rows-select-all': null,
    'rows-select-page': null,
    'rows-deselect-page': null,
    'rows-deselect-all': null,
    'rows-sorted': null,
    'rows-moved': null,
    'rows-edited': null,
    'row-edited': null
  },
  setup(props, ctx) {
    const themeOptions = useThemeOptions()
    const sort = ref({ column: '', order: '' })
    const items = ref(props.items || [])
    const tableElt = shallowRef<HTMLDivElement | undefined>()
    const drag = ref(false)
    const currentNested = ref(false)
    const dragInProgress = ref(false)
    const draggingItem = ref([])
    const currentCanBeNested = ref(false)
    const currentCoords = ref([] as number[])
    const arrowTop = ref(0)
    const highlightLastMoved = ref(false)
    const isTouchable = ref(false)
    const nestDepth = ref(0)
    const currentInnerDepth = ref(0)
    const draggingOptions: any = reactive({
      nested: false,
      allNested: true,
      nestedLimit: 5,
      allParent: true
    })
    const dragLeft = computed(() => {
      return 55 + 20 * nestDepth.value + 'px'
    })
    watch(
      () => props.dragOptions,
      (options) => {
        if (options) {
          for (const [key, value] of Object.entries(options)) {
            draggingOptions[key] = value
          }
        }
      },
      { immediate: true }
    )
    const samePosition = (itemIndexes: number[], targetIndexes: number[]) => {
      let itemDepth = itemIndexes.length
      let targetDepth = targetIndexes.length
      if (itemDepth === targetDepth) {
        let samePosition = true
        for (let i = 0; i < itemDepth; i++) {
          if (i === itemDepth - 1) {
            if (
              !(
                itemIndexes[i] === targetIndexes[i] ||
                targetIndexes[i] - itemIndexes[i] === 1
              )
            ) {
              samePosition = false
            }
          } else {
            if (itemIndexes[i] !== targetIndexes[i]) {
              samePosition = false
            }
          }
        }
        return samePosition
      }
      return false
    }
    watch(
      () => highlightLastMoved.value,
      (value) => {
        if (!value) {
          items.value.forEach((v: any) => {
            clearHighlight(v)
          })
        }
      }
    )
    const dragEvents = {
      dragstart: (data: any) => {
        draggingItem.value = data.coords
        currentCoords.value = data.coords
        dragInProgress.value = true
        currentCanBeNested.value = data.canBeNested
        nestDepth.value = data.depth
        currentInnerDepth.value = data.innerDepth
        fixArrow(data.element)
      },
      setCoords: (data: any) => {
        currentCoords.value = data.coords
        nestDepth.value = data.depth
        fixArrow(data.element, data.fixArrowNext)
      }
    }
    const eventStart = (event: MouseEvent | TouchEvent) => {
      if (event.type === 'touchstart') {
        isTouchable.value = true
      }
      if (highlightLastMoved.value) {
        highlightLastMoved.value = false
      }
    }
    const eventEnd = (event: MouseEvent | TouchEvent) => {
      if (event.type === 'touchend') {
        isTouchable.value = false
      }
      if (dragInProgress.value) {
        dragInProgress.value = false
        switchItems(draggingItem.value, currentCoords.value)
      }
    }
    document.addEventListener('mouseup', eventEnd)
    document.addEventListener('mousedown', eventStart)
    document.addEventListener('touchstart', eventStart, {
      passive: true
    })
    document.addEventListener('touchend', eventEnd, {
      passive: true
    })
    const switchItems = (itemIndexes: number[], targetIndexes: number[]) => {
      if (itemIndexes.length && targetIndexes.length) {
        if (!samePosition(itemIndexes, targetIndexes)) {
          let itemDepth = itemIndexes.length
          let targetDepth = targetIndexes.length
          let itemParent: any = items.value
          let targetItemParent: any = items.value
          if (itemDepth > 1) {
            itemParent = itemParent[itemIndexes[0]].subitems
            for (let i = 1; i < itemDepth - 1; i++) {
              itemParent = itemParent[itemIndexes[i]].subitems
            }
          }
          if (targetDepth > 1) {
            if (!targetItemParent[targetIndexes[0]].subitems) {
              targetItemParent[targetIndexes[0]].subitems = []
            }
            targetItemParent = targetItemParent[targetIndexes[0]].subitems
            for (let i = 1; i < targetDepth - 1; i++) {
              if (!targetItemParent[targetIndexes[i]].subitems) {
                targetItemParent[targetIndexes[i]].subitems = []
              }
              targetItemParent = targetItemParent[targetIndexes[i]].subitems
            }
          }
          const item = itemParent[itemIndexes[itemDepth - 1]]
          let order = targetIndexes[targetDepth - 1] - 0.5
          targetItemParent.push({
            ...{ ...item, highlighted: true },
            order
          })
          item.toRemove = true
        }
        highlightLastMoved.value = true
      }
      currentCoords.value = []
      draggingItem.value = []
      sortItems()
      ctx.emit('rows-moved', items.value)
    }
    const sortSubitems = (item: any) => {
      if (!item.subitems) return
      item.subitems = item.subitems.filter((v: any) => !v.toRemove)
      item.subitems
        .sort((a: any, b: any) => a.order - b.order)
        .forEach((value: any, index: number) => {
          value.order = index
          sortSubitems(value)
        })
    }
    const clearHighlight = (item: any) => {
      if (item.highlighted) {
        delete item.highlighted
        return
      }
      if (item.subitems) {
        item.subitems
          .sort((a: any, b: any) => a.order - b.order)
          .forEach((value: any, _index: number) => {
            clearHighlight(value)
          })
      }
    }
    const sortItems = () => {
      items.value = items.value.filter((v: any) => !v.toRemove)
      items.value
        .sort((a: any, b: any) => a.order - b.order)
        .forEach((value: any, index: number) => {
          value.order = index
          sortSubitems(value)
        })
    }
    const updateRow = (row: object) => {
      ctx.emit('row-edited', row)
      ctx.emit('rows-edited', items.value)
    }
    const updateField = () => {
      updateSumTotal()
    }
    const tableLeft = computed(() => {
      if (tableElt.value) {
        const tab = tableElt.value as HTMLDivElement
        return tab?.getBoundingClientRect()?.left ?? 0
      }
      return 0
    })

    const fillListedRows = (
      item: any,
      arr: any[],
      coords: string,
      depth: number
    ) => {
      let clone = { ...item }
      delete clone.subitems
      clone.coordIndex = coords
      clone.coords = coords.split('-').map((v: any) => parseInt(v))
      clone.depth = depth
      arr.push(clone)
      if (item.subitems?.length) {
        item.subitems.map((v: any, i: number) => {
          fillListedRows(v, arr, coords + '-' + i, depth + 1)
        })
      }
    }

    const listedRows = computed(() => {
      let arr: any = []
      rows.value.map((v: any, i: number) => {
        fillListedRows(v, arr, i + '', 0)
      })
      return arr
    })

    const outerId = computed(() => {
      return 'of-data-table-' + ++sysDataTableIndex
    })

    const fixArrow = (el: HTMLDivElement, point_next = false) => {
      let elem = el
        ?.closest('.of-data-table-row')
        ?.querySelector('.of--align-start')
        ?.getBoundingClientRect()
      if (!elem) return
      let elem_top = elem.top
      let table_top = tableElt?.value?.getBoundingClientRect()?.top
      if (!table_top) return
      let table_scroll_top = tableElt?.value?.scrollTop
      if (table_top === undefined || table_scroll_top === undefined) return
      if (point_next) {
        arrowTop.value = elem_top + table_scroll_top - table_top + elem.height
      } else {
        arrowTop.value = elem_top + table_scroll_top - table_top
      }
    }

    const sortPopupCloseTimerId = ref()
    const sortPopupOpenTimerId = ref()
    const sortPopupChangeTimerId = ref()
    const sortPopupOpened = ref(false)
    const sortPopupTarget = ref('')
    const selectedColFields: Ref<object[]> = ref([])
    const selectLocked = ref(false)
    const sumTotals: Ref<object> = ref({})

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
          text: field.label
        }
        const itemAsc = {
          icon: 'select up',
          selected:
            sort.value.column === field.value &&
            sort.value.order === RowSortOrders.asc,
          order: RowSortOrders.asc
        }
        const itemDesc = {
          icon: 'select down',
          selected:
            sort.value.column === field.value &&
            sort.value.order === RowSortOrders.desc,
          order: RowSortOrders.desc
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
    const setSort = function (column: string, order: string) {
      sort.value.order = order
      sort.value.column = column
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
    const sumTotalColumns = computed(() => {
      const indexes: any[] = []
      props.headers?.forEach(
        (hdr, index) => hdr.sum_total && indexes.push(index)
      )
      return indexes
    })
    const perPage = computed(
      () => parseInt(props.itemsPerPage as any, 10) || 10
    )
    const page = ref(0)
    const updateSumTotal = () => {
      if (!sumTotalColumns.value.length || !items.value.length) return
      let label = ''
      const name = columns.value[0].value
      const row: any = {
        nested: null,
        draggable: false
      }
      sumTotalColumns.value.forEach((col) => {
        let values: object[] = []
        let value = 0
        const fieldName = columns.value[col].value
        items.value?.forEach((v: any) => {
          if (Array.isArray(v[fieldName])) {
            let i = 0
            v[fieldName].forEach((column: any, index: number) => {
              const fieldValue =
                typeof column?.value === 'object'
                  ? column?.rawValue ?? ''
                  : column?.value ?? ''

              if (isNaN(+fieldValue)) {
                i++
                return
              }

              if (!values[index - i]) {
                label = column?.label
                values.push({ ...column, value: +fieldValue })
              } else {
                ;(values[index - i] as any).value += +fieldValue
              }
            })
          } else {
            label = v[fieldName]?.label
            let fieldValue = v[fieldName]?.value ?? v[fieldName]

            if (typeof fieldValue === 'object')
              fieldValue = v[fieldName]?.rawValue ?? ''

            if (!isNaN(+fieldValue)) value += +fieldValue
          }
        })
        if (values.length) {
          row[fieldName] = values
        } else {
          row[fieldName] = {
            value: value || '',
            format:
              (items.value as any)[0][fieldName]?.format ??
              (items.value as any)[0][fieldName]?.totalFormat ??
              {}
          }
        }
      })
      sumTotals.value = {
        ...row,
        [name]: label || 'Total amounts',
        editable: false
      }
    }
    watch(
      () => props.page,
      (p) => (page.value = parseInt(p as string, 10) || 1), // FIXME check in range
      { immediate: true }
    )
    watch(
      () => props.items,
      (p) => (items.value = p as Record<string, any>),
      { immediate: true }
    )
    watch(
      () => sumTotalColumns.value,
      (cols) => {
        if (cols.length) {
          updateSumTotal()
        }
      },
      { immediate: true }
    )
    watch(
      () => props.items,
      () => {
        updateSumTotal()
      },
      { deep: true }
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
        '--of-table-columns': `${dragWidth} ${selectorWidth} ${widths}`
      }
    })

    const footerRows = computed(() => {
      return props.footerItems
    })

    const addRowsSelector = computed(() =>
      showSelector(props.rowsSelector, rows.value)
    )
    const selectAll = computed(() => props.selectAll)

    const orderItems = (item: any, idx: number) => {
      item.order = item.hasOwnProperty('order') ? item.order : idx
      if (item.subitems?.length) {
        item.subitems.forEach((v: any, i: number) => {
          v = orderItems(v, i)
        })
      }
      return item
    }

    const checkItems = (item: any) => {
      const selectedValues = rowsRecord.value.value
      item.selected =
        item.selected || (selectedValues && selectedValues[item.id])
          ? selectedValues[item.id]
          : !!(selectedValues && selectedValues[RowsSelectorValues.All])
      if (item.subitems?.length) {
        item.subitems.forEach((v: any, _i: number) => {
          checkItems(v)
        })
      }
      return item
    }

    const rows = computed(() => {
      const result = []
      let count = perPage.value
      let propItems: any = items.value
      for (
        let idx = iterStart.value;
        count > 0 && idx < propItems.length;
        idx++
      ) {
        let item: any = propItems[idx]
        item = orderItems(item, idx)
        result.push(item)
      }
      return result
    })

    const rowsRecord: ComputedRef<FormRecord> = computed(() => {
      let ids: any = {}

      if (selectAll.value) {
        ids = { all: true }
      } else {
        if (addRowsSelector.value) {
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
      rows,
      (newRows) => {
        for (const row of newRows) {
          checkItems(row)
        }
      },
      { deep: true }
    )

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
      const checked =
        val != RowsSelectorValues.DeselectAll &&
        val != RowsSelectorValues.DeselectPage
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
          rowsRecord.value.value = {}
          ctx.emit('rows-deselect-all')
        } else if (val == RowsSelectorValues.DeselectPage) {
          ctx.emit('rows-deselect-page')
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
        : RowsSelectorValues.DeselectPage
      selectRows(select)
    }
    const selectRowsItems = [
      {
        key: 'page',
        text: 'Select Page',
        value: () => selectRows(RowsSelectorValues.Page)
      },
      {
        key: 'all',
        text: 'Select All',
        value: () => selectRows(RowsSelectorValues.All)
      },
      {
        key: 'clear',
        text: 'Deselect All',
        value: () => selectRows(RowsSelectorValues.DeselectAll)
      }
    ]

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
      'of--density-' + density.value
    ])

    return {
      columns,
      footerRows,
      rows,
      addRowsSelector,
      draggingItem,
      rowsRecord,
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
      draggingOptions,
      dragInProgress,
      listedRows,
      tableLeft,
      currentCanBeNested,
      currentInnerDepth,
      updateRow,
      updateField,
      currentCoords,
      highlightLastMoved,
      dragEvents,
      dragLeft,
      isTouchable,
      sumTotals,
      sumTotalColumns
    }
  }
})
</script>
<style lang="scss">
.of-data-table {
  .of-data-table-row.dragging > div {
    background-color: var(--of-inverse-tint) !important;
  }
  .grab-button.draggable {
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
        pointer-events: none;
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
    & {
      user-select: none;
    }
  }
}
</style>

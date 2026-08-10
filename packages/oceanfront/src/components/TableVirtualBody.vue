<template>
  <div
    class="of-data-table-virtual-spacer"
    :style="{ height: topSpacer + 'px' }"
    aria-hidden="true"
  ></div>
  <template v-for="rowIdx in visibleIndices" :key="rowIdx">
    <of-table-row-skeleton
      v-if="!rows[rowIdx]"
      :ref="(inst: any) => registerRow(rowIdx, inst)"
      :columns="columns"
      :rows-selector="rowsSelector"
      :draggable="!!dragInfo?.draggable"
      :row-index="rowIdx"
    />
    <of-table-row
      v-else
      :ref="(inst: any) => registerRow(rowIdx, inst)"
      :row="rows[rowIdx]"
      :drag-info="dragInfo"
      :coords="[rowIdx]"
      :point-next="[rowIdx + 1]"
      v-on="dragEvents"
      :rows-selector="rowsSelector"
      :select-locked="selectLocked"
      :edit-type="editType"
      :editable="editable"
      :show-old-values="showOldValues"
      :columns="columns"
      :rows-record="rowsRecord"
      :idx="rowIdx"
      :is-touchable="isTouchable"
      @update:row="$emit('update:row', $event)"
      @update:field="$emit('update:field')"
    >
      <template #rows-selector>
        <slot name="rows-selector" :record="rowsRecord" :item="rows[rowIdx]" />
      </template>
      <template #first-cell>
        <slot name="first-cell" :record="rowsRecord" :item="rows[rowIdx]" />
      </template>
    </of-table-row>
  </template>
  <div
    class="of-data-table-virtual-spacer"
    :style="{ height: bottomSpacer + 'px' }"
    aria-hidden="true"
  ></div>
</template>

<script lang="ts">
import {
  ComponentPublicInstance,
  PropType,
  computed,
  defineComponent,
  onBeforeUnmount
} from 'vue'
import { DataTableHeader } from '../lib/datatable'
import { FormRecord } from '../lib/records'
import OfTableRow from './TableRow.vue'
import OfTableRowSkeleton from './TableRowSkeleton.vue'

/** Virtual-scroll body: spacers + visible real/skeleton rows. */
export default defineComponent({
  name: 'OfTableVirtualBody',
  components: { OfTableRow, OfTableRowSkeleton },
  props: {
    rows: { type: Array as PropType<any[]>, required: true },
    columns: {
      type: Array as PropType<DataTableHeader[]>,
      required: true
    },
    rangeStart: { type: Number, required: true },
    rangeEnd: { type: Number, required: true },
    topSpacer: { type: Number, required: true },
    bottomSpacer: { type: Number, required: true },
    dragInfo: { type: Object as PropType<Record<string, any>>, required: true },
    dragEvents: { type: Object, required: true },
    rowsSelector: Boolean,
    selectLocked: Boolean,
    editType: { type: String, default: 'inline' },
    editable: Boolean,
    showOldValues: Boolean,
    rowsRecord: {
      type: Object as PropType<FormRecord>,
      required: true
    },
    isTouchable: Boolean,
    /** Feeds each rendered row's real height back to the height cache. */
    reportRowHeight: {
      type: Function as PropType<(index: number, height: number) => void>,
      required: true
    }
  },
  emits: ['update:row', 'update:field'],
  setup(props) {
    const visibleIndices = computed(() => {
      const start = props.rangeStart
      const count = Math.max(0, props.rangeEnd - start)
      const indices = new Array<number>(count)
      for (let i = 0; i < count; i++) indices[i] = start + i
      return indices
    })

    // Rows are `display: contents` (see _tables.scss), so measure the first
    // cell — CSS Grid stretches every cell in a row to the same track
    // height by default, so any one cell's height equals the row's height.
    const rowEls = new Map<number, Element>()
    const elIndices = new WeakMap<Element, number>()

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            for (const entry of entries) {
              const rowIdx = elIndices.get(entry.target)
              if (rowIdx === undefined) continue
              const height =
                entry.borderBoxSize?.[0]?.blockSize ??
                entry.target.getBoundingClientRect().height
              if (height > 0) props.reportRowHeight(rowIdx, height)
            }
          })
        : undefined

    const registerRow = (
      rowIdx: number,
      inst: ComponentPublicInstance | Element | null
    ) => {
      const prevEl = rowEls.get(rowIdx)
      if (prevEl) {
        resizeObserver?.unobserve(prevEl)
        elIndices.delete(prevEl)
        rowEls.delete(rowIdx)
      }
      if (!inst) return
      const rootEl = ((inst as ComponentPublicInstance).$el ??
        inst) as HTMLElement
      const cell = rootEl?.querySelector?.('[role="cell"]')
      if (!cell) return
      rowEls.set(rowIdx, cell)
      elIndices.set(cell, rowIdx)
      resizeObserver?.observe(cell)
    }

    onBeforeUnmount(() => resizeObserver?.disconnect())

    return { visibleIndices, registerRow }
  }
})
</script>

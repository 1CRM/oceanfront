<template>
  <div
    class="of-data-table-virtual-spacer"
    :style="{ height: topSpacer + 'px', gridColumn: '1 / -1' }"
    aria-hidden="true"
  ></div>
  <template v-for="rowIdx in visibleIndices" :key="rowIdx">
    <of-table-row-skeleton
      v-if="forceSkeleton || !rows[rowIdx]"
      :columns="columns"
      :rows-selector="rowsSelector"
      :draggable="!!dragInfo?.draggable"
      :row-index="rowIdx"
      :height="rowHeightAt(rowIdx)"
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
    :style="{ height: bottomSpacer + 'px', gridColumn: '1 / -1' }"
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

/**
 * Virtual-scroll body: spacers + the rows of the current window, addressed by
 * absolute index. An index without data renders a skeleton sized to that row's
 * remembered height, so a window may be all skeletons without the body
 * changing height. During a true fling (`forceSkeleton`) every index is a
 * cheap skeleton so the viewport stays filled without rebuilding formatted
 * rows; ordinary scrolling always shows loaded data as real rows.
 *
 * Only real rows are measured — measuring placeholders would feed their
 * fallback height back into the height store.
 */
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
    /** Feeds each rendered row's real height back to the height store. */
    reportRowHeight: {
      type: Function as PropType<(index: number, height: number) => void>,
      required: true
    },
    /** Remembered height for an index, used to size skeleton placeholders. */
    rowHeightAt: {
      type: Function as PropType<(index: number) => number>,
      required: true
    },
    /**
     * True fling only: show skeletons for every index even when row data is
     * present, so the viewport stays filled without mounting expensive rows.
     */
    forceSkeleton: Boolean
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

    /**
     * The row's own element. A row that renders nested sub-rows has several
     * root nodes, and `$el` is then the fragment's anchor text node rather than
     * the row — hence `itemRef`, which the row exposes for exactly this. `$el`
     * still covers single-root rows.
     */
    const rowElementOf = (inst: ComponentPublicInstance): Element | null => {
      const exposed = (inst as unknown as { itemRef?: unknown }).itemRef
      if (exposed instanceof Element) return exposed
      const rootEl = inst.$el
      return rootEl instanceof Element ? rootEl : null
    }

    const measureTarget = (
      inst: ComponentPublicInstance | Element | null
    ): Element | null => {
      if (!inst) return null
      const rowEl = inst instanceof Element ? inst : rowElementOf(inst)
      if (!rowEl) return null
      return rowEl.querySelector('[role="cell"]') ?? rowEl
    }

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
      const cell = measureTarget(inst)
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

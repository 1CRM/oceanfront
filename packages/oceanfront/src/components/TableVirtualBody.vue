<template>
  <div
    class="of-data-table-virtual-spacer"
    :style="{ height: topSpacer + 'px', gridColumn: '1 / -1' }"
    aria-hidden="true"
  ></div>
  <template
    v-for="(rowIdx, slotIdx) in visibleIndices"
    :key="isFastScrolling ? slotIdx : rowIdx"
  >
    <of-table-row-skeleton
      v-if="isFastScrolling || !rows[rowIdx]"
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
 * Virtual-scroll body: spacers + the current window, by absolute index.
 * Missing rows (and every row while flinging) render as skeletons.
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
    /** While flinging, show skeletons even when row data is present. */
    isFastScrolling: Boolean
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

    const rowCells = new Map<number, Element[]>()
    const elIndices = new WeakMap<Element, number>()

    const cellHeight = (el: Element, entry?: ResizeObserverEntry) =>
      entry?.borderBoxSize?.[0]?.blockSize ??
      el.getBoundingClientRect().height

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const entryHeight = new Map<Element, number>()
            const affected = new Set<number>()
            for (const entry of entries) {
              const rowIdx = elIndices.get(entry.target)
              if (rowIdx === undefined) continue
              affected.add(rowIdx)
              entryHeight.set(entry.target, cellHeight(entry.target, entry))
            }
            for (const rowIdx of affected) {
              const cells = rowCells.get(rowIdx) ?? []
              let height = 0
              for (const cell of cells) {
                const h =
                  entryHeight.get(cell) ?? cell.getBoundingClientRect().height
                if (h > height) height = h
              }
              if (height > 0) props.reportRowHeight(rowIdx, height)
            }
          })
        : undefined

    const rowElementOf = (inst: ComponentPublicInstance): Element | null => {
      const exposed = (inst as unknown as { itemRef?: unknown }).itemRef
      if (exposed instanceof Element) return exposed
      const rootEl = inst.$el
      return rootEl instanceof Element ? rootEl : null
    }

    const measureTargets = (rowEl: Element): Element[] => {
      const cells = [...rowEl.querySelectorAll('[role="cell"]')]
      return cells.length ? cells : [rowEl]
    }

    const sameElements = (a: Element[], b: Element[]) =>
      a.length === b.length && a.every((el, i) => el === b[i])

    const registerRow = (
      rowIdx: number,
      inst: ComponentPublicInstance | Element | null
    ) => {
      const rowEl = inst
        ? inst instanceof Element
          ? inst
          : rowElementOf(inst)
        : null
      const cells = rowEl ? measureTargets(rowEl) : []
      const prevEls = rowCells.get(rowIdx)
      if (prevEls && sameElements(prevEls, cells)) return
      if (prevEls) {
        for (const el of prevEls) {
          resizeObserver?.unobserve(el)
          elIndices.delete(el)
        }
        rowCells.delete(rowIdx)
      }
      if (!cells.length) return
      rowCells.set(rowIdx, cells)
      for (const cell of cells) {
        elIndices.set(cell, rowIdx)
        resizeObserver?.observe(cell)
      }
    }

    onBeforeUnmount(() => resizeObserver?.disconnect())

    return { visibleIndices, registerRow }
  }
})
</script>

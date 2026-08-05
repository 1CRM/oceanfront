<template>
  <div
    class="of-data-table-virtual-spacer"
    :style="{ height: topSpacer + 'px' }"
    aria-hidden="true"
  ></div>
  <template v-for="rowIdx in visibleIndices" :key="rowIdx">
    <of-table-row-skeleton
      v-if="!rows[rowIdx]"
      :columns="columns"
      :rows-selector="rowsSelector"
      :draggable="!!dragInfo?.draggable"
      :row-index="rowIdx"
    />
    <of-table-row
      v-else
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
import { PropType, computed, defineComponent } from 'vue'
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
    isTouchable: Boolean
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
    return { visibleIndices }
  }
})
</script>

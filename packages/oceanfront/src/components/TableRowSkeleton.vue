<template>
  <div
    class="of-data-table-row of-data-table-row-skeleton"
    role="row"
    aria-hidden="true"
  >
    <div v-if="draggable" role="cell"></div>
    <div v-if="rowsSelector" role="cell"></div>
    <div
      v-for="(col, colidx) of columns"
      role="cell"
      :class="col.class"
      :key="colidx"
    >
      <span
        class="of-table-skeleton-bar"
        :style="{ width: skeletonBarWidth(colidx) }"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { DataTableHeader } from '../lib/datatable'

// Cosmetic: avoids a uniform "striped" look across skeleton rows.
const widthCycle = ['85%', '60%', '72%', '45%', '90%']

export default defineComponent({
  name: 'OfTableRowSkeleton',
  props: {
    columns: {
      type: Array as PropType<DataTableHeader[]>,
      default: () => []
    },
    rowsSelector: Boolean,
    draggable: Boolean,
    rowIndex: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const skeletonBarWidth = (colIdx: number): string =>
      widthCycle[(props.rowIndex + colIdx) % widthCycle.length]

    return { skeletonBarWidth }
  }
})
</script>

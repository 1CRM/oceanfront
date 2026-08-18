<template>
  <div
    class="of-data-table-row of-data-table-row-skeleton"
    role="row"
    aria-hidden="true"
    :style="rowStyle"
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
import { computed, defineComponent, PropType } from 'vue'
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
    },
    /** Height this row measured before its data was dropped, if known. */
    height: {
      type: Number,
      default: undefined
    }
  },
  setup(props) {
    const skeletonBarWidth = (colIdx: number): string =>
      widthCycle[(props.rowIndex + colIdx) % widthCycle.length]

    const rowStyle = computed(() =>
      props.height ? { '--of-row-height': props.height + 'px' } : undefined
    )

    return { skeletonBarWidth, rowStyle }
  }
})
</script>

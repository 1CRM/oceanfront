<template>
  <table class="of-data-table">
    <colgroup>
      <col v-for="col of columns" />
    </colgroup>
    <thead>
      <tr>
        <th v-for="col of columns" :class="col.class">
          {{ col.text }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row of rows">
        <td v-for="col of columns" :class="col.class">
          <!-- of-format :type="col.format" :value="row[col.value]" / -->
          {{ row[col.value] }}
        </td>
      </tr>
    </tbody>
    <tfoot v-if="footerRows.length">
      <tr v-for="row of footerRows">
        <td v-for="col of columns" :class="col.class">
          <of-format :type="col.format" :value="row[col.value]" />
        </td>
      </tr>
    </tfoot>
  </table>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch, PropType } from 'vue'
import { DataTableHeader } from '../lib/datatable'
import { useFormats } from '../lib/formats'
// import OfFormat from './Format'

export default defineComponent({
  name: 'of-data-table',
  // components: { OfFormat },
  props: {
    footerItems: { type: Array, default: [] },
    headers: { type: Array, default: [] } as object &
      PropType<DataTableHeader[]>,
    items: { type: Array, default: [] } as object &
      PropType<Record<string, any>>,
    itemsCount: [String, Number],
    itemsPerPage: [String, Number],
    page: [String, Number]
  },
  setup(props, ctx) {
    const fmtMgr = useFormats()
    const columns = computed(() => {
      const cols: any[] = []
      for (const hdr of props.headers as DataTableHeader[]) {
        const format = fmtMgr.getTextFormatter(hdr.format)
        const align = hdr.align || (format && format.align)
        const cls = ['of--text-' + (align || 'start'), hdr.class]
        cols.push(Object.assign({}, hdr, { format, align, class: cls }))
      }
      return cols
    })
    const perPage = computed(
      () => parseInt(props.itemsPerPage as any, 10) || 10
    )
    const page = ref(0)
    const pageCount = computed(() => {
      let count = parseInt(props.itemsCount ?? props.items?.length, 10) || 0
      return Math.ceil(count / perPage.value)
    })
    watch(
      () => props.page,
      p => (page.value = parseInt(p as string, 10) || 1), // FIXME check in range
      { immediate: true }
    )
    const iterStart = computed(() => {
      if (props.itemsCount != null) return 0 // external navigation
      return Math.max(0, perPage.value * (page.value - 1))
    })
    const rows = computed(() => {
      const result = []
      let count = perPage.value
      let propItems = props.items || []
      for (
        let idx = iterStart.value;
        count > 0 && idx < propItems.length;
        idx++
      ) {
        result.push(propItems[idx])
      }
      return result
    })
    const footerRows = computed(() => {
      return props.footerItems
    })
    return {
      columns,
      footerRows,
      rows
    }
  }
})
</script>
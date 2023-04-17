<template>
  <div class="container">
    <h1>Data Tables</h1>
    <of-field
      v-model="params.density"
      label="Density"
      type="select"
      :items="densityOptions"
    />
    <of-field
      v-model="params.draggable"
      label="Draggable"
      type="select"
      :items="draggableOptions"
    />

    <div class="row">
      <div class="column">
        <of-data-table
          :density="params.density"
          :headers="headers"
          :draggable="params.draggable === 'On'"
          :items="items"
          :footer-items="footerItems"
        />
      </div>
    </div>
    <div class="row">
      <div class="column">
        <of-data-table
          rows-selector
          :density="params.density"
          :draggable="params.draggable === 'On'"
          @rows-selected="onRowsSelected"
          @rows-sorted="onRowsSorted"
          :headers="headers2"
          :items="items2"
          :footer-items="footerItems"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue'

const densityOptions = ['default', '0', '1', '2', '3']
const draggableOptions = ['Off', 'On']

const params = reactive({
  density: 'default',
  draggable: 'Off'
})

export default defineComponent({
  setup() {
    const headers = [
      {
        text: 'Name',
        value: 'name',
        divider: true,
        width: '150px',
        sortable: false,
      },
      { text: 'Category', value: 'category', sortable: false },
      { text: 'Size', value: 'size', align: 'end', sortable: false },
    ]
    const items = [
      {
        name: 'First item',
        category: {
          value: 'Category 1',
          format: 'link',
          params: {
            href: 'https://1crm.com',
          },
        },
        size: {
          value: 15.56,
          format: 'currency',
          params: {
            symbol: '&#36;',
          },
        },
      },
      {
        name: 'Second item',
        category: {
          value: 'Category 2',
          format: 'link',
          params: {
            to: 'tabs',
          },
        },
        size: {
          value: -15.56,
          format: 'currency',
          params: {
            symbol: '&#36;',
          },
        },
      },
      {
        name: 'Third item',
        category: 'Category 3',
        size: 15125.56,
      },
    ]

    const headers2 = [
      {
        text: 'Name',
        value: 'name',
        divider: true,
        width: '150px',
        sort: 'desc',
        extra_sort_fields: [
          { label: 'Address', value: 'address' },
          { label: 'Phone', value: 'phone' },
        ],
      },
      { text: 'Category', value: 'category' },
      { text: 'Address', value: 'address', sortable: false },
      { text: 'Phone', value: 'phone', sortable: false },
      { text: 'Size', value: 'size', align: 'end', sort: 'asc' },
    ]
    const items2 = ref([
      {
        id: '1',
        name: 'First item',
        category: 'Category 1',
        address: 'Aram Khachatryan 12/2 , Yerevan, Armenia',
        phone: '+1 (961) 209-1256',
        size: 15.56,
      },
      {
        id: '2',
        name: 'Second item',
        category: 'Category 2',
        address: 'San Francisco, CA, USA',
        phone: '+1 (416) 269-0823',
        size: -15.56,
      },
      {
        id: '3',
        name: 'Third item',
        category: 'Category 3',
        address: 'Orléans, CA, USA',
        phone: '+1 (125) 853-7161',
        size: 15125.56,
      },
      {
        id: '4',
        name: 'Fourth item',
        category: 'Category 4',
        address: 'New York, NY, USA',
        phone: '+1 (041) 102-0224',
        size: 45.56,
      },
      {
        id: '5',
        name: 'Fifth item',
        category: 'Category 5',
        address: 'Lisbon, CA, USA ',
        phone: '+1 (041) 102-0224',
        size: 45.56,
      },
      {
        id: '6',
        name: 'Sixth item',
        category: 'Category 6',
        address: 'Glendale, LA, USA',
        phone: '+1 (041) 102-0224',
        size: 45.56,
      },
      {
        id: '7',
        name: 'Seventh item',
        category: 'Category 7',
        address: 'New York, NY, USA',
        phone: '+1 (041) 102-0224',
        size: 45.56,
      }
    ])

    const initialItems2 = [...items2.value]
    const footerItems = [{ size: 100.5 }]
    const onRowsSelected = function (values: any) {
      console.log(values)
    }

    const onRowsSorted = function (sort: { column: string; order: string }) {
      if (sort.order == '') {
        items2.value = [...initialItems2]
      } else {
        if (sort.column == 'size') {
          items2.value.sort((a, b) => (a.size > b.size ? 1 : -1))
        } else {
          items2.value.sort(function (x, y) {
            let a = x[sort.column as keyof typeof y].toString().toUpperCase(),
              b = y[sort.column as keyof typeof y].toString().toUpperCase()
            return a == b ? 0 : a > b ? 1 : -1
          })
        }
        if (sort.order == 'desc') {
          items2.value.reverse()
        }
      }
    }

    return {
      headers,
      headers2,
      items,
      items2,
      footerItems,
      onRowsSelected,
      onRowsSorted,
      params,
      densityOptions,
      draggableOptions,
    }
  },
})
</script>

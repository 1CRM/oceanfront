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

    <of-field
      v-model="params.nested"
      label="Nested"
      :disabled="params.draggable === 'Off'"
      type="select"
      :items="nestedOptions"
    />
    <of-field
      v-model="params.editable"
      label="Editable"
      type="select"
      :items="editableOptions"
    />
    <of-field
      v-model="params.editType"
      label="Edit Type"
      :disabled="params.editable === 'Off'"
      type="select"
      :items="editOptions"
    />
    <of-field
      v-model="params.showOldValues"
      label="Show Original Value"
      :disabled="params.editable === 'Off'"
      type="select"
      :items="oldValuesOptions"
    />

    <div class="row">
      <div class="column">
        <h3>Data Table</h3>

        <of-data-table
          rows-selector
          :editable="params.editable === 'On'"
          :draggable="params.draggable === 'On'"
          :drag-options="{
            nestedLimit: 5,
            nested: true,
            allNested: true,
            allParent: true,
          }"
          :nested="params.nested === 'Nested'"
          :edit-type="params.editType"
          :show-old-values="params.showOldValues === 'Show'"
          @rows-selected="onRowsSelected"
          @rows-moved="OnRowsMoved"
          @rows-sorted="onRowsSorted"
          @rows-edited="onRowsEdited"
          :headers="universalHeaders"
          :items="universalItems"
          :footer-items="footerItems"
        />
      </div>
    </div>
    <div class="row">
      <div class="column">
        <h3>Editable Data Table</h3>
        <of-data-table
          rows-selector
          :nested="params.nested === 'Nested'"
          editable
          :edit-type="params.editType"
          :show-old-values="params.showOldValues === 'Show'"
          :density="params.density"
          :draggable="params.draggable === 'On'"
          @rows-selected="onRowsSelected"
          @rows-moved="OnRowsMoved"
          @rows-sorted="onRowsSorted"
          @rows-edited="onRowsEdited"
          :headers="editableHeaders"
          :items="editableItems"
          :footer-items="footerItems"
        />
      </div>
    </div>
    <div class="row">
      <div class="column">
        <h3>Draggable Data Table</h3>
        <of-data-table
          draggable
          @rows-sorted="onRowsSorted"
          :headers="draggableHeaders"
          :items="draggableItems"
          :footer-items="footerItems"
        />
      </div>
    </div>
    <div class="row">
      <div class="column">
        <h3>Draggable Data Table Unlimit Nested</h3>
        <of-data-table
          draggable
          :drag-options="{
            nestedLimit: 10,
            nested: true,
            allNested: true,
            allParent: true,
          }"
          editable
          @rows-sorted="onRowsSorted"
          :headers="newDraggableHeaders"
          :items="newDraggableItems"
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
const nestedOptions = ['Default', 'Nested']
const editableOptions = ['Off', 'On']
const editOptions = [
  { text: 'Inline', value: 'inline' },
  { text: 'Popup', value: 'popup' },
]
const oldValuesOptions = ['Hide', 'Show']

const params = reactive({
  density: 'default',
  draggable: 'Off',
  nested: 'Default',
  editable: 'Off',
  editType: 'inline',
  showOldValues: 'Hide',
})

export default defineComponent({
  setup() {
    const categoryOptions = [
      'Category 1',
      'Category 2',
      'Category 3',
      'Category 4',
    ]
    const universalHeaders = [
      {
        text: 'Name',
        value: 'name',
        divider: true,
        width: '150px',
        sortable: false,
      },
      { text: 'Category', value: 'category', sortable: false },
      { text: 'Date & Time', value: 'datetime', sortable: false },
      { text: 'Amount', value: 'amount', sortable: false },
      { text: 'Size', value: 'size', align: 'end', sortable: false },
    ]

    const universalItems = ref([
      {
        name: { value: 'First item', editable: true },
        id: '1',
        amount: { value: 10, editable: true, type: 'number' },
        datetime: {
          editable: true,
          value: '2022-06-17 12:44:44',
          type: 'datetime',
        },
        draggable: true,
        category: {
          value: 'Category 1',
          type: 'select',
          items: categoryOptions,
          editable: true,
        },
        size: { value: 15.56, format: 'currency', params: { symbol: '&#36;' } },
      },
      {
        draggable: true,
        id: '2',
        amount: { value: 40, editable: true, type: 'number' },
        name: { value: 'Second item', editable: true },
        category: {
          value: 'Category 2',
          type: 'select',
          items: categoryOptions,
          editable: true,
        },
        datetime: {
          editable: true,
          value: '2021-06-17 12:20:00',
          type: 'datetime',
        },
        size: {
          value: -15.56,
          format: 'currency',
          params: { symbol: '&#36;' },
        },
      },
      {
        id: '3',
        draggable: true,
        amount: { value: 100, editable: true, type: 'number' },
        name: { value: 'Third item', editable: true },
        category: {
          value: 'Category 3',
          type: 'select',
          items: categoryOptions,
          editable: true,
        },
        datetime: {
          editable: true,
          value: '2023-08-13 22:14:00',
          type: 'datetime',
        },
        size: 15125.56,
      },
      {
        id: '4',
        draggable: true,
        amount: { value: 45, editable: true, type: 'number' },
        name: { value: 'Fourth item', editable: true },
        category: {
          value: 'Category 4',
          type: 'select',
          items: categoryOptions,
          editable: true,
        },
        datetime: {
          editable: true,
          value: '2020-13-20 11:11:11',
          type: 'datetime',
        },
        size: 15125.56,
      },
      {
        id: '5',
        draggable: true,
        amount: { value: 45, editable: true, type: 'number' },
        name: { value: 'Fourth item', editable: true },
        category: {
          value: 'Category 4',
          type: 'select',
          items: categoryOptions,
          editable: true,
        },
        datetime: {
          editable: true,
          value: '2020-13-20 11:11:11',
          type: 'datetime',
        },
        size: 15125.56,
      },
      {
        id: '6',
        draggable: true,
        amount: { value: 45, editable: true, type: 'number' },
        name: { value: 'Fourth item', editable: true },
        category: {
          value: 'Category 4',
          type: 'select',
          items: categoryOptions,
          editable: true,
        },
        datetime: {
          editable: true,
          value: '2020-13-20 11:11:11',
          type: 'datetime',
        },
        size: 15125.56,
      },
    ])
    const editableHeaders = [
      { text: 'Text', value: 'text', sortable: false },
      { text: 'Number', value: 'number', sortable: false },
      { text: 'Select', value: 'select', sortable: false },
      { text: 'Toggle', value: 'toggle', sortable: false },
      { text: 'Date', value: 'date', sortable: false },
      { text: 'Time', value: 'time', sortable: false },
      { text: 'Date & Time', value: 'datetime', sortable: false },
    ]
    const editableItems = [
      {
        text: { editable: true, type: 'text', value: 'Text 1' },
        number: { editable: true, type: 'number', value: '100' },
        toggle: { editable: true, type: 'toggle', value: true },
        date: { editable: true, type: 'date', value: '2021-01-01' },
        time: { editable: true, type: 'time', value: '15:15:15' },
        datetime: {
          editable: true,
          type: 'datetime',
          value: '2021-01-01 15:15:15',
        },
        select: {
          editable: true,
          type: 'select',
          value: 'Select 1',
          items: ['Select 1', 'Select 2', 'Select 3', 'Select 4'],
        },
      },
      {
        text: { editable: true, type: 'text', value: 'Text 2' },
        number: { editable: true, type: 'number', value: '200' },
        toggle: { editable: true, type: 'toggle', value: false },
        date: { editable: true, type: 'date', value: '2022-02-02' },
        time: { editable: true, type: 'time', value: '16:16:16' },
        datetime: {
          editable: true,
          type: 'datetime',
          value: '2022-02-02 16:16:16',
        },
        select: {
          editable: true,
          type: 'select',
          value: 'Select 2',
          items: ['Select 1', 'Select 2', 'Select 3', 'Select 4'],
        },
      },
      {
        text: { editable: true, type: 'text', value: 'Text 3' },
        number: { editable: true, type: 'number', value: '300' },
        toggle: { editable: true, type: 'toggle', value: true },
        date: { editable: true, type: 'date', value: '2023-03-03' },
        time: { editable: true, type: 'time', value: '17:17:17' },
        datetime: {
          editable: true,
          type: 'datetime',
          value: '2023-03-03 17:17:17',
        },
        select: {
          editable: true,
          type: 'select',
          value: 'Select 3',
          items: ['Select 1', 'Select 2', 'Select 3', 'Select 4'],
        },
      },
      {
        text: { editable: true, type: 'text', value: 'Text 4' },
        number: { editable: true, type: 'number', value: '400' },
        toggle: { editable: true, type: 'toggle', value: false },
        date: { editable: true, type: 'date', value: '2024-04-04' },
        time: { editable: true, type: 'time', value: '18:18:18' },
        datetime: {
          editable: true,
          type: 'datetime',
          value: '2024-04-04 18:18:18',
        },
        select: {
          editable: true,
          type: 'select',
          value: 'Select 4',
          items: ['Select 1', 'Select 2', 'Select 3', 'Select 4'],
        },
      },
    ]

    const draggableHeaders = [
      {
        text: 'Name',
        value: 'name',
        divider: true,
        sort: 'desc',
        extra_sort_fields: [
          { label: 'Address', value: 'address' },
          { label: 'Phone', value: 'phone' },
        ],
      },
      { text: 'Category', value: 'category' },
      { text: 'Address', value: 'address', sortable: false },
      { text: 'Phone', value: 'phone', sortable: false },
      { text: 'Amount', value: 'amount', sortable: false },
      { text: 'Size', value: 'size', align: 'end', sort: 'asc' },
    ]
    const newDraggableHeaders = [
      {
        text: 'Name',
        value: 'name',
        divider: true,
        sort: 'desc',
        extra_sort_fields: [
          { label: 'Address', value: 'address' },
          { label: 'Phone', value: 'phone' },
        ],
      },
      { text: 'Category', value: 'category' },
      { text: 'Address', value: 'address', sortable: false },
    ]
    const draggableItems = [
      {
        name: 'First item',
        draggable: true,
        category: 'Category 1',
        address: 'New York, NY, USA',
        amount: 100,
        phone: '+1 (961) 209-1256',
        size: 15.56,
      },
      {
        draggable: true,
        name: 'Second item',
        amount: 150,
        category: 'Category 2',
        address: 'San Francisco, CA, USA',
        phone: '+1 (416) 269-0823',
        size: -15.56,
      },
      {
        id: '3',
        name: { value: 'Third item', editable: true },
        amount: 16,
        category: 'Category 3',
        draggable: true,
        address: 'Orléans, CA, USA',
        phone: '+1 (125) 853-7161',
        size: 15125.56,
      },
      {
        id: '4',
        name: 'Fourth item',
        draggable: true,
        category: 'Category 4',
        address: 'New York, NY, USA',
        phone: '+1 (041) 102-0224',
        amount: 1500,
        size: 45.56,
      },
      {
        id: '5',
        name: 'Fifth item',
        category: 'Category 5',
        draggable: true,
        address: 'Lisbon, CA, USA ',
        phone: '+1 (041) 102-0224',
        size: 12.55,
        amount: 200,
      },
    ]

    const newDraggableItems = [
      {
        name: 'parent nested 1',
        draggable: true,
        nested: true,
        parent: true,
        category: 'Category 1',
        address: 'New York, NY, USA',
        amount: 100,
        phone: '+1 (961) 209-1256',
        size: 15.56,
        subitems: [
          {
            draggable: true,
            name: 'nested 2',
            amount: 150,
            nested: true,
            category: 'Category 2',
            address: 'San Francisco, CA, USA',
            phone: '+1 (416) 269-0823',
            size: -15.56,
          },
          {
            draggable: true,
            name: 'nested 3',
            amount: 150,
            nested: true,
            category: 'Category 2',
            address: 'San Francisco, CA, USA',
            phone: '+1 (416) 269-0823',
            size: -15.56,
          },
          {
            draggable: true,
            name: 'parent 4',
            amount: 150,
            parent: true,
            category: 'Category 2',
            address: 'San Francisco, CA, USA',
            phone: '+1 (416) 269-0823',
            size: -15.56,
          },
        ],
      },
      {
        draggable: true,
        name: 'parent 6',
        parent: true,
        amount: 150,
        category: 'Category 2',
        address: 'San Francisco, CA, USA',
        phone: '+1 (416) 269-0823',
        subitems: [
          {
            draggable: true,
            name: 'parent nested',
            amount: 150,
            parent: true,
            nested: true,
            category: 'Category 2',
            address: 'San Francisco, CA, USA',
            phone: '+1 (416) 269-0823',
            size: -15.56,
          },
          {
            draggable: true,
            name: 'Draggable 2',
            amount: 150,
            category: 'Category 2',
            address: 'San Francisco, CA, USA',
            phone: '+1 (416) 269-0823',
            size: -15.56,
          },
          {
            draggable: true,
            name: 'Draggable -n',
            amount: 150,
            nested: true,
            category: 'Category 2',
            address: 'San Francisco, CA, USA',
            phone: '+1 (416) 269-0823',
            size: -15.56,
          },
        ],
        size: -15.56,
      },
      {
        draggable: true,
        name: 'Draggable',
        amount: 150,
        category: 'Category 2',
        address: 'San Francisco, CA, USA',
        phone: '+1 (416) 269-0823',
        size: -15.56,
      },
      {
        draggable: true,
        name: 'Draggable 2',
        amount: 150,
        category: 'Category 2',
        address: 'San Francisco, CA, USA',
        phone: '+1 (416) 269-0823',
        size: -15.56,
      },
      {
        draggable: true,
        name: 'Draggable -n',
        amount: 150,
        nested: true,
        category: 'Category 2',
        address: 'San Francisco, CA, USA',
        phone: '+1 (416) 269-0823',
        size: -15.56,
      },
      {
        draggable: true,
        name: 'Draggable -pn',
        parent: true,
        nested: true,
        amount: 150,
        category: 'Category 2',
        address: 'San Francisco, CA, USA',
        phone: '+1 (416) 269-0823',
        size: -15.56,
      },
      {
        draggable: true,
        name: 'Second item',
        amount: 150,
        category: 'Category 2',
        address: 'San Francisco, CA, USA',
        phone: '+1 (416) 269-0823',
        size: -15.56,
      },
      {
        id: '3',
        name: 'Third item',
        amount: 16,
        category: 'Category 3',
        draggable: true,
        address: 'Orléans, CA, USA',
        phone: '+1 (125) 853-7161',
        size: 15125.56,
      },
      {
        id: '4',
        name: 'Fourth item',
        draggable: true,
        category: 'Category 4',
        address: 'New York, NY, USA',
        phone: '+1 (041) 102-0224',
        amount: 1500,
        size: 45.56,
      },
      {
        id: '5',
        name: 'Fifth item',
        category: 'Category 5',
        draggable: true,
        address: 'Lisbon, CA, USA ',
        phone: '+1 (041) 102-0224',
        size: 12.55,
        amount: 200,
      },
      {
        id: '6',
        name: 'Sixth item',
        category: 'Category 6',
        draggable: true,
        address: 'Lisbon, CA, USA ',
        phone: '+1 (041) 102-0224',
        size: 12.55,
        amount: 200,
      },
    ]

    const initialItems2 = [...universalItems.value]
    const footerItems = [{ size: 100.5 }]
    const onRowsSelected = function (values: any) {
      console.log(values)
    }
    const OnRowsMoved = function (values: any) {
      console.log('OnRowsMoved', values)
    }

    const onRowsSorted = function (sort: { column: string; order: string }) {
      if (sort.order == '') {
        universalItems.value = [...initialItems2]
      } else {
        if (sort.column == 'size') {
          universalItems.value.sort((a, b) => (a.size > b.size ? 1 : -1))
        } else {
          universalItems.value.sort(function (x, y) {
            let a = x[sort.column as keyof typeof y].toString().toUpperCase(),
              b = y[sort.column as keyof typeof y].toString().toUpperCase()
            return a == b ? 0 : a > b ? 1 : -1
          })
        }
        if (sort.order == 'desc') {
          universalItems.value.reverse()
        }
      }
    }
    const onRowsEdited = (rows: []) => {
      console.log('rows edited ', rows)
    }

    return {
      universalHeaders,
      draggableHeaders,
      newDraggableHeaders,
      editableHeaders,
      editableItems,
      universalItems,
      draggableItems,
      newDraggableItems,
      footerItems,
      onRowsSelected,
      onRowsEdited,
      OnRowsMoved,
      onRowsSorted,
      params,
      densityOptions,
      draggableOptions,
      nestedOptions,
      editableOptions,
      editOptions,
      oldValuesOptions,
    }
  },
})
</script>

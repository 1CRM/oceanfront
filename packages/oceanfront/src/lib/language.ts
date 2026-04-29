import { computed, ComputedRef, Ref, ref } from 'vue'

const defaults = {
  selectFieldAddItems: 'Add Items',
  selectFieldRemoveItems: 'Remove Items',
  listNoItems: 'No Items',
  remove: 'Remove Item',
  startAt: 'Start At',
  perPage: 'Per Page',
  update: 'Update',

  selectComboboxFallback: ' ',

  pagination: 'Pagination',
  paginationGoToFirst: 'Go To First',
  paginationPage: 'Page',
  paginationGoToLast: 'Go To Last',
  paginationExpand: 'Expand',

  dataTableReorderRows: 'Reorder rows',
  dataTableRowSelection: 'Row selection',
  dataTableSelectPage: 'Select Page',
  dataTableSelectAll: 'Select All',
  dataTableDeselectAll: 'Deselect All',
  dataTableTotalAmounts: 'Total amounts',
  dataTableColumnAriaActiveAscending:
    '{column}. Table is sorted by this column in ascending order. Press to change.',
  dataTableColumnAriaActiveDescending:
    '{column}. Table is sorted by this column in descending order. Press to change.',
  dataTableColumnAriaInactive: '{column}. Press to sort by this column.',
  dataTableSortAnnouncedAscending: 'Table sorted by {column}, ascending.',
  dataTableSortAnnouncedDescending: 'Table sorted by {column}, descending.',

  tableRowDragToReorder: 'Drag to reorder',
  tableRowSelector: 'Row Selector',
  tableRowNestedUnderParent: 'Nested under parent row',
  tableColumn: 'Column',

  tabsScrollLeft: 'Scroll tabs left',
  tabsScrollRight: 'Scroll tabs right',

  optionListClearSearch: 'Clear search',

  spinnerLoading: 'Loading',

  dialogClose: 'Close',

  kanbanSearchPlaceholder: 'Search by keyword...',
  kanbanClearFilters: 'Clear filters',
  kanbanBoard: 'Kanban board',
  kanbanColumns: 'Board columns',
  kanbanFiltersGroup: 'Filter and search board',
  kanbanSearchCards: 'Search cards by keyword',
  kanbanCollapseColumn: 'Collapse column',
  kanbanExpandColumn: 'Expand column',
  kanbanColumnActionsMenu: 'Column menu',
  kanbanCardActionsMenu: 'Card menu',
  kanbanAddCard: 'Add card',
  kanbanRemoveTagFilter: 'Remove tag filter',
  kanbanFilterByTag: 'Filter by tag',
  kanbanUntitledCard: 'Untitled card',
  kanbanColumnCards: 'Cards',

  fieldModeLocked: 'Locked. Editing is temporarily unavailable.',
  fieldModeReadonly: 'Read-only.',

  fieldFileUpload: 'File upload',
  fieldFilePlaceholder: 'Attach a file',

  fieldDateTimeDialogDate: 'Choose a date',
  fieldDateTimeDialogTime: 'Choose a time',
  fieldDateTimeDialogDateTime: 'Choose a date and time',
  datePickerPrevMonth: 'Previous month',
  datePickerNextMonth: 'Next month',

  fieldFileClear: 'Clear file',

  fieldColorPickerDialog: 'Color picker'
}

const userLanuage: Ref<{ [key: string]: string }> = ref({})

const language: ComputedRef<{ [key: string]: string }> = computed(() => {
  return { ...defaults, ...userLanuage.value }
})

export const useLanguage = (): ComputedRef<{ [key: string]: string }> => {
  return language
}

export const provideLanguage = (lang: { [key: string]: string }): void => {
  userLanuage.value = lang
}

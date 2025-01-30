<template>
  <div
    class="of-kanban-board"
    @blur="handleBlur"
    tabindex="-1"
    ref="boardRef"
    @click="handleBoardClick"
  >
    <kanban-filters
      :assignees="assignees"
      :search-input-placeholder="searchInputPlaceholder"
      @filter-change="handleFilterChange"
      @clear-filters="handleClearFilters"
    >
      <template #custom-filters>
        <slot name="filters" />
      </template>
      <template #clear-filters>
        <slot name="clear-filters" />
      </template>
    </kanban-filters>
    <div class="of-kanban-columns">
      <kanban-column
        v-for="column in columns"
        :key="column.id"
        :column="column"
        :menu-items="columnMenuItems"
        :dragged-card-id="draggedCardId"
        :selected-card-id="selectedCardId"
        @menu-item-click="handleColumnMenuItemClick"
        @column-click="handleColumnClick"
        @card-blur="handleCardBlur"
        @card-moved="handleCardMove"
        @card-drag-start="handleCardDragStart"
        @card-click="handleCardClick"
        @add-card="$emit('add-card', column.id)"
        @project-click="$emit('project-click', $event)"
        @assignee-click="$emit('assignee-click', $event)"
        @card-title-click="$emit('card-title-click', $event)"
      >
        <template #card-title="slotProps">
          <slot name="card-title" :card="slotProps.card" />
        </template>
        <template #project="slotProps">
          <slot name="project" :card="slotProps.card" />
        </template>
        <template #avatar="slotProps">
          <slot name="avatar" :card="slotProps.card" />
        </template>
        <template #create-button><slot name="create-button" /></template>
      </kanban-column>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  type PropType,
  ref,
  onMounted,
  onUnmounted,
  computed
} from 'vue'
import KanbanColumn from './components/KanbanColumn.vue'
import KanbanFilters from './components/KanbanFilters.vue'
import type {
  IKanbanColumn,
  CardMovedEvent,
  IKanbanCard,
  IKanbanCardAssignee
} from './types'
import { Item } from '../../lib/items_list'

export default defineComponent({
  name: 'OfKanbanBoard',
  components: {
    KanbanColumn,
    KanbanFilters
  },
  props: {
    columns: {
      type: Array as PropType<IKanbanColumn[]>,
      required: true
    },
    columnMenuItems: {
      type: Array as PropType<Item[]>,
      default: () => []
    },
    searchInputPlaceholder: {
      type: String,
      default: 'Search by keyword...'
    }
  },
  emits: [
    'update:columns',
    'card-moved',
    'column-menu-item-click',
    'add-card',
    'card-click',
    'project-click',
    'assignee-click',
    'card-title-click',
    'filter-change'
  ] as const,
  setup(props, { emit }) {
    const boardRef = ref<HTMLElement>()
    const draggedCardId = ref<string | number | undefined>(undefined)
    const selectedCardId = ref<string | number | undefined>(undefined)

    const assignees = computed(() => {
      const assigneeMap = new Map<string | number, IKanbanCardAssignee>()

      props.columns.forEach((column) => {
        column.cards?.forEach((card) => {
          if (card.assignee) {
            assigneeMap.set(card.assignee.id, card.assignee)
          }
        })
      })

      return Array.from(assigneeMap.values())
    })

    const handleCardDragStart = (card: IKanbanCard) => {
      draggedCardId.value = card.id
      selectedCardId.value = card.id
    }

    const handleCardBlur = (card: IKanbanCard) => {
      if (selectedCardId.value === card.id) {
        selectedCardId.value = undefined
      }
    }

    const handleCardClick = (card: IKanbanCard) => {
      selectedCardId.value = card.id
      emit('card-click', card)
    }

    const handleColumnClick = (_column: IKanbanColumn) => {
      selectedCardId.value = undefined
    }

    const handleBlur = () => {
      selectedCardId.value = undefined
    }

    const handleCardMove = ({
      cardId,
      fromColumn,
      toColumn,
      newOrder
    }: CardMovedEvent) => {
      // Create a new columns array, but only clone the affected columns
      const updatedColumns = [...props.columns]
      const fromColumnIndex = updatedColumns.findIndex(
        (col) => col.id === fromColumn
      )
      const toColumnIndex = updatedColumns.findIndex(
        (col) => col.id === toColumn
      )

      // Get the moved card before modifying the from column
      const movedCard = updatedColumns[fromColumnIndex].cards?.find(
        (card) => card.id === cardId
      )

      if (!movedCard) return

      // Update the from column
      updatedColumns[fromColumnIndex] = {
        ...updatedColumns[fromColumnIndex],
        cards: updatedColumns[fromColumnIndex].cards
          ?.filter((card) => card.id !== cardId)
          .map((card, index) => ({
            ...card,
            order: index
          }))
      }

      // Update the to column
      const targetColumn = updatedColumns[toColumnIndex]
      if (!targetColumn.cards) {
        targetColumn.cards = []
      }
      const reorderedCards = [...targetColumn.cards]
      reorderedCards.splice(newOrder, 0, movedCard)

      updatedColumns[toColumnIndex] = {
        ...targetColumn,
        cards: reorderedCards.map((card, index) => ({
          ...card,
          order: index
        }))
      }

      draggedCardId.value = undefined
      emit('update:columns', updatedColumns)
      emit('card-moved', { cardId, fromColumn, toColumn, newOrder })
    }

    const handleBoardClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Check if click was on a card, column, or any interactive elements
      if (
        target.closest('.of-kanban-card') ||
        target.closest('.of-kanban-column') ||
        target.closest('button')
      ) {
        return
      }

      // If we get here, the click was on the board background
      selectedCardId.value = undefined
    }

    const handleWindowClick = (event: MouseEvent) => {
      // Check if click is outside the kanban board
      if (boardRef.value && !boardRef.value.contains(event.target as Node)) {
        selectedCardId.value = undefined
      }
    }

    const handleWindowDragEnd = () => {
      draggedCardId.value = undefined
    }

    const handleColumnMenuItemClick = (
      item: string | number,
      columnId: string
    ) => {
      emit('column-menu-item-click', item, columnId)
    }

    const handleFilterChange = (filters: {
      keyword: string
      assignees: (string | number)[]
    }) => {
      console.log('filters', filters)
      emit('filter-change', filters)
    }

    const handleClearFilters = (filters: {
      keyword: string
      assignees: (string | number)[]
    }) => {
      console.log('Clear filters', filters)
      emit('filter-change', filters)
    }

    onMounted(() => {
      window.addEventListener('click', handleWindowClick)
      window.addEventListener('dragend', handleWindowDragEnd)
    })

    onUnmounted(() => {
      window.removeEventListener('click', handleWindowClick)
      window.removeEventListener('dragend', handleWindowDragEnd)
    })

    return {
      boardRef,
      draggedCardId,
      selectedCardId,
      assignees,
      handleCardMove,
      handleCardDragStart,
      handleCardBlur,
      handleCardClick,
      handleColumnClick,
      handleBlur,
      handleBoardClick,
      handleColumnMenuItemClick,
      handleFilterChange,
      handleClearFilters
    }
  }
})
</script>

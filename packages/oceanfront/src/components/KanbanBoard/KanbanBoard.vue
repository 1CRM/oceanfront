<template>
  <div class="of-kanban-board">
    <div class="of-kanban-columns" ref="boardRef">
      <kanban-column
        v-for="column in columns"
        :key="column.id"
        :column="column"
        @column-menu="$emit('column-menu', $event)"
        @card-moved="handleCardMove"
        @add-card="$emit('add-card', column.id)"
        @card-click="$emit('card-click', $event)"
        @project-click="$emit('project-click', $event)"
        @assignee-click="$emit('assignee-click', $event)"
        @card-title-click="$emit('card-title-click', $event)"
      >
        <template #create-button>{{ createButtonText }}</template>
      </kanban-column>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, ref } from 'vue'
import KanbanColumn from './components/KanbanColumn.vue'
import type { IKanbanColumn, CardMovedEvent } from './types'

export default defineComponent({
  name: 'OfKanbanBoard',
  components: {
    KanbanColumn
  },
  props: {
    columns: {
      type: Array as PropType<IKanbanColumn[]>,
      required: true
    },
    createButtonText: {
      type: String,
      default: 'Create Issue'
    }
  },

  emits: [
    'update:columns',
    'column-menu',
    'card-moved',
    'add-card',
    'card-click',
    'project-click',
    'assignee-click',
    'card-title-click'
  ] as const,

  setup(props, { emit }) {
    const boardRef = ref<HTMLElement>()

    const handleCardMove = ({
      cardId,
      fromColumn,
      toColumn,
      newOrder
    }: CardMovedEvent) => {
      const updatedColumns = props.columns.map((column) => {
        if (column.id === fromColumn) {
          return {
            ...column,
            cards: column.cards?.filter((card) => card.id !== cardId)
          }
        }
        if (column.id === toColumn) {
          const movedCard = props.columns
            .find((col) => col.id === fromColumn)
            ?.cards?.find((card) => card.id === cardId)

          if (movedCard) {
            const reorderedCards = [...(column.cards || [])]
            reorderedCards.splice(newOrder, 0, movedCard)

            return {
              ...column,
              cards: reorderedCards.map((card, index) => ({
                ...card,
                order: index + 1
              }))
            }
          }
        }
        return column
      })

      console.log('updatedColumns', updatedColumns)

      emit('update:columns', updatedColumns)
      emit('card-moved', { cardId, fromColumn, toColumn, newOrder })
    }

    return {
      boardRef,
      handleCardMove
    }
  }
})
</script>

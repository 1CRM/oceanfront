<template>
  <div class="of-kanban-board">
    <div class="of-kanban-columns" ref="boardRef">
      <kanban-column
        v-for="column in columns"
        :key="column.id"
        :column="column"
        @card-moved="handleCardMove"
        @add-card="$emit('add-card', column.id)"
        @card-click="$emit('card-click', $event)"
        @column-menu="$emit('column-menu', $event)"
      />
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
    }
  },

  emits: [
    'update:columns',
    'card-moved',
    'add-card',
    'card-click',
    'column-menu'
  ] as const,

  setup(props, { emit }) {
    const boardRef = ref<HTMLElement>()

    const handleCardMove = ({
      cardId,
      fromColumn,
      toColumn
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
            return {
              ...column,
              cards: [...(column.cards || []), movedCard]
            }
          }
        }
        return column
      })

      emit('update:columns', updatedColumns)
      emit('card-moved', { cardId, fromColumn, toColumn })
    }

    return {
      boardRef,
      handleCardMove
    }
  }
})
</script>

<style lang="scss">
.of-kanban-board {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 16px;

  .of-kanban-columns {
    display: flex;
    gap: 16px;
    height: 100%;
    min-height: 200px;
  }
}
</style>

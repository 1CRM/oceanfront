<template>
  <div class="of-kanban-column">
    <div class="of-kanban-column-header">
      <div class="of-kanban-column-title">
        <h3>{{ column.title }}</h3>
        <span class="of-kanban-column-count">
          {{ column.cards?.length || 0 }}
          <template v-if="column.limit"> / {{ column.limit }} </template>
        </span>
      </div>
      <div class="of-kanban-column-actions">
        <of-button
          variant="text"
          icon="more"
          size="sm"
          @click="showColumnMenu"
        />
      </div>
    </div>

    <div
      class="of-kanban-column-content"
      :data-column-id="column.id"
      @dragover.prevent="handleDragOver"
      @drop.prevent="handleDrop"
      @dragenter.prevent="handleDragEnter"
      @dragleave.prevent="handleDragLeave"
    >
      <kanban-card
        v-for="card in sortedCards"
        :key="card.id"
        :card="card"
        :is-dragging="isDragging"
        @drag-start="handleCardDragStart"
        @drag-end="handleCardDragEnd"
        @click="$emit('card-click', card)"
      />

      <div v-if="isDropTarget" class="of-kanban-drop-indicator" />
    </div>

    <div class="of-kanban-column-footer">
      <of-button
        class="create-issue-button"
        @click="$emit('add-card')"
        :disabled="isAtLimit"
      >
        Create Issue
      </of-button>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType, ref } from 'vue'
import { OfButton } from '../../Button'
import KanbanCard from './KanbanCard.vue'
import type { IKanbanCard, IKanbanColumn } from '../types'

export default defineComponent({
  name: 'OfKanbanColumn',

  components: {
    OfButton,
    KanbanCard
  },

  props: {
    column: {
      type: Object as PropType<IKanbanColumn>,
      required: true
    }
  },

  emits: {
    'add-card': null,
    'card-click': (_card: IKanbanCard) => true,
    'card-moved': (_event: {
      cardId: string
      fromColumn: string
      toColumn: string
    }) => true,
    'column-menu': (_event: { column: IKanbanColumn; event: MouseEvent }) =>
      true
  },

  setup(props, { emit }) {
    const isDragging = ref(false)
    const isDropTarget = ref(false)

    const sortedCards = computed(() => {
      return [...(props.column.cards || [])].sort((a, b) => a.order - b.order)
    })

    const isAtLimit = computed(() => {
      if (!props.column.limit) return false
      return (props.column.cards?.length || 0) >= props.column.limit
    })

    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer) return
      event.dataTransfer.dropEffect = 'move'
    }

    const handleDragEnter = () => {
      isDropTarget.value = true
    }

    const handleDragLeave = () => {
      isDropTarget.value = false
    }

    const handleDrop = (event: DragEvent) => {
      isDropTarget.value = false
      if (!event.dataTransfer) return

      const data = JSON.parse(event.dataTransfer.getData('text/plain'))
      if (data.sourceColumnId === props.column.id) return

      emit('card-moved', {
        cardId: data.cardId,
        fromColumn: data.sourceColumnId,
        toColumn: props.column.id
      })
    }

    const handleCardDragStart = (_card: IKanbanCard) => {
      isDragging.value = true
    }

    const handleCardDragEnd = () => {
      isDragging.value = false
    }

    const showColumnMenu = (event: MouseEvent) => {
      emit('column-menu', {
        column: props.column,
        event
      })
    }

    return {
      isDragging,
      isDropTarget,
      isAtLimit,
      sortedCards,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      handleCardDragStart,
      handleCardDragEnd,
      showColumnMenu
    }
  }
})
</script>

<style lang="scss">
.of-kanban-column {
  flex: 1;
  min-width: 280px;
  background: #f0f1ee;
  border-radius: 3px;
  display: flex;
  flex-direction: column;

  .of-kanban-column-header {
    padding: 8px 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .of-kanban-column-title {
      display: flex;
      align-items: center;
      gap: 8px;

      h3 {
        margin: 0;
        color: #151713;
        font-size: 20px;
        font-family: Roboto;
        font-weight: 500;
        line-height: 24px;
      }

      .of-kanban-column-count {
        color: #6b778c;
        font-size: 12px;
      }
    }

    .of-kanban-column-actions {
      padding: 2px;
      border-radius: 3px;
      display: flex;
      gap: 12px;
      justify-content: center;
      align-items: center;
    }
  }

  .of-kanban-column-content {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .of-kanban-column-footer {
    padding: 12px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;

    .create-issue-button {
      display: flex;
      padding: 2px 12px;
      align-items: center;
      gap: 12px;
      border-radius: 3px;
      background: #f0f1ee;
      box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.18);
      color: #246874;
      font-size: 14px;
      font-family: Roboto;
      font-weight: 400;
      line-height: 17px;
    }
  }

  .of-kanban-drop-indicator {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    height: 2px;
    background: #0052cc;
  }
}
</style>

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
          icon="add"
          size="sm"
          @click="$emit('add-card')"
          :disabled="isAtLimit"
        />
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
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType, ref } from 'vue'
import { OfButton } from '../../../Button'
import KanbanCard from './KanbanCard.vue'
import type {
  KanbanCard as IKanbanCard,
  KanbanColumn as IKanbanColumn
} from '../types'

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
    'card-click': (card: IKanbanCard) => true,
    'card-moved': (event: {
      cardId: string
      fromColumn: string
      toColumn: string
    }) => true,
    'column-menu': (event: { column: IKanbanColumn; event: MouseEvent }) => true
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

    const handleCardDragStart = (card: IKanbanCard) => {
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
  background: var(--of-surface-variant);
  border-radius: var(--of-border-radius-lg);
  display: flex;
  flex-direction: column;

  .of-kanban-column-header {
    padding: var(--of-space-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--of-border-color);

    .of-kanban-column-title {
      display: flex;
      align-items: center;
      gap: var(--of-space-sm);

      h3 {
        margin: 0;
        font-size: var(--of-font-size-md);
        font-weight: var(--of-font-weight-medium);
      }
    }

    .of-kanban-column-actions {
      display: flex;
      gap: var(--of-space-xs);
    }
  }

  .of-kanban-column-content {
    flex: 1;
    padding: var(--of-space-md);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--of-space-md);
    position: relative;

    &.is-drop-target {
      background: var(--of-surface-variant-hover);
    }
  }

  .of-kanban-drop-indicator {
    position: absolute;
    left: var(--of-space-md);
    right: var(--of-space-md);
    bottom: var(--of-space-md);
    height: 2px;
    background: var(--of-primary);
  }
}
</style>

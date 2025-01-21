<template>
  <div
    class="of-kanban-card"
    :class="{
      'of--is-dragging': isDragging,
      'of--is-selected': isSelected
    }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="$emit('click', card)"
  >
    <div class="of-kanban-card-header">
      <div class="of-kanban-card-labels" v-if="card.labels?.length">
        <span
          v-for="label in card.labels"
          :key="label.id"
          class="of-kanban-label"
          :style="{ backgroundColor: label.color }"
        >
          {{ label.name }}
        </span>
      </div>
    </div>

    <div class="of-kanban-card-content">
      <h4>{{ card.title }}</h4>
      <p v-if="card.description">{{ card.description }}</p>
    </div>

    <div class="of-kanban-card-footer">
      <div class="of-kanban-card-meta">
        <of-icon v-if="card.dueDate" name="calendar" size="sm" />
        <span v-if="card.dueDate">{{ formatDate(card.dueDate) }}</span>
      </div>
      <div class="of-kanban-card-assignees" v-if="card.assignees?.length">
        <!-- We can add assignee avatars here later -->
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { OfIcon } from '../../../Icon'
import type { KanbanCard } from '../types'

export default defineComponent({
  name: 'OfKanbanCard',

  components: {
    OfIcon
  },

  props: {
    card: {
      type: Object as PropType<KanbanCard>,
      required: true
    },
    isDragging: {
      type: Boolean,
      default: false
    },
    isSelected: {
      type: Boolean,
      default: false
    }
  },

  emits: ['click', 'drag-start', 'drag-end'],

  setup(props, { emit }) {
    const handleDragStart = (event: DragEvent) => {
      if (!event.dataTransfer) return

      emit('drag-start', props.card)

      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          cardId: props.card.id,
          order: props.card.order
        })
      )
    }

    const handleDragEnd = () => {
      emit('drag-end')
    }

    const formatDate = (date: string | Date) => {
      // We can add proper date formatting later
      return new Date(date).toLocaleDateString()
    }

    return {
      handleDragStart,
      handleDragEnd,
      formatDate
    }
  }
})
</script>

<style lang="scss">
.of-kanban-card {
  background: var(--of-surface);
  border-radius: var(--of-border-radius-md);
  padding: var(--of-space-md);
  cursor: grab;
  user-select: none;
  box-shadow: var(--of-shadow-sm);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    box-shadow: var(--of-shadow-md);
  }

  &.of--is-dragging {
    opacity: 0.5;
    transform: scale(1.05);
  }

  &.of--is-selected {
    outline: 2px solid var(--of-primary);
  }

  .of-kanban-card-header {
    margin-bottom: var(--of-space-sm);
  }

  .of-kanban-card-labels {
    display: flex;
    flex-wrap: wrap;
    gap: var(--of-space-xs);
  }

  .of-kanban-label {
    padding: 2px var(--of-space-xs);
    border-radius: var(--of-border-radius-sm);
    font-size: var(--of-font-size-xs);
    color: var(--of-on-primary);
  }

  .of-kanban-card-content {
    h4 {
      margin: 0 0 var(--of-space-xs);
      font-size: var(--of-font-size-md);
      font-weight: var(--of-font-weight-medium);
    }

    p {
      margin: 0;
      font-size: var(--of-font-size-sm);
      color: var(--of-text-secondary);
    }
  }

  .of-kanban-card-footer {
    margin-top: var(--of-space-sm);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .of-kanban-card-meta {
    display: flex;
    align-items: center;
    gap: var(--of-space-xs);
    font-size: var(--of-font-size-sm);
    color: var(--of-text-secondary);
  }
}
</style>

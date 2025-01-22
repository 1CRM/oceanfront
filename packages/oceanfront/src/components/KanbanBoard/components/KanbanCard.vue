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
import { OfIcon } from '../../Icon'
import type { IKanbanCard } from '../types'

export default defineComponent({
  name: 'OfKanbanCard',
  components: {
    OfIcon
  },
  props: {
    card: {
      type: Object as PropType<IKanbanCard>,
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
  background: white;
  border-radius: 3px;
  padding: 12px;
  cursor: grab;
  user-select: none;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;

  &:hover {
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.12);
  }

  &.of--is-dragging {
    opacity: 0.5;
  }

  &.of--is-selected {
    outline: 2px solid #0052cc;
  }

  .of-kanban-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;

    .of-kanban-card-project {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #151713;
      font-size: 13px;
      font-family: Roboto;
      font-weight: 500;
      line-height: 18.2px;
    }

    .of-kanban-avatar {
      width: 24px;
      height: 24px;
      padding: 1px;
      background: #246874;
      border-radius: 1000px;
      box-shadow: 0px 0px 0px 1px white;
      color: white;
      font-size: 11px;
      font-family: Roboto;
      font-weight: 300;
      line-height: 12.1px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .of-kanban-card-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    .of-kanban-label {
      padding: 2px 8px;
      border-radius: 4.4px;
      border: 1px solid #dddddd;
      background: white;
      color: #151713;
      font-size: 13px;
      font-family: Roboto;
      font-weight: 400;
      line-height: 18.2px;
    }
  }

  .of-kanban-card-content {
    h4 {
      margin: 0 0 4px;
      color: black;
      font-size: 16px;
      font-family: Roboto;
      font-weight: 500;
      line-height: 19.2px;
    }

    p {
      margin: 0;
      font-size: 13px;
      color: #6b778c;
    }
  }

  .of-kanban-card-footer {
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .of-kanban-card-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #6b778c;
  }

  .priority-indicator {
    width: 184px;
    height: 0px;
    transform: rotate(90deg);
    transform-origin: 0 0;
    border: 2px solid;

    &.high {
      border-color: #f55b5b;
    }

    &.medium {
      border-color: #246874;
    }
  }
}
</style>

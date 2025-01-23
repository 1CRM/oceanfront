<template>
  <div
    class="of-kanban-card of--elevated-1"
    :class="{
      'of--is-dragging': isDragging,
      'of--is-selected': isSelected
    }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="$emit('click', card)"
  >
    <div class="card-content">
      <div class="of-kanban-card-header">
        <div class="project-container">
          <div class="project-icon">
            <of-icon name="mobile" size="16px" />
          </div>
          <div class="project-name">
            <div class="project-text">{{ card.project }}</div>
          </div>
        </div>
        <div class="of-kanban-avatar" v-if="card.assignee">
          <div class="avatar-text">{{ card.assignee.initials }}</div>
        </div>
      </div>
      <div class="title-container">
        <div class="title-text">{{ card.title }}</div>
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

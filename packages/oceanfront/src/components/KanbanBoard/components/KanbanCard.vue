<template>
  <div
    class="of-kanban-card of--elevated-1"
    :class="{
      'of--is-dragging': isDragging,
      'of--is-selected': isSelected
    }"
    :data-order="card.order"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="$emit('card-click', card)"
    @blur="$emit('blur')"
    tabindex="0"
  >
    <div class="card-content">
      <div class="of-kanban-card-header">
        <div class="project-container">
          <div class="project-icon">
            <of-icon :name="card.project?.icon ?? 'mobile'" />
          </div>
          <div class="project-name">
            <div
              class="project-text"
              @click="$emit('project-click', card.project)"
            >
              {{ card.project?.name }}
            </div>
          </div>
        </div>
        <div
          class="of-kanban-avatar"
          v-if="card.assignee"
          @click="$emit('assignee-click', card.assignee)"
        >
          <img
            v-if="card.assignee.avatar"
            :src="card.assignee.avatar"
            :alt="card.assignee.name"
            class="avatar-image"
          />
          <div v-else class="avatar-text">{{ assigneeInitials }}</div>
        </div>
      </div>
      <div class="title-container">
        <div class="title-text">
          {{ card.title }}
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue'
import { OfIcon } from '../../Icon'
import type { IKanbanAssignee, IKanbanCard } from '../types'

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
  emits: [
    'drag-start',
    'drag-end',
    'project-click',
    'assignee-click',
    'card-click',
    'blur'
  ],
  setup(props, { emit }) {
    const handleDragStart = (event: DragEvent) => {
      if (!event.dataTransfer) return

      emit('card-click', props.card)
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

    const assigneeInitials = computed<string>(() => {
      const name = props.card.assignee?.name
      if (!name) return ''

      return (
        name.includes(' ')
          ? name
              .split(' ')
              .map((word) => word[0])
              .join('')
          : name.slice(0, 2)
      ).toUpperCase()
    })

    return {
      handleDragStart,
      handleDragEnd,
      assigneeInitials
    }
  }
})
</script>

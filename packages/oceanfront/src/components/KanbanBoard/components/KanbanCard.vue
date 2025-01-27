<template>
  <div
    class="of-kanban-card of--elevated-1"
    :class="{
      'of--is-dragging': isCardDragging,
      'of--is-selected': isSelected
    }"
    :data-order="card.order"
    draggable="true"
    @dragstart="handleDragStart"
    @click="handleCardClick"
    @blur="handleBlur"
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
        <div class="title-text" @click="$emit('card-title-click', card)">
          {{ card.title }}
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue'
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
    columnId: {
      type: String,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    draggedCardId: {
      type: [String, Number] as PropType<string | number | undefined>,
      default: undefined
    }
  },
  emits: [
    'drag-start',
    'project-click',
    'assignee-click',
    'card-title-click',
    'card-click',
    'card-blur'
  ],
  setup(props, { emit }) {
    const isCardDragging = computed<boolean>(
      () => props.draggedCardId === props.card.id
    )

    const handleDragStart = (event: DragEvent) => {
      if (!event.dataTransfer) return

      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          cardId: props.card.id,
          sourceColumnId: props.columnId
        })
      )

      emit('drag-start', props.card)
    }

    const handleBlur = () => {
      emit('card-blur', props.card)
    }

    const handleCardClick = () => {
      emit('card-click', props.card)
    }

    const assigneeInitials = computed<string>(() => {
      const name = props.card.assignee?.name
      //Anonimus
      if (!name) return 'AN'

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
      isCardDragging,
      handleDragStart,
      assigneeInitials,
      handleBlur,
      handleCardClick
    }
  }
})
</script>

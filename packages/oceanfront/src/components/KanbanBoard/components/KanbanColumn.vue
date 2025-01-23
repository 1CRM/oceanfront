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
        @card-click="$emit('card-click', $event)"
        @project-click="$emit('project-click', $event)"
        @assignee-click="$emit('assignee-click', $event)"
      />
      <div v-if="isDropTarget" class="of-kanban-drop-indicator" />
    </div>

    <div class="of-kanban-column-footer">
      <of-button
        class="create-issue-button"
        @click="$emit('add-card')"
        :disabled="isAtLimit"
        variant="elevated"
        tint="primary"
        icon="plus"
      >
        <slot name="create-button">Create Issue</slot>
      </of-button>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, type PropType, ref } from 'vue'
import { OfButton } from '../../Button'
import KanbanCard from './KanbanCard.vue'
import type {
  IKanbanAssignee,
  IKanbanCard,
  IKanbanColumn,
  IKanbanProject
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
    },
    createButtonText: {
      type: String,
      default: 'Create Issue'
    }
  },
  emits: {
    'add-card': null,
    'card-click': (_card: IKanbanCard) => true,
    'project-click': (_project: IKanbanProject | undefined) => true,
    'assignee-click': (_assignee: IKanbanAssignee | undefined) => true,
    'card-moved': (_event: {
      cardId: string
      fromColumn: string
      toColumn: string
      newOrder?: number
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

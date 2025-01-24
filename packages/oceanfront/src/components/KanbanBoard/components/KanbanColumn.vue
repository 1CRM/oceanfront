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
        :is-selected="selectedCardId === card.id"
        @drag-start="handleCardDragStart"
        @drag-end="handleCardDragEnd"
        @card-click="handleCardClick"
        @project-click="$emit('project-click', $event)"
        @assignee-click="$emit('assignee-click', $event)"
        @blur="handleCardBlur"
      />
      <div v-if="isDropTarget" :style="dropIndicatorStyle" />
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
import type { CSSProperties } from 'vue'

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
    const dropPosition = ref(0)
    const selectedCardId = ref<string | number | null>(null)

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

      try {
        // Check if we're dragging a card
        const data = JSON.parse(event.dataTransfer.getData('text/plain'))
        if (!data.cardId) return
      } catch {
        return
      }

      const containerRect = (
        event.currentTarget as HTMLElement
      ).getBoundingClientRect()
      const cards = Array.from(
        (event.currentTarget as HTMLElement).querySelectorAll('.of-kanban-card')
      ) as HTMLElement[]

      // If no cards, position at the top
      if (cards.length === 0) {
        dropPosition.value = 12 // padding top
        return
      }

      // Find the card we're dragging over
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        // Skip the card being dragged
        if (card.classList.contains('of--is-dragging')) continue

        const cardRect = card.getBoundingClientRect()
        const cardMiddle = cardRect.top + cardRect.height / 2

        if (event.clientY < cardMiddle) {
          // Position above current card
          dropPosition.value =
            i === 0
              ? 12 // If first card, position at top padding
              : cardRect.top - containerRect.top
          return
        }
      }

      // If we're below all cards, position at the bottom
      const lastCard = cards[cards.length - 1]
      if (lastCard && !lastCard.classList.contains('of--is-dragging')) {
        const lastCardRect = lastCard.getBoundingClientRect()
        dropPosition.value = lastCardRect.bottom - containerRect.top + 12
      }
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
      // Calculate new order based on drop position
      const cards = Array.from(
        (event.currentTarget as HTMLElement).querySelectorAll('.of-kanban-card')
      ) as HTMLElement[]

      let newOrder = 0
      let prevOrder = 0
      let nextOrder = cards.length * 2 // Default large gap

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        if (card.classList.contains('of--is-dragging')) continue

        const cardRect = card.getBoundingClientRect()
        const cardMiddle = cardRect.top + cardRect.height / 2

        if (event.clientY < cardMiddle) {
          nextOrder = parseFloat(card.getAttribute('data-order') || '0')
          break
        }

        prevOrder = parseFloat(card.getAttribute('data-order') || '0')
      }

      newOrder = prevOrder + (nextOrder - prevOrder) / 2

      emit('card-moved', {
        cardId: data.cardId,
        fromColumn: data.sourceColumnId,
        toColumn: props.column.id,
        newOrder
      })
    }

    const handleCardDragStart = (card: IKanbanCard) => {
      isDragging.value = true
      selectedCardId.value = card.id
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

    const handleCardClick = (card: IKanbanCard) => {
      console.log(
        'Card clicked, current:',
        selectedCardId.value,
        'new:',
        card.id
      )
      selectedCardId.value = selectedCardId.value === card.id ? null : card.id
      emit('card-click', card)
    }

    const handleCardBlur = () => {
      if (!isDragging.value) {
        selectedCardId.value = null
      }
    }

    const dropIndicatorStyle = computed<CSSProperties>(() => ({
      top: `${dropPosition.value}px`,
      position: 'absolute',
      left: '12px',
      right: '12px',
      height: '2px',
      background: 'var(--of-kanban-board-drop-indicator-bg)',
      pointerEvents: 'none' as const
    }))

    return {
      isDragging,
      isDropTarget,
      isAtLimit,
      sortedCards,
      selectedCardId,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      handleCardDragStart,
      handleCardDragEnd,
      showColumnMenu,
      handleCardClick,
      handleCardBlur,
      dropIndicatorStyle
    }
  }
})
</script>

<template>
  <div class="of-kanban-column" @dragend="handleDragEnd">
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
        :column-id="column.id"
        :is-selected="selectedCardId === card.id"
        :dragged-card-id="draggedCardId"
        @card-click="handleCardClick"
        @drag-start="handleCardDragStart"
        @project-click="$emit('project-click', $event)"
        @assignee-click="$emit('assignee-click', $event)"
        @card-title-click="$emit('card-title-click', $event)"
        @card-blur="$emit('card-blur', $event)"
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
    draggedCardId: {
      type: [String, Number] as PropType<string | number | undefined>,
      default: undefined
    },
    selectedCardId: {
      type: [String, Number] as PropType<string | number | undefined>,
      default: undefined
    }
  },
  emits: {
    'add-card': null,
    'card-click': (_card: IKanbanCard) => true,
    'project-click': (_project: IKanbanProject | undefined) => true,
    'assignee-click': (_assignee: IKanbanAssignee | undefined) => true,
    'card-title-click': (_card: IKanbanCard) => true,
    'card-blur': (_card: IKanbanCard) => true,
    'card-moved': (_event: {
      cardId: string
      fromColumn: string
      toColumn: string
      newOrder: number
    }) => true,
    'card-drag-start': (_card: IKanbanCard) => true,
    'column-menu': (_event: { column: IKanbanColumn; event: MouseEvent }) =>
      true
  },

  setup(props, { emit }) {
    const isDropTarget = ref(false)
    const dropPosition = ref(0)
    const draggedCardColumnId = ref<string | null>(null)

    const sortedCards = computed(() => {
      return [...(props.column.cards || [])].sort((a, b) => a.order - b.order)
    })

    const isAtLimit = computed(() => {
      if (!props.column.limit) return false
      return (props.column.cards?.length || 0) >= props.column.limit
    })

    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer) return

      // Check if dropping would exceed limit
      if (props.column.limit !== undefined) {
        const currentCount = props.column.cards?.length || 0
        // Only block if card is from different column and would exceed limit
        if (
          draggedCardColumnId.value !== props.column.id &&
          currentCount >= props.column.limit
        ) {
          event.dataTransfer.dropEffect = 'none'
          return
        }
      }

      event.dataTransfer.dropEffect = 'move'
      event.preventDefault()

      const container = event.currentTarget as HTMLElement
      const scrollTop = container.scrollTop
      const containerRect = container.getBoundingClientRect()

      // Get all cards, including the dragged one
      const cards = Array.from(
        container.querySelectorAll('.of-kanban-card')
      ) as HTMLElement[]

      const mouseY = event.clientY - containerRect.top + scrollTop
      const draggingCard = container.querySelector(
        '.of-kanban-card.of--is-dragging'
      ) as HTMLElement

      // If mouse is near the top of the container, position at the top
      if (mouseY < 24) {
        // 24px threshold from the top
        dropPosition.value = 12
        isDropTarget.value = true
        return
      }

      // If no cards or only the dragged card, position at the top
      if (
        cards.length === 0 ||
        (cards.length === 1 && cards[0] === draggingCard)
      ) {
        dropPosition.value = 12
        isDropTarget.value = true
        return
      }

      // Find the card we're dragging over
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        // Skip the card being dragged
        if (card === draggingCard) continue

        const cardRect = card.getBoundingClientRect()
        const cardTop = cardRect.top - containerRect.top + scrollTop
        const cardBottom = cardTop + cardRect.height
        const cardMiddle = cardTop + cardRect.height / 2

        if (mouseY < cardMiddle) {
          // Position above current card
          dropPosition.value = cardTop
          isDropTarget.value = true
          return
        }

        // If this is the last non-dragging card and we're below its middle
        if (i === cards.length - 1 || cards[i + 1] === draggingCard) {
          dropPosition.value = cardBottom + 12
          isDropTarget.value = true
          return
        }
      }
    }

    const handleDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer) return

      // Check if dropping would exceed limit
      if (props.column.limit !== undefined) {
        const currentCount = props.column.cards?.length || 0
        const dragData = event.dataTransfer.getData('text/plain')
        try {
          const { sourceColumnId } = JSON.parse(dragData)
          if (
            sourceColumnId !== props.column.id &&
            currentCount >= props.column.limit
          ) {
            return
          }
        } catch (error) {
          console.error('Error parsing drag data:', error)
          return
        }
      }

      event.preventDefault()
      isDropTarget.value = true
    }

    const handleDragLeave = (event: DragEvent) => {
      // Only hide indicator if we're leaving the column content area
      const relatedTarget = event.relatedTarget as HTMLElement
      const currentColumn = event.currentTarget as HTMLElement
      if (!relatedTarget || !currentColumn.contains(relatedTarget)) {
        isDropTarget.value = false
      }
    }

    const handleDrop = (event: DragEvent) => {
      event.preventDefault()
      isDropTarget.value = false
      if (!event.dataTransfer) return

      try {
        const data = JSON.parse(event.dataTransfer.getData('text/plain'))
        if (!data.cardId || !data.sourceColumnId) return

        // Check column limit before processing the drop
        if (props.column.limit !== undefined) {
          const currentCount = props.column.cards?.length || 0
          // Only count as new card if it's coming from a different column
          if (
            data.sourceColumnId !== props.column.id &&
            currentCount >= props.column.limit
          ) {
            return
          }
        }

        let newOrder = 0

        const container = event.currentTarget as HTMLElement
        const scrollTop = container.scrollTop
        const containerRect = container.getBoundingClientRect()

        // Get all cards, including the dragged one
        const cards = Array.from(
          container.querySelectorAll('.of-kanban-card')
        ) as HTMLElement[]

        const mouseY = event.clientY - containerRect.top + scrollTop
        const draggingCard = container.querySelector(
          '.of-kanban-card.of--is-dragging'
        ) as HTMLElement

        // If mouse is near the top of the container, position at the top
        if (mouseY < 44) {
          newOrder = 0
          emit('card-moved', {
            cardId: data.cardId,
            fromColumn: data.sourceColumnId,
            toColumn: props.column.id,
            newOrder: newOrder
          })
          return
        }

        // If no cards or only the dragged card, position at the top
        if (
          cards.length === 0 ||
          (cards.length === 1 && cards[0] === draggingCard)
        ) {
          newOrder = 0
          emit('card-moved', {
            cardId: data.cardId,
            fromColumn: data.sourceColumnId,
            toColumn: props.column.id,
            newOrder: newOrder
          })
          return
        }

        let nearCard = null
        let isDraggingCardInThisColumn = false
        cards.some((card) => {
          if (card === draggingCard) {
            isDraggingCardInThisColumn = true
            return true
          }
        })

        let currIndex = 0

        for (let i = 0; i < cards.length; i++) {
          const card = cards[i]
          // Skip the card being dragged
          if (card === draggingCard) continue

          const cardRect = card.getBoundingClientRect()
          const cardTop = cardRect.top - containerRect.top + scrollTop
          const cardBottom = cardTop + cardRect.height

          if (
            Math.abs(cardTop - dropPosition.value) < 10 &&
            isDraggingCardInThisColumn
          ) {
            // Drop position is near the top of this card
            nearCard = cards[i - 1]
            currIndex = i
            break
          } else if (Math.abs(cardBottom - (dropPosition.value - 12)) < 10) {
            // Drop position is near the bottom of this card
            nearCard = card
            currIndex = i
            break
          }
        }

        if (nearCard) {
          let nearOrder = nearCard.getAttribute('data-order') ?? currIndex
          if (typeof nearOrder === 'string') {
            nearOrder = parseFloat(nearOrder)
          }
          newOrder = nearOrder + 1
        }

        emit('card-moved', {
          cardId: data.cardId,
          fromColumn: data.sourceColumnId,
          toColumn: props.column.id,
          newOrder: newOrder
        })
      } catch (error) {
        console.error('Error handling drop:', error)
      }
    }

    const handleCardDragStart = (card: IKanbanCard) => {
      draggedCardColumnId.value = props.column.id
      emit('card-drag-start', card)
    }

    const showColumnMenu = (event: MouseEvent) => {
      emit('column-menu', {
        column: props.column,
        event
      })
    }

    const handleCardClick = (card: IKanbanCard) => {
      emit('card-click', card)
    }

    const dropIndicatorStyle = computed<CSSProperties>(() => ({
      top: `${dropPosition.value - 6}px`,
      position: 'absolute',
      left: '12px',
      right: '12px',
      height: '2px',
      background: 'var(--of-kanban-board-drop-indicator-bg)',
      pointerEvents: 'none' as const,
      zIndex: 1
    }))

    const handleDragEnd = () => {
      draggedCardColumnId.value = null
    }

    return {
      isDropTarget,
      isAtLimit,
      sortedCards,
      dropIndicatorStyle,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      handleCardDragStart,
      showColumnMenu,
      handleCardClick,
      handleDragEnd
    }
  }
})
</script>

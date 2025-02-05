<template>
  <div
    class="of-kanban-column"
    @dragend="handleDragEnd"
    @touchend="handleDragEnd"
    @click="handleColumnClick"
  >
    <div class="of-kanban-column-header">
      <div class="of-kanban-column-title">
        <h3>{{ column.title }}</h3>
        <span class="of-kanban-column-count">
          {{ column.cards?.length || 0 }}
          <template v-if="column.limit"> / {{ column.limit }} </template>
        </span>
      </div>
      <div
        class="of-kanban-column-actions"
        v-if="compactedMenuItems.length > 0"
      >
        <of-button
          variant="text"
          icon="more"
          size="sm"
          :items="compactedMenuItems"
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
      @card-touch-hover="handleCardTouchHover"
      @card-touch-drop="handleCardTouchDrop"
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
      >
        <template #title="slotProps">
          <slot name="card-title" :card="slotProps.card" />
        </template>
        <template #project="slotProps">
          <slot name="project" :card="slotProps.card" />
        </template>
        <template #avatar="slotProps">
          <slot name="avatar" :card="slotProps.card" />
        </template>
      </kanban-card>
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
import {
  computed,
  defineComponent,
  type PropType,
  ref,
  CSSProperties
} from 'vue'
import { OfButton } from '../../Button'
import KanbanCard from './KanbanCard.vue'
import type {
  IKanbanCard,
  IKanbanCardAssignee,
  IKanbanColumn,
  IKanbanProject
} from '../types'
import { Item } from '../../../lib/items_list'
import { getDragData, isOverTheLimit } from '../utils'

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
    menuItems: {
      type: Array as PropType<Item[]>,
      default: () => []
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
    'menu-item-click': (_item: string | number, _columnId: string) => true,
    'card-click': (_card: IKanbanCard) => true,
    'project-click': (_project: IKanbanProject | undefined) => true,
    'assignee-click': (_assignee: IKanbanCardAssignee | undefined) => true,
    'card-title-click': (_card: IKanbanCard) => true,
    'card-blur': (_card: IKanbanCard) => true,
    'card-moved': (_event: {
      cardId: string
      fromColumn: string
      toColumn: string
      newOrder: number
    }) => true,
    'card-drag-start': (_card: IKanbanCard) => true,
    'column-click': (_column: IKanbanColumn) => true
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
      const currentCount = props.column.cards?.length || 0

      if (
        isOverTheLimit(
          currentCount,
          props.column.limit,
          draggedCardColumnId.value ?? '',
          props.column.id
        )
      ) {
        event.dataTransfer.dropEffect = 'none'
        return
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
        if (i === cards.length - 1) {
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
        const data = getDragData(event)
        if (!data) return

        if (
          isOverTheLimit(
            currentCount,
            props.column.limit,
            data.sourceColumnId ?? '',
            props.column.id
          )
        ) {
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

    const calculateNewOrder = (
      container: HTMLElement,
      mouseY: number,
      data: any,
      dropPosition: number
    ) => {
      const cards = Array.from(
        container.querySelectorAll('.of-kanban-card')
      ) as HTMLElement[]
      const draggingCard = container.querySelector(
        '.of-kanban-card.of--is-dragging'
      ) as HTMLElement

      // Handle empty or dragging-only cases
      if (
        cards.length === 0 ||
        (cards.length === 1 && cards[0] === draggingCard)
      ) {
        return 0
      }

      // Handle top of container drop
      if (mouseY < 44) {
        return 0
      }

      const draggingCardOrder = parseFloat(
        draggingCard?.getAttribute('data-order') ?? '0'
      )
      const isDraggingCardInThisColumn = data.sourceColumnId === props.column.id

      // Find nearest card and calculate order
      const { nearCard, currIndex } = findNearestCard(
        cards,
        draggingCard,
        container,
        dropPosition
      )

      if (nearCard) {
        const nearOrder = parseFloat(
          nearCard.getAttribute('data-order') ?? String(currIndex)
        )
        const increasingOrder = draggingCardOrder < nearOrder
        return increasingOrder && isDraggingCardInThisColumn
          ? nearOrder
          : nearOrder + 1
      }

      return 0
    }

    const findNearestCard = (
      cards: HTMLElement[],
      draggingCard: HTMLElement,
      container: HTMLElement,
      dropPosition: number
    ) => {
      const containerRect = container.getBoundingClientRect()
      const scrollTop = container.scrollTop

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        if (card === draggingCard) continue

        const cardRect = card.getBoundingClientRect()
        const cardTop = cardRect.top - containerRect.top + scrollTop
        const cardBottom = cardTop + cardRect.height

        if (Math.abs(cardTop - dropPosition) < 10) {
          return { nearCard: cards[i - 1] ?? null, currIndex: i }
        } else if (Math.abs(cardBottom - (dropPosition - 12)) < 10) {
          return { nearCard: card, currIndex: i }
        }
      }

      return { nearCard: null, currIndex: 0 }
    }

    const handleDrop = (event: DragEvent) => {
      event.preventDefault()
      isDropTarget.value = false

      if (!event.dataTransfer) return
      const data = getDragData(event)
      if (!data?.cardId || !data?.sourceColumnId) return

      // Check column limits
      const currentCount = props.column.cards?.length || 0
      if (
        isOverTheLimit(
          currentCount,
          props.column.limit,
          data.sourceColumnId,
          props.column.id
        )
      ) {
        return
      }

      const container = event.currentTarget as HTMLElement
      const mouseY =
        event.clientY -
        container.getBoundingClientRect().top +
        container.scrollTop

      const newOrder = calculateNewOrder(
        container,
        mouseY,
        data,
        dropPosition.value
      )

      emit('card-moved', {
        cardId: data.cardId,
        fromColumn: data.sourceColumnId,
        toColumn: props.column.id,
        newOrder
      })
    }

    const handleCardDragStart = (card: IKanbanCard) => {
      draggedCardColumnId.value = props.column.id
      emit('card-drag-start', card)
    }

    const handleDragEnd = () => {
      dropPosition.value = 0
      draggedCardColumnId.value = null
      isDropTarget.value = false
    }

    const handleCardTouchHover = (event: CustomEvent) => {
      const { _, clientY } = event.detail
      const columnContent = event.currentTarget as HTMLElement
      if (!columnContent) return

      const containerRect = columnContent.getBoundingClientRect()
      const scrollTop = columnContent.scrollTop || 0

      // Get all cards in this column
      const cards = Array.from(
        columnContent.querySelectorAll('.of-kanban-card')
      ) as HTMLElement[]

      const mouseY = clientY - containerRect.top + scrollTop

      // If mouse is near the top of the container
      if (mouseY < 24) {
        dropPosition.value = 12
        isDropTarget.value = true
        return
      }

      // If no cards, position at the top
      if (cards.length === 0) {
        dropPosition.value = 12
        isDropTarget.value = true
        return
      }

      // Find the card we're hovering over
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        if (card.classList.contains('of--is-dragging')) continue

        const cardRect = card.getBoundingClientRect()
        const cardTop = cardRect.top - containerRect.top + scrollTop
        const cardMiddle = cardTop + cardRect.height / 2

        if (mouseY < cardMiddle) {
          // Position above current card
          dropPosition.value = cardTop
          isDropTarget.value = true
          return
        }

        // If this is the last card and we're below its middle
        if (i === cards.length - 1) {
          dropPosition.value = cardTop + cardRect.height + 12
          isDropTarget.value = true
          return
        }
      }
    }

    const handleCardTouchDrop = (event: CustomEvent) => {
      const { dragData } = event.detail
      if (!dragData) return

      try {
        const data = JSON.parse(dragData)
        if (!data.cardId || !data.sourceColumnId) return

        // Check column limit before processing the drop
        if (props.column.limit !== undefined) {
          const currentCount = props.column.cards?.length || 0
          if (
            data.sourceColumnId !== props.column.id &&
            currentCount >= props.column.limit
          ) {
            return
          }
        }

        const columnContent = event.currentTarget as HTMLElement
        if (!columnContent) return

        const containerRect = columnContent.getBoundingClientRect()
        const scrollTop = columnContent.scrollTop || 0

        // Get all visible cards (excluding the dragging one)
        const cards = Array.from(
          columnContent.querySelectorAll(
            '.of-kanban-card:not(.of--is-selected)'
          )
        ) as HTMLElement[]

        // Calculate new order based on drop position
        let newOrder = 0

        if (cards.length === 0) {
          // If no cards, place at the beginning
          newOrder = 0
        } else {
          // Find the insertion point
          let currIndex = 0
          for (const card of cards) {
            const cardRect = card.getBoundingClientRect()
            const cardTop = cardRect.top - containerRect.top + scrollTop
            const cardMiddle = cardTop + cardRect.height / 2

            if (dropPosition.value - 12 <= cardMiddle) {
              break
            }
            currIndex++
          }
          newOrder = currIndex
        }

        const incresingOrder = data.cardOrder <= newOrder
        const isDraggingCardInThisColumn =
          data.sourceColumnId === props.column.id
        if (incresingOrder && isDraggingCardInThisColumn) newOrder++

        emit('card-moved', {
          cardId: data.cardId,
          fromColumn: data.sourceColumnId,
          toColumn: props.column.id,
          newOrder: newOrder
        })
      } catch (error) {
        console.error('Error handling drop:', error)
      }

      isDropTarget.value = false
    }

    const handleCardClick = (card: IKanbanCard) => {
      emit('card-click', card)
    }

    const handleColumnClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // If the click is on a card, do nothing
      if (target.closest('.of-kanban-card')) {
        return
      }

      emit('column-click', props.column)
    }

    const handleMenuItemClick = (item: string | number) => {
      emit('menu-item-click', item, props.column.id)
    }

    const compactedMenuItems = computed(() => {
      return props.menuItems?.map((item) => {
        return {
          text: item.text,
          value:
            typeof item.value === 'function'
              ? () => (item.value as Function)(props.column.id)
              : () => handleMenuItemClick(item.value as string | number)
        }
      })
    })

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

    return {
      isDropTarget,
      isAtLimit,
      sortedCards,
      dropIndicatorStyle,
      compactedMenuItems,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      handleCardDragStart,
      handleCardClick,
      handleDragEnd,
      handleColumnClick,
      handleCardTouchHover,
      handleCardTouchDrop
    }
  }
})
</script>

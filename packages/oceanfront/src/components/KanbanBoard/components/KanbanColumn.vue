<template>
  <div
    class="of-kanban-column"
    :class="{ 'of-is-collapsed': isCollapsed }"
    @dragend="handleDragEnd"
    @touchend="handleDragEnd"
    @click="handleColumnClick"
  >
    <div class="of-kanban-column-header">
      <div class="of-kanban-column-title">
        <h3>{{ column.title }}</h3>
        <span class="of-kanban-column-count">
          {{ column.total || column.cards?.length || 0 }}
          <template v-if="column.limit"> / {{ column.limit }} </template>
        </span>
      </div>
      <div class="of-kanban-column-actions">
        <of-button
          variant="text"
          class="of-kanban-column-collapse-button"
          :icon="isCollapsed ? 'expand open' : 'expand close'"
          size="sm"
          @click.stop="$emit('collapse-toggle', column.id)"
        />
        <of-button
          v-if="compactedMenuItems.length > 0 && !isCollapsed"
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
      @scroll="debouncedHandleScroll"
      ref="columnContentRef"
    >
      <kanban-card
        v-for="card in sortedCards"
        :key="card.id"
        :card="card"
        :column-id="column.id"
        :is-selected="selectedCardId === card.id"
        :dragged-card-id="draggedCardId"
        :card-menu-items="cardMenuItems"
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
      <div
        v-if="isDropTarget"
        :style="dropIndicatorStyle"
        class="of-kanban-column-drop-indicator"
      />
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
  CSSProperties,
  onUnmounted
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
import {
  calculateDropPosition,
  calculateNewOrder,
  getDragData,
  isOverTheLimit,
  debounce
} from '../utils'

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
    cardMenuItems: {
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
    },
    activeColumnId: {
      type: String as PropType<string | null | undefined>,
      default: undefined
    },
    hasMore: {
      type: Boolean,
      default: false
    },
    isCollapsed: {
      type: Boolean,
      default: false
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
    'column-click': (_column: IKanbanColumn) => true,
    'set-active-column': (_columnId: string | null) => true,
    'load-more': null,
    'collapse-toggle': (_columnId: string) => true
  },

  setup(props, { emit }) {
    const isDropTarget = computed(
      () => props.activeColumnId === props.column.id
    )
    const dropPosition = ref(0)
    const draggedCardColumnId = ref<string | null>(null)
    const clearDropTargetTimeout = ref<number | null>(null)

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
      const mouseY =
        event.clientY -
        container.getBoundingClientRect().top +
        container.scrollTop
      const draggingCard = container.querySelector(
        '.of-kanban-card.of--is-dragging'
      ) as HTMLElement

      dropPosition.value = calculateDropPosition(
        container,
        mouseY,
        draggingCard
      )
      emit('set-active-column', props.column.id)
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
      emit('set-active-column', props.column.id)
    }

    const handleDragLeave = (event: DragEvent) => {
      // Only hide indicator if we're leaving the column content area
      const relatedTarget = event.relatedTarget as HTMLElement
      const currentColumn = event.currentTarget as HTMLElement
      if (!relatedTarget || !currentColumn.contains(relatedTarget)) {
        emit('set-active-column', null)
      }
    }

    const handleDrop = (event: DragEvent) => {
      event.preventDefault()
      emit('set-active-column', null)

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
        dropPosition.value,
        props.column.id
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
      emit('set-active-column', null)
    }

    const handleCardTouchHover = (event: CustomEvent) => {
      const { clientY } = event.detail
      const container = event.currentTarget as HTMLElement
      if (!container) return

      if (clearDropTargetTimeout.value) {
        clearTimeout(clearDropTargetTimeout.value)
        clearDropTargetTimeout.value = null
      }

      if (
        isOverTheLimit(
          props.column.cards?.length || 0,
          props.column.limit,
          draggedCardColumnId.value ?? '',
          props.column.id
        )
      ) {
        emit('set-active-column', null)
        return
      }

      const columnRect = container.getBoundingClientRect()
      // Add a buffer zone of 20px around the column
      const buffer = 20
      if (
        clientY >= columnRect.top - buffer &&
        clientY <= columnRect.bottom + buffer &&
        event.detail.clientX >= columnRect.left - buffer &&
        event.detail.clientX <= columnRect.right + buffer
      ) {
        const mouseY = clientY - columnRect.top + (container.scrollTop || 0)
        dropPosition.value = calculateDropPosition(container, mouseY)
        emit('set-active-column', props.column.id)
      } else {
        // Set a timeout before clearing the drop target
        clearDropTargetTimeout.value = window.setTimeout(() => {
          emit('set-active-column', null)
        }, 150) // 150ms delay
      }
    }

    const handleCardTouchDrop = (event: CustomEvent) => {
      const data = getDragData(event)
      if (!data) return
      if (!data.cardId || !data.sourceColumnId) {
        emit('set-active-column', null)
        return
      }

      if (
        isOverTheLimit(
          props.column.cards?.length || 0,
          props.column.limit,
          data.sourceColumnId,
          props.column.id
        )
      ) {
        emit('set-active-column', null)
        return
      }

      const columnContent = event.currentTarget as HTMLElement
      if (!columnContent) {
        emit('set-active-column', null)
        return
      }

      const containerRect = columnContent.getBoundingClientRect()
      const scrollTop = columnContent.scrollTop || 0

      // Verify we're actually dropping in this column
      if (
        event.detail.clientY < containerRect.top ||
        event.detail.clientY > containerRect.bottom ||
        event.detail.clientX < containerRect.left ||
        event.detail.clientX > containerRect.right
      ) {
        emit('set-active-column', null)
        return
      }

      // Get all visible cards (excluding the dragging one)
      const cards = Array.from(
        columnContent.querySelectorAll('.of-kanban-card:not(.of--is-selected)')
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
      const isDraggingCardInThisColumn = data.sourceColumnId === props.column.id
      if (incresingOrder && isDraggingCardInThisColumn) newOrder++

      emit('card-moved', {
        cardId: data.cardId,
        fromColumn: data.sourceColumnId,
        toColumn: props.column.id,
        newOrder: newOrder
      })

      emit('set-active-column', null)
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
      top: `${dropPosition.value - 6}px`
    }))

    const columnContentRef = ref<HTMLElement | null>(null)
    const SCROLL_THRESHOLD = 100 // pixels before bottom to trigger load more

    const handleScroll = () => {
      if (!columnContentRef.value || !props.hasMore) return

      const { scrollTop, scrollHeight, clientHeight } = columnContentRef.value

      if (scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD) {
        emit('load-more', props.column.id)
      }
    }

    // Debounce the scroll handler with 10ms delay
    const debouncedHandleScroll = debounce(handleScroll, 10)

    onUnmounted(() => {
      if (clearDropTargetTimeout.value) {
        clearTimeout(clearDropTargetTimeout.value)
      }
    })

    return {
      isDropTarget,
      isAtLimit,
      sortedCards,
      dropIndicatorStyle,
      compactedMenuItems,
      columnContentRef,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      handleCardDragStart,
      handleCardClick,
      handleDragEnd,
      handleColumnClick,
      handleCardTouchHover,
      handleCardTouchDrop,
      debouncedHandleScroll
    }
  }
})
</script>

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
      ref="columnContentRef"
    >
      <div class="of-kanban-top-spacer" :style="topSpacerStyle" />

      <!-- Tiny spinner shown above loaded cards when loading the previous page -->
      <div
        v-if="isLoading && windowTopCount > 0"
        class="of-kanban-load-indicator of-kanban-load-indicator--top"
      >
        <span class="of-kanban-load-indicator__dot" />
        <span class="of-kanban-load-indicator__dot" />
        <span class="of-kanban-load-indicator__dot" />
      </div>

      <!-- Skeleton cards shown only while column data is explicitly not loaded -->
      <template v-if="!isLoaded && sortedCards.length === 0">
        <div v-for="i in 4" :key="i" class="of-kanban-skeleton-card">
          <div
            class="of-kanban-skeleton-card__line of-kanban-skeleton-card__line--short"
          />
          <div
            class="of-kanban-skeleton-card__line of-kanban-skeleton-card__line--long"
          />
        </div>
      </template>

      <kanban-card
        v-for="card in sortedCards"
        :key="card.id"
        :card="card"
        :column-id="column.id"
        :is-selected="selectedCardId === card.id"
        :dragged-card-id="draggedCardId"
        :card-menu-items="cardMenuItems"
        :dependency-stripe-color="
          dependencyStripeColorByCardKey[getDependencyCardKey(card)]
        "
        :is-dependency-related="
          dependencyRelatedKeys.has(getDependencyCardKey(card))
        "
        :is-dependency-dimmed="
          dependencyDimmedKeys.has(getDependencyCardKey(card))
        "
        :dependencies-enabled="dependenciesEnabled"
        @card-click="handleCardClick"
        @drag-start="handleCardDragStart"
        @hover-change="handleCardHoverChange(card, $event)"
        @project-click="$emit('project-click', $event)"
        @assignee-click="$emit('assignee-click', $event)"
        @card-title-click="$emit('card-title-click', $event)"
        @card-tag-click="$emit('card-tag-click', $event)"
        @card-menu-item-click="$emit('card-menu-item-click', $event, card)"
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
      <!-- Tiny spinner shown below loaded cards when loading the next page -->
      <div
        v-if="isLoading && sortedCards.length > 0"
        class="of-kanban-load-indicator of-kanban-load-indicator--bottom"
      >
        <span class="of-kanban-load-indicator__dot" />
        <span class="of-kanban-load-indicator__dot" />
        <span class="of-kanban-load-indicator__dot" />
      </div>

      <div class="of-kanban-bottom-spacer" :style="bottomSpacerStyle" />
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
        <slot name="create-button"> Create Issue </slot>
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
  watch,
  nextTick,
  CSSProperties,
  onMounted,
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
    isLoading: {
      type: Boolean,
      default: false
    },
    isLoaded: {
      type: Boolean,
      default: false
    },
    windowTopCount: {
      type: Number,
      default: 0
    },
    windowBottomCount: {
      type: Number,
      default: 0
    },
    estimatedCardHeight: {
      type: Number,
      default: 80
    },
    scrollThreshold: {
      type: Number,
      default: 100
    },
    isCollapsed: {
      type: Boolean,
      default: false
    },
    dependenciesEnabled: {
      type: Boolean,
      default: false
    },
    dependencyStripeColorByCardKey: {
      type: Object as PropType<Record<string, string | undefined>>,
      default: () => ({})
    },
    dependencyRelatedKeys: {
      type: Object as PropType<Set<string>>,
      default: () => new Set<string>()
    },
    dependencyDimmedKeys: {
      type: Object as PropType<Set<string>>,
      default: () => new Set<string>()
    },
    getDependencyCardKey: {
      type: Function as PropType<(card: IKanbanCard) => string>,
      default: (card: IKanbanCard) => `${typeof card.id}:${String(card.id)}`
    }
  },
  emits: {
    'add-card': null,
    'menu-item-click': (_item: string | number, _columnId: string) => true,
    'card-menu-item-click': (_item: string | number, _card: IKanbanCard) =>
      true,
    'card-click': (_card: IKanbanCard) => true,
    'project-click': (_project: IKanbanProject | undefined) => true,
    'assignee-click': (_assignee: IKanbanCardAssignee | undefined) => true,
    'card-title-click': (_card: IKanbanCard) => true,
    'card-tag-click': (_tag: string) => true,
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
    'load-previous': null,
    'collapse-toggle': (_columnId: string) => true,
    'card-hover-change': (_card: IKanbanCard, _isHovering: boolean) => true
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
      let newOrder: number

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

    const handleCardHoverChange = (card: IKanbanCard, isHovering: boolean) => {
      emit('card-hover-change', card, isHovering)
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

    // Top spacer uses real measured DOM heights of evicted cards (accurate for scroll anchoring)
    const topSpacerHeight = ref(0)

    const topSpacerStyle = computed<CSSProperties>(() => ({
      height: `${topSpacerHeight.value}px`,
      flexShrink: '0'
    }))

    const bottomSpacerStyle = computed<CSSProperties>(() => ({
      height: `${props.windowBottomCount * props.estimatedCardHeight}px`,
      flexShrink: '0'
    }))

    // When windowTopCount drops to 0, reset top spacer (full reload / initial hydration)
    watch(
      () => props.windowTopCount,
      (n) => {
        if (n === 0) topSpacerHeight.value = 0
      }
    )

    // After the top spacer grows due to eviction, overflow-anchor adjusts scrollTop silently
    // (no scroll event fires). Re-evaluate the load-previous condition post-DOM-update so the
    // user doesn't see a frozen empty zone when they're already inside the trigger range.
    watch(
      topSpacerHeight,
      () => {
        nextTick(() => handleScroll())
      },
      { flush: 'post' }
    )

    // Measure top-space changes before Vue updates DOM (flush:'pre').
    // We track cards + windowTopCount together so we can distinguish:
    // - load-more eviction from top  => windowTopCount increases
    // - load-previous prepend        => windowTopCount decreases
    // This avoids relying on array-length growth, because prepend often keeps
    // length constant (it prepends and evicts from bottom in the same update).
    watch(
      [() => props.column.cards, () => props.windowTopCount],
      ([newCards, newWindowTop], [oldCards, oldWindowTop]) => {
        if (!oldCards?.length || !newCards) return
        const allCardEls = Array.from(
          columnContentRef.value?.querySelectorAll('.of-kanban-card') ?? []
        ) as HTMLElement[]

        // Eviction from top (window sliding): first card changed and server window moved forward.
        const firstNewId = newCards[0]?.id
        const firstNewIndexInOld =
          firstNewId != null
            ? oldCards.findIndex((c) => c.id === firstNewId)
            : -1
        if (firstNewIndexInOld > 0 && newWindowTop > oldWindowTop) {
          let evictedPx = 0
          for (
            let i = 0;
            i < firstNewIndexInOld && i < allCardEls.length;
            i++
          ) {
            evictedPx += allCardEls[i].getBoundingClientRect().height
          }
          topSpacerHeight.value += evictedPx
        }

        // Prepend (load-previous): server window moved backward.
        const firstOldId = oldCards[0]?.id
        const firstOldIndexInNew =
          firstOldId != null
            ? newCards.findIndex((c) => c.id === firstOldId)
            : -1
        if (firstOldIndexInNew > 0 && newWindowTop < oldWindowTop) {
          // New cards are not in the DOM yet (flush: 'pre') — measure after nextTick then shrink spacer
          nextTick(() => {
            const updatedCardEls = Array.from(
              columnContentRef.value?.querySelectorAll('.of-kanban-card') ?? []
            ) as HTMLElement[]
            let prependedPx = 0
            for (
              let i = 0;
              i < firstOldIndexInNew && i < updatedCardEls.length;
              i++
            ) {
              prependedPx += updatedCardEls[i].getBoundingClientRect().height
            }
            topSpacerHeight.value = Math.max(
              0,
              topSpacerHeight.value - prependedPx
            )
          })
          return
        }

        // Fallback: if IDs shifted unexpectedly during backward paging, still
        // shrink spacer approximately by count delta to avoid prolonged empty area.
        if (newWindowTop < oldWindowTop) {
          const delta = oldWindowTop - newWindowTop
          if (delta > 0) {
            const approxPx = delta * props.estimatedCardHeight
            topSpacerHeight.value = Math.max(
              0,
              topSpacerHeight.value - approxPx
            )
          }
        }
      },
      { flush: 'pre', deep: false }
    )

    const handleScroll = () => {
      if (!columnContentRef.value) return
      const { scrollTop, scrollHeight, clientHeight } = columnContentRef.value
      const isNearTop =
        props.windowTopCount > 0 &&
        scrollTop <= topSpacerHeight.value + props.scrollThreshold

      // Prioritize backfill from top. When we're near top, firing load-more in the same
      // tick can bounce the window forward again after prepend completes.
      if (isNearTop) {
        emit('load-previous', props.column.id)
        return
      }

      // Scroll near the end of loaded cards → load next page.
      // The bottom spacer represents off-screen cards; its height is subtracted so the trigger
      // fires when the user reaches the last loaded card, not the absolute scroll bottom.
      const bottomSpacerHeight =
        props.windowBottomCount * props.estimatedCardHeight
      const remaining = scrollHeight - scrollTop - clientHeight
      if (
        props.hasMore &&
        remaining <= bottomSpacerHeight + props.scrollThreshold
      ) {
        emit('load-more', props.column.id)
      }

      // Top trigger handled first above to avoid load-more/load-previous ping-pong.
    }

    // Debounce the scroll handler with 10ms delay
    const debouncedHandleScroll = debounce(handleScroll, 10)

    onMounted(() => {
      if (columnContentRef.value) {
        columnContentRef.value.addEventListener(
          'scroll',
          debouncedHandleScroll,
          { passive: true }
        )
      }
    })

    onUnmounted(() => {
      if (clearDropTargetTimeout.value) {
        clearTimeout(clearDropTargetTimeout.value)
      }
      if (columnContentRef.value) {
        columnContentRef.value.removeEventListener(
          'scroll',
          debouncedHandleScroll
        )
      }
    })

    return {
      isDropTarget,
      isAtLimit,
      sortedCards,
      dropIndicatorStyle,
      topSpacerStyle,
      bottomSpacerStyle,
      compactedMenuItems,
      columnContentRef,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      handleCardDragStart,
      handleCardClick,
      handleCardHoverChange,
      handleDragEnd,
      handleColumnClick,
      handleCardTouchHover,
      handleCardTouchDrop
    }
  }
})
</script>

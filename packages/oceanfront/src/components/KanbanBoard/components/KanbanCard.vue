<template>
  <div
    role="article"
    class="of-kanban-card of--elevated-1"
    :aria-label="cardAccessibleLabel"
    :class="{
      'of--is-dragging': isCardDragging,
      'of--is-selected': isSelected,
      'of--has-dependency-stripe':
        !!dependencyStripeColor && dependenciesEnabled,
      'of--dependency-related': isDependencyRelated && dependenciesEnabled,
      'of--dependency-dimmed': isDependencyDimmed && dependenciesEnabled
    }"
    :style="dependencyStyle"
    :data-order="card.order"
    draggable="true"
    @dragstart="handleDragStart"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @click="handleCardClick"
    @keydown.enter.prevent="handleCardClick"
    @keydown.space.prevent.stop="handleCardClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focus="handleFocus"
    @blur="handleBlur"
    tabindex="0"
  >
    <div class="card-content">
      <div class="of-kanban-card-header">
        <div class="project-container">
          <slot name="project" :card="card">
            <div class="project-icon" v-if="card.project?.name">
              <of-icon :name="card.project?.icon ?? 'mobile'" decorative />
            </div>
            <div class="project-name" v-if="card.project?.name">
              <div
                class="project-text"
                @click="$emit('project-click', card.project)"
              >
                {{ card.project?.name }}
              </div>
            </div>
          </slot>
          <div class="of-kanban-card-actions" v-if="isHovering || isFocused">
            <of-button
              v-if="compactedMenuItems.length > 0"
              variant="text"
              icon="more"
              size="sm"
              :aria-label="lang.kanbanCardActionsMenu"
              :items="compactedMenuItems"
            />
          </div>
        </div>
        <slot name="avatar" :card="card">
          <div
            class="of-kanban-avatar"
            v-if="card.assignee"
            role="button"
            tabindex="0"
            :aria-label="card.assignee.name"
            @click="$emit('assignee-click', card.assignee)"
            @keydown.enter.prevent="$emit('assignee-click', card.assignee)"
            @keydown.space.prevent="$emit('assignee-click', card.assignee)"
            :title="card.assignee.name"
          >
            <img
              v-if="card.assignee.avatar"
              :src="card.assignee.avatar"
              :alt="card.assignee.name"
              class="avatar-image"
            />
            <div v-else class="avatar-text">
              {{ assigneeInitials }}
            </div>
          </div>
        </slot>
      </div>
      <div class="title-container">
        <slot name="title" :card="card">
          <div class="title-text" @click="$emit('card-title-click', card)">
            {{ card.title }}
          </div>
        </slot>
      </div>
      <div class="tags-container">
        <div class="card-tags" v-for="tag in card.tags" :key="tag">
          <of-button
            variant="outlined"
            icon=""
            size="sm"
            tabindex="0"
            :aria-label="`${lang.kanbanFilterByTag} ${tag}`"
            @click.stop="$emit('card-tag-click', tag)"
          >
            {{ tag }}
          </of-button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, ref, type PropType } from 'vue'
import { OfIcon } from '../../Icon'
import type { IKanbanCard } from '../types'
import { getInitials } from '../utils'
import { Item } from '../../../lib/items_list'
import { useLanguage } from '../../../lib/language'

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
    columnTitle: {
      type: String,
      default: ''
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    draggedCardId: {
      type: [String, Number] as PropType<string | number | undefined>,
      default: undefined
    },
    cardMenuItems: {
      type: Array as PropType<Item[]>,
      default: () => []
    },
    hovering: {
      type: Boolean,
      default: false
    },
    dependenciesEnabled: {
      type: Boolean,
      default: false
    },
    dependencyStripeColor: {
      type: String as PropType<string | undefined>,
      default: undefined
    },
    isDependencyRelated: {
      type: Boolean,
      default: false
    },
    isDependencyDimmed: {
      type: Boolean,
      default: false
    }
  },
  emits: {
    'drag-start': null,
    'project-click': null,
    'assignee-click': null,
    'card-title-click': null,
    'card-click': null,
    'card-blur': null,
    'card-menu-item-click': (_item: string | number, _card: IKanbanCard) =>
      true,
    'card-tag-click': null,
    'filter-change': null,
    'hover-change': (_isHovering: boolean) => true
  },
  setup(props, { emit }) {
    const lang = useLanguage()
    const cardAccessibleLabel = computed(() => {
      const raw = props.card.title?.trim()
      const title = raw || lang.value.kanbanUntitledCard
      const col = props.columnTitle?.trim()
      return col ? `${title}, ${col}` : title
    })
    const isCardDragging = computed<boolean>(
      () => props.draggedCardId === props.card.id
    )

    const isFocused = ref(false)

    const handleFocus = () => {
      isFocused.value = true
    }

    const handleBlur = () => {
      isFocused.value = false
      emit('card-blur', props.card)
    }

    const handleCardClick = () => {
      emit('card-click', props.card)
    }

    const handleMenuItemClick = (item: string | number) => {
      emit('card-menu-item-click', item.toString(), props.card)
    }

    const isHovering = ref(props.hovering)

    const handleMouseEnter = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.of-kanban-card')) {
        isHovering.value = true
        emit('hover-change', true)
      }
    }

    const handleMouseLeave = (event: MouseEvent) => {
      if (
        !(event.relatedTarget as HTMLElement)?.closest('.of-kanban-card') &&
        !(event.relatedTarget as HTMLElement)?.closest('.of-list-item')
      ) {
        isHovering.value = false
        emit('hover-change', false)
      }
    }

    const compactedMenuItems = computed(() => {
      return props.cardMenuItems?.map((item) => {
        return {
          text: item.text,
          value:
            typeof item.value === 'function'
              ? () => (item.value as Function)(props.card.id)
              : () => handleMenuItemClick(item.value as string | number)
        }
      })
    })

    const assigneeInitials = computed<string>(() => {
      const name = props.card.assignee?.name
      //Anonimus
      if (!name) return 'AN'

      return getInitials(name)
    })

    const dependencyStyle = computed<Record<string, string>>(() => {
      if (!props.dependenciesEnabled || !props.dependencyStripeColor)
        return {} as Record<string, string>
      return {
        '--of-kanban-dep-color': props.dependencyStripeColor
      } as Record<string, string>
    })

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

    let touchTimeout: number | null = null
    let isDragging = false
    let initialTouchY = 0
    let initialTouchX = 0
    let cardElement: HTMLElement | null = null
    let initialCardRect: DOMRect | null = null

    const handleTouchStart = (event: TouchEvent) => {
      cardElement = event.currentTarget as HTMLElement
      const touch = event.touches[0]
      initialTouchY = touch.clientY
      initialTouchX = touch.clientX
      initialCardRect = cardElement.getBoundingClientRect()

      touchTimeout = window.setTimeout(() => {
        isDragging = true
        cardElement?.classList.add('of--is-dragging')

        // Create and store drag data
        const dragData = {
          cardId: props.card.id,
          cardOrder: props.card.order,
          sourceColumnId: props.columnId,
          cardRect: {
            top: initialCardRect?.top,
            left: initialCardRect?.left,
            width: initialCardRect?.width,
            height: initialCardRect?.height
          }
        }

        // Store the drag data in the element
        cardElement?.setAttribute('data-drag-data', JSON.stringify(dragData))

        emit('drag-start', props.card)
      }, 200)
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging || !cardElement || !initialCardRect) {
        if (touchTimeout) {
          clearTimeout(touchTimeout)
          touchTimeout = null
        }
        return
      }

      event.preventDefault()
      const touch = event.touches[0]
      const moveX = touch.clientX - initialTouchX
      const moveY = touch.clientY - initialTouchY

      // Set the initial position before applying transform
      cardElement.style.position = 'fixed'
      cardElement.style.top = `${initialCardRect.top}px`
      cardElement.style.left = `${initialCardRect.left}px`
      cardElement.style.width = `${initialCardRect.width}px`
      cardElement.style.zIndex = '1000'
      cardElement.style.transform = `translate(${moveX}px, ${moveY}px)`

      // Get the element under the touch point
      const elementUnderTouch = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      )

      // Find the closest column content
      const columnContent = elementUnderTouch?.closest(
        '.of-kanban-column-content'
      )
      if (columnContent) {
        columnContent.dispatchEvent(
          new CustomEvent('card-touch-hover', {
            detail: {
              clientX: touch.clientX,
              clientY: touch.clientY,
              dragData: cardElement.getAttribute('data-drag-data'),
              cardRect: initialCardRect
            },
            bubbles: true
          })
        )
      }
    }

    const handleTouchEnd = (event: TouchEvent) => {
      if (touchTimeout) {
        clearTimeout(touchTimeout)
        touchTimeout = null
      }

      if (!isDragging || !cardElement || !initialCardRect) return

      event.preventDefault()
      isDragging = false

      // Reset card styles
      cardElement.style.position = ''
      cardElement.style.top = ''
      cardElement.style.left = ''
      cardElement.style.width = ''
      cardElement.style.zIndex = ''
      cardElement.style.transform = ''
      cardElement.classList.remove('of--is-dragging')

      // Get the element under the touch point
      const touch = event.changedTouches[0]
      const elementUnderTouch = document.elementFromPoint(
        touch.clientX,
        touch.clientY
      )

      // Find the closest column content
      const columnContent = elementUnderTouch?.closest(
        '.of-kanban-column-content'
      )
      if (columnContent) {
        columnContent.dispatchEvent(
          new CustomEvent('card-touch-drop', {
            detail: {
              clientX: touch.clientX,
              clientY: touch.clientY,
              dragData: cardElement.getAttribute('data-drag-data'),
              cardRect: initialCardRect
            },
            bubbles: true
          })
        )
      }

      cardElement.removeAttribute('data-drag-data')
      cardElement = null
      initialCardRect = null
    }

    return {
      lang,
      cardAccessibleLabel,
      isCardDragging,
      handleDragStart,
      assigneeInitials,
      isFocused,
      handleFocus,
      handleBlur,
      handleCardClick,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleMouseEnter,
      handleMouseLeave,
      isHovering,
      compactedMenuItems,
      dependencyStyle
    }
  }
})
</script>

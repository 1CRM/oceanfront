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
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @click="handleCardClick"
    @blur="handleBlur"
    tabindex="0"
  >
    <div class="card-content">
      <div class="of-kanban-card-header">
        <div class="project-container">
          <slot name="project" :card="card">
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
          </slot>
        </div>
        <slot name="avatar" :card="card">
          <div
            class="of-kanban-avatar"
            v-if="card.assignee"
            @click="$emit('assignee-click', card.assignee)"
            :title="card.assignee.name"
          >
            <img
              v-if="card.assignee.avatar"
              :src="card.assignee.avatar"
              :alt="card.assignee.name"
              class="avatar-image"
            />
            <div v-else class="avatar-text">{{ assigneeInitials }}</div>
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
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue'
import { OfIcon } from '../../Icon'
import type { IKanbanCard } from '../types'
import { getInitials } from '../utils'

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

      return getInitials(name)
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
      isCardDragging,
      handleDragStart,
      assigneeInitials,
      handleBlur,
      handleCardClick,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd
    }
  }
})
</script>

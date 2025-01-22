<template>
  <div
    class="of-kanban-card"
    :class="{
      'of--is-dragging': isDragging,
      'of--is-selected': isSelected
    }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @click="$emit('click', card)"
  >
    <div class="card-content">
      <div class="of-kanban-card-header">
        <div class="project-container">
          <div class="project-icon">
            <of-icon name="mobile" size="sm" />
          </div>
          <div class="project-name">
            <div class="project-text">{{ card.project }}</div>
          </div>
        </div>
        <div class="of-kanban-avatar" v-if="card.assignee">
          <div class="avatar-text">{{ card.assignee.initials }}</div>
        </div>
      </div>
      <div class="title-container">
        <div class="title-text">{{ card.title }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
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
    isDragging: {
      type: Boolean,
      default: false
    },
    isSelected: {
      type: Boolean,
      default: false
    }
  },

  emits: ['click', 'drag-start', 'drag-end'],

  setup(props, { emit }) {
    const handleDragStart = (event: DragEvent) => {
      if (!event.dataTransfer) return

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

    const formatDate = (date: string | Date) => {
      // We can add proper date formatting later
      return new Date(date).toLocaleDateString()
    }

    return {
      handleDragStart,
      handleDragEnd,
      formatDate
    }
  }
})
</script>

<style lang="scss">
.of-kanban-card {
  background: white;
  border-radius: 3px;
  padding: 12px;
  cursor: grab;
  user-select: none;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  gap: 12px;

  &:hover {
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.12);
  }

  &.of--is-dragging {
    opacity: 0.5;
  }

  &.of--is-selected {
    outline: 2px solid #0052cc;
  }

  .card-content {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .of-kanban-card-header {
      align-self: stretch;
      justify-content: flex-start;
      align-items: center;
      gap: 8px;
      display: inline-flex;

      .project-container {
        flex: 1 1 0;
        height: 18px;
        display: flex;
        align-items: center;
        gap: 4px;

        .project-icon {
          width: 16px;
          height: 16px;
          padding: 1.33px 2.67px 1.37px 2.7px;
          justify-content: center;
          align-items: center;
          display: flex;
        }

        .project-name {
          flex: 1 1 0;
          height: 18px;
          display: flex;
          align-items: center;
          gap: 10px;

          .project-text {
            color: #151713;
            font-size: 13px;
            font-family: Roboto;
            font-weight: 500;
            line-height: 18.2px;
            word-wrap: break-word;
          }
        }
      }

      .of-kanban-avatar {
        width: 24px;
        height: 24px;
        padding: 1px;
        background: #246874;
        border-radius: 1000px;
        box-shadow: 0px 0px 0px 1px white;
        overflow: hidden;
        display: inline-flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 10px;

        .avatar-text {
          align-self: stretch;
          text-align: center;
          color: white;
          font-size: 11px;
          font-family: Roboto;
          font-weight: 300;
          line-height: 12.1px;
          word-wrap: break-word;
        }
      }
    }

    .title-container {
      align-self: stretch;
      justify-content: flex-start;
      align-items: flex-start;
      gap: 4px;
      display: inline-flex;

      .title-text {
        flex: 1 1 0;
        color: black;
        font-size: 16px;
        font-family: Roboto;
        font-weight: 500;
        line-height: 19.2px;
        word-wrap: break-word;
      }
    }
  }
}
</style>

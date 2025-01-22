<template>
  <div class="container">
    <h1>Kanban Board</h1>
    <of-highlight lang="html" :value="sampleCode" />

    <of-kanban-board
      :columns="columns"
      @card-moved="onCardMoved"
      @add-card="onAddCard"
      @card-click="onCardClick"
      @column-menu="onColumnMenu"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import type { IKanbanCard, IKanbanColumn, CardMovedEvent } from 'oceanfront'

export default defineComponent({
  setup() {
    const columns = ref<IKanbanColumn[]>([
      {
        id: 'todo',
        title: 'To Do',
        limit: 5,
        cards: [
          {
            id: 'card-1',
            title: 'Implement Drag and Drop',
            project: 'Project 1',
            order: 0,
            assignee: {
              initials: 'AI'
            }
          },
          {
            id: 'card-2',
            title: 'Add Card Details Modal',
            project: 'Project 2',
            order: 1,
            assignee: {
              initials: 'AB'
            }
          }
        ]
      },
      {
        id: 'in-progress',
        title: 'In Progress',
        limit: 3,
        cards: [
          {
            id: 'card-3',
            title: 'Style Improvements',
            project: 'Project 3',
            order: 0,
            assignee: {
              initials: 'AC'
            }
          }
        ]
      },
      {
        id: 'done',
        title: 'Done',
        cards: [
          {
            id: 'card-4',
            title: 'Basic Component Setup',
            project: 'Project 4',
            order: 0,
            assignee: {
              initials: 'AD'
            }
          }
        ]
      }
    ])

    const sampleCode = `
<of-kanban-board
  :columns="columns"
  @card-moved="onCardMoved"
  @add-card="onAddCard"
  @card-click="onCardClick"
  @column-menu="onColumnMenu"
/>
`

    const onCardMoved = (event: CardMovedEvent) => {
      console.log('Card moved:', event)
    }

    const onAddCard = (columnId: string) => {
      console.log('Add card to column:', columnId)
    }

    const onCardClick = (card: IKanbanCard) => {
      console.log('Card clicked:', card)
    }

    const onColumnMenu = (event: {
      column: IKanbanColumn
      event: MouseEvent
    }) => {
      console.log('Column menu:', event)
    }

    return {
      columns,
      sampleCode,
      onCardMoved,
      onAddCard,
      onCardClick,
      onColumnMenu
    }
  }
})
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 16px;

  h1 {
    margin: 0;
  }
}
</style>

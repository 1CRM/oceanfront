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
            description: 'Add drag and drop functionality to cards',
            order: 0,
            assignees: [
              { id: 'user1', name: 'John Doe', avatar: '/avatars/john.jpg' }
            ]
          },
          {
            id: 'card-2',
            title: 'Add Card Details Modal',
            description: 'Create a modal for viewing and editing card details',
            order: 1
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
            description: 'Update card and column styling',
            order: 0,
            assignees: [
              { id: 'user2', name: 'Jane Smith', avatar: '/avatars/jane.jpg' }
            ]
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
            description: 'Initial setup of Kanban components',
            order: 0
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

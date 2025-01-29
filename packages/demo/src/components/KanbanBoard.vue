<template>
  <div class="container">
    <h1>Kanban Board</h1>
    <of-highlight lang="html" :value="sampleCode" />

    <of-kanban-board
      v-model:columns="columns"
      @card-moved="handleCardMoved"
      @add-card="handleAddCard"
      @card-click="handleCardClick"
      @project-click="onProjectClick"
      @assignee-click="onAssigneeClick"
      @card-title-click="onCardTitleClick"
      @column-menu="onColumnMenu"
    >
      <template #card-title="{ card }">
        <div class="custom-title" @click="onCardTitleClick(card)">
          {{ card.title }} Bbieg
        </div>
      </template>
      <template #project="{ card }">
        <div class="project-icon">
          <of-icon :name="card.project?.icon ?? 'mobile'" />
        </div>
        <div class="project-name">
          <div class="project-text" @click="onProjectClick(card.project)">
            {{ card.project?.name }}
          </div>
        </div>
      </template>
      <template #avatar=""></template>
    </of-kanban-board>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import type {
  IKanbanCard,
  IKanbanColumn,
  CardMovedEvent,
  IKanbanProject,
  IKanbanAssignee
} from 'oceanfront'

export default defineComponent({
  setup() {
    const columns = ref<IKanbanColumn[]>([
      {
        id: 'todo',
        title: 'To Do',
        limit: 7,
        cards: [
          {
            id: 'card-1',
            title:
              'Kanban Board: Create components hierarchy and create base component',
            project: {
              id: 'project-1',
              name: 'Project 1',
              icon: 'mobile'
            },
            order: 0,
            assignee: {
              id: 'assignee-1',
              name: 'Michael Whitehead',
              avatar:
                'https://1crm9-demo.1crmcloud.com/files/images/directory/1/MichaelWhitehead.png'
            }
          },
          {
            id: 'card-2',
            title: 'Kanban Board: Create KanbanColumn component',
            project: {
              id: 'project-2',
              name: 'Project 2',
              icon: 'email'
            },
            order: 1,
            assignee: {
              id: 'assignee-2',
              name: 'Bob Smith'
            }
          },
          {
            id: 'card-33',
            title: 'Test card 1',
            project: {
              id: 'project-3',
              name: 'Project 3',
              icon: 'email'
            },
            order: 2,
            assignee: {
              id: 'assignee-3',
              name: 'Charlie Brown'
            }
          },
          {
            id: 'card-34',
            title: 'Test card 2',
            project: {
              id: 'project-4',
              name: 'Project 3',
              icon: 'email'
            },
            order: 3,
            assignee: {
              id: 'assignee-4',
              name: 'Alex Johnson'
            }
          },
          {
            id: 'card-35',
            title: 'Test card 3',
            project: {
              id: 'project-4',
              name: 'Project 3',
              icon: 'email'
            },
            order: 4,
            assignee: {
              id: 'assignee-4',
              name: 'Alex Johnson'
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
            project: {
              id: 'project-3',
              name: 'Project 3',
              icon: 'mobile'
            },
            order: 0,
            assignee: {
              id: 'assignee-3',
              name: 'Charlie Brown'
            }
          }
        ]
      },
      {
        id: 'test',
        title: 'Reviewe & Test',
        cards: [
          {
            id: 'card-5',
            title: 'Kanban Board: Implement Basic Drag-and-Drop',
            project: {
              id: 'project-5',
              name: 'Project 5',
              icon: 'email'
            },
            order: 0,
            assignee: {
              id: 'assignee-5',
              name: 'Alex Johnson'
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
            project: {
              id: 'project-4',
              name: 'Project 4',
              icon: 'mobile'
            },
            order: 0,
            assignee: {
              id: 'assignee-4',
              name: 'David Lee'
            }
          }
        ]
      },
      {
        id: 'empty',
        title: 'Empty',
        cards: []
      }
    ])

    const handleCardMoved = (event: CardMovedEvent) => {
      console.log('Card moved:', event)
      // Your backend update logic here if needed
    }

    const handleAddCard = (columnId: string) => {
      console.log('Add card to column:', columnId)
      // Add your card creation logic here
    }

    const handleCardClick = (card: IKanbanCard) => {
      console.log('Card clicked:', card)
      // Add your card click handling logic here
    }

    const onProjectClick = (project: IKanbanProject) => {
      console.log('Project clicked:', project)
    }

    const onAssigneeClick = (assignee: IKanbanAssignee) => {
      console.log('Assignee clicked:', assignee)
    }

    const onCardTitleClick = (card: IKanbanCard) => {
      console.log('Card title clicked:', card)
    }

    const onColumnMenu = (event: {
      column: IKanbanColumn
      event: MouseEvent
    }) => {
      console.log('Column menu:', event)
    }

    const sampleCode = `
<of-kanban-board
  v-model:columns="columns"
  @card-moved="handleCardMoved"
  @add-card="handleAddCard"
  @card-click="handleCardClick"
  @project-click="onProjectClick"
  @assignee-click="onAssigneeClick"
  @card-title-click="onCardTitleClick"
  @column-menu="onColumnMenu"
>
  <template #card-title="{ card }">
    <div class="custom-title" @click="onCardTitleClick(card)">
      {{ card.title }}
      <!-- Add any custom title content here -->
    </div>
  </template>
</of-kanban-board>
`

    return {
      columns,
      sampleCode,
      handleCardMoved,
      handleAddCard,
      handleCardClick,
      onColumnMenu,
      onProjectClick,
      onAssigneeClick,
      onCardTitleClick
    }
  }
})
</script>

<style lang="scss" scoped>
.container {
  height: 80vh;

  .of-kanban-board {
    padding: 16px 0;
  }

  h1 {
    margin: 0;
  }
}
</style>

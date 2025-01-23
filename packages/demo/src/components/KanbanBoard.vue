<template>
  <div class="container">
    <h1>Kanban Board</h1>
    <of-highlight lang="html" :value="sampleCode" />

    <of-kanban-board
      :columns="columns"
      @card-moved="onCardMoved"
      @add-card="onAddCard"
      @card-click="onCardClick"
      @project-click="onProjectClick"
      @assignee-click="onAssigneeClick"
      @column-menu="onColumnMenu"
    />
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
        limit: 5,
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
              avatar: 'https://1crm9-demo.1crmcloud.com/files/images/directory/1/MichaelWhitehead.png'
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
          },
          {
            id: 'card-36',
            title: 'Test card 4',
            project: {
              id: 'project-4',
              name: 'Project 3',
              icon: 'email'
            },
            order: 5,
            assignee: {
              id: 'assignee-4',
              name: 'Alex Johnson'
            }
          },
          {
            id: 'card-37',
            title: 'Test card 5',
            project: {
              id: 'project-4',
              name: 'Project 3',
              icon: 'email'
            },
            order: 7,
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
        title: 'test',
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
      }
    ])

    const sampleCode = `
<of-kanban-board
  :columns="columns"
  @card-moved="onCardMoved"
  @add-card="onAddCard"
  @card-click="onCardClick"
  @project-click="onProjectClick"
  @assignee-click="onAssigneeClick"
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

    const onProjectClick = (project: IKanbanProject) => {
      console.log('Project clicked:', project)
    }

    const onAssigneeClick = (assignee: IKanbanAssignee) => {
      console.log('Assignee clicked:', assignee)
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
      onColumnMenu,
      onProjectClick,
      onAssigneeClick
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

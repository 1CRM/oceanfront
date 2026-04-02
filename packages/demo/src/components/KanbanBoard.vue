<template>
  <div class="container">
    <h1>Kanban Board</h1>
    <of-highlight lang="html" :value="sampleCode" />

    <of-kanban-board
      v-model:columns="columns"
      :column-menu-items="columnMenuItems"
      :card-menu-items="cardMenuItems"
      :dependencies="{
        enabled: true,
        hoverHighlightMode: 'group',
        getEdges: (card: any) =>
          card.dependsOnId ? [{ toId: card.dependsOnId }] : []
      }"
      search-input-placeholder="Search by keyword..."
      @column-menu-item-click="handleColumnMenuItemClick"
      @card-moved="handleCardMoved"
      @add-card="handleAddCard"
      @card-click="handleCardClick"
      @card-tag-click="handleCardTagClick"
      @project-click="onProjectClick"
      @assignee-click="onAssigneeClick"
      @card-title-click="onCardTitleClick"
      @card-menu-item-click="handleCardMenuItemClick"
      @filter-change="handleFilterChange"
    >
      <template #clear-filters>Clear Filters</template>
      <template #create-button>Create Issue</template>
      <template #filters></template>
      <template #card-title="{ card }">
        <div class="custom-title" @click="onCardTitleClick(card)">
          {{ card.title }}
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
  IKanbanCardAssignee
} from 'oceanfront'

export default defineComponent({
  setup() {
    const sampleCode = `
<of-kanban-board
  v-model:columns="columns"
  :column-menu-items="columnMenuItems"
  :card-menu-items="cardMenuItems"
  :has-more-cards="columnHasMore"
  search-input-placeholder="Search by keyword..."
  :dependencies="{
    enabled: true,
    getEdges: (card) => (card.dependsOnId ? [{ toId: card.dependsOnId }] : [])
  }"
  @column-menu-item-click="handleColumnMenuItemClick"
  @card-moved="handleCardMoved"
  @add-card="handleAddCard"
  @card-click="handleCardClick"
  @project-click="onProjectClick"
  @assignee-click="onAssigneeClick"
  @card-title-click="onCardTitleClick"
  @card-menu-item-click="handleCardMenuItemClick"
  @load-more="handleLoadMore"
/>
`
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
            },
            tags: ['Bug', 'Feature']
          } as IKanbanCard,
          {
            id: 'card-11',
            title: 'Build: Create release checklist',
            project: {
              id: 'project-6',
              name: 'Project 6',
              icon: 'mobile'
            },
            order: 1,
            assignee: {
              id: 'assignee-6',
              name: 'Dana Rivera'
            },
            tags: ['Build']
          } as IKanbanCard,
          {
            id: 'card-35',
            title: 'Test card 3',
            dependsOnId: 'card-34',
            project: {
              id: 'project-4',
              name: 'Project 3',
              icon: 'email'
            },
            order: 2,
            assignee: {
              id: 'assignee-4',
              name: 'Alex Johnson'
            }
          } as IKanbanCard,
          {
            id: 'card-4',
            title: 'Basic Component Setup',
            dependsOnId: 'card-31',
            project: {
              id: 'project-4',
              name: 'Project 4',
              icon: 'mobile'
            },
            order: 3,
            assignee: {
              id: 'assignee-4',
              name: 'David Lee'
            }
          } as IKanbanCard,
          {
            id: 'card-100',
            title: 'Independent card (no deps)',
            project: {
              id: 'project-9',
              name: 'Project 9',
              icon: 'mobile'
            },
            order: 4,
            assignee: {
              id: 'assignee-9',
              name: 'Sam Patel'
            }
          } as IKanbanCard
        ]
      },
      {
        id: 'in-progress',
        title: 'In Progress',
        limit: 3,
        cards: [
          {
            id: 'card-2',
            title: 'Kanban Board: Create KanbanColumn component',
            dependsOnId: 'card-1',
            project: {
              id: 'project-2',
              name: 'Project 2',
              icon: 'email'
            },
            order: 0,
            assignee: {
              id: 'assignee-2',
              name: 'admin'
            }
          } as IKanbanCard,
          {
            id: 'card-21',
            title: 'QA: Prepare test cases',
            project: {
              id: 'project-7',
              name: 'Project 7',
              icon: 'email'
            },
            order: 1,
            assignee: {
              id: 'assignee-7',
              name: 'Morgan Lee'
            }
          } as IKanbanCard,
          {
            id: 'card-12',
            title: 'Build: Smoke test staging',
            dependsOnId: 'card-11',
            project: {
              id: 'project-6',
              name: 'Project 6',
              icon: 'mobile'
            },
            order: 2,
            assignee: {
              id: 'assignee-6',
              name: 'Dana Rivera'
            }
          } as IKanbanCard
        ]
      },
      {
        id: 'test',
        title: 'Reviewe & Test',
        cards: [
          {
            id: 'card-33',
            title: 'Test card 1',
            dependsOnId: 'card-2',
            project: {
              id: 'project-3',
              name: 'Project 3',
              icon: 'email'
            },
            order: 0,
            assignee: {
              id: 'assignee-3',
              name: 'Charlie Brown'
            }
          } as IKanbanCard,
          {
            id: 'card-31',
            title: 'Docs: Write README',
            project: {
              id: 'project-8',
              name: 'Project 8',
              icon: 'mobile'
            },
            order: 1,
            assignee: {
              id: 'assignee-8',
              name: 'Taylor Kim'
            }
          } as IKanbanCard
        ]
      },
      {
        id: 'done',
        title: 'Done',
        cards: [
          {
            id: 'card-34',
            title: 'Test card 2',
            dependsOnId: 'card-33',
            project: {
              id: 'project-4',
              name: 'Project 3',
              icon: 'email'
            },
            order: 0,
            assignee: {
              id: 'assignee-1',
              name: 'Michael Whitehead',
              avatar:
                'https://1crm9-demo.1crmcloud.com/files/images/directory/1/MichaelWhitehead.png'
            }
          } as IKanbanCard,
          {
            id: 'card-3',
            title: 'Style Improvements',
            dependsOnId: 'card-11',
            project: {
              id: 'project-3',
              name: 'Project 3',
              icon: 'mobile'
            },
            order: 1,
            assignee: {
              id: 'assignee-3',
              name: 'Charlie Brown'
            }
          } as IKanbanCard,
          {
            id: 'card-5',
            title: 'Kanban Board: Implement Basic Drag-and-Drop',
            dependsOnId: 'card-21',
            project: {
              id: 'project-5',
              name: 'Project 5',
              icon: 'email'
            },
            order: 2,
            assignee: {
              id: 'assignee-5',
              name: 'Alex Johnson'
            }
          } as IKanbanCard
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
    }

    const handleCardClick = (card: IKanbanCard) => {
      console.log('Card clicked:', card)
    }

    const handleCardTagClick = (tag: string) => {
      console.log('Card tag clicked:', tag)
    }

    const handleCardMenuItemClick = (
      item: string | number,
      card: IKanbanCard
    ) => {
      console.log('Card menu item clicked:', item, card)
    }

    const onProjectClick = (project: IKanbanProject) => {
      console.log('Project clicked:', project)
    }

    const onAssigneeClick = (assignee: IKanbanCardAssignee) => {
      console.log('Assignee clicked:', assignee)
    }

    const onCardTitleClick = (card: IKanbanCard) => {
      console.log('Card title clicked:', card)
    }

    const handleColumnMenuItemClick = (
      item: string | number,
      columnId: string
    ) => {
      console.log('Column menu item clicked:', item, columnId)
    }

    const handleFilterChange = (filters: {
      keyword: string
      assignees: (string | number)[]
      tags: string[]
    }) => {
      console.log('Filter changed:', filters)
    }

    const columnMenuItems = [
      {
        text: 'Option 1',
        value: 'option-1',
        attrs: { 'data-test': 'my-btn' }
      },
      {
        text: 'Option 2',
        value: (columnId: string) => {
          console.log('Option 2 custom handler', columnId)
        }
      }
    ]

    const cardMenuItems = [
      {
        text: 'Card Option 1',
        value: 'option-1',
        attrs: { 'data-test': 'my-btn' }
      },
      {
        text: 'Card Option 2',
        value: (columnId: string) => {
          console.log('Option 2 custom handler', columnId)
        }
      }
    ]

    return {
      columns,
      sampleCode,
      columnMenuItems,
      cardMenuItems,
      handleColumnMenuItemClick,
      handleCardMoved,
      handleAddCard,
      handleCardClick,
      handleCardMenuItemClick,
      handleFilterChange,
      handleCardTagClick,
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

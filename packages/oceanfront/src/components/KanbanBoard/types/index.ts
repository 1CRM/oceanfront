export interface KanbanLabel {
  id: string
  name: string
  color: string
}

export interface KanbanAssignee {
  id: string
  name: string
  avatar?: string
}

export interface KanbanCard {
  id: string
  title: string
  description?: string
  order: number
  labels?: KanbanLabel[]
  assignees?: KanbanAssignee[]
  dueDate?: string | Date
  [key: string]: any
}

export interface KanbanColumn {
  id: string
  title: string
  cards?: KanbanCard[]
  limit?: number
}

export interface CardMovedEvent {
  cardId: string
  fromColumn: string
  toColumn: string
  newOrder?: number
}

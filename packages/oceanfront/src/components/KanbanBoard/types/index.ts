export interface IKanbanTag {
  id: string
  name: string
  color: string
}

export interface IKanbanAssignee {
  id: string
  name: string
  avatar?: string
}

export interface IKanbanCard {
  id: string | number
  title: string
  order: number
  project?: string
  priority?: 'high' | 'medium' | 'low'
  assignee?: {
    initials: string
  }
}

export interface IKanbanColumn {
  id: string
  title: string
  cards?: IKanbanCard[]
  limit?: number
}

export interface CardMovedEvent {
  cardId: string
  fromColumn: string
  toColumn: string
  newOrder?: number
}

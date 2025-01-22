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
  id: string
  title: string
  description?: string
  order: number
  assignees?: IKanbanAssignee[]
  tags?: IKanbanTag[]
  [key: string]: any
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

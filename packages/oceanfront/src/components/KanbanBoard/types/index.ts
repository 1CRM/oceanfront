export interface IKanbanCard {
  id: string | number
  title: string
  order: number
  project?: IKanbanProject
  assignee?: IKanbanCardAssignee
}

export interface IKanbanProject {
  id: string
  name: string
  module?: string
  icon?: string
}

export interface IKanbanTag {
  id: string
  name: string
  color: string
}

export interface IKanbanColumn {
  id: string
  title: string
  total?: number
  cards?: IKanbanCard[]
  limit?: number
}

export interface CardMovedEvent {
  cardId: string
  fromColumn: string
  toColumn: string
  newOrder: number
}

export interface IKanbanCardAssignee {
  id: string | number
  name: string
  avatar?: string
  module?: string
}

export interface IKanbanCard {
  id: string | number
  title: string
  order: number
  dependsOnId?: KanbanCardId
  project?: IKanbanProject
  assignee?: IKanbanCardAssignee
  tags?: string[]
}

export type KanbanCardId = string | number

export type KanbanDependencyEdge = {
  toId: KanbanCardId
}

export type KanbanDependenciesConfig = {
  enabled?: boolean
  getCardId?: (card: IKanbanCard) => KanbanCardId
  getEdges?: (card: IKanbanCard) => KanbanDependencyEdge[]
  palette?: string[]
  hoverHighlightMode?: 'neighbors' | 'group'
}

export interface IKanbanProject {
  id: string
  name: string
  module?: string
  icon?: string
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

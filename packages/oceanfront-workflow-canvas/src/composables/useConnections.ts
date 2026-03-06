import { ref, type Ref } from 'vue'
import type {
  Position,
  WorkflowGraph,
  WorkflowEdge,
  WorkflowNode,
  WorkflowGroup
} from '../types/workflow'
import {
  findNode,
  findGroup,
  areEntitiesInDifferentGroups,
  handleConnectNodes
} from '../utils/graph-helpers'

export interface UseConnectionsOptions {
  graph: Ref<WorkflowGraph>
  readonly: Ref<boolean>
  edgesLocked: Ref<boolean>
  canvasRef: Ref<HTMLElement | undefined>
  getEntityCenter: (entity: WorkflowNode | WorkflowGroup) => Position
  getEntityDimensions: (entity: WorkflowNode | WorkflowGroup) => { width: number; height: number }
  onGraphUpdate: (graph: WorkflowGraph) => void
  onEdgeAdd: (edge: WorkflowEdge) => void
  onEdgeDelete: (edgeId: string) => void
  nodeTypes?: Ref<Record<string, any>>
}

export function useConnections(options: UseConnectionsOptions) {
  const {
    graph,
    readonly,
    edgesLocked,
    canvasRef: _canvasRef,
    getEntityCenter,
    getEntityDimensions,
    onGraphUpdate,
    onEdgeAdd,
    onEdgeDelete,
    nodeTypes: _nodeTypes
  } = options

  const connectionPreview = ref<{ path: string; fromNodeId: string; isInvalid?: boolean } | null>(
    null
  )
  const connectionDragStart = ref<{
    nodeId: string
    port: string
    position?: 'top' | 'bottom' | 'left' | 'right'
  } | null>(null)
  const connectionDragMoved = ref(false)
  const disconnectingEdge = ref<WorkflowEdge | null>(null)
  const hoveredEntityId = ref<string | null>(null)

  const findEntity = (entityId: string): WorkflowNode | WorkflowGroup | undefined => {
    const node = findNode(graph.value, entityId)
    if (node) return node
    return findGroup(graph.value, entityId)
  }

  const handleEntityHandleMouseDown = (event: MouseEvent, entityId: string, port: string) => {
    if (readonly.value) return
    if (event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    if (port === 'input') {
      const existingEdge = graph.value.edges.find(edge => edge.to.entityId === entityId)
      if (existingEdge && !existingEdge.locked && !edgesLocked.value) {
        connectionDragStart.value = {
          nodeId: entityId,
          port: 'input',
          position: existingEdge.to.position
        }
        disconnectingEdge.value = existingEdge
        return
      }
    }

    if (port === 'output') {
      const existingEdge = graph.value.edges.find(edge => edge.from.entityId === entityId)
      if (existingEdge && !existingEdge.locked && !edgesLocked.value) {
        connectionDragStart.value = {
          nodeId: entityId,
          port: 'output',
          position: existingEdge.from.position
        }
        disconnectingEdge.value = existingEdge
        return
      }
    }

    connectionDragStart.value = { nodeId: entityId, port }
    disconnectingEdge.value = null
  }

  const handleConnectionDragMove = (mousePos: Position): boolean => {
    if (!connectionDragStart.value) return false

    connectionDragMoved.value = true

    const dragEntity = findEntity(connectionDragStart.value.nodeId)
    if (!dragEntity) return true

    const dragPos = getEntityCenter(dragEntity)
    const dragDimensions = getEntityDimensions(dragEntity)

    let startPos: Position
    let endPos: Position = mousePos
    let startControlY: number
    let endControlY: number

    if (connectionDragStart.value.port === 'input') {
      startPos = { x: dragPos.x, y: dragPos.y - dragDimensions.height / 2 }
      const dy = endPos.y - startPos.y
      const controlOffset = Math.abs(dy) / 2
      startControlY = startPos.y - controlOffset
      endControlY = endPos.y + controlOffset
    } else {
      startPos = { x: dragPos.x, y: dragPos.y + dragDimensions.height / 2 }
      const dy = endPos.y - startPos.y
      const controlOffset = Math.abs(dy) / 2
      startControlY = startPos.y + controlOffset
      endControlY = endPos.y - controlOffset
    }

    // Check if hovering over an incompatible node type
    let isInvalid = false
    if (hoveredEntityId.value && 'kind' in dragEntity) {
      const hoveredEntity = findEntity(hoveredEntityId.value)
      if (hoveredEntity && 'kind' in hoveredEntity) {
        if (dragEntity.kind !== hoveredEntity.kind) {
          isInvalid = true
        }
      }
    }

    connectionPreview.value = {
      path: `M ${startPos.x},${startPos.y} C ${startPos.x},${startControlY} ${endPos.x},${endControlY} ${endPos.x},${endPos.y}`,
      fromNodeId: connectionDragStart.value.nodeId,
      isInvalid
    }

    return true
  }

  const handleEntityHandleMouseEnter = (entityId: string) => {
    hoveredEntityId.value = entityId
  }

  const handleEntityHandleMouseLeave = () => {
    hoveredEntityId.value = null
  }

  const handleEntityHandleMouseUp = (entityId: string, port: string) => {
    if (readonly.value) return

    if (connectionDragStart.value && connectionDragStart.value.nodeId !== entityId) {
      let shouldConnect = false
      let fromEntityId = ''
      let toEntityId = ''

      if (connectionDragStart.value.port === 'input') {
        if (port === 'output') {
          shouldConnect = true
          fromEntityId = entityId
          toEntityId = connectionDragStart.value.nodeId
        }
      } else {
        if (port === 'input') {
          shouldConnect = true
          fromEntityId = connectionDragStart.value.nodeId
          toEntityId = entityId
        }
      }

      if (shouldConnect && areEntitiesInDifferentGroups(graph.value, fromEntityId, toEntityId)) {
        shouldConnect = false
      }

      // Validate type matching - only allow connections between same types
      if (shouldConnect) {
        const fromEntity = findEntity(fromEntityId)
        const toEntity = findEntity(toEntityId)

        if (fromEntity && toEntity && 'kind' in fromEntity && 'kind' in toEntity) {
          // Only allow connections between entities of the same type
          if (fromEntity.kind !== toEntity.kind) {
            shouldConnect = false
          }
        }
      }

      if (shouldConnect) {
        let baseGraph = graph.value
        if (disconnectingEdge.value) {
          baseGraph = {
            ...graph.value,
            edges: graph.value.edges.filter(edge => edge.id !== disconnectingEdge.value!.id)
          }
        }

        const fromPosition =
          connectionDragStart.value.port === 'output'
            ? connectionDragStart.value.position
            : undefined
        const toPosition =
          connectionDragStart.value.port === 'input'
            ? connectionDragStart.value.position
            : undefined

        const updatedGraph = handleConnectNodes(
          baseGraph,
          {
            fromNodeId: fromEntityId,
            toNodeId: toEntityId,
            fromPosition,
            toPosition
          },
          {
            edgeLocked: edgesLocked.value
          }
        )
        onGraphUpdate(updatedGraph)
        const newEdge = updatedGraph.edges[updatedGraph.edges.length - 1]
        onEdgeAdd(newEdge)
      }
    }

    connectionDragStart.value = null
    connectionPreview.value = null
    disconnectingEdge.value = null
    connectionDragMoved.value = false
  }

  const handleMouseUp = () => {
    if (connectionDragStart.value) {
      if (disconnectingEdge.value && !disconnectingEdge.value.locked && !edgesLocked.value) {
        const edgeId = disconnectingEdge.value.id
        const updatedGraph = {
          ...graph.value,
          edges: graph.value.edges.filter(edge => edge.id !== edgeId)
        }
        onGraphUpdate(updatedGraph)
        onEdgeDelete(edgeId)
        disconnectingEdge.value = null
      }

      connectionDragStart.value = null
      connectionPreview.value = null
      connectionDragMoved.value = false
    }
  }

  const isOutputFree = (entityId: string): boolean => {
    return !graph.value.edges.some(edge => edge.from.entityId === entityId)
  }

  const hasIncomingConnection = (entityId: string): boolean => {
    return graph.value.edges.some(edge => edge.to.entityId === entityId)
  }

  return {
    connectionPreview,
    connectionDragStart,
    connectionDragMoved,
    disconnectingEdge,
    hoveredEntityId,
    handleEntityHandleMouseDown,
    handleEntityHandleMouseUp,
    handleEntityHandleMouseEnter,
    handleEntityHandleMouseLeave,
    handleConnectionDragMove,
    handleMouseUp,
    isOutputFree,
    hasIncomingConnection
  }
}

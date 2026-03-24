import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useConnections } from '../useConnections'
import type { WorkflowGraph, Position } from '../../types/workflow'

describe('useConnections', () => {
  let mockGraph: WorkflowGraph
  let mockCanvasRef: any
  let mockGetEntityCenter: any
  let mockGetEntityDimensions: any
  let mockGetEntityConnectionPoint: any
  let onGraphUpdate: any
  let onEdgeAdd: any
  let onEdgeDelete: any

  beforeEach(() => {
    mockGraph = {
      nodes: [
        { id: 'node-1', kind: 'action', position: { x: 100, y: 100 } },
        { id: 'node-2', kind: 'action', position: { x: 100, y: 300 } }
      ],
      edges: [],
      groups: []
    }

    mockCanvasRef = ref({
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      scrollLeft: 0,
      scrollTop: 0
    })

    mockGetEntityCenter = vi.fn((entity: any) => ({
      x: entity.position.x + 125,
      y: entity.position.y + 50
    }))

    mockGetEntityDimensions = vi.fn(() => ({ width: 250, height: 100 }))

    mockGetEntityConnectionPoint = vi.fn((entity: any, position: string) => {
      const width = 250
      const height = 100
      const baseX = entity.position.x
      const baseY = entity.position.y

      switch (position) {
        case 'top':
          return { x: baseX + width / 2, y: baseY }
        case 'bottom':
          return { x: baseX + width / 2, y: baseY + height }
        case 'left':
          return { x: baseX, y: baseY + height / 2 }
        case 'right':
          return { x: baseX + width, y: baseY + height / 2 }
        default:
          return { x: baseX + width / 2, y: baseY + height }
      }
    })

    onGraphUpdate = vi.fn()
    onEdgeAdd = vi.fn()
    onEdgeDelete = vi.fn()
  })

  describe('isOutputFree', () => {
    it('returns true when node has no outgoing edges', () => {
      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      expect(connections.isOutputFree('node-1')).toBe(true)
    })

    it('returns false when node has an outgoing edge', () => {
      mockGraph.edges = [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }]

      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      expect(connections.isOutputFree('node-1')).toBe(false)
      expect(connections.isOutputFree('node-2')).toBe(true)
    })
  })

  describe('hasIncomingConnection', () => {
    it('returns false when node has no incoming edges', () => {
      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      expect(connections.hasIncomingConnection('node-1')).toBe(false)
    })

    it('returns true when node has an incoming edge', () => {
      mockGraph.edges = [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }]

      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      expect(connections.hasIncomingConnection('node-1')).toBe(false)
      expect(connections.hasIncomingConnection('node-2')).toBe(true)
    })
  })

  describe('connection preview', () => {
    it('generates connection preview path when dragging from output', () => {
      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      // Start connection drag
      const mockEvent = {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any

      connections.handleEntityHandleMouseDown(mockEvent, 'node-1', 'output')

      // Move mouse to create preview
      const mousePos: Position = { x: 200, y: 250 }
      const result = connections.handleConnectionDragMove(mousePos)

      expect(result).toBe(true)
      expect(connections.connectionPreview.value).toBeTruthy()
      expect(connections.connectionPreview.value?.path).toContain('M ')
      expect(connections.connectionPreview.value?.path).toContain('C ')
    })

    it('marks preview as invalid when hovering incompatible node type', () => {
      mockGraph.nodes = [
        { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
        { id: 'node-2', kind: 'action', position: { x: 100, y: 300 } }
      ]

      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete,
        nodeTypes: ref({})
      })

      const mockEvent = {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any

      connections.handleEntityHandleMouseDown(mockEvent, 'node-1', 'output')
      connections.handleEntityHandleMouseEnter('node-2')

      const mousePos: Position = { x: 200, y: 250 }
      connections.handleConnectionDragMove(mousePos)

      expect(connections.connectionPreview.value?.isInvalid).toBe(true)
    })
  })

  describe('connection creation', () => {
    it('creates edge when connecting output to input', () => {
      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      const mockEvent = {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any

      // Start drag from node-1 output
      connections.handleEntityHandleMouseDown(mockEvent, 'node-1', 'output')

      // End drag on node-2 input
      connections.handleEntityHandleMouseUp('node-2', 'input')

      expect(onGraphUpdate).toHaveBeenCalled()
      expect(onEdgeAdd).toHaveBeenCalled()
      const [addedGraph, addedEdge] = onEdgeAdd.mock.calls[0]
      expect(addedEdge.from.entityId).toBe('node-1')
      expect(addedEdge.to.entityId).toBe('node-2')
      expect(addedGraph.edges).toContainEqual(addedEdge)
    })

    it('does not create edge when connecting same node', () => {
      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      const mockEvent = {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any

      connections.handleEntityHandleMouseDown(mockEvent, 'node-1', 'output')
      connections.handleEntityHandleMouseUp('node-1', 'input')

      expect(onGraphUpdate).not.toHaveBeenCalled()
      expect(onEdgeAdd).not.toHaveBeenCalled()
    })

    it('does not create edge between nodes in different groups', () => {
      mockGraph.groups = [
        {
          id: 'group-1',
          kind: 'group',
          label: 'Group 1',
          position: { x: 50, y: 50 },
          size: { w: 300, h: 200 },
          containedIds: ['node-1']
        },
        {
          id: 'group-2',
          kind: 'group',
          label: 'Group 2',
          position: { x: 400, y: 50 },
          size: { w: 300, h: 200 },
          containedIds: ['node-2']
        }
      ]

      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      const mockEvent = {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any

      connections.handleEntityHandleMouseDown(mockEvent, 'node-1', 'output')
      connections.handleEntityHandleMouseUp('node-2', 'input')

      expect(onGraphUpdate).not.toHaveBeenCalled()
      expect(onEdgeAdd).not.toHaveBeenCalled()
    })
  })

  describe('edge deletion', () => {
    it('deletes edge when dragging from input and releasing', () => {
      mockGraph.edges = [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }]

      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      const mockEvent = {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any

      // Start drag from node-2 input (which has incoming edge)
      connections.handleEntityHandleMouseDown(mockEvent, 'node-2', 'input')

      // Release without connecting to anything
      connections.handleMouseUp()

      expect(onGraphUpdate).toHaveBeenCalled()
      expect(onEdgeDelete).toHaveBeenCalledWith('edge-1')
    })

    it('does not delete locked edge', () => {
      mockGraph.edges = [
        { id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' }, locked: true }
      ]

      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(false),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      const mockEvent = {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any

      connections.handleEntityHandleMouseDown(mockEvent, 'node-2', 'input')
      connections.handleMouseUp()

      expect(onEdgeDelete).not.toHaveBeenCalled()
    })
  })

  describe('readonly mode', () => {
    it('does not allow connections in readonly mode', () => {
      const connections = useConnections({
        graph: ref(mockGraph),
        readonly: ref(true),
        edgesLocked: ref(false),
        canvasRef: mockCanvasRef,
        getEntityCenter: mockGetEntityCenter,
        getEntityDimensions: mockGetEntityDimensions,
        getEntityConnectionPoint: mockGetEntityConnectionPoint,
        onGraphUpdate,
        onEdgeAdd,
        onEdgeDelete
      })

      const mockEvent = {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any

      connections.handleEntityHandleMouseDown(mockEvent, 'node-1', 'output')
      connections.handleEntityHandleMouseUp('node-2', 'input')

      expect(onGraphUpdate).not.toHaveBeenCalled()
      expect(onEdgeAdd).not.toHaveBeenCalled()
    })
  })
})

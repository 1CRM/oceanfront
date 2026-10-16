import { describe, it, expect } from 'vitest'
import type { WorkflowGraph } from '../../types/workflow'
import {
  canPlaceInGroup,
  findEntity,
  fitsMaxGroupDepth,
  getDescendants,
  getGroupDepth,
  getParentGroup,
  insertEntity,
  isGroup,
  moveEntity,
  removeEntity,
  swapNodes
} from '../graph-helpers'

const createGraph = (): WorkflowGraph => ({
  nodes: [
    { id: 'a', kind: 'condition' },
    { id: 'b', kind: 'condition' },
    { id: 'c', kind: 'condition' },
    { id: 'x', kind: 'action' }
  ],
  groups: [
    { id: 'root', kind: 'condition', children: ['a', 'inner'] },
    { id: 'inner', kind: 'condition', children: ['b', 'deep'] },
    { id: 'deep', kind: 'condition', children: ['c'] },
    { id: 'actions', kind: 'action', children: ['x'] }
  ]
})

const children = (graph: WorkflowGraph, id: string) => graph.groups.find(g => g.id === id)!.children

describe('graph-helpers', () => {
  it('finds entities and parents', () => {
    const graph = createGraph()
    expect(isGroup(findEntity(graph, 'inner')!)).toBe(true)
    expect(isGroup(findEntity(graph, 'a')!)).toBe(false)
    expect(getParentGroup(graph, 'c')?.id).toBe('deep')
    expect(getParentGroup(graph, 'root')).toBeUndefined()
  })

  it('computes descendants and depth', () => {
    const graph = createGraph()
    expect(getDescendants(graph, 'inner')).toEqual(['b', 'deep', 'c'])
    expect(getGroupDepth(graph, 'root')).toBe(0)
    expect(getGroupDepth(graph, 'deep')).toBe(2)
  })

  it('checks max group depth including the moved subtree', () => {
    const graph = createGraph()
    expect(fitsMaxGroupDepth(graph, 'deep', undefined)).toBe(true)
    expect(fitsMaxGroupDepth(graph, 'deep', 3)).toBe(true)
    expect(fitsMaxGroupDepth(graph, 'deep', 2)).toBe(false)
    expect(fitsMaxGroupDepth(graph, 'root', 1, 'inner')).toBe(false)
    expect(fitsMaxGroupDepth(graph, 'root', 2, 'inner')).toBe(true)
  })

  it('allows placement only into same-kind groups outside the own subtree', () => {
    const graph = createGraph()
    expect(canPlaceInGroup(graph, 'a', 'deep')).toBe(true)
    expect(canPlaceInGroup(graph, 'x', 'root')).toBe(false)
    expect(canPlaceInGroup(graph, 'inner', 'inner')).toBe(false)
    expect(canPlaceInGroup(graph, 'inner', 'deep')).toBe(false)
    expect(canPlaceInGroup(graph, 'deep', 'root')).toBe(true)
  })

  it('moves an entity to an index counted without itself', () => {
    const graph = createGraph()
    expect(children(moveEntity(graph, 'a', 'root', 1), 'root')).toEqual(['inner', 'a'])
    const moved = moveEntity(graph, 'a', 'inner', 1)
    expect(children(moved, 'root')).toEqual(['inner'])
    expect(children(moved, 'inner')).toEqual(['b', 'a', 'deep'])
  })

  it('inserts new nodes and groups', () => {
    const node = insertEntity(createGraph(), 'node', 'condition', 'root', 1)
    expect(node.graph.nodes.find(n => n.id === node.id)).toEqual({ id: node.id, kind: 'condition' })
    expect(children(node.graph, 'root')).toEqual(['a', node.id, 'inner'])

    const group = insertEntity(createGraph(), 'group', 'condition', 'deep', 0)
    expect(group.graph.groups.find(g => g.id === group.id)?.children).toEqual([])
    expect(children(group.graph, 'deep')).toEqual([group.id, 'c'])
  })

  it('swaps nodes across groups', () => {
    const graph = swapNodes(createGraph(), 'a', 'c')
    expect(children(graph, 'root')).toEqual(['c', 'inner'])
    expect(children(graph, 'deep')).toEqual(['a'])
  })

  it('removes a node, and a group with its descendants', () => {
    const node = removeEntity(createGraph(), 'a')
    expect(node.nodes.map(n => n.id)).toEqual(['b', 'c', 'x'])
    expect(children(node, 'root')).toEqual(['inner'])

    const graph = removeEntity(createGraph(), 'inner')
    expect(graph.nodes.map(n => n.id)).toEqual(['a', 'x'])
    expect(graph.groups.map(g => g.id)).toEqual(['root', 'actions'])
    expect(children(graph, 'root')).toEqual(['a'])
  })
})

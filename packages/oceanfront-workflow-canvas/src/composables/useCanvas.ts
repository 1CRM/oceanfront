import { computed, type Ref } from 'vue'
import type { WorkflowGraph, WorkflowNode, WorkflowGroup, Position } from '../types/workflow'
import { getGroupDepth } from '../utils/graph-helpers'

export interface UseCanvasOptions {
  graph: Ref<WorkflowGraph>
  width: Ref<number>
  height: Ref<number>
  nodeElements: Ref<Map<string, HTMLElement>>
}

export function useCanvas(options: UseCanvasOptions) {
  const { graph, width, height, nodeElements } = options

  const containerStyle = computed(() => {
    let w = width.value
    let h = height.value

    graph.value.nodes.forEach(node => {
      const right = node.position.x + (node.size?.w || 250)
      const bottom = node.position.y + (node.size?.h || 100)
      if (right > w) w = right
      if (bottom > h) h = bottom
    })

    graph.value.groups.forEach(group => {
      const right = group.position.x + group.size.w
      const bottom = group.position.y + group.size.h
      if (right > w) w = right
      if (bottom > h) h = bottom
    })

    return {
      width: `${w + 100}px`,
      height: `${h + 100}px`
    }
  })

  const svgViewBox = computed(() => {
    const style = containerStyle.value
    const w = parseInt(style.width)
    const h = parseInt(style.height)
    return `0 0 ${w} ${h}`
  })

  const svgWidth = computed(() => containerStyle.value.width)
  const svgHeight = computed(() => containerStyle.value.height)

  const sortedGroups = computed(() => {
    return [...graph.value.groups].sort((a, b) => {
      return getGroupDepth(graph.value, a.id) - getGroupDepth(graph.value, b.id)
    })
  })

  const getNodeDimensions = (node: WorkflowNode): { width: number; height: number } => {
    const element = nodeElements.value.get(node.id)
    if (element) {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }
    return { width: node.size?.w || 250, height: node.size?.h || 100 }
  }

  const getNodeCenter = (node: WorkflowNode): Position => {
    const { width, height } = getNodeDimensions(node)
    return {
      x: node.position.x + width / 2,
      y: node.position.y + height / 2
    }
  }

  const getEntityCenter = (entity: WorkflowNode | WorkflowGroup): Position => {
    if ('kind' in entity && 'containedIds' in entity) {
      return {
        x: entity.position.x + entity.size.w / 2,
        y: entity.position.y + entity.size.h / 2
      }
    } else {
      return getNodeCenter(entity)
    }
  }

  const getEntityDimensions = (
    entity: WorkflowNode | WorkflowGroup
  ): {
    width: number
    height: number
  } => {
    if ('kind' in entity && 'containedIds' in entity) {
      return {
        width: entity.size.w,
        height: entity.size.h
      }
    } else {
      return getNodeDimensions(entity)
    }
  }

  const getNodeStyle = (node: WorkflowNode) => {
    return {
      left: `${node.position.x}px`,
      top: `${node.position.y}px`,
      width: node.size?.w ? `${node.size.w}px` : '250px',
      height: node.size?.h ? `${node.size.h}px` : 'auto'
    }
  }

  const getGroupStyle = (group: WorkflowGroup) => {
    return {
      left: `${group.position.x}px`,
      top: `${group.position.y}px`,
      width: `${group.size.w}px`,
      height: `${group.size.h}px`,
      zIndex: getGroupDepth(graph.value, group.id)
    }
  }

  return {
    containerStyle,
    svgViewBox,
    svgWidth,
    svgHeight,
    sortedGroups,
    getNodeDimensions,
    getNodeCenter,
    getEntityCenter,
    getEntityDimensions,
    getNodeStyle,
    getGroupStyle
  }
}

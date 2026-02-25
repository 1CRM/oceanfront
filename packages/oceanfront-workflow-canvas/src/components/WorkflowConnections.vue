<template>
  <svg
    class="workflow-canvas__svg-layer"
    :viewBox="svgViewBox"
    :width="svgWidth"
    :height="svgHeight"
  >
    <defs>
      <marker
        id="arrowhead"
        markerWidth="14"
        markerHeight="14"
        refX="11"
        refY="7"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path d="M0,0 L0,14 L11,7 z" class="workflow-canvas-connector__marker" />
      </marker>
    </defs>

    <!-- Groups background (sorted by depth) -->
    <g v-for="group in sortedGroups" :key="group.id">
      <rect
        :x="group.position.x"
        :y="group.position.y"
        :width="group.size.w"
        :height="group.size.h"
        fill="transparent"
        stroke="none"
        rx="8"
      />
    </g>

    <!-- Edges -->
    <g v-for="edge in edges" :key="edge.id">
      <path :d="getEdgePath(edge)" class="workflow-canvas-connector" marker-end="url(#arrowhead)" />
    </g>

    <!-- Preview connection while dragging -->
    <path
      v-if="connectionPreview"
      :d="connectionPreview.path"
      class="workflow-canvas-connector workflow-canvas-connector--preview"
      :class="{
        'workflow-canvas-connector--invalid': connectionPreview.isInvalid
      }"
    />
  </svg>
</template>

<script setup lang="ts">
import type { WorkflowEdge, WorkflowGroup, WorkflowNode, Position } from '../types/workflow'

interface Props {
  edges: WorkflowEdge[]
  sortedGroups: WorkflowGroup[]
  connectionPreview: { path: string; fromNodeId: string; isInvalid?: boolean } | null
  svgViewBox: string
  svgWidth: string
  svgHeight: string
  getEntityCenter: (entity: WorkflowNode | WorkflowGroup) => Position
  getEntityDimensions: (entity: WorkflowNode | WorkflowGroup) => { width: number; height: number }
  findEntity: (entityId: string) => WorkflowNode | WorkflowGroup | undefined
}

const props = defineProps<Props>()

function getEdgePath(edge: WorkflowEdge): string {
  const fromEntity = props.findEntity(edge.from.entityId)
  const toEntity = props.findEntity(edge.to.entityId)

  if (!fromEntity || !toEntity) return ''

  const fromPos = props.getEntityCenter(fromEntity)
  const toPos = props.getEntityCenter(toEntity)

  const fromDimensions = props.getEntityDimensions(fromEntity)
  const toDimensions = props.getEntityDimensions(toEntity)

  fromPos.y += fromDimensions.height / 2
  toPos.y -= toDimensions.height / 2

  const dy = toPos.y - fromPos.y
  const controlOffset = Math.abs(dy) / 2

  return `M ${fromPos.x},${fromPos.y} C ${fromPos.x},${fromPos.y + controlOffset} ${toPos.x},${toPos.y - controlOffset} ${toPos.x},${toPos.y}`
}
</script>

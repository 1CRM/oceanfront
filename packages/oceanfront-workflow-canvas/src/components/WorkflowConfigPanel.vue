<template>
  <of-sidebar v-if="isOpen" :model-value="true" :embed="true" class="workflow-canvas__sidebar">
    <div class="workflow-canvas__panel-default">
      <div class="workflow-canvas__panel-header">
        <h3>
          {{ panelTitle }}
        </h3>
        <button @click="emit('close')" class="workflow-canvas__panel-close" type="button">×</button>
      </div>
      <div class="workflow-canvas__panel-content">
        <div v-if="selectedNode">
          <!-- Type selector (only shown when no type is set) -->
          <of-field
            v-if="!hasNodeType"
            :label="effectiveLabels.typeLabel"
            type="select"
            :items="typeOptions"
            :model-value="selectedNode.kind"
            @update:model-value="updateNodeKind"
          />

          <!-- Dynamic fields based on node type with per-node overrides -->
          <template v-if="nodeTypeDefinition">
            <template v-for="field in visibleNodeFields" :key="field.name">
              <!-- Custom component rendering -->
              <component
                v-if="isComponent(field.configPanelValue)"
                :is="field.configPanelValue"
                :model-value="getFieldValue(field.name)"
                @update:model-value="updateNodeField(field.name, $event)"
              />
              <!-- Standard of-field rendering -->
              <of-field
                v-else
                v-bind="{
                  ...field
                }"
                :model-value="getFieldValue(field.name)"
                @update:model-value="updateNodeField(field.name, $event)"
                @selected="(value: any) => updateNodeField(field.name, value)"
              />
            </template>
          </template>

          <div class="workflow-canvas__panel-actions">
            <slot
              name="panel-actions"
              :selected-node="selectedNode"
              :selected-group="null"
              :on-delete="() => emit('delete-node')"
              :on-close="() => emit('close')"
            >
              <of-button
                v-if="!selectedNode.locked"
                @click="emit('delete-node')"
                variant="filled"
                tint="secondary"
              >
                {{ effectiveLabels.deleteNodeButton }}
              </of-button>
            </slot>
          </div>
        </div>
        <div v-if="selectedGroup">
          <of-text-field
            v-if="showGroupTypeField"
            :label="effectiveLabels.typeLabel"
            :model-value="selectedGroup.kind"
            @update:model-value="updateGroupKind"
          />
          <of-text-field
            v-if="showGroupTitleField"
            :label="effectiveLabels.titleLabel"
            :model-value="selectedGroup.label || ''"
            @update:model-value="updateGroupLabel"
            :placeholder="effectiveLabels.groupLabelPlaceholder"
          />

          <!-- Dynamic fields based on group type with per-group overrides -->
          <template v-if="groupTypeDefinition">
            <template v-for="field in visibleGroupFields" :key="field.name">
              <!-- Custom component rendering -->
              <component
                v-if="isComponent(field.value)"
                :is="field.value"
                :model-value="getGroupTypeFieldValue(field.name)"
                @update:model-value="updateGroupTypeField(field.name, $event)"
              />
              <!-- Standard of-field rendering -->
              <of-field
                v-else
                v-bind="{
                  ...field
                }"
                :model-value="getGroupTypeFieldValue(field.name)"
                @update:model-value="updateGroupTypeField(field.name, $event)"
              />
            </template>
          </template>

          <div class="workflow-canvas__panel-actions">
            <slot
              name="panel-actions"
              :selected-node="null"
              :selected-group="selectedGroup"
              :on-delete="() => emit('delete-group')"
            >
              <of-button
                v-if="!selectedGroup.locked"
                @click="emit('delete-group')"
                variant="filled"
                tint="secondary"
              >
                {{ effectiveLabels.deleteGroupButton }}
              </of-button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </of-sidebar>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type {
  WorkflowNode,
  WorkflowGroup,
  WorkflowGraph,
  WorkflowCanvasLabels,
  NodeTypeConfig,
  NodeFieldDefinition,
  GroupTypeConfig
} from '../types/workflow'
import type { FormRecord } from 'oceanfront'
import { getGroupDepth } from '../utils/graph-helpers'
import { DEFAULT_LABELS } from '../constants/labels'

export default defineComponent({
  name: 'WorkflowConfigPanel',
  props: {
    selectedNode: {
      type: Object as () => WorkflowNode | null,
      default: null
    },
    selectedGroup: {
      type: Object as () => WorkflowGroup | null,
      default: null
    },
    graph: {
      type: Object as () => WorkflowGraph | null,
      default: null
    },
    labels: {
      type: Object as () => WorkflowCanvasLabels,
      default: undefined
    },
    nodeTypes: {
      type: Object as () => NodeTypeConfig,
      default: () => ({})
    },
    groupTypes: {
      type: Object as () => GroupTypeConfig,
      default: () => ({})
    },
    record: {
      type: Object as () => FormRecord,
      required: true
    }
  },
  emits: ['close', 'delete-node', 'delete-group', 'update-node', 'update-group'],
  setup(props, { emit }) {
    // Helper to check if field.value is a valid component
    const isComponent = (value: any): boolean => {
      if (!value) return false
      // Check if it's a component object (has render, setup, or template)
      if (typeof value === 'object' && (value.render || value.setup || value.template)) return true
      // Check if it's a function component
      if (typeof value === 'function') return true
      // Check if it's an async component
      if (value.__asyncLoader) return true
      return false
    }
    // Use DEFAULT_LABELS if no labels provided
    const effectiveLabels = computed(() => props.labels || DEFAULT_LABELS)

    const isOpen = computed(() => {
      if (props.selectedNode?.readonly || props.selectedGroup?.readonly) {
        return false
      }
      return !!(props.selectedNode || props.selectedGroup)
    })

    const groupDepth = computed(() => {
      if (!props.selectedGroup || !props.graph) return undefined
      return getGroupDepth(props.graph, props.selectedGroup.id)
    })

    const getNodeData = (node: WorkflowNode) => {
      const prefix = `${node.id}-`
      const data: Record<string, any> = {}

      Object.keys(props.record.value).forEach(key => {
        if (key.startsWith(prefix)) {
          const fieldName = key.substring(prefix.length)
          data[fieldName] = props.record.value[key]
        }
      })

      return data
    }

    const getGroupData = (group: WorkflowGroup) => {
      const prefix = `${group.id}-`
      const data: Record<string, any> = {}

      Object.keys(props.record.value).forEach(key => {
        if (key.startsWith(prefix)) {
          const fieldName = key.substring(prefix.length)
          data[fieldName] = props.record.value[key]
        }
      })

      return data
    }

    const hasNodeType = computed(() => {
      return props.selectedNode && props.selectedNode.kind && props.selectedNode.kind !== ''
    })

    const nodeTypeDefinition = computed(() => {
      if (!props.selectedNode?.kind) return null
      return props.nodeTypes[props.selectedNode.kind] || null
    })

    const groupTypeDefinition = computed(() => {
      if (!props.selectedGroup?.kind) return null
      return props.groupTypes[props.selectedGroup.kind] || null
    })

    const mergedNodeDefinition = computed(() => {
      const base = nodeTypeDefinition.value
      const override = props.selectedNode?.definition

      return {
        icon: override?.icon ?? base?.icon,
        title: override?.title ?? base?.title,
        configPanelTitle: override?.configPanelTitle ?? base?.configPanelTitle,
        tileTitle: override?.tileTitle ?? base?.tileTitle,
        placeholder: override?.placeholder ?? base?.placeholder,
        fields: override?.fields ?? base?.fields ?? [],
        cssClass: override?.cssClass ?? base?.cssClass
      }
    })

    const mergedGroupDefinition = computed(() => {
      const base = groupTypeDefinition.value
      const override = props.selectedGroup?.definition

      return {
        label: override?.label ?? base?.label,
        fields: override?.fields ?? base?.fields ?? []
      }
    })

    const showGroupTypeField = computed(() => {
      if (!props.selectedGroup) return true

      // Priority 1: instance-level override
      if (props.selectedGroup.definition?.showTypeField !== undefined) {
        return props.selectedGroup.definition.showTypeField
      }

      // Priority 2: type-level default
      if (groupTypeDefinition.value?.showTypeField !== undefined) {
        return groupTypeDefinition.value.showTypeField
      }

      // Priority 3: default to true
      return true
    })

    const showGroupTitleField = computed(() => {
      if (!props.selectedGroup) return true

      // Priority 1: instance-level override
      if (props.selectedGroup.definition?.showTitleField !== undefined) {
        return props.selectedGroup.definition.showTitleField
      }

      // Priority 2: type-level default
      if (groupTypeDefinition.value?.showTitleField !== undefined) {
        return groupTypeDefinition.value.showTitleField
      }

      // Priority 3: default to true
      return true
    })

    const typeOptions = computed(() => {
      return Object.values(props.nodeTypes).map(def => ({
        value: def.type,
        text: def.title
      }))
    })

    const nodePanelTitle = computed(() => {
      if (!props.selectedNode) return ''

      if (hasNodeType.value) {
        // Priority 1: configPanelTitle
        if (mergedNodeDefinition.value.configPanelTitle) {
          return mergedNodeDefinition.value.configPanelTitle
        }

        // Priority 2: tileTitle
        if (mergedNodeDefinition.value.tileTitle) {
          return mergedNodeDefinition.value.tileTitle
        }

        // Priority 3: title
        if (mergedNodeDefinition.value.title) {
          return mergedNodeDefinition.value.title
        }

        // Priority 4: kind
        return props.selectedNode.kind
      }

      // Priority 5: default header
      return effectiveLabels.value.nodeDetailsHeader
    })

    const groupPanelTitle = computed(() => {
      if (!props.selectedGroup) return ''

      // Priority 1: merged definition label
      if (mergedGroupDefinition.value.label) {
        return mergedGroupDefinition.value.label
      }

      // Priority 2: default header
      return effectiveLabels.value.groupDetailsHeader
    })

    const panelTitle = computed(() => {
      return props.selectedNode ? nodePanelTitle.value : groupPanelTitle.value
    })

    // Use merged node definition fields
    const mergedNodeFields = computed(() => {
      return mergedNodeDefinition.value.fields
    })

    // Filter out hidden fields for nodes
    const visibleNodeFields = computed(() => {
      return mergedNodeFields.value.filter((field: any) => field.visible !== false)
    })

    // Use merged group definition fields
    const mergedGroupFields = computed(() => {
      return mergedGroupDefinition.value.fields
    })

    // Filter out hidden fields for groups
    const visibleGroupFields = computed(() => {
      return mergedGroupFields.value.filter((field: any) => field.visible !== false)
    })

    const updateNodeKind = (value: string) => {
      if (!props.selectedNode) return
      // Clear all fields for this node when type changes
      const prefix = `${props.selectedNode.id}-`
      Object.keys(props.record.value).forEach(key => {
        if (key.startsWith(prefix)) {
          // eslint-disable-next-line vue/no-mutating-props
          delete props.record.value[key]
        }
      })
      emit('update-node', {
        ...props.selectedNode,
        kind: value
      })
    }

    const updateNodeField = (fieldName: string, value: any) => {
      if (!props.selectedNode) return
      // FormRecord is designed to be mutated directly
      // eslint-disable-next-line vue/no-mutating-props
      props.record.value[`${props.selectedNode.id}-${fieldName}`] = value
      emit('update-node', {
        ...props.selectedNode
      })
    }

    const getFieldValue = (fieldName: string) => {
      if (!props.selectedNode) return ''
      return props.record.value[`${props.selectedNode.id}-${fieldName}`] ?? ''
    }

    const getSelectItems = (field: NodeFieldDefinition) => {
      // Transform options to the format expected by of-field select
      return (field.items || []).map(item => ({
        value: item.value,
        text: item.text
      }))
    }

    const updateGroupLabel = (value: string) => {
      if (!props.selectedGroup) return
      emit('update-group', {
        ...props.selectedGroup,
        label: value
      })
    }

    const updateGroupKind = (value: string) => {
      if (!props.selectedGroup) return
      emit('update-group', {
        ...props.selectedGroup,
        kind: value
      })
    }

    const updateGroupTypeField = (fieldName: string, value: any) => {
      if (!props.selectedGroup) return
      // FormRecord is designed to be mutated directly
      // eslint-disable-next-line vue/no-mutating-props
      props.record.value[`${props.selectedGroup.id}-${fieldName}`] = value
      emit('update-group', {
        ...props.selectedGroup
      })
    }

    const getGroupTypeFieldValue = (fieldName: string) => {
      if (!props.selectedGroup) return ''
      return props.record.value[`${props.selectedGroup.id}-${fieldName}`] ?? ''
    }

    return {
      emit,
      effectiveLabels,
      isOpen,
      groupDepth,
      getNodeData,
      getGroupData,
      hasNodeType,
      nodeTypeDefinition,
      groupTypeDefinition,
      mergedNodeDefinition,
      mergedGroupDefinition,
      typeOptions,
      nodePanelTitle,
      groupPanelTitle,
      panelTitle,
      mergedNodeFields,
      visibleNodeFields,
      mergedGroupFields,
      visibleGroupFields,
      updateNodeKind,
      updateNodeField,
      getFieldValue,
      getSelectItems,
      updateGroupLabel,
      updateGroupKind,
      updateGroupTypeField,
      getGroupTypeFieldValue,
      isComponent,
      showGroupTypeField,
      showGroupTitleField
    }
  }
})
</script>

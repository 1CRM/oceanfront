<template>
  <of-overlay
    :active="true"
    align="left"
    :pad="false"
    :capture="false"
    embed
    :blur-on-escape="false"
    :blur-on-focus-out="false"
    :blur-on-backdrop-click="false"
  >
    <nav class="of-sidebar workflow-canvas__sidebar" role="navigation">
      <div class="workflow-canvas__panel-default">
        <div class="workflow-canvas__panel-header">
          <h3>{{ title }}</h3>
          <button
            class="workflow-canvas__panel-close"
            type="button"
            :aria-label="LABELS.closePanel"
            @click="emit('close')"
          >
            ×
          </button>
        </div>
        <div class="workflow-canvas__panel-content">
          <div>
            <slot />
            <div class="workflow-canvas__panel-actions">
              <slot name="actions" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  </of-overlay>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { LABELS } from '../constants/labels'

export default defineComponent({
  name: 'WorkflowConfigPanel',
  props: {
    title: { type: String as PropType<string>, default: '' }
  },
  emits: ['close'],
  setup(_props, { emit }) {
    return { emit, LABELS }
  }
})
</script>

<template>
  <div v-for="(color, name) in colors" :key="name" class="row content">
    <div class="column" style="max-width: 10em">
      <of-field
        :model-value="colors[name]"
        type="color"
        @update:model-value="(v) => updateColor(name, v)"
      >
        <template #label>
          <label class="of-field-label">
            <slot :color-name="name" :color="color" name="label">{{
              formatName(name)
            }}</slot>
          </label>
        </template>
      </of-field>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, watch } from 'vue'
import { defaultPalletes } from '../lib/defaults'

const ColorSchemeEditor = defineComponent({
  name: 'ColorSchemeEditor',
  props: {
    colors: Object,
    limits: Object,
  },
  emits: ['colorUpdated', 'palletteUpdated'],
  setup(props, ctx) {
    const pallettes = computed(() => {
      const limits = props.limits ?? {}
      return defaultPalletes(props.colors, limits)
    })

    watch(
      () => pallettes.value,
      (pallettes) => {
        ctx.emit('palletteUpdated', pallettes)
      },
      { immediate: true },
    )

    const formatName = (name: string): string => {
      return (
        name.substring(0, 1).toUpperCase() +
        name.substring(1).replace(/\-/g, ' ')
      )
    }

    const updateColor = (n: any, v: any) => {
      ctx.emit('colorUpdated', n, v)
    }
    return {
      pallettes,
      formatName,
      updateColor,
    }
  },
})

export default ColorSchemeEditor
</script>

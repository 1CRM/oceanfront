<template>
  <div class="of-demo-field of--elevated">
    <div :class="containerClass">
      <div class="field" v-for="(opts, idx) in allParams" :key="idx">
        <slot v-bind="opts"></slot>
      </div>
    </div>
    <div class="options of--elevated">
      <div class="options-fields">
        <of-field
          v-model="params.containerTint"
          label="Container Tint"
          type="select"
          :items="tintOptions"
        />
        <of-field
          v-model="params.variant"
          label="Variant Type"
          type="select"
          :items="variantOptions"
        />
        <of-field
          v-model="params.labelPosition"
          label="Label Position"
          type="select"
          :items="labelPosOptions"
        />
        <of-field
          v-model="params.density"
          label="Density"
          type="select"
          :items="densityOptions"
        />
        <of-field
          v-model="params.tint"
          label="Tint"
          type="select"
          :items="tintOptions"
        />
        <of-field
          v-model="params.size"
          label="Size"
          type="select"
          :items="sizeOptions"
        />
        <of-field
          v-model="params.width"
          label="Width"
          type="select"
          :items="widthOptions"
        />
        <of-field
          type="toggle"
          label="Full Width (block)"
          v-model="params.block"
          v-bind="{
            ...props,
            inputType: customProps.switch ? 'switch' : null,
            inputLabel: checkedValue ? 'Off' : 'On',
            labelPosition: 'top',
          }"
        />
      </div>
      <hr />
      <div class="options-fields">
        <of-field
          v-model="params.mode"
          label="Mode"
          type="select"
          :items="modeOptions"
        />
        <slot name="options"></slot>
        <of-field
          type="toggle"
          label="Required"
          v-model="params.required"
          v-bind="{
            ...props,
            inputType: customProps.switch ? 'switch' : null,
            inputLabel: checkedValue ? 'Off' : 'On',
            labelPosition: 'top',
          }"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, reactive, defineComponent, ref } from 'vue'

export default defineComponent({
  props: {
    allowInputLabelPosition: Boolean,
  },
  setup(props) {
    const params = reactive({
      density: 'default',
      labelPosition: 'default',
      mode: 'editable',
      variant: 'compare',
      tint: 'default',
      size: 'nm',
      width: '100%',
      containerTint: 'default',
      required: false,
      block: false,
    })

    const densityOptions = ['default', '0', '1', '2', '3']
    const tintOptions = ['default', 'primary', 'secondary', 'tertiary']
    const sizeOptions = ['sm', 'nm', 'lg', '2', '1.9', '14px']
    const widthOptions = ['100%', '50%', '300px', '20ch', '30em']

    const labelPosOptions = [
      'default',
      'none',
      'frame',
      'left',
      'right',
      'top',
      ...(props.allowInputLabelPosition ? ['input'] : []),
    ]
    const modeOptions = ['editable', 'locked', 'readonly', 'disabled', 'fixed']
    const variantOptions = ['default', 'outlined', 'filled', 'compare']
    const containerClass = computed(() => [
      'content',
      'of--tinted',
      `of--tint-${params.containerTint}`,
    ])
    const allParams = computed(() => {
      let p: any = { ...params }
      if (p.variant === 'default') delete p.variant
      if (p.variant === 'compare') {
        return [
          { ...p, variant: 'outlined' },
          { ...p, variant: 'filled' },
        ]
      } else {
        return [p]
      }
    })

    const checkedValue = ref(false)
    const customProps = reactive({ switch: false })

    return {
      allParams,
      densityOptions,
      tintOptions,
      containerClass,
      labelPosOptions,
      modeOptions,
      variantOptions,
      params,
      checkedValue,
      props,
      customProps,
      sizeOptions,
      widthOptions,
    }
  },
})
</script>

<style lang="scss">
.of-demo-field {
  background: var(--of-color-background);
  --elevation-level: 1;
  border-radius: 4px;
  display: flex;
  flex-flow: row nowrap;
  margin: 1em 0;
  .content {
    box-sizing: border-box;
    display: flex;
    flex: auto;
    flex-flow: column wrap;
    justify-content: center;
    overflow: hidden;
    padding: 0.25em 0.5em;
    .field {
      box-sizing: border-box;
      flex: 0 1 auto;
      justify-content: center;
      padding: 0.75em;
    }
  }
  .options {
    flex: 0 0 16em;
    padding: 1ex;
    margin: 1em;
    overflow: hidden;
    --elevation-level: 1;
    border-radius: 8px;
  }
  .options-fields {
    display: flex;
    flex-flow: column nowrap;
    grid-gap: 0.5em;
  }
  hr {
    padding: 0;
    margin: 0.75em;
  }
}
</style>

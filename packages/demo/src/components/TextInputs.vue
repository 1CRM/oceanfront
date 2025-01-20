<template>
  <div class="container">
    <h1>Text Inputs</h1>
    <of-highlight lang="html" :value="sampleCode" />

    <of-demo-field>
      <template #default="props">
        <of-text-field
          placeholder="(placeholder)"
          help="field help"
          label="Text input"
          v-model="textValue"
          v-bind="{
            ...props,
            ...customProps
          }"
        />
      </template>
      <template #options>
        <of-field
          type="toggle"
          label="Multi-line"
          label-position="input"
          v-model="customProps.multiline"
        />
        <of-field
          type="toggle"
          label="Tooltip"
          label-position="input"
          v-model="showTooltip"
        />
      </template>
    </of-demo-field>

    <div class="demo-fields of--elevated-1">
      <div class="row demo-row">
        <of-text-field
          class="of--small"
          model-value="Small text input"
          style="width: 10em"
          frame="none"
        />
        <of-text-field
          :model-value="withItemsVal"
          @update:modelValue="upd"
          style="width: 10em"
          frame="none"
          :items="items"
        />
        <of-text-field
          model-value="Normal text input"
          style="width: 10em"
          frame="none"
        />
        <of-text-field
          class="of--large"
          model-value="Large text input"
          style="width: 10em"
          frame="none"
        />
        <of-text-field
          readonly
          model-value="Read-only text"
          style="width: 10em"
          frame="none"
        />
        <of-text-field
          disabled
          model-value="Disabled text"
          style="width: 10em"
          frame="none"
        />
        <of-text-field
          placeholder="Placeholder"
          style="width: 10em"
          frame="none"
        />
        <of-text-field
          class="of--density-3"
          style="width: 10em"
          model-value="Compact"
          frame="none"
        />
        <of-text-field
          placeholder="Password"
          input-type="password"
          model-value="password"
          frame="none"
        />
      </div>
      <div class="row demo-row">
        <of-text-field
          multiline
          class="of--small"
          style="width: 10em"
          model-value="Small text area"
          frame="none"
        />
        <of-text-field
          multiline
          style="width: 10em"
          model-value="Normal text area"
          frame="none"
        />
        <of-text-field
          multiline
          class="of--large"
          style="width: 10em"
          model-value="Large text area"
          frame="none"
        />
        <of-text-field
          multiline
          readonly
          style="width: 10em"
          model-value="Read-only text area"
          frame="none"
        />
        <of-text-field
          multiline
          disabled
          style="width: 10em"
          model-value="Disabled text area"
          frame="none"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { reactive, ref, defineComponent, computed } from 'vue'

export default defineComponent({
  setup() {
    const textValue = ref('sample value')
    const showTooltip = ref(false)
    const change = () => {
      textValue.value = new Date().getTime().toString()
    }
    const sampleCode = `
<of-text-field
  label="Field Label"
  v-model="fieldValue"
/>`

    const items = [
      { text: 'Items', value: 'Items' },
      { text: 'Items2', value: 'Items2' },
      { text: 'Items3', value: 'Items3' }
    ]
    const withItemsVal = ref('Items')
    const upd = (v: any) => (withItemsVal.value = v)

    const tooltip = computed(() =>
      showTooltip.value ? 'Text Input Tooltip' : ''
    )
    const customProps = reactive({
      multiline: false,
      tooltip
    })

    return {
      change,
      customProps,
      sampleCode,
      textValue,
      items,
      withItemsVal,
      showTooltip,
      upd
    }
  }
})
</script>

<style lang="scss">
.demo-row {
  grid-gap: 10px;
  margin: 10px 0;
}
</style>

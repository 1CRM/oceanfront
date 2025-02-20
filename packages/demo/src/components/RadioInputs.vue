<template>
  <div class="container">
    <h1>Radio Inputs</h1>
    <of-highlight lang="html" :value="sampleCode" />

    <of-demo-field allow-input-label-position>
      <template #default="props">
        <of-radio-field
          label="Radio Field"
          :items="[{text: 'Value1', value: 'value1'}, {text: 'Value2', value: 'value2'}, {text: 'Value3', value: 'value3'}]"
          v-model="checkedValue"
          v-bind="{
            ...props,
            grid: customProps.grid,
          }"
        />
      </template>
      <template #options>
        <of-field
          v-model="customProps.grid"
          label="Grid"
          type="select"
          :items="gridOptions"
        />
      </template>
    </of-demo-field>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue'

export default defineComponent({
  setup() {
    const sampleCode = `
<of-radio-field
  label="Field Label"
  :items="['value1', 'value2', 'value3'] or [{text: 'Value1', value: 'value1'}, {text: 'Value2', value: 'value2'}, {text: 'Value3', value: 'value3'}]"
  v-model="selectedValue"
/>`
    const customProps = reactive({ grid: 'column' })
    const gridOptions = ['column', 'row']
    const checkedValue = ref('')
    return { checkedValue, customProps, sampleCode, gridOptions }
  },
})
</script>

<template>
  <div class="container">
    <h1>Toggle Inputs</h1>
    <of-highlight lang="html" :value="sampleCode" />

    <of-demo-field allow-input-label-position>
      <template #default="props">
        <of-toggle-field
          type="toggle"
          label="Toggle Field"
          v-model="checkedValue"
          v-bind="{
            ...props,
            inputType: customProps.switch ? 'switch' : null,
            inputLabel: checkedValue ? 'On' : 'Off'
          }"
        />
      </template>
      <template #options>
        <of-toggle-field
          label="Render as switch"
          label-position="input"
          v-model="customProps.switch"
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
<of-toggle-field
  label="Field Label"
  v-model:checked="fieldChecked"
/>`
    const customProps = reactive({ switch: false })
    const checkedValue = ref(false)
    return { checkedValue, customProps, sampleCode }
  }
})
</script>

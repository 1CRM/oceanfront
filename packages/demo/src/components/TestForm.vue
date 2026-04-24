<template>
  <div class="container">
    <div class="row">
      <div class="column">
        <of-select-field
          label="Select input"
          value="Selected"
          variant="filled"
        ></of-select-field>
        <of-highlight lang="html" value="<html>" />
      </div>
    </div>
    <div class="row">
      <div class="column md-4">
        <div class="form-outer">
          <div class="form-cell">
            <of-text-field
              :config="{ ...testField, variant: 'basic' }"
              v-model="textValue"
            />
          </div>
          <br />
          <div class="form-cell">
            <of-text-field
              :config="{ ...testField, variant: 'outlined' }"
              v-model="textValue"
            />
          </div>
          <br />
          <div class="form-cell">
            <of-text-field
              :config="{ ...testField, variant: 'filled' }"
              v-model="textValue"
            />
          </div>
          <br />
          <button class="input-button" @click="change">Update</button>
        </div>
      </div>
      <div class="column md-4">
        <div class="form-outer">
          <div class="form-cell">
            <of-textarea
              :config="{ ...testField, rows: 3, variant: 'basic' }"
            />
          </div>
          <br />
          <div class="form-cell">
            <of-textarea
              :config="{ ...testField, rows: 3, variant: 'outlined' }"
            />
          </div>
          <br />
          <div class="form-cell">
            <of-textarea
              :config="{ ...testField, rows: 3, variant: 'filled' }"
            />
          </div>
        </div>
      </div>
      <div class="column md-4">
        <div class="form-outer">
          <div class="form-cell">
            <of-toggle-field
              :config="{ ...testCheckField, variant: 'basic' }"
            />
          </div>
          <br />
          <div class="form-cell">
            <of-toggle-field
              :config="{ ...testCheckField, variant: 'outlined' }"
            />
          </div>
          <br />
          <div class="form-cell">
            <of-toggle-field
              :config="{ ...testCheckField, variant: 'filled' }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent } from 'vue'

const testField = {
  description: 'Field description',
  help: 'field help',
  hidden: false,
  label: 'Field Label',
  placeholder: 'placeholder',
  readOnly: false,
  required: true,
  type: 'float'
}

const testCheckField = {
  description: 'Field description',
  help: 'field help',
  hidden: false,
  label: 'Field Label',
  placeholder: 'placeholder',
  readOnly: false,
  required: true,
  type: 'float',
  labelPosition: 'input'
}

export default defineComponent({
  /*async */ setup() {
    const textValue = ref('62.14')
    const change = () => {
      textValue.value = new Date().getTime().toString()
    }
    return {
      change,
      testField,
      testCheckField,
      textValue
    }
  }
})
</script>

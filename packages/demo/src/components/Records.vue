<template>
  <div class="container">
    <h1>Records</h1>
    <p>
      Instead of binding each field's value property directly, it can be more
      effective to bind a <var>record</var> and a field name. This may be be
      required for complex field types which bind to multiple fields on the
      associated record. It also allows for validation rules to be combined at
      the record level, instead of being assigned to individual fields or
      handled within a custom component.
    </p>
    <of-highlight lang="html" :value="sampleBinding" />

    <div class="row content">
      <div class="column">
        <div class="demo-form of--elevated-1">
          <div class="row form-row">
            <div class="column">
              <of-select-field
                label="Select"
                :items="items"
                :record="testRecord"
                name="one"
              ></of-select-field>
            </div>
          </div>
          <div class="row form-row">
            <div class="column">
              <of-select-field
                label="Multi Select"
                multi
                :items="items"
                :record="testRecord"
                name="nine"
              ></of-select-field>
            </div>
          </div>
          <div class="row form-row">
            <div class="column">
              <of-text-field label="Text" name="two" :record="testRecord" />
            </div>
          </div>
          <div class="row form-row">
            <div class="column">
              <of-toggle-field
                name="three"
                label="Toggle"
                label-position="input"
                :record="testRecord"
              />
            </div>
          </div>
          <div class="row form-row">
            <div class="column">
              <of-slider-field
                name="four"
                label="Slider"
                :record="testRecord"
              />
            </div>
          </div>
          <div class="row form-row">
            <div class="column">
              <of-datetime-field
                name="five"
                label="Date and time picker"
                :record="testRecord"
              />
            </div>
          </div>
          <div class="row form-row">
            <div class="column">
              <of-date-field
                name="six"
                label="Date picker"
                required
                :record="testRecord"
              />
            </div>
          </div>
          <div class="row form-row">
            <div class="column">
              <of-time-field
                name="seven"
                label="Time picker"
                :record="testRecord"
              />
            </div>
          </div>
          <div class="row form-row">
            <div class="column">
              <of-button
                @click="testRecord.reset()"
                :disabled="testRecord.locked"
              >
                Reset
              </of-button>
            </div>
          </div>
        </div>
      </div>
      <div class="column">
        <div class="record-info">
          <h4>Record state</h4>
          <div class="row">
            <div class="column sm-8">
              <of-toggle
                label="Locked"
                v-model:checked="testRecord.locked"
                switch
              />
            </div>
          </div>
          <div class="row">
            <div class="column sm-4">Updated:</div>
            <div class="column sm-8">
              {{ testRecord.updated || false }}
            </div>
          </div>
          <of-highlight lang="json" :value="formatValue" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { makeRecord } from 'oceanfront'
import { computed, defineComponent, ref } from 'vue'

const testRecord = makeRecord({
  one: 'optionA',
  two: 'text',
  three: true,
  four: 25,
  five: '2021-03-14 15:45',
  six: '2021-02-15',
  seven: '12:00:00',
  eight: 'https://1crm.com/',
  nine: ['optionB', 'optionA']
})

const items = [
  { value: 'optionA', text: 'A' },
  { value: 'optionB', text: 'B' }
]

export default defineComponent({
  setup() {
    const textValue = ref('62.14')
    const change = () => {
      textValue.value = new Date().getTime().toString()
    }
    const formatValue = computed(() => {
      return JSON.stringify(testRecord.value, null, 2)
    })
    const sampleBinding = `<of-field
  :record="testRecord"
  name="propA"
  type="text"
/>`
    return {
      change,
      formatValue,
      sampleBinding,
      testRecord,
      textValue,
      items
    }
  }
})
</script>

<style scoped>
.content {
  margin-top: 1.5rem;
}
.record-info {
  padding-left: 1em;
}
</style>

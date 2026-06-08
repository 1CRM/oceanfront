<template>
  <div class="container">
    <h1>Value Formatters</h1>
    <div class="row content sm-unstack">
      <div class="column">
        <div class="demo-form of--elevated-1">
          <div class="row form-row" style="column-gap: 1em">
            <div class="column">
              <of-config :locale="locale">
                <of-text-field
                  placeholder="(placeholder)"
                  help="field help"
                  label="Number Input"
                  v-model="values.number"
                  type="number"
                />
              </of-config>
            </div>
            <div class="column">
              <of-select-field
                label="Select Locale"
                :items="localeOpts"
                v-model="locale"
              />
            </div>
          </div>
          <div class="row form-row">
            <of-config :locale="locale">
              <of-field
                placeholder="(placeholder)"
                help="field help"
                label="Duration Input"
                type="duration"
                v-model="values.duration"
              />
            </of-config>
          </div>
          <div class="row form-row">
            <of-config :locale="locale">
              <of-field
                placeholder="(placeholder)"
                help="field help"
                label="URL Input"
                type="url"
                v-model="values.url"
              />
            </of-config>
          </div>
        </div>
      </div>
      <div class="column"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, reactive, defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const values = reactive({
      number: 100125.99,
      duration: 100,
      url: 'https://example.com/',
      color: '#336699'
    })
    const localeOpts = [
      { text: '(browser default)', value: '' },
      { text: 'en-CA', value: 'en-CA' },
      { text: 'de-CH', value: 'de-CH' },
      { text: 'de-DE', value: 'de-DE' },
      { text: 'fr-FR', value: 'fr-FR' }
    ]
    const locale = ref('')
    return {
      locale,
      localeOpts,
      values
    }
  }
})
</script>

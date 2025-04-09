<template>
  <div class="container">
    <h1>Buttons</h1>
    <of-highlight lang="html" :value="sampleCode" />
    <br />
    <div class="header-options-fields">
      <of-field
        v-model="params.density"
        label="Density"
        type="select"
        :items="densityOptions"
      />
      <of-field
        v-model="params.rounded"
        label="Rounded"
        type="toggle"
        label-position="input"
        :items="densityOptions"
      />
      <of-field
        v-model="params.tint"
        label="Tint"
        type="select"
        :items="tintOptions"
      />
      <of-field
        v-model="params.scale"
        label="Scale"
        type="select"
        :items="scaleOptions"
      />
    </div>
    <div class="demo-fields of--elevated-1">
      <div class="row" v-for="variant in variants" :key="variant">
        <div
          class="column spaced"
          style="flex: 0 1 10em; text-transform: capitalize; font-weight: bold"
        >
          {{ variant }}
        </div>
        <div class="column spaced">
          <of-button v-bind="params" :variant="variant">Submit</of-button>
          <of-button v-bind="params" :variant="variant" disabled
            >Disabled</of-button
          >
          <of-button v-bind="params" :variant="variant" icon="gear"></of-button>
          <of-button
            v-bind="params"
            :variant="variant"
            split
            :items="testItems"
            @click="menuClick"
            icon="gear"
          ></of-button>
          <of-button v-bind="params" :variant="variant" icon="gear"
            >Gear</of-button
          >
          <of-button
            v-bind="params"
            :variant="variant"
            split
            :items="testItems"
            @click="menuClick"
            >Split</of-button
          >
          <of-button
            v-bind="params"
            :variant="variant"
            icon="gear"
            :items="testItems"
            >Menu</of-button
          >
        </div>
      </div>
    </div>
    <div class="demo-fields of--elevated-1">
      <div class="row" v-for="variant in variants" :key="variant">
        <div class="column spaced">
          <span
            class="of-buttonset"
            :class="{
              'of-buttonset--rounded': params.rounded,
              'of--elevated': variant == 'elevated'
            }"
          >
            <of-button v-bind="params" :variant="variant" icon="accept"
              >Save</of-button
            >
            <of-button
              v-bind="params"
              :variant="variant"
              icon="refresh"
              disabled
              >Refresh</of-button
            >
            <of-button
              v-bind="params"
              :variant="variant"
              icon="gear"
              :items="testItems"
              >Menu</of-button
            >
            <of-button v-bind="params" :variant="variant" icon="cancel"
              >Cancel</of-button
            >
          </span>
        </div>
        <div class="column spaced" v-if="variant != 'text'">
          <span
            class="of-buttonset"
            :class="{
              'of-buttonset--rounded': params.rounded,
              'of--elevated': variant == 'elevated'
            }"
          >
            <of-button v-bind="params" :variant="variant">1</of-button>
            <of-button v-bind="params" :variant="variant" active>2</of-button>
            <of-button v-bind="params" :variant="variant">3</of-button>
            <of-button v-bind="params" :variant="variant">4</of-button>
            <of-button v-bind="params" :variant="variant">5</of-button>
            <of-button
              v-bind="params"
              :variant="variant"
              icon="page last"
            ></of-button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue'

export default defineComponent({
  setup() {
    const sampleCode = `
<of-button scale="nm">Submit</of-button>
<of-button variant="outlined">Submit</of-button>
<of-button variant="text">Submit</of-button>
<of-button disabled>Disabled</of-button>
<of-button icon="gear">With Icon</of-button>
<of-button rounded>Rounded</of-button>
<of-button split :items="testItems" @click="menuClick">Split</of-button>
<of-button icon="gear" rounded :items="testItems">Menu</of-button>
<!-- Set -->
<span class="of-buttonset">
  <of-button icon="accept">Save</of-button>
  <of-button icon="refresh" disabled>Refresh</of-button>
  <of-button icon="gear" rounded split :items="testItems">Split</of-button>
  <of-button icon="cancel">Cancel</of-button>
</span>`

    const variants = ['elevated', 'filled', 'tonal', 'outlined', 'text']
    const selectMenu1 = () => {
      console.log('Menu item 1 selected')
    }
    const selectMenu2 = () => {
      console.log('Menu item 2 selected')
    }
    const menuClick = () => {
      console.log('Button click')
    }

    const testItems = [
      {
        text: 'Option 1',
        value: selectMenu1,
        attrs: { 'data-test': 'my-btn' }
      },
      { text: 'Option 2', value: selectMenu2 }
    ]

    const densityOptions = ['default', '0', '1', '2', '3']
    const tintOptions = ['default', 'primary', 'secondary', 'tertiary']
    const scaleOptions = ['sm', 'nm', 'lg']
    const params = reactive({
      density: 'default',
      rounded: false,
      tint: 'default',
      scale: 'nm'
    })
    return {
      sampleCode,
      testItems,
      densityOptions,
      tintOptions,
      scaleOptions,
      params,
      menuClick,
      variants
    }
  }
})
</script>

<style lang="scss" scoped>
.container {
  min-width: 27em;
}
</style>

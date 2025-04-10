<template>
  <div class="container" style="style">
    <h1>Color scheme editor</h1>
    <div class="row content">
      <div class="column spaced">
        <h2>Source colors</h2>
        <of-color-scheme-editor
          :colors="colors"
          :limits="limits"
          @color-updated="colorUpdated"
          @pallette-updated="palletteUpdated"
        />
      </div>
      <div class="column spaced">
        <h2>Application color palette</h2>
        <div class="palette-grid of--elevated-2 styled" :style="styles">
          <div class="primary">Primary</div>
          <div class="on-primary">On Primary</div>
          <div class="primary-container">Primary Container</div>
          <div class="on-primary-container">On Primary Container</div>
          <div class="secondary">Secondary</div>
          <div class="on-secondary">On Secondary</div>
          <div class="secondary-container">Secondary Container</div>
          <div class="on-secondary-container">On Secondary Container</div>
          <div class="tertiary">Tertiary</div>
          <div class="on-tertiary">On Tertiary</div>
          <div class="tertiary-container">Tertiary Container</div>
          <div class="on-tertiary-container">On Tertiary Container</div>
          <div class="error">Error</div>
          <div class="on-error">On Error</div>
          <div class="error-container">Error Container</div>
          <div class="on-error-container">On Error Container</div>
          <div class="background">Background</div>
          <div class="on-background">On Background</div>
          <div class="surface">Surface</div>
          <div class="on-surface">On Surface</div>
          <div class="surface-variant">Surface Variant</div>
          <div class="on-surface-variant">On Surface Variant</div>
          <div class="inverse-surface">Inverse Surface</div>
          <div class="inverse-on-surface">Inverse On Surface</div>
          <div class="outline">Outline</div>
          <div class="shadow">Shadow</div>
          <div class="inverse-primary">Inverse Primary</div>
          <div class="inverse-secondary">Inverse Secondary</div>
          <div class="inverse-tertiary">Inverse Tertiary</div>
        </div>
        <p>
          <of-button variant="elevated" @click="applyScheme">Apply</of-button>
        </p>
      </div>
    </div>
  </div>
  <div class="container styled" :style="styles">
    <h2>Section</h2>
    <div class="sections">
      <div class="header separated">Title</div>
      <div class="header2 separated">Title 2</div>
      <div class="header3 separated">Title 3</div>
      <div class="bg separated">Background</div>
      <div class="bg-alt">Alt background</div>
    </div>
  </div>
  <div class="container">
    <of-highlight lang="css" :value="styles" />
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue'
import {
  defaultBaseColors,
  defaultLimits,
  defaultStyles,
  OfColorSchemeEditor
} from 'of-colorscheme-editor'

const colors = reactive(defaultBaseColors())

export default defineComponent({
  components: {
    OfColorSchemeEditor
  },
  setup() {
    const styles = ref('')
    const colorUpdated = (name: string, value: string) => {
      colors[name] = value
    }
    const palletteUpdated = (pal: any) => {
      styles.value = defaultStyles(pal)
    }
    const applyScheme = () => {
      const styleEl = document.head.querySelector<HTMLStyleElement>(
        'style#colorscheme-preview'
      )

      if (styleEl)
        styleEl.innerText = `:root {${styles.value.replaceAll('\n', '')}}`
    }
    return {
      colors,
      palletteUpdated,
      colorUpdated,
      styles,
      applyScheme,
      limits: defaultLimits
    }
  },
  mounted() {
    const styleEl = document.head.querySelector('style#colorscheme-preview')
    if (!styleEl) {
      const styleEl = document.createElement('style')
      styleEl.setAttribute('id', 'colorscheme-preview')
      document.head.appendChild(styleEl)
    }
  }
})
</script>

<style lang="scss" scoped>
.row.content {
  > div {
    padding: 0 1rem;

    &:first-child {
      max-width: 15em;
      min-width: 15em;
    }
    &:last-child {
      min-width: 20em;
    }
  }
}

.palette-grid {
  display: grid;
  font-size: 65%;
  max-width: 60em;
  grid-template-columns: repeat(4, minmax(50px, 1fr));
  border-radius: 4px;
  overflow: hidden;
  & div {
    padding: 0.4rem;
    font-weight: bold;
  }
  & .primary {
    background: var(--of-color-primary);
    color: var(--of-color-on-primary);
  }
  & .on-primary {
    color: var(--of-color-primary);
    background: var(--of-color-on-primary);
  }
  & .primary-container {
    background: var(--of-color-primary-container);
    color: var(--of-color-on-primary-container);
  }
  & .on-primary-container {
    color: var(--of-color-primary-container);
    background: var(--of-color-on-primary-container);
  }
  & .secondary {
    background: var(--of-color-secondary);
    color: var(--of-color-on-secondary);
  }
  & .on-secondary {
    color: var(--of-color-secondary);
    background: var(--of-color-on-secondary);
  }
  & .secondary-container {
    background: var(--of-color-secondary-container);
    color: var(--of-color-on-secondary-container);
  }
  & .on-secondary-container {
    color: var(--of-color-secondary-container);
    background: var(--of-color-on-secondary-container);
  }
  & .tertiary {
    background: var(--of-color-tertiary);
    color: var(--of-color-on-tertiary);
  }
  & .on-tertiary {
    color: var(--of-color-tertiary);
    background: var(--of-color-on-tertiary);
  }
  & .tertiary-container {
    background: var(--of-color-tertiary-container);
    color: var(--of-color-on-tertiary-container);
  }
  & .on-tertiary-container {
    color: var(--of-color-tertiary-container);
    background: var(--of-color-on-tertiary-container);
  }
  & .error {
    background: var(--of-color-error);
    color: var(--of-color-on-error);
  }
  & .on-error {
    color: var(--of-color-error);
    background: var(--of-color-on-error);
  }
  & .error-container {
    background: var(--of-color-error-container);
    color: var(--of-color-on-error-container);
  }
  & .on-error-container {
    color: var(--of-color-error-container);
    background: var(--of-color-on-error-container);
  }
  & .background {
    background: var(--of-color-background);
    color: var(--of-color-on-background);
  }
  & .on-background {
    color: var(--of-color-background);
    background: var(--of-color-on-background);
  }
  & .surface {
    background: var(--of-color-surface);
    color: var(--of-color-on-surface);
  }
  & .on-surface {
    color: var(--of-color-surface);
    background: var(--of-color-on-surface);
  }
  & .outline {
    grid-column-start: 1;
    grid-column-end: 3;
    background: var(--of-color-outline);
    color: var(--of-color-on-background);
  }
  & .surface-variant {
    background: var(--of-color-surface-variant);
    color: var(--of-color-on-surface-variant);
  }
  & .on-surface-variant {
    color: var(--of-color-surface-variant);
    background: var(--of-color-on-surface-variant);
  }
  & .shadow {
    grid-column-start: 3;
    grid-column-end: 5;
    color: var(--of-color-outline);
    background: var(--of-color-shadow);
  }
  & .inverse-surface {
    background: var(--of-color-inverse-surface);
    color: var(--of-color-inverse-on-surface);
  }
  & .inverse-on-surface {
    color: var(--of-color-inverse-surface);
    background: var(--of-color-inverse-on-surface);
  }
  & .inverse-primary {
    grid-column-start: 1;
    grid-column-end: 3;
    color: var(--of-color-primary);
    background: var(--of-color-inverse-primary);
  }
  & .inverse-secondary {
    color: var(--of-color-secondary);
    background: var(--of-color-inverse-secondary);
  }
  & .inverse-tertiary {
    color: var(--of-color-tertiary);
    background: var(--of-color-inverse-tertiary);
  }
}

.sections {
  border: solid 1px var(--of-color-section-border);
  border-radius: 8px;
  overflow: hidden;
  div {
    padding: 8px;
  }
  .header {
    background-color: var(--of-color-section-header);
  }
  .header2 {
    background-color: var(--of-color-section-header2);
  }
  .header3 {
    background-color: var(--of-color-section-header3);
  }
  .bg {
    background-color: var(--of-color-section-bg);
  }
  .bg-alt {
    background-color: var(--of-color-section-alt-bg);
  }
}

.separated {
  position: relative;
  &:after {
    position: absolute;
    height: 1px;
    background: var(--of-color-outline);
    opacity: 0.2;
    content: '';
    left: 0;
    right: 0;
    bottom: 0;
  }
}
</style>

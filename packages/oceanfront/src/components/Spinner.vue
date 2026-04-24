<template>
  <div
    class="wait-icon"
    role="status"
    aria-live="polite"
    :aria-label="lang.spinnerLoading"
  >
    <div class="bar1"></div>
    <div class="bar2"></div>
    <div class="bar3"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useLanguage } from '../lib/language'

export default defineComponent({
  name: 'OfSpinner',
  setup() {
    const lang = useLanguage()
    return { lang }
  }
})
</script>

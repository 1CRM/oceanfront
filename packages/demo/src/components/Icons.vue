<template>
  <div class="container">
    <h1>Icons</h1>
    <p>
      The library will support a customizable mapping from standard named icons
      to theme-specific versions, with support for Material icons by default,
      along with any others that applications choose to include.
    </p>

    <of-config>
      <div class="row demo-row">
        <div class="demo-inline" v-for="(iconset, idx) of icons" :key="idx">
          <div class="demo-icon" v-for="(desc, icon) of iconset" :key="icon">
            <of-icon :name="icon" :title="desc" />
          </div>
        </div>
      </div>

      <div v-if="highDpi">
        <div class="row demo-row">
          <div class="demo-inline" v-for="(iconset, idx) of icons" :key="idx">
            <div class="demo-icon" v-for="(desc, icon) of iconset" :key="icon">
              <of-icon :name="icon" :title="desc" size="12" />
            </div>
          </div>
        </div>
      </div>
    </of-config>

    <h2>Two-color SVG icons</h2>
    <of-icon-preview />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useLayout } from 'oceanfront'

import OfIconPreview from './iconedit/Preview.vue'

export default defineComponent({
  components: { OfIconPreview },
  setup(_props, _ctx) {
    const layout = useLayout()
    return {
      highDpi: computed(() => layout.isHighDpi),
      icons: [
        {
          accept: 'accept',
          cancel: 'cancel',
          gear: 'gear',
          print: 'print',
          refresh: 'refresh',
          menu: 'menu',
          more: 'more',
          'more alt': 'more alt',
          'theme settings': 'theme settings',
          'theme light': 'light mode',
          'theme dark': 'dark mode'
        },
        {
          required: 'required',
          email: 'email',
          mobile: 'mobile',
          phone: 'phone',
          external: 'external',
          attach: 'attachment',
          plus: 'plus',
          minus: 'minus',
          user: 'user',
          lock: 'lock',
          search: 'search',
          date: 'date',
          time: 'time',
          hourglass: 'hourglass'
        },
        {
          checkbox: 'checkbox off',
          'checkbox checked': 'checkbox on',
          radio: 'radio off',
          'radio checked': 'radio on',
          star: 'star off',
          'star checked': 'star on'
        },
        {
          'arrow up': 'up arrow',
          'arrow down': 'down arrow',
          'arrow left': 'left arrow',
          'arrow right': 'right arrow'
        },
        {
          'page first': 'page first',
          'page previous': 'page previous',
          'page next': 'page next',
          'page last': 'page last'
        },
        {
          'bullet up': 'bullet up',
          'bullet down': 'bullet down',
          'bullet left': 'bullet left',
          'bullet right': 'bullet right'
        },
        {
          'expand up': 'expand up',
          'expand down': 'expand down',
          'expand open': 'expand',
          'expand close': 'expand close'
        },
        {
          // ellipsis circle
          // attach circle
          'accept circle': 'accept circle',
          'cancel circle': 'cancel circle',
          'info circle': 'info circle',
          'error circle': 'error circle',
          'plus circle': 'plus circle',
          'minus circle': 'minus circle',
          'help circle': 'help circle'
          // split circle
          // refresh circle
        },
        {
          'led grey': 'grey led',
          'led green': 'green led',
          'led red': 'red led',
          'led yellow': 'yellow led',
          'led violet': 'violet led',
          'led blue': 'blue led',
          'led orange': 'orange led'
        }
      ]
    }
  }
})
</script>

<style lang="scss">
.demo-inline {
  display: flex;
  flex-flow: row wrap;
}
.demo-icon {
  // box-sizing: content-box;
  display: flex;
  border-radius: 2px;
  // font-size: 1.75rem;
  // line-height: 1;
  border: 1px solid var(--of-color-outline);
  background: var(--of-color-surface);
  color: var(--of-color-on-surface);
  box-shadow: 0 1px 0 var(--of-color-shadow);
  cursor: default;
  margin: 2px;
  text-align: center;
  &:hover {
    color: var(--of-primary-tint);
  }
}
</style>

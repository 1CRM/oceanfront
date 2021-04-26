<template>
  <div 
    :class="[
      {
        'of-button--rounded': rounded,
        'of-button--split': split,
      },
      'of-button', 
      'of-button--' + variant
    ]"
  >
    <button :disabled="disabled">
      <of-icon v-if="icon" :name="icon" class="of-button-icon" />
      <slot>&nbsp;</slot>
    </button>
    <button 
      v-if="split"
      class="expand"
      @click="toggleMenu($event)"
      @mouseleave="menuLeave()"
    > 
      <of-icon name="expand-down" />
    </button>
    <of-overlay
      v-if="split"
      :active="menuShown"
      :capture="false"
      :shade="false"
      :target="menuOuter"
    >
      <of-option-list 
        :items="items" 
        :on-click="onClick" 
        @mouseenter="menuClearTimeout()"
        @mouseleave="menuLeave()"
      />
    </of-overlay>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import { OfOptionList } from '../components/OptionList'
export default defineComponent({
  name: 'OfButton',  
  components: { OfOptionList },
  props: {
    variant: String,
    icon: String,
    rounded: Boolean,
    disabled: Boolean,
    split: Boolean,
    items: [String, Array, Object],
  },
  setup(props) {
    const variant = computed(() => props.variant || 'solid')
    const menuShown = ref(false)
    const menuOuter = ref()
    const menuTimerId = ref()
    const onClick = (menuItemSelect: Function) => {
      menuItemSelect()
      closeMenu()
    }
    const toggleMenu = (_evt?: MouseEvent) => {
      menuOuter.value = _evt?.target
      menuShown.value = !menuShown.value
    }
    const closeMenu = () => {
      menuShown.value = false
    }
    const menuLeave = () => {
      if (!menuShown.value) return false
      menuTimerId.value = setTimeout(() => {
        closeMenu()
      }, 500)
    }
    const menuClearTimeout = () => {
      clearTimeout(menuTimerId.value)
    }
    return {
      onClick, 
      closeMenu, 
      toggleMenu, 
      menuShown, 
      menuOuter, 
      variant,
      menuLeave,
      menuClearTimeout
    }
  }
})
</script>

<template>
  <template v-if="type === 'text' || type === 'number'">
    <div class="editable-field-value-handler">
      <div
        class="editable-field-value field-value"
        :class="{
          active: active,
          inline: mode === 'inline',
        }"
        ref="elem"
      >
        <span
          v-if="
            active &&
            mode === 'inline' &&
            item.hasOwnProperty('originalValue') &&
            item.originalValue != item.value
          "
          @click="resetValue"
          class="reset-value-button"
          ><of-icon name="cancel"></of-icon
        ></span>
        <of-text-field
          :mode="active && mode === 'inline' ? 'editable' : 'fixed'"
          multiline
          type="textarea"
          @input="resizeInput"
          @blur="onInputBlur"
          @focus="onInputFocus"
          @keydown:enter="() => (active = false)"
          v-model="item.value"
        ></of-text-field>
        <div class="field-editor" v-if="active && mode === 'popup'">
          <div class="edit-overlay-desk">
            <of-text-field
              multiline
              class="awdawdawd"
              type="textarea"
              @input="resizeInput"
              @blur="onInputBlur"
              @focus="onInputFocus"
              @keydown:enter="() => (active = false)"
              v-model="item.value"
            ></of-text-field>
            <of-button
              v-if="item.value != item.originalValue"
              @click="resetValue"
              class="reset-edit-button"
              label="Reset"
              icon="cancel"
            ></of-button>
          </div>
        </div>
      </div>
      <div class="rename-divider"></div>
      <span
        v-if="
          item.hasOwnProperty('originalValue') &&
          item.originalValue != item.value &&
          showOldValues
        "
        class="old-value"
      >
        <of-data-type :value="showItem"></of-data-type>
      </span>
    </div>
  </template>
  <template v-else>
    <component v-model="item.value" :is="componentValue"></component>
  </template>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  h,
  nextTick,
  ref,
  resolveComponent,
  shallowRef,
  watch,
} from 'vue'
import { OfSelectField } from '../fields/Select'
import { OfIcon } from './Icon'
import { DataTypeValue } from '../lib/datatype'
import { OfButton } from './Button'
import { OfToggleField } from '../fields/Toggle'
const renderValues = {
  select: 'OfSelectField',
  checkbox: 'OfToggleField',
  date: 'OfDateField',
  time: 'OfTimeField',
  datetime: 'OfDatetimeField',
}
const OfEditableField = defineComponent({
  name: 'OfEditableField',
  components: { OfToggleField, OfButton, OfIcon, OfSelectField },
  props: {
    modelValue: Object,
    mode: String,
    showOldValues: Boolean,
  },
  emits: ['update:modelValue'],
  setup(props, ctx) {
    const item = computed(
      () => props.modelValue || ({} as DataTypeValue)
    ) as any
    const active = ref(false)
    const type = computed(() => props.modelValue?.type || 'text')
    if (item.value && !item.value.hasOwnProperty('originalValue')) {
      item.value.originalValue = item.value.value
    }
    const showItem = computed(() => {
      const res = { ...item.value }
      res.value = res.hasOwnProperty('originalValue')
        ? res.originalValue
        : res.value
      return res as DataTypeValue
    })
    const elem = shallowRef<HTMLInputElement | undefined>()
    const resetValue = () => {
      item.value.value = item.value.originalValue
      nextTick(() => {
        resizeInput()
      })
    }

    const onInputBlur = () => {
      setTimeout(() => {
        active.value = false
      }, 100)
    }
    const onInputFocus = () => {
      active.value = true
      nextTick(() => {
        resizeInput(true)
      })
    }
    const resizeInput = (focus = false) => {
      const placement =
        props.mode === 'inline'
          ? '.of-field-input'
          : '.edit-overlay-desk .of-field-input'
      const input = elem.value?.querySelector(placement) as HTMLInputElement
      if (!input) return
      input.style.height = '14px'
      input.style.height = input.scrollHeight + 'px'
      if (focus) {
        input.focus()
      }
    }
    const componentValue = computed(() => {
      if (renderValues.hasOwnProperty(type.value)) {
        const comp = resolveComponent(
          renderValues[type.value as keyof typeof renderValues]
        )
        const props = { items: item.value?.items }
        return h(comp, props)
      }
      return null
    })
    watch(
      () => item.value,
      () => {
        if (type.value === 'number' && item.value.value) {
          let val = item.value.value + ''
          item.value.value = parseInt(val.replace(/\D/g, '').trim())
        }
        ctx.emit('update:modelValue', item.value)
      },
      { deep: true }
    )
    return {
      item,
      type,
      elem,
      resetValue,
      resizeInput,
      onInputFocus,
      active,
      onInputBlur,
      componentValue,
      showItem,
    }
  },
})

export default OfEditableField
</script>

<style scoped lang="scss">
.editable-field-value {
  .field-editor {
    position: absolute;
    z-index: 1;
  }
}
</style>

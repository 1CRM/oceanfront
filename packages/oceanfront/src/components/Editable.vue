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
          @blur="onInputBlur(true)"
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
              @blur="onInputBlur(true)"
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
    <of-field
      @focus="onInputFocus"
      :type="type"
      :mode="inputMode"
      @blur="onInputBlur"
      @update:model-value="updateValue"
      v-model="item.value"
      :items="item.items"
    ></of-field>
  </template>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  nextTick,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { OfIcon } from './Icon'
import { DataTypeValue } from '../lib/datatype'
import { OfButton } from './Button'
import { OfField } from './Field'
const supportedTypes = [
  'select',
  'toggle',
  'date',
  'time',
  'datetime',
  'text',
  'number',
]
const OfEditableField = defineComponent({
  name: 'OfEditableField',
  components: { OfField, OfButton, OfIcon },
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
    const type = computed(() => {
      if (props.modelValue?.type) {
        if (supportedTypes.includes(props.modelValue.type)) {
          return props.modelValue.type
        } else {
          throw new TypeError('Unsupported "type" property')
        }
      }
      return 'text'
    })
    if (item.value && !item.value.hasOwnProperty('originalValue')) {
      item.value.originalValue = item.value.value
    }
    const updateValue = () => {
      if (['date', 'time', 'datetime'].includes(type.value)) {
        onInputBlur()
      }
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

    const onInputBlur = (delay = false) => {
      if (delay) {
        setTimeout(() => {
          active.value = false
        }, 150)
      } else {
        active.value = false
      }
    }
    const onInputFocus = () => {
      active.value = true
      nextTick(() => {
        resizeInput(true)
      })
    }
    const inputMode = computed(() => {
      if (type.value === 'toggle') {
        return 'editable'
      } else {
        return active.value ? 'editable' : 'fixed'
      }
    })
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
      updateValue,
      resizeInput,
      onInputFocus,
      inputMode,
      active,
      onInputBlur,
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

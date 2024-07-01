<template>
  <template v-if="type === 'text' || type === 'number'">
    <div class="editable-field-value-handler">
      <div
        class="editable-field-value field-value"
        :class="{
          active: active,
          inline: mode === 'inline'
        }"
        ref="elem"
      >
        <div class="of-field-main"></div>
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
          :mode="active && mode === 'inline' ? 'editable' : inputMode"
          multiline
          type="textarea"
          :input-type="type"
          @input="resizeInput"
          @blur="onInputBlur(true)"
          @focus="onInputFocus"
          @update:model-value="updateValue"
          @keydown:enter="onKeyDown"
          v-model="item.value"
          :label="item.label"
          label-position="frame"
          :invalid="isInvalid"
          :format="item.format"
        >
          <template v-if="item.icon" #prepend>
            <of-icon :name="item.icon" />
          </template>
        </of-text-field>
        <div class="field-editor" v-if="active && mode === 'popup'">
          <div class="edit-overlay-desk">
            <of-text-field
              multiline
              type="textarea"
              @input="resizeInput"
              @blur="onInputBlur(true)"
              @focus="onInputFocus"
              @keydown:enter="onKeyDown"
              @update:model-value="updateValue"
              v-model="item.value"
              label-position="frame"
              :invalid="isInvalid"
              :format="item.format"
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
    <span v-if="item.prepend" class="editable-prepend">{{ item.prepend }}</span>
    <template v-if="supportedTypes.includes(item.type)">
      <of-field
        :class="['in-data-table-' + type, [...classes]]"
        class="editable"
        in-data-table
        @focus="onInputFocus"
        :label="item.label"
        :type="type"
        :mode="inputMode"
        @input="resizeInput"
        @blur="onInputBlur"
        @update:model-value="updateValue"
        @keydown:enter="onKeyDown"
        v-model="item.value"
        :items="item.items"
        :input-type="item.inputType"
        :outside="item.outside"
        :key="modelValue?.key"
        :invalid="isInvalid"
        :format="item.format"
        label-position="frame"
      ></of-field>
    </template>
    <template v-else>
      <component :is="item.value" :mode="'editable'" />
    </template>
  </template>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  inject,
  nextTick,
  ref,
  shallowRef,
  watch
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
  'number'
]
const OfEditableField = defineComponent({
  name: 'OfEditableField',
  components: { OfField, OfButton, OfIcon },
  props: {
    modelValue: Object,
    mode: String as any,
    showOldValues: Boolean,
    index: Number,
    name: String
  },
  emits: ['update:modelValue', 'valueChanged'],
  setup(props, ctx) {
    const itemValue: any = ref(props.modelValue || ({} as DataTypeValue))
    const isInvalid = ref(false)
    watch(
      () => props.modelValue,
      (value) => {
        itemValue.value = value
      }
    )
    const item = computed({
      get() {
        return itemValue.value
      },
      set(val) {
        console.log(val, '11111')
        itemValue.value = val
      }
    }) as any
    const active = ref(false)
    const type = computed(() => {
      if (props.modelValue?.format?.type) {
        return props.modelValue?.format?.type
      }
      if (props.modelValue?.type) {
        return props.modelValue.type
      }
      return 'text'
    })
    const classes = computed(() => props.modelValue?.classes || [])
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

    const onInputBlur = (value: Boolean | String | Number = false) => {
      if (typeof value !== 'boolean') {
        item.value.value = value
        updateValue(value)
      }
      if (value) {
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
    const onKeyDown = (value: any) => {
      item.value.value = value
      updateValue(value)
      onInputBlur()
    }
    const inputMode = computed(() => {
      if (type.value === 'toggle') {
        return 'editable'
      } else {
        return active.value ? 'editable' : props.modelValue?.mode || 'fixed'
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
      nextTick(() => (input.style.height = input.scrollHeight + 'px'))
      if (focus) {
        input.focus()
      }
    }
    const fieldUpdated: Function = inject(
      'fieldUpdated',
      () => null
    ) as Function
    const updateValue = (val: String | Boolean | Number) => {
      if (item.value.hasOwnProperty('customValidate')) {
        const result = item.value.customValidate(props.name, val)
        if (result instanceof Promise) {
          result.then((data: boolean) => {
            isInvalid.value = !data
          })
        } else {
          isInvalid.value = !result
        }
      }
      ctx.emit('valueChanged', { name: props.name, value: val })
      fieldUpdated({ name: props.name, value: val, index: props.index })
    }
    return {
      item,
      type,
      elem,
      resetValue,
      resizeInput,
      onInputFocus,
      inputMode,
      active,
      onInputBlur,
      onKeyDown,
      showItem,
      classes,
      supportedTypes,
      updateValue,
      isInvalid
    }
  }
})

export default OfEditableField
</script>

<style lang="scss">
.of-data-table {
  .editable-prepend {
    padding-right: 5px;
  }
  .of-field.editable {
    cursor: pointer;
  }
  &.editable {
    .in-data-table-datetime,
    .in-data-table-date,
    .in-data-table-time {
      position: relative;
      &.of--focused {
        .of-field-main {
          position: relative;
          transform: translateY(0px);
          width: 100%;
        }
      }
    }
    .of--align-end {
      .in-data-table-toggle {
        display: contents;
        .of-field-inner {
          display: contents;
        }
      }
    }

    .in-data-table-datetime {
      .of-field-main {
        max-width: 235px;
      }
    }
    .in-data-table-date {
      .of-field-main {
        max-width: 160px;
      }
    }
    .in-data-table-time {
      .of-field-main {
        max-width: 145px;
      }
    }
  }
  .of--align-end {
    .field-value {
      justify-content: flex-end;
    }
  }
  .field-value {
    display: flex;
    width: 100%;
  }
  .field-value:not(.editable-field-value) {
    padding-left: var(--field-h-pad, 0.5em);
  }
  .editable-field-value {
    position: relative;
    .reset-value-button {
      position: absolute;
      bottom: calc(100% - 4px);
      left: calc(100% - 8px);
      --of-icon-size: 15px;
      cursor: pointer;
    }
    min-height: 25px;
    .of-field * {
      min-height: auto;
    }
    .of-field-inner .of-field-input {
      padding: 0;
      line-height: 1.6;
    }
    &:hover {
      color: var(--of-primary-tint);
      cursor: pointer;
      &:not(.active) {
        border-radius: 4px;
        outline: 1px solid var(--of-primary-tint);
      }
    }
    &.active:not(.inline) {
      .of-field-content-text {
        color: var(--of-color-on-primary);
      }
      background: var(--of-primary-tint);
      border-radius: 4px 4px 0 0;
    }
  }
  .rename-divider {
    border-bottom: 1px dashed grey;
  }
  .old-value {
    opacity: 70%;
    font-size: 0.85em;
    padding-left: var(--field-h-pad, 4px);
  }
  .editable-field-value-handler {
    width: 100%;
  }
  .of-field > .of-field-main > .of-field-body > .of-field-inner > textarea,
  .of-field > .of-field-main > .of-field-body > .of-field-inner > input {
    resize: none;
    overflow: hidden;
    line-height: 1.25;
    margin: 0;
  }
}
.edit-overlay-desk {
  .reset-edit-button {
    margin-top: 5px;
  }
  outline: none;
  min-width: 250px;
  background: var(--of-color-menu-bg, var(--of-color-surface-variant));
  padding: 7px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.25),
    0 1px 2px rgba(0, 0, 0, 0.5);
  border-radius: 5px;
}
.editable-field-value {
  .field-editor {
    top: calc(100% + 2px);
    position: absolute;
    z-index: 1;
  }
}
.editable-fields {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 2px;
}
</style>

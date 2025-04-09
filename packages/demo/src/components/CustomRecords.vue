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
            <of-field :record="testRecord" name="one"></of-field>
          </div>
          <div class="row form-row">
            <of-field
              label="Select input (label from props)"
              :record="testRecord"
              name="one"
            ></of-field>
          </div>
          <div class="row form-row">
            <of-field :record="testRecord" name="two"></of-field>
          </div>
          <div class="row form-row">
            <of-field :record="testRecord" name="three"></of-field>
          </div>
          <div class="row form-row">
            <of-field name="four" :record="testRecord"></of-field>
          </div>
          <div class="row form-row">
            <of-button
              @click="testRecord.reset()"
              :disabled="testRecord.locked"
            >
              Reset
            </of-button>
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
import { looseEqual } from '@vue/shared'
import {
  FieldRecordState,
  FormRecord,
  Lock,
  LockOptions,
  RecordMetadata
} from 'oceanfront'
import {
  computed,
  defineComponent,
  markRaw,
  reactive,
  ref,
  Ref,
  toRaw,
  watchEffect
} from 'vue'

class CustomRecord<T extends object = Record<string, any>>
  implements FormRecord
{
  _initial: Ref<Readonly<T>>
  _rules: Ref<((value: T) => boolean)[]>
  _state: Ref<FieldRecordState>
  _value: T
  _metadata: RecordMetadata
  _mode: 'edit' | 'readonly' | 'view' = 'edit'

  public get metadata(): RecordMetadata {
    return this._metadata
  }

  constructor(initial: T, meta: RecordMetadata) {
    const init = toRaw(initial || {}) as T
    this._initial = ref(Object.assign({}, init)) as Ref<T>
    this._rules = ref([])
    this._state = ref({ locked: false })
    this._value = reactive(init) as T
    this._metadata = reactive(meta)
    watchEffect(this._checkUpdated.bind(this))
  }

  _checkUpdated() {
    const init = this._initial.value
    const vals = this._value
    let invalid = false
    this._state.value.updated = !looseEqual(init, vals)
    for (const rule of this._rules.value) {
      if (!rule(vals)) {
        invalid = true
      }
    }
    for (const k in this.metadata.required) {
      if (!vals[k as keyof T]) {
        invalid = true
      }
    }
    this._state.value.invalid = invalid
    // FIXME set messages
  }

  get initialValue(): Readonly<T> | null {
    return this._initial.value
  }

  get invalid(): boolean {
    return this._state.value.invalid || false
  }

  lock(_options?: LockOptions): Lock | null {
    if (this.locked) {
      return null
    }
    this._state.value.locked = true
    return {
      release: () => {
        this._state.value.locked = false
      }
    }
  }

  get locked(): boolean {
    return this._state.value.locked || false
  }

  set locked(flag: boolean) {
    this._state.value.locked = flag
  }

  get pending(): boolean {
    return this._state.value.pending || false
  }

  reset() {
    this.value = this._initial.value
  }

  get updated(): boolean {
    return this._state.value.updated || false
  }

  get value(): T {
    return this._value
  }

  set value(val: T) {
    for (const k in this._value) {
      if (!val || !(k in val)) delete this._value[k]
    }
    Object.assign(this._value, val)
  }

  get mode() {
    return this._mode
  }

  set mode(m: 'edit' | 'readonly' | 'view') {
    this._mode = m
  }
}

const createContext = <T extends object = Record<string, any>>(
  initial: T,
  meta: RecordMetadata
) => {
  return markRaw(new CustomRecord<T>(initial, meta))
}

const data = {
  one: 'optionA',
  two: '2015-05-11',
  three: 'Text',
  four_hours: 1,
  four_minutes: 15
}

const meta = reactive({
  one: {
    type: 'select',
    label: 'Select input (label from metadata)',
    items: [
      { value: 'optionA', text: 'A' },
      { value: 'optionB', text: 'B' }
    ]
  },
  two: {
    type: 'date',
    label: 'Date'
  },
  three: {
    type: 'text',
    label: 'Text'
  },
  four: {
    type: 'minutes',
    label: 'Minutes'
  }
})

const testRecord = createContext(data, meta)

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
      textValue
    }
  }
})
</script>

<style scoped>
.content {
  margin-top: 1.5rem;

  > div {
    min-width: 20em;
  }
}
.record-info {
  padding-left: 1em;
}
</style>

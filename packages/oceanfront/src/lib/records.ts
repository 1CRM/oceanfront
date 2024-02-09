import { Ref, reactive, ref, markRaw, watchEffect } from 'vue'
import { ConfigManager, Config } from './config'
import { ItemList } from './items_list'
import { deepEqual, deepToRaw, readonlyUnref } from './util'

export interface FieldRecordState {
  pending?: boolean
  invalid?: boolean
  locked?: boolean
  updated?: boolean
}

export interface FieldMetadata {
  required?: string | undefined
  label?: string | undefined
  type?: string | undefined
  readonly?: boolean | undefined
  items?: string | any[] | ItemList
  [key: string]: any
}

export type RecordMetadata = {
  fields?: FieldMetadata
  [k: string]: any
}

export interface FormRecord {
  initialValue: Record<string, any> | null
  invalid?: boolean
  lock(options?: LockOptions): Lock | null
  locked?: boolean
  pending?: boolean
  reset(): void
  reinit(): void
  updated?: boolean
  value: Record<string, any>
  metadata: Record<string, FieldMetadata>
  mode?: 'edit' | 'readonly' | 'view'
}

export interface LockOptions {
  reason?: string
}

export interface Lock {
  release(): void
}

class BasicRecord<T extends object = Record<string, any>>
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

  constructor(initial?: T) {
    const init = deepToRaw(initial || {}) as T
    this._initial = ref(structuredClone(init)) as Ref<T>
    this._rules = ref([])
    this._state = ref({ locked: false })
    this._value = reactive(init) as T
    this._metadata = {}
    watchEffect(this._checkUpdated.bind(this))
  }

  _checkUpdated() {
    const init = this._initial.value
    const vals = this._value
    let invalid = false
    this._state.value.updated = !deepEqual(init, vals)
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
      },
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
    this.value = structuredClone(deepToRaw(this._initial.value))
  }

  reinit() {
    this._initial.value = structuredClone(deepToRaw(this.value))
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

export const makeRecord = (initial?: Record<string, any>): BasicRecord => {
  return markRaw(new BasicRecord(initial))
}

export interface RecordManagerState {
  getCurrentRecord(): FormRecord | null
}

class RecordManager implements RecordManagerState {
  currentRecord: FormRecord | null = null

  getCurrentRecord(): FormRecord | null {
    return this.currentRecord
  }
}

const configManager = new ConfigManager('ofrec', RecordManager)

export function setCurrentRecord(record?: FormRecord | null): void {
  configManager.extendingManager.currentRecord = record || null
}

export function useRecords(config?: Config): RecordManagerState {
  const mgr = configManager.inject(config)
  return readonlyUnref(mgr)
}

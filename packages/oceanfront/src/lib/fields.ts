import {
  Component,
  computed,
  inject,
  PropType,
  provide,
  proxyRefs,
  readonly,
  SetupContext,
  VNode,
} from 'vue'
import { ItemList } from './items'
import { FormRecord, useRecords } from './records'
import { useThemeOptions } from './theme'
import { extendReactive, extractRefs } from './util'

export type Renderable = VNode | VNode[] | string

let _fieldIndex = 0

export const newFieldId = (): string => {
  return 'of-field-' + _fieldIndex++
}

export interface FieldRender {
  active?: boolean
  append?: () => Renderable | undefined
  // afterContent? (below)
  blank?: boolean
  class?: string | string[] | Record<string, boolean>
  click?: (evt?: MouseEvent) => boolean | void
  content?: () => Renderable | undefined
  cursor?: string
  dragIn?: FieldDragIn
  focus?: () => void
  // footer?: () => Renderable | undefined
  focused?: boolean
  hovered?: boolean
  inputId?: string
  inputValue?: any
  invalid?: boolean
  label?: string
  loading?: boolean
  // messages
  pendingValue?: any
  popup?: FieldPopup
  prepend?: () => Renderable | undefined
  size?: number | string
  updated?: boolean
  value?: any
  undecorated?: boolean
}

export type FieldMode =
  | 'editable'
  | 'disabled'
  | 'readonly'
  | 'locked'
  | 'static'
  | 'fixed'

export type FieldFormatProp = string | Record<string, any>

export type FieldLabelPositionProp =
  | 'default'
  | 'none'
  | 'frame'
  | 'input'
  | 'top'
  | 'left'
  | 'right'

export interface FieldContext {
  container?: string
  density?: number
  editable?: boolean
  fieldType?: string // the resolved field type name
  id?: string
  initialValue?: any // normally loaded from record
  inputLabel?: string
  inline?: boolean
  interactive?: boolean
  items?: string | any[] | ItemList
  label?: string
  ariaLabel?: string
  labelPosition?: string
  mode?: FieldMode
  muted?: boolean // if editable, reduce indicators
  name?: string
  record?: FormRecord
  rounded?: boolean
  // onFocus, onBlur
  onInput?: (input: any, value: any) => void
  onUpdate?: (value: any) => void
  onKeyup?: (value: any) => void
  onKeydown?: (value: any) => void
  required?: boolean
  value?: any
  size?: string
}

export interface FieldProps {
  align?: string // defaultAlign?
  defaultValue?: any
  items?: string | any[] | ItemList
  // label?: string  / defaultLabel?
  maxlength?: number | string // defaultMaxlength?
  // name?: string
  placeholder?: string
  size?: number | string //  defaultSize?
  type?: string
  record?: FormRecord
  [key: string]: any
}

// container props:
// format (= field props), name/id/type (override format), label, value, form, messages, loading, variant
// list view: header block = field props, value obtained from row, row = record

// do not switch fields immediately to 'view' mode when saving form
// set 'locked' property of context, which should close any popups, abort/commit pending changes
// after timeout, change mode to readonly

export interface FieldDragIn {
  dropEffect?: 'none' | 'copy' | 'link' | 'move'
  onDrop: (evt: DragEvent) => void
  onEnter?: (evt: DragEvent) => void
  onLeave?: (evt: DragEvent) => void
}

export interface FieldPopup {
  content?: () => Renderable | undefined
  visible?: boolean
  onBlur?: () => void
  // position?
}

// helper to infer type
export function defineFieldType<T extends Component>(f: T): T {
  return f
}

export const BaseFieldProps = {
  align: String,
  density: { type: [String, Number], default: undefined },
  relativeDensity: { type: [String, Number], default: undefined },
  disabled: Boolean,
  fixed: Boolean,
  format: [String, Object] as PropType<FieldFormatProp>,
  id: String,
  initialValue: {
    type: [String, Boolean, Number, Array, Object],
    default: undefined,
  },
  inDataTable: {
    type: Boolean,
    default: false,
  },
  inline: Boolean,
  inputLabel: String,
  invalid: Boolean,
  items: [String, Array, Object] as PropType<string | any[] | ItemList>,
  label: String,
  ariaLabel: String,
  labelPosition: String as PropType<FieldLabelPositionProp>,
  loading: Boolean,
  locked: Boolean,
  // messages
  maxlength: [Number, String],
  mode: String as PropType<FieldMode>,
  modelValue: {
    type: [String, Boolean, Number, Array, Object],
    default: undefined,
  },
  muted: Boolean,
  name: String,
  placeholder: String,
  readonly: Boolean,
  record: {
    type: Object as PropType<FormRecord>,
    required: false,
  },
  required: Boolean,
  rounded: Boolean,
  size: { type: [Number, String], default: undefined },
  block: Boolean,
  width: { type: [Number, String], default: undefined },
  // style
  type: String,
  variant: String,
  tint: String,
  context: String,
  //typeConstructor: Object as PropType<FieldTypeConstructor>,
  active: Boolean,
  blank: Boolean,
  class: [String, Array, Object],
  cursor: String,
  dragIn: Object as PropType<FieldDragIn>,
  focused: Boolean,
  hovered: Boolean,
  inputId: String,
  inputValue: null,
  pendingValue: null,
  popup: Object as PropType<FieldPopup>,
  updated: Boolean,
  value: null,
  formatOptions: null,
  defaultValue: null,
}

export function extendFieldFormat(
  format: FieldFormatProp | undefined,
  props: Record<string, any>
): Record<string, any> {
  if (typeof format === 'string' || typeof format === 'function') {
    // text format name or constructor
    format = { type: format }
  }
  format = typeof format === 'object' ? format : {}
  return extendReactive(format, props)
}

export function makeFieldContext<C>(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  props: any,
  ctx: SetupContext<C>
): FieldContext {
  const themeOptions = useThemeOptions()
  const parseDensity = (density: string) => {
    const d = parseInt(density, 10)
    if (isNaN(d)) return undefined
    return d
  }
  const density = computed(() => {
    let d = props.density
    let rd = props.relativeDensity
    if (d === 'default') {
      d = undefined
    } else if (typeof d === 'string') {
      d = parseDensity(d)
    }
    if (typeof d !== 'number') {
      d = themeOptions.defaultDensity
    }
    if (typeof d !== 'number') {
      d = 2
    }
    if (typeof rd === 'string') {
      rd = parseDensity(rd)
    }
    if (typeof rd !== 'number') {
      rd = 0
    }
    d += rd
    return Math.max(0, Math.min(3, d || 0))
  })
  const recordMgr = useRecords()
  const record = computed(() => {
    return props.record || recordMgr.getCurrentRecord() || undefined
  })
  const size = computed(() => {
    return props.size || undefined
  })
  const metadata = computed(() =>
    props.name ? record.value?.metadata?.[props.name] : null
  )
  const mode = computed(
    () =>
      props.mode ||
      metadata.value?.mode ||
      (props.fixed || metadata.value?.fixed
        ? 'fixed'
        : props.disabled || metadata.value?.disabled
        ? 'disabled'
        : props.readonly || metadata.value?.readonly
        ? 'readonly'
        : props.locked || record.value?.locked
        ? 'locked'
        : 'editable')
  )
  const editable = computed(() => mode.value === 'editable')
  const interactive = computed(() => mode.value !== 'fixed')
  const fieldType = computed(() => {
    const fmt = props.format
    return (
      props.type ||
      metadata.value?.type ||
      (fmt && typeof fmt === 'string'
        ? fmt
        : typeof fmt === 'object'
        ? (fmt as any).fieldType || (fmt as any).type
        : undefined)
    )
  })
  const initialValue = computed(() =>
    props.name && record.value
      ? (record.value.initialValue || {})[props.name]
      : props.initialValue
  )
  const labelPosition = computed(() => {
    let p = props.labelPosition
    if (!p || p === 'default') {
      p = themeOptions.defaultLabelPosition as
        | FieldLabelPositionProp
        | undefined
    }
    if (!p || p === 'default') {
      p = props.variant === 'filled' ? 'frame' : 'top'
    }
    return p
  })
  const inputLabel = computed(
    () =>
      props.inputLabel ??
      (labelPosition.value === 'input' ? props.label : undefined)
  )
  // may inherit default value from context in future
  const value = computed(() =>
    props.name && record.value
      ? record.value.value[props.name]
      : props.modelValue
  )

  const fctx: FieldContext = proxyRefs({
    container: 'of-field',
    density,
    editable,
    fieldType,
    initialValue,
    size,
    inputLabel,
    interactive,
    labelPosition,
    mode,
    record,
    value,
    onInput: (input: any, value: any) => {
      ;(ctx.emit as any)('input', input, value)
    },
    onKeydown: (value: any) => {
      ;(ctx.emit as any)('keydown:enter', value)
    },
    onKeyup: (value: any) => {
      ;(ctx.emit as any)('keyup:enter', value)
    },
    onUpdate: (value: any) => {
      if (props.name && record.value) record.value.value[props.name] = value
      else (ctx.emit as any)('update:modelValue', value)
    },
    ...extractRefs(props, [
      'id',
      'inline',
      'items',
      'label',
      'ariaLabel',
      'loading',
      'muted',
      'name',
      'required',
      'rounded',
    ]),
  })
  return fctx
}

export function fieldRender<T extends object>(props: T): FieldRender {
  // FIXME lies
  return readonly(props) as any as FieldRender
}

const fieldContextKey = Symbol('[oceanfront-field-context')
const fieldRenderKey = Symbol('[oceanfront-field-render')

export function provideFieldContext<C>(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  props: any,
  ctx: SetupContext<C>
): FieldContext {
  const fCtx = makeFieldContext(props, ctx)
  provide(fieldContextKey, fCtx)
  return fCtx
}

export const useFieldContext = (): FieldContext => {
  return inject(fieldContextKey) as FieldContext
}

export const provideFieldRender = (r: FieldRender): void => {
  provide(fieldRenderKey, r)
}

export const useFieldRender = (): FieldRender => {
  return inject(fieldRenderKey) as FieldRender
}

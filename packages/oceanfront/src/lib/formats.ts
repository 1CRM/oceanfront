import { Component } from 'vue'
import { Config, ConfigManager } from './config'
import { FormRecord } from './records'
import { readonlyUnref } from './util'
import { Renderable } from './fields'

export interface TextFormatResult {
  blank?: boolean
  error?: string
  textValue?: string
  textClass?: string
  value?: any
  [_: string]: any
}

export interface TextInputResult extends TextFormatResult {
  selStart?: number
  selEnd?: number
  updated: boolean
}

export interface TextFormatter {
  align?: 'start' | 'center' | 'end'
  format(modelValue: any): TextFormatResult
  formatFixed?(modelValue: any, context?: string): Renderable | undefined
  unformat(input: string): any
  handleInput?: (evt: InputEvent) => TextInputResult
  handleKeyDown?: (evt: KeyboardEvent) => void
  handleFocus?: (evt: FocusEvent) => void
  handleBlur?: (evt: FocusEvent) => TextInputResult
  // get attachments (ie. currency symbol, date icon, unit)
  inputClass?: string | string[]
  inputMode?: string
  inputType?: string
  multiline?: boolean
}

export type TextFormatterConstructor = {
  new (
    config?: Config,
    options?: any,
    fieldName?: string,
    record?: FormRecord
  ): TextFormatter
}
type TextFormatterFn = {
  (
    config?: Config,
    options?: any,
    fieldName?: string,
    record?: FormRecord
  ): TextFormatter
}

type TextFormatterDef =
  | TextFormatter
  | TextFormatterConstructor
  | TextFormatterFn
export type TextFormatterProp = TextFormatterDef | string

export interface FormatState {
  getFieldType(
    type?: string,
    defaultType?: boolean | string
  ): Component | undefined

  getTextFormatter(
    type?: string | TextFormatterDef,
    options?: any,
    fieldName?: string,
    record?: FormRecord
  ): TextFormatter | undefined
}

class FormatManager implements FormatState {
  defaultFieldType = 'text'
  readonly fieldTypes: Record<string, Component> = {}
  readonly textFormats: Record<string, TextFormatterDef> = {}
  readonly config: Config

  constructor(config: Config) {
    this.config = config
  }

  getFieldType(
    type: string,
    defaultType?: boolean | string
  ): Component | undefined {
    let ctor = this.fieldTypes[type]
    if (!ctor && defaultType) {
      if (typeof defaultType === 'string') ctor = this.fieldTypes[defaultType]
      if (!ctor) ctor = this.fieldTypes[this.defaultFieldType]
    }
    if (ctor && typeof ctor === 'function') {
      ctor = { init: ctor }
    }
    return ctor
  }

  getTextFormatter(
    type?: TextFormatterProp,
    options?: any,
    fieldName?: string,
    record?: FormRecord
  ): TextFormatter | undefined {
    let def: TextFormatterDef | undefined
    if (typeof type === 'string') def = this.textFormats[type]
    else def = type
    if (def) {
      if (typeof def === 'function') {
        if ('format' in def.prototype) {
          return new (def as TextFormatterConstructor)(
            this.config,
            options,
            fieldName,
            record
          )
        }
        return (def as TextFormatterFn)(this.config, options, fieldName, record)
      }
    }
    return def
  }
}

const configManager = new ConfigManager('offmt', FormatManager)

export function registerFieldType(name: string, fmt: Component): void {
  configManager.extendingManager.fieldTypes[name] = fmt
}

export function registerTextFormatter(
  name: string,
  fmt: TextFormatterDef
): void {
  configManager.extendingManager.textFormats[name] = fmt
}

export function setDefaultFieldType(name: string): void {
  configManager.extendingManager.defaultFieldType = name
}

export function useFormats(config?: Config): FormatState {
  const mgr = configManager.inject(config)
  return readonlyUnref(mgr)
}

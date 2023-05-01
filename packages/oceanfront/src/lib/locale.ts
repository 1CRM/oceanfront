import { Config, ConfigManager } from './config'
import { readonlyUnref } from './util'

export interface LocaleNumberFormat {
  readonly groupSeparator: string
  readonly decimalSeparator: string
  readonly auto: boolean
}

export type LocaleDateTimeFormat = {
  dateFormat?: string
  timeFormat?: string
  timeZone?: string
}

export type LocaleParams = {
  numberFormat?: LocaleNumberFormat
  dateTimeFormat?: LocaleDateTimeFormat
  weekStart?: number
  [key: string]: any
}

export interface LocaleState {
  readonly locale: string
  readonly localeParams?: LocaleParams
}

class LocaleManager implements LocaleState {
  locale: string
  localeParams?: LocaleParams

  constructor() {
    this.locale = navigator.language
  }
}

const configManager = new ConfigManager('ofloc', LocaleManager)

export function setLocale(loc: string): void {
  configManager.extendingManager.locale = loc
}

export function setLocaleParams(params: LocaleParams): void {
  configManager.extendingManager.localeParams = params
}

export function useLocale(config?: Config): LocaleState {
  const mgr = configManager.inject(config)
  return readonlyUnref(mgr)
}

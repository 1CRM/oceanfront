import { Ref, computed } from 'vue'
import { Config } from '../lib/config'
import { TextFormatter, TextFormatResult } from '../lib/formats'
import { LocaleState, useLocale } from '../lib/locale'

export interface DateTimeFormatterOptions {
  locale?: string
  dateFormat?: string
  timeFormat?: string
  timeZone?: string
  nativeOptions?: Intl.DateTimeFormatOptions
}

export const expand = (value: string | number, digits: number): string => {
  let result = '' + value
  while (result.length < digits) {
    result = '0' + result
  }
  return result
}

abstract class DateTimeFormatterBase implements TextFormatter {
  private _locale: LocaleState
  private _options: Ref<DateTimeFormatterOptions>

  constructor(config?: Config, options?: DateTimeFormatterOptions) {
    const allowedDateFormats = [
      'Y-m-d',
      'm-d-Y',
      'd-m-Y',
      'Y/m/d',
      'm/d/Y',
      'd/m/Y',
      'Y.m.d',
      'd.m.Y',
      'm.d.Y',
    ]
    const allowedTimeFormats = [
      'H:i',
      'h:ia',
      'h:i a',
      'h:iA',
      'h:i A',
      'H.i',
      'h.ia',
      'h.i a',
      'h.iA',
      'h.i A',
    ]
    this._locale = useLocale(config)
    this._options = computed(() => {
      const opts: DateTimeFormatterOptions = {}
      opts.locale = this._locale.locale
      Object.assign(opts, this._locale.localeParams?.dateTimeFormat)
      if (options) {
        Object.assign(opts, options)
      }
      if (
        opts.dateFormat === undefined ||
        !allowedDateFormats.includes(opts.dateFormat)
      )
        opts.dateFormat = ''
      if (
        opts.timeFormat === undefined ||
        !allowedTimeFormats.includes(opts.timeFormat)
      )
        opts.timeFormat = ''

      return opts
    })
  }

  get options(): DateTimeFormatterOptions {
    return this._options.value
  }

  get inputClass(): string {
    return 'of--text-datetime'
  }

  getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value

  formatterOptions(_editing?: boolean): Intl.DateTimeFormatOptions {
    return { timeZone: this.options.timeZone }
  }

  unformat(_input: string): Date | null {
    throw new TypeError('Unsupported value')
  }

  format(modelValue?: string | Date | number | null): TextFormatResult {
    let error
    let textValue = ''
    let value = modelValue
    let parts
    let localeValue
    let tzOffset
    let tzName
    try {
      value = this.loadValue(value)
      if (value !== null) {
        const fmt = Intl.DateTimeFormat(
          this.options.locale,
          this.formatterOptions()
        )
        textValue = this.formatLocale(fmt, value)

        const partsFmt = Intl.DateTimeFormat('en-US', {
          timeZone: this.options.timeZone,
          day: '2-digit',
          hour: 'numeric',
          minute: 'numeric',
          month: '2-digit',
          year: 'numeric',
          hourCycle: 'h23',
        })
        parts = partsFmt.formatToParts(value)

        const dateStr =
          this.getPart(parts, 'year') +
          '-' +
          this.getPart(parts, 'month') +
          '-' +
          this.getPart(parts, 'day') +
          'T' +
          this.getPart(parts, 'hour') +
          ':' +
          this.getPart(parts, 'minute') +
          ':00.000Z'

        const localeDate = new Date(dateStr)
        if (!isNaN(localeDate.getTime())) {
          const valueDate = new Date(value.getTime())
          valueDate.setSeconds(0)
          valueDate.setMilliseconds(0)
          tzOffset = (localeDate.getTime() - valueDate.getTime()) / 1000
          tzName = this.options.timeZone
          localeValue = localeDate
        }
      }
    } catch (e: any) {
      error = e.toString()
    }
    return {
      textValue,
      error,
      value,
      localeValue,
      tzOffset,
      tzName,
      textClass: this.inputClass,
      parts,
    }
  }

  formatLocaleTime(parts: Intl.DateTimeFormatPart[]): string {
    const timeFormat = this.options.timeFormat as string
    const h = this.getPart(parts, 'hour') ?? ''
    const i = this.getPart(parts, 'minute') ?? ''
    const a = this.getPart(parts, 'dayPeriod') ?? ''
    return timeFormat
      .replace('H', h)
      .replace('h', h)
      .replace('i', i)
      .replace('a', a.toLowerCase())
      .replace('A', a.toUpperCase())
  }

  formatLocaleDate(parts: Intl.DateTimeFormatPart[]): string {
    const dateFormat = this.options.dateFormat as string
    const D = this.getPart(parts, 'day') ?? ''
    const M = this.getPart(parts, 'month') ?? ''
    const Y = this.getPart(parts, 'year') ?? ''
    return dateFormat?.replace('Y', Y).replace('m', M).replace('d', D)
  }

  abstract formatLocale(fmt: Intl.DateTimeFormat, value: Date): string
  abstract formatPortable(date: Date): string
  abstract loadValue(
    modelValue?: string | Date | number | null,
    dateOnly?: boolean
  ): Date | null
}

export class DateTimeFormatter extends DateTimeFormatterBase {
  formatterOptions(_editing?: boolean): Intl.DateTimeFormatOptions {
    if (this.options.nativeOptions !== undefined) {
      this.options.dateFormat = ''
      this.options.timeFormat = ''
      return this.options.nativeOptions
    }
    const options = super.formatterOptions(_editing)
    options.day = '2-digit'
    options.month = '2-digit'
    options.year = 'numeric'
    options.hour = 'numeric'
    options.minute = 'numeric'
    return options
  }

  formatPortable(date: Date): string {
    const Y = date.getUTCFullYear()
    const M = date.getUTCMonth() + 1
    const D = date.getUTCDate()
    const h = date.getUTCHours()
    const m = date.getUTCMinutes()
    const s = date.getUTCSeconds()
    return (
      expand(Y, 4) +
      '-' +
      expand(M, 2) +
      '-' +
      expand(D, 2) +
      ' ' +
      expand(h, 2) +
      ':' +
      expand(m, 2) +
      ':' +
      expand(s, 2)
    )
  }

  formatLocale(fmt: Intl.DateTimeFormat, value: Date): string {
    const timeFormat = this.options.timeFormat as string
    const dateFormat = this.options.dateFormat as string

    if (timeFormat == '' && dateFormat == '') {
      return fmt.format(value)
    } else {
      const options = super.formatterOptions()
      const tFmt = Intl.DateTimeFormat(
        this.options.locale,
        TimeFormatter.adjustOptions(options, timeFormat)
      )
      const dFmt = Intl.DateTimeFormat(
        this.options.locale,
        DateFormatter.adjustOptions(options, false)
      )
      return (
        (dateFormat === ''
          ? dFmt.format(value)
          : this.formatLocaleDate(dFmt.formatToParts(value))) +
        ', ' +
        (timeFormat === ''
          ? tFmt.format(value)
          : this.formatLocaleTime(tFmt.formatToParts(value)))
      )
    }
  }

  formatFixed(modelValue: string): string {
    return this.format(modelValue).textValue ?? modelValue
  }

  loadValue(modelValue?: string | Date | number | null): Date | null {
    let value
    if (typeof modelValue === 'string') {
      modelValue = modelValue.trim()
    }
    if (modelValue === null || modelValue == undefined) {
      value = null
    } else if (modelValue instanceof Date) {
      value = modelValue
    } else if (typeof modelValue === 'string') {
      // we expect "YYYY-MM-DD hh:mm:ss", always GMT
      const re = /^(\d\d\d\d)-(\d\d)-(\d\d)\s+(\d\d):(\d\d)(:\d\d)?$/
      const matches = re.exec(modelValue)
      if (!matches) {
        value = new Date()
      } else {
        const dateStr =
          matches.slice(1, 4).join('-') +
          'T' +
          matches.slice(4, 6).join(':') +
          ':00Z'
        value = new Date(dateStr)
      }
    } else if (typeof modelValue === 'number') {
      value = new Date(modelValue)
    } else {
      throw new TypeError('Unsupported value')
    }
    return value
  }
}

export class DateFormatter extends DateTimeFormatterBase {
  static adjustOptions(
    options: Intl.DateTimeFormatOptions,
    ignoreTimezone = true
  ): Intl.DateTimeFormatOptions {
    return {
      ...options,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: ignoreTimezone ? undefined : options.timeZone,
    }
  }

  formatPortable(date: Date): string {
    const Y = expand(date.getUTCFullYear(), 4)
    const M = expand(date.getUTCMonth() + 1, 2)
    const D = expand(date.getUTCDate(), 2)
    return Y + '-' + M + '-' + D
  }

  formatLocale(fmt: Intl.DateTimeFormat, value: Date): string {
    const dateFormat = this.options.dateFormat as string
    return dateFormat === ''
      ? fmt.format(value)
      : this.formatLocaleDate(fmt.formatToParts(value))
  }

  formatFixed(modelValue: string): string {
    return this.format(modelValue).textValue ?? modelValue
  }

  formatterOptions(_editing?: boolean): Intl.DateTimeFormatOptions {
    if (this.options.nativeOptions !== undefined) {
      this.options.dateFormat = ''
      return this.options.nativeOptions
    }
    const options = super.formatterOptions(_editing)
    return DateFormatter.adjustOptions(options)
  }

  loadValue(modelValue?: string | Date | number | null): Date | null {
    let value
    if (typeof modelValue === 'string') {
      modelValue = modelValue.trim()
    }
    if (modelValue === null || modelValue == undefined) {
      value = null
    } else if (modelValue instanceof Date) {
      value = modelValue
    } else if (typeof modelValue === 'string') {
      // we expect "YYYY-MM-DD hh:mm:ss", always GMT
      const re = /^(\d\d\d\d)-(\d\d)-(\d\d)$/
      const matches = re.exec(modelValue)
      if (!matches) {
        value = new Date()
      } else {
        const dateStr = matches.slice(1, 4).join('-') + 'T00:00:00'
        value = new Date(dateStr)
      }
    } else if (typeof modelValue === 'number') {
      value = new Date(modelValue)
    } else {
      throw new TypeError('Unsupported value')
    }
    return value
  }
}

export class TimeFormatter extends DateTimeFormatterBase {
  static adjustOptions(
    options: Intl.DateTimeFormatOptions,
    timeFormat: string
  ): Intl.DateTimeFormatOptions {
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
    }

    if (timeFormat !== '') {
      const h12 = timeFormat.search(/[aA]/) !== -1
      timeOptions.hour = h12 ? 'numeric' : '2-digit'
      timeOptions.minute = h12 ? 'numeric' : '2-digit'
      timeOptions.hourCycle = h12 ? 'h12' : 'h23'
    }

    return {
      ...options,
      ...timeOptions,
    }
  }

  formatPortable(date: Date): string {
    const h = date.getUTCHours()
    const m = date.getUTCMinutes()
    const s = date.getUTCSeconds()
    return expand(h, 2) + ':' + expand(m, 2) + ':' + expand(s, 2)
  }

  formatLocale(fmt: Intl.DateTimeFormat, value: Date): string {
    const timeFormat = this.options.timeFormat as string
    return timeFormat === ''
      ? fmt.format(value)
      : this.formatLocaleTime(fmt.formatToParts(value))
  }

  formatFixed(modelValue: string): string {
    return this.format(modelValue).textValue ?? modelValue
  }

  formatterOptions(_editing?: boolean): Intl.DateTimeFormatOptions {
    if (this.options.nativeOptions !== undefined) {
      this.options.timeFormat = ''
      return this.options.nativeOptions
    }
    const timeFormat = this.options.timeFormat as string
    const options = super.formatterOptions(_editing)
    return TimeFormatter.adjustOptions(options, timeFormat)
  }

  loadValue(modelValue?: string | Date | number | null): Date | null {
    let value
    if (typeof modelValue === 'string') {
      modelValue = modelValue.trim()
    }
    if (modelValue === null || modelValue == undefined) {
      value = null
    } else if (modelValue instanceof Date) {
      value = modelValue
    } else if (typeof modelValue === 'string') {
      // we expect "YYYY-MM-DD hh:mm:ss", always GMT
      const re = /^(\d\d):(\d\d)(:\d\d)?$/
      const matches = re.exec(modelValue)
      if (!matches) {
        value = new Date()
      } else {
        const dateStr = '1970-01-01T' + matches.slice(1, 3).join(':') + ':00Z'
        value = new Date(dateStr)
      }
    } else if (typeof modelValue === 'number') {
      value = new Date(modelValue)
    } else {
      throw new TypeError('Unsupported value')
    }
    return value
  }
}

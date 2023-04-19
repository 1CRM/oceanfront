import { DeepReadonly, readonly, reactive } from 'vue'

export interface ThemeOptions {
  defaultDensity?: number
  defaultInputVariant?: string
  defaultButtonVariant?: string
  defaultLabelPosition?: string
  defaultRoundedButton?: boolean
}

const options: ThemeOptions = reactive({})
const roOptions = readonly(options)

export function setThemeOptions(opts: ThemeOptions): void {
  if (opts.defaultDensity !== undefined) {
    options.defaultDensity = opts.defaultDensity
  }
  if (opts.defaultInputVariant !== undefined) {
    options.defaultInputVariant = opts.defaultInputVariant
  }
  if (opts.defaultButtonVariant !== undefined) {
    options.defaultButtonVariant = opts.defaultButtonVariant
  }
  if (opts.defaultLabelPosition !== undefined) {
    options.defaultLabelPosition = opts.defaultLabelPosition
  }
  if (opts.defaultRoundedButton !== undefined) {
    options.defaultRoundedButton = opts.defaultRoundedButton
  }
}

export function useThemeOptions(): DeepReadonly<ThemeOptions> {
  return roOptions
}

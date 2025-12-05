import { rgbToHex, loadColor } from '../lib/color'
import { TextFormatter, TextFormatResult } from '../lib/formats'

export class ColorFormatter implements TextFormatter {
  format(modelValue: any): TextFormatResult {
    let value = modelValue
    let textValue = ''
    let error
    try {
      value = loadColor(value)
      textValue = value ? rgbToHex(value) : ''
    } catch (e: any) {
      error = e.toString()
      console.error(error)
    }
    return {
      error,
      value,
      textValue
    }
  }

  unformat(input: string): string | null {
    const val = loadColor(input)
    return val ? rgbToHex(val) : null
  }
}

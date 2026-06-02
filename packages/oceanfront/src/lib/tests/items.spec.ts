import { describe, expect, it } from 'vitest'
import { resolveItemLabel } from '../items'

describe('resolveItemLabel', () => {
  it('uses text when set', () => {
    expect(resolveItemLabel({ text: 'B', value: 'optionB' })).toBe('B')
  })

  it('falls back to value when text is empty', () => {
    expect(resolveItemLabel({ text: '', value: 'optionA' })).toBe('optionA')
  })

  it('prefers selectedText over text and value', () => {
    expect(
      resolveItemLabel({
        selectedText: 'Short',
        text: 'Long',
        value: 'key'
      })
    ).toBe('Short')
  })

  it('falls back from empty selectedText to text then value', () => {
    expect(
      resolveItemLabel({ selectedText: '', text: '', value: 'optionA' })
    ).toBe('optionA')
  })
})

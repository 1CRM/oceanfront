import { describe, it, expect } from 'vitest'
import {
  readRecordTrimmed,
  entityAccessibilityLabel,
  entityRecordPrimaryTextOptional
} from '../workflow-record-a11y'

describe('workflow-record-a11y', () => {
  it('readRecordTrimmed returns trimmed strings', () => {
    expect(readRecordTrimmed({ k: '  x  ' }, 'k')).toBe('x')
    expect(readRecordTrimmed({ k: '' }, 'k')).toBe('')
    expect(readRecordTrimmed({}, 'k')).toBe('')
  })

  it('entityAccessibilityLabel joins title and description then falls back to id', () => {
    const v = { 'n-title': 'A', 'n-description': 'B' }
    expect(entityAccessibilityLabel(v, 'n')).toBe('A B')
    expect(entityAccessibilityLabel({ 'n-title': 'A' }, 'n')).toBe('A')
    expect(entityAccessibilityLabel({}, 'n')).toBe('n')
  })

  it('entityRecordPrimaryTextOptional returns undefined when empty', () => {
    expect(entityRecordPrimaryTextOptional({}, 'n')).toBeUndefined()
    expect(entityRecordPrimaryTextOptional({ 'n-title': 'T' }, 'n')).toBe('T')
  })
})

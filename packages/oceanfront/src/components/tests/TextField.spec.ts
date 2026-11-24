import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { OfIcon } from '../Icon'
import { OfTooltip } from '../Tooltip'
import { OfOverlay } from '../Overlay'
import { OfTextField } from '../../fields/Text'

const mountTextField = (props: Record<string, unknown> = {}) =>
  mount(OfTextField, {
    attachTo: document.body,
    props: { label: 'Name', modelValue: '', mode: 'editable', ...props },
    global: { components: { OfIcon, OfTooltip, OfOverlay } }
  })

/** Plain formatter factory (no handleInput); each call returns a new instance. */
const plainFormat = function (_cfg: unknown, _opts?: unknown) {
  return {
    format: (v: any) => ({ value: v, textValue: v ?? '' }),
    unformat: (t: string) => t
  }
} as any

/** Masked formatter factory (with handleInput); each call returns a new instance. */
const maskedFormat = function (_cfg: unknown, _opts?: unknown) {
  return {
    format: (v: any) => ({ value: v, textValue: v ?? '' }),
    unformat: (t: string) => t,
    handleInput: (evt: InputEvent) => {
      const text = (evt.target as HTMLInputElement).value
      return { updated: true, textValue: text, value: text }
    }
  }
} as any

/** Formatter factory whose text depends on options, so a re-resolve is observable. */
const suffixFormat = function (_cfg: unknown, opts?: { s?: string }) {
  return {
    format: (v: any) => ({ value: v, textValue: (v ?? '') + (opts?.s ?? '') }),
    unformat: (t: string) => (opts?.s ? t.replace(opts.s, '') : t)
  }
} as any

/** Masked formatter whose handleInput reports no change. */
const noopMaskedFormat = function (_cfg: unknown, _opts?: unknown) {
  return {
    format: (v: any) => ({ value: v, textValue: v ?? '' }),
    unformat: (t: string) => t,
    handleInput: () => ({ updated: false })
  }
} as any

afterEach(() => {
  document.body.innerHTML = ''
})

describe('OfTextField uncommitted input', () => {
  it('keeps typed text when the field re-renders before change fires', async () => {
    const wrapper = mountTextField()
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = 'Acme'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.setProps({ label: 'Account Name' })
    await nextTick()

    expect(input.value).toBe('Acme')
    wrapper.unmount()
  })

  it('keeps typed text when the format is re-resolved before change fires', async () => {
    const wrapper = mountTextField({
      type: plainFormat,
      formatOptions: { v: 1 }
    })
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = 'Acme'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.setProps({ formatOptions: { v: 2 } })
    await nextTick()

    expect(input.value).toBe('Acme')
    wrapper.unmount()
  })

  it('re-syncs the input from the model on format change after blur', async () => {
    const wrapper = mountTextField({
      type: suffixFormat,
      formatOptions: { s: '' },
      modelValue: 'x'
    })
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = 'xy'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.value = 'x'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('blur'))
    await wrapper.setProps({ formatOptions: { s: '!' } })
    await nextTick()

    expect(input.value).toBe('x!')
    wrapper.unmount()
  })

  it('emits the typed text on change', async () => {
    const wrapper = mountTextField()
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = 'Acme'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Acme'])
    wrapper.unmount()
  })

  it('shows the new model value after the parent updates it', async () => {
    const wrapper = mountTextField()
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = 'Acme'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.setProps({ modelValue: 'Reset by parent' })
    await nextTick()

    expect(input.value).toBe('Reset by parent')
    wrapper.unmount()
  })

  it('keeps typed text in a masked field when the format is re-resolved', async () => {
    const wrapper = mountTextField({
      type: maskedFormat,
      formatOptions: { v: 1 }
    })
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = '12'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.setProps({ formatOptions: { v: 2 } })
    await nextTick()

    expect(input.value).toBe('12')
    wrapper.unmount()
  })

  it('keeps committed text when the format is re-resolved before the parent applies the model', async () => {
    const wrapper = mountTextField({
      type: plainFormat,
      formatOptions: { v: 1 }
    })
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = 'Acme'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await wrapper.setProps({ formatOptions: { v: 2 } })
    await nextTick()

    expect(input.value).toBe('Acme')
    await wrapper.setProps({ modelValue: 'Acme' })
    await nextTick()
    expect(input.value).toBe('Acme')
    wrapper.unmount()
  })

  it('keeps committed text through blur until the parent applies the model', async () => {
    const wrapper = mountTextField({
      type: plainFormat,
      formatOptions: { v: 1 }
    })
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = 'Acme'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    input.dispatchEvent(new Event('blur'))
    await wrapper.setProps({ formatOptions: { v: 2 } })
    await nextTick()

    expect(input.value).toBe('Acme')
    wrapper.unmount()
  })

  it('keeps cleared text in a masked field when handleInput reports no update', async () => {
    const wrapper = mountTextField({ type: noopMaskedFormat, modelValue: '12' })
    const input = wrapper.get('input').element as HTMLInputElement

    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.setProps({ label: 'Account Name' })
    await nextTick()

    expect(input.value).toBe('')
    wrapper.unmount()
  })
})

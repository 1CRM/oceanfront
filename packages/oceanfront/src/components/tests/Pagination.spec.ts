import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { OfButton } from '../Button'
import { OfIcon } from '../Icon'
import { OfTooltip } from '../Tooltip'
import { OfTextField } from '../../fields/Text'
import { NumberFormatter } from '../../formats/Number'
import { extendDefaultConfig } from '../../lib/config'
import { registerTextFormatter } from '../../lib/formats'
import OfPagination from '../Pagination.vue'

extendDefaultConfig(() => {
  registerTextFormatter('number', NumberFormatter)
})

const mountPagination = (props: Record<string, unknown> = {}) =>
  mount(OfPagination, {
    attachTo: document.body,
    props: {
      modelValue: 1,
      totalPages: 10,
      customOffsetPopup: true,
      startRecord: 1,
      perPage: 5,
      ...props
    },
    global: {
      components: { OfButton, OfIcon, OfTextField, OfTooltip }
    }
  })

const openOffsetPopup = async (wrapper: ReturnType<typeof mountPagination>) => {
  await wrapper.find('[id$="-expand"] button').trigger('click')
  await nextTick()
}

const perPageInput = (): HTMLInputElement => {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Per Page"]'
  )
  if (!input) throw new Error('per page input not rendered')
  return input
}

const typeInto = async (input: HTMLInputElement, value: string) => {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

const commit = async (input: HTMLInputElement) => {
  input.dispatchEvent(new Event('change', { bubbles: true }))
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
})

// Grouped digits are read back as the number before the first separator, so a
// per page value above 999 has to survive both directions ungrouped.
test('round-trips a per page value above 999', async () => {
  const wrapper = mountPagination({ perPage: 2000 })
  await openOffsetPopup(wrapper)

  const input = perPageInput()
  expect(input.value).toBe('2000')

  await typeInto(input, '1000')
  expect(input.value).toBe('1000')

  await commit(input)
  document
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await nextTick()

  expect(wrapper.emitted('update-offset')?.at(-1)).toEqual([
    { page: 1, startRecord: 1, perPage: 1000 }
  ])
  wrapper.unmount()
})

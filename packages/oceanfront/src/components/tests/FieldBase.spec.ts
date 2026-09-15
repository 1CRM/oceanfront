import { mount } from '@vue/test-utils'
import { OfIcon } from '../Icon'
import { OfTooltip } from '../Tooltip'
import { OfOverlay } from '../Overlay'
import { OfTextField } from '../../fields/Text'

const mountLabeledField = (
  labelPosition: 'top' | 'right' | 'left',
  label = 'Status'
) =>
  mount(OfTextField, {
    props: {
      label,
      tooltip: 'help',
      labelPosition,
      modelValue: 'In Process',
      mode: 'fixed'
    },
    global: {
      components: { OfIcon, OfTooltip, OfOverlay }
    }
  })

afterEach(() => {
  document.body.innerHTML = ''
})

describe('OfFieldBase in-label tooltip', () => {
  it.each(['top', 'right', 'left'] as const)(
    'renders the tooltip inside the %s label at 1em so it stays after the text',
    (labelPosition) => {
      const wrapper = mountLabeledField(labelPosition)
      const label = wrapper.get('.of-field-label')

      expect(label.text()).toContain('Status')
      expect(label.find('.of-tooltip').exists()).toBe(true)
      expect(
        wrapper.get('.of-field-main-label').find(':scope > .of-tooltip').exists()
      ).toBe(false)
      expect(wrapper.getComponent(OfTooltip).props('scale')).toBe('1em')
    }
  )
})

describe('OfFieldBase frame-label tooltip', () => {
  const mountFrameLabelField = () =>
    mount(OfTextField, {
      props: {
        label: 'Text input',
        tooltip: 'help',
        labelPosition: 'frame',
        variant: 'outlined',
        modelValue: 'sample value',
        mode: 'editable'
      },
      global: {
        components: { OfIcon, OfTooltip, OfOverlay }
      }
    })

  it('renders the tooltip beside the frame label text', () => {
    const wrapper = mountFrameLabelField()
    const frameLabel = wrapper.get('.of-field-frame-label')

    expect(frameLabel.get('.of-field-label').text()).toContain('Text input')
    expect(frameLabel.find('.of-tooltip').exists()).toBe(true)
    expect(frameLabel.get('.of-field-label').find('.of-tooltip').exists()).toBe(
      false
    )
  })
})

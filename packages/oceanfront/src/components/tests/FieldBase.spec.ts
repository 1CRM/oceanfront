import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { mount } from '@vue/test-utils'
import { OfIcon } from '../Icon'
import { OfTooltip } from '../Tooltip'
import { OfOverlay } from '../Overlay'
import { OfTextField } from '../../fields/Text'

const fieldsScss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../scss/_fields.scss'),
  'utf8'
)

const mountTopLabelField = (label = 'Status') =>
  mount(OfTextField, {
    props: {
      label,
      tooltip: 'gfsret h hf',
      labelPosition: 'top',
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

describe('OfFieldBase top-label tooltip', () => {
  it('renders the tooltip inside the label so it stays after the text', () => {
    const wrapper = mountTopLabelField()
    const label = wrapper.get('.of-field-label')

    expect(label.text()).toContain('Status')
    expect(label.find('.of-tooltip').exists()).toBe(true)
    expect(
      wrapper.get('.of-field-main-label').find(':scope > .of-tooltip').exists()
    ).toBe(false)
  })

  it('keeps top-label tooltips in the inline label flow so they cannot wrap alone', () => {
    expect(fieldsScss).toMatch(
      /of--label-top[\s\S]*?of-field-main-label[\s\S]*?flex-wrap:\s*nowrap/
    )
    expect(fieldsScss).toMatch(
      /of--label-top[\s\S]*?> \.of-field-label[\s\S]*?flex:\s*0 1 auto/
    )
    expect(fieldsScss).toMatch(
      /\.of-field-label\s+\.of-tooltip[\s\S]*?display:\s*inline-flex/
    )
    expect(fieldsScss).toMatch(
      /of-field-label:has\(\.of-tooltip\)[\s\S]*?white-space:\s*normal/
    )
  })

  it('sizes an in-label tooltip icon to 1em and vertically centers it with the text', () => {
    const wrapper = mountTopLabelField()
    const tooltip = wrapper.getComponent(OfTooltip)

    expect(tooltip.props('scale')).toBe('1em')
    expect(fieldsScss).toMatch(
      /\.of-field-label\s+\.of-tooltip[\s\S]*?font-size:\s*1em/
    )
    expect(fieldsScss).toMatch(
      /\.of-field-label\s+\.of-tooltip[\s\S]*?align-items:\s*center/
    )
    expect(fieldsScss).toMatch(
      /\.of-field-label\s+\.of-tooltip[\s\S]*?margin-inline-start:\s*0\.5em/
    )
  })
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
  })

  it('vertically centers the outlined frame tooltip with the floated label text', () => {
    expect(fieldsScss).toMatch(
      /of--label-frame \.of-field-frame-label[\s\S]*?align-items:\s*center/
    )
    expect(fieldsScss).toMatch(
      /of--label-frame\.of--variant-outlined \.of-field-frame-label[\s\S]*?\.of-tooltip[\s\S]*?align-items:\s*center/
    )
    expect(fieldsScss).toMatch(
      /of--active[\s\S]*?\.of-tooltip[\s\S]*?transform:\s*translateY\(-50%\)/
    )
  })
})

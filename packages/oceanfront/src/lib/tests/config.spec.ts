import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { OfConfig } from '../../components/Config'
import { LocaleOptionsApiProbe } from './locale-options-api-probe'
import { LocaleSetupProbe } from './locale-setup-probe'

test('resolveConfig returns a config when called from setup', () => {
  const wrapper = mount(LocaleSetupProbe)
  expect(wrapper.find('span').attributes('data-has-config')).toBe('true')
})

test('resolveLocale reads OfConfig props in Options API computed', () => {
  const wrapper = mount(OfConfig, {
    props: {
      locale: 'de-DE',
      localeParams: { weekStart: 0 }
    },
    slots: {
      default: () => h(LocaleOptionsApiProbe)
    }
  })

  const span = wrapper.find('span')
  expect(span.attributes('data-locale')).toBe('de-DE')
  expect(span.attributes('data-week')).toBe('0')
})

test('nested OfConfig uses inner locale scope', () => {
  const wrapper = mount(OfConfig, {
    props: {
      locale: 'en-US',
      localeParams: { weekStart: 1 }
    },
    slots: {
      default: () =>
        h(
          OfConfig,
          {
            locale: 'fr-FR',
            localeParams: { weekStart: 0 }
          },
          { default: () => h(LocaleSetupProbe) }
        )
    }
  })

  const span = wrapper.find('span')
  expect(span.attributes('data-locale')).toBe('fr-FR')
  expect(span.attributes('data-week')).toBe('0')
  expect(span.attributes('data-has-formats')).toBe('true')
})

test('child without OfConfig inherits parent OfConfig locale', () => {
  const wrapper = mount(OfConfig, {
    props: {
      locale: 'nl-NL',
      localeParams: { weekStart: 2 }
    },
    slots: {
      default: () => h(LocaleSetupProbe)
    }
  })

  const span = wrapper.find('span')
  expect(span.attributes('data-locale')).toBe('nl-NL')
  expect(span.attributes('data-week')).toBe('2')
})

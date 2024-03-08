import { mount } from '@vue/test-utils'
import { OfIcon } from '../Icon'
import OfTabs from '../Tabs.vue'

test('displays message', () => {
  const wrapper = mount(OfTabs, {
    props: {
      items: ['One', 'Two']
    },
    global: {
      components: {
        OfIcon
      }
    }
  })

  expect(wrapper.text()).toContain('Two')
})

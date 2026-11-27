import { mount } from '@vue/test-utils'
import KanbanCard from '../KanbanBoard/components/KanbanCard.vue'

const mountCard = (title?: string) =>
  mount(KanbanCard, {
    props: { card: { id: '1', title: 'Card', order: 0 }, columnId: 'col-1' },
    slots: title ? { title } : {},
    global: { stubs: { OfButton: true, OfIcon: true, OfOptionList: true } }
  })

describe('KanbanCard title click', () => {
  test('emits card-title-click for the default title', async () => {
    const wrapper = mountCard()
    await wrapper.get('.title-text').trigger('click')
    expect(wrapper.emitted('card-title-click')).toHaveLength(1)
  })

  test('emits card-title-click for marked custom title content', async () => {
    const wrapper = mountCard(
      '<div class="custom"><div data-kanban-title-click><span>Field</span></div></div>'
    )
    await wrapper.get('.custom span').trigger('click')
    expect(wrapper.emitted('card-title-click')).toHaveLength(1)
  })

  test('ignores clicks on unmarked custom title content', async () => {
    const wrapper = mountCard(
      '<div class="custom"><div data-kanban-title-click>Field</div></div>'
    )
    await wrapper.get('.custom').trigger('click')
    expect(wrapper.emitted('card-title-click')).toBeUndefined()
  })

  test('emits card-title-click when title content stops propagation', async () => {
    const wrapper = mountCard(
      '<div class="custom" data-kanban-title-click @click.stop>Field</div>'
    )
    await wrapper.get('.custom').trigger('click')
    expect(wrapper.emitted('card-title-click')).toHaveLength(1)
  })

  test.each(['a', 'button'])(
    'ignores clicks on <%s> inside the title',
    async (tag) => {
      const wrapper = mountCard(
        `<div data-kanban-title-click><${tag} class="control">x</${tag}></div>`
      )
      await wrapper.get('.control').trigger('click')
      expect(wrapper.emitted('card-title-click')).toBeUndefined()
    }
  )
})

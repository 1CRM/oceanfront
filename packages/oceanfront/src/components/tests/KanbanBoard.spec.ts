import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import KanbanBoard from '../KanbanBoard/KanbanBoard.vue'

const KanbanColumnStub = defineComponent({
  name: 'KanbanColumnStub',
  props: {
    column: {
      type: Object,
      required: true
    }
  },
  emits: ['collapse-toggle'],
  template:
    '<div class="of-kanban-column" :data-column-id="column.id"><button class="toggle-collapse" @click="$emit(\'collapse-toggle\', column.id)">Toggle</button></div>'
})

describe('KanbanBoard', () => {
  test('scrolls horizontally to keep expanded column visible', async () => {
    const boardId = 'kanban-expand-scroll-spec'
    localStorage.setItem(
      `kanban-collapsed-columns-${boardId}`,
      JSON.stringify(['col-1'])
    )

    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback): number => {
        callback(0)
        return 1
      })

    const wrapper = mount(KanbanBoard, {
      props: {
        id: boardId,
        columns: [{ id: 'col-1', title: 'Column 1', cards: [] }],
        disableInternalFilters: true
      },
      global: {
        stubs: {
          KanbanColumn: KanbanColumnStub
        }
      }
    })

    await nextTick()

    const boardEl = wrapper.find('.of-kanban-board').element as HTMLElement
    const columnEl = wrapper.find('.of-kanban-column').element as HTMLElement

    Object.defineProperty(boardEl, 'scrollLeft', {
      value: 100,
      writable: true,
      configurable: true
    })
    Object.defineProperty(boardEl, 'scrollWidth', {
      value: 1800,
      configurable: true
    })
    Object.defineProperty(boardEl, 'clientWidth', {
      value: 600,
      configurable: true
    })

    Object.defineProperty(columnEl, 'offsetLeft', {
      value: 420,
      configurable: true
    })
    Object.defineProperty(columnEl, 'offsetWidth', {
      value: 350,
      configurable: true
    })

    await wrapper.find('.toggle-collapse').trigger('click')
    await nextTick()

    expect(boardEl.scrollLeft).toBe(178)
    expect(wrapper.emitted('column-expanded')).toEqual([['col-1']])

    requestAnimationFrameSpy.mockRestore()
  })

  test('uses projected expanded width while column is still animating', async () => {
    const boardId = 'kanban-expand-scroll-projected-width-spec'
    localStorage.setItem(
      `kanban-collapsed-columns-${boardId}`,
      JSON.stringify(['col-1'])
    )

    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback): number => {
        callback(0)
        return 1
      })

    const getComputedStyleSpy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation(
        () =>
          ({
            maxWidth: '350px',
            minWidth: '48px'
          }) as CSSStyleDeclaration
      )

    const wrapper = mount(KanbanBoard, {
      props: {
        id: boardId,
        columns: [{ id: 'col-1', title: 'Column 1', cards: [] }],
        disableInternalFilters: true
      },
      global: {
        stubs: {
          KanbanColumn: KanbanColumnStub
        }
      }
    })

    await nextTick()

    const boardEl = wrapper.find('.of-kanban-board').element as HTMLElement
    const columnEl = wrapper.find('.of-kanban-column').element as HTMLElement

    Object.defineProperty(boardEl, 'scrollLeft', {
      value: 100,
      writable: true,
      configurable: true
    })
    Object.defineProperty(boardEl, 'scrollWidth', {
      value: 1800,
      configurable: true
    })
    Object.defineProperty(boardEl, 'clientWidth', {
      value: 600,
      configurable: true
    })

    Object.defineProperty(columnEl, 'offsetLeft', {
      value: 640,
      configurable: true
    })
    Object.defineProperty(columnEl, 'offsetWidth', {
      // Simulates in-transition width while collapsed->expanded animation is running.
      value: 48,
      configurable: true
    })

    await wrapper.find('.toggle-collapse').trigger('click')
    await nextTick()

    expect(boardEl.scrollLeft).toBe(398)
    expect(wrapper.emitted('column-expanded')).toEqual([['col-1']])

    getComputedStyleSpy.mockRestore()
    requestAnimationFrameSpy.mockRestore()
  })
})

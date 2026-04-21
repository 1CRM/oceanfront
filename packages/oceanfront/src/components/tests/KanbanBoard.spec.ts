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

    boardEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          left: 0,
          right: 600,
          width: 600
        }) as DOMRect
    )
    columnEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          left: 420,
          right: 770,
          width: 350
        }) as DOMRect
    )

    const scrollToSpy = vi.fn(
      (args: ScrollToOptions | number, _y?: number): void => {
        if (typeof args === 'number') return
        if (typeof args.left === 'number') boardEl.scrollLeft = args.left
      }
    )
    ;(boardEl as unknown as { scrollTo: typeof scrollToSpy }).scrollTo =
      scrollToSpy

    const getComputedStyleSpy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation(
        (el: Element) =>
          ({
            overflowX: el === boardEl ? 'auto' : 'visible'
          }) as CSSStyleDeclaration
      )

    await wrapper.find('.toggle-collapse').trigger('click')
    await nextTick()

    expect(scrollToSpy).toHaveBeenCalled()
    expect(boardEl.scrollLeft).toBe(294)
    expect(wrapper.emitted('column-expanded')).toEqual([['col-1']])

    getComputedStyleSpy.mockRestore()
    requestAnimationFrameSpy.mockRestore()
  })

  test('falls back to direct scroll when smooth scroll does not move', async () => {
    const boardId = 'kanban-expand-scroll-projected-width-spec'
    localStorage.setItem(
      `kanban-collapsed-columns-${boardId}`,
      JSON.stringify(['col-1'])
    )
    vi.useFakeTimers()

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

    boardEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          left: 0,
          right: 600,
          width: 600
        }) as DOMRect
    )
    columnEl.getBoundingClientRect = vi.fn(
      () =>
        ({
          left: 700,
          right: 874,
          width: 174
        }) as DOMRect
    )

    // Simulate environments where smooth scroll is ignored/no-op.
    const scrollToSpy = vi.fn()
    ;(boardEl as unknown as { scrollTo: typeof scrollToSpy }).scrollTo =
      scrollToSpy

    const getComputedStyleSpy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation(
        (el: Element) =>
          ({
            overflowX: el === boardEl ? 'auto' : 'visible'
          }) as CSSStyleDeclaration
      )

    await wrapper.find('.toggle-collapse').trigger('click')
    await nextTick()
    vi.advanceTimersByTime(250)
    await nextTick()

    expect(scrollToSpy).toHaveBeenCalled()
    expect(boardEl.scrollLeft).toBe(398)
    expect(wrapper.emitted('column-expanded')).toEqual([['col-1']])

    getComputedStyleSpy.mockRestore()
    requestAnimationFrameSpy.mockRestore()
    vi.useRealTimers()
  })
})

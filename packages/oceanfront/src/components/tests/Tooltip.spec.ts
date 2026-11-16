import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import { OfTooltip } from '../Tooltip'

type Box = { left: number; width: number }

type Container = Box & { overflowX: string; sized?: boolean }

const rects = new Map<Element, Box>()

const mountTooltip = (
  icon: Box,
  container?: Container,
  position: 'left' | 'right' = 'right'
) => {
  const wrapper = mount(
    {
      render: () =>
        h(
          'div',
          {
            class: 'container',
            style: container && { overflowX: container.overflowX }
          },
          [h(OfTooltip, { text: 'Tooltip text', position })]
        )
    },
    { attachTo: document.body }
  )
  if (container) {
    const el = wrapper.find('.container').element
    if (container.sized !== false)
      Object.defineProperty(el, 'clientWidth', { value: container.width })
    rects.set(el, container)
  }
  rects.set(wrapper.find('.of-tooltip-main').element, icon)
  rects.set(wrapper.find('.of-tooltip-text').element, { left: 0, width: 200 })
  return wrapper
}

const openTooltip = async (wrapper: ReturnType<typeof mountTooltip>) => {
  await wrapper.find('.of-tooltip-main').trigger('mouseenter')
  await flushPromises()
  const text = wrapper.find('.of-tooltip-text')
  return {
    side: text.classes('left') ? 'left' : 'right',
    maxWidth: (text.element as HTMLElement).style.maxWidth
  }
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const { left, width } = rects.get(this) ?? { left: 0, width: 0 }
      return { left, width, right: left + width } as DOMRect
    }
  )
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: 1000
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  rects.clear()
  document.body.innerHTML = ''
  delete (document.documentElement as any).clientWidth
})

describe('OfTooltip positioning', () => {
  it('wraps within the browser window', async () => {
    expect(await openTooltip(mountTooltip({ left: 100, width: 16 }))).toEqual({
      side: 'right',
      maxWidth: '852px'
    })
  })

  it.each(['auto', 'hidden'])(
    'flips left and wraps inside an overflow-x: %s container',
    async (overflowX) => {
      expect(
        await openTooltip(
          mountTooltip(
            { left: 350, width: 16 },
            { left: 100, width: 300, overflowX }
          )
        )
      ).toEqual({ side: 'left', maxWidth: '223px' })
    }
  )

  it('measures left space from the container, not the viewport', async () => {
    expect(
      await openTooltip(
        mountTooltip(
          { left: 310, width: 16 },
          { left: 300, width: 400, overflowX: 'hidden' },
          'left'
        )
      )
    ).toEqual({ side: 'right', maxWidth: '342px' })
  })

  it('ignores clipping ancestors without a layout box', async () => {
    expect(
      await openTooltip(
        mountTooltip(
          { left: 100, width: 16 },
          { left: 100, width: 300, overflowX: 'hidden', sized: false }
        )
      )
    ).toEqual({ side: 'right', maxWidth: '852px' })
  })

  it('never sets a negative max-width', async () => {
    const { maxWidth } = await openTooltip(
      mountTooltip(
        { left: 2, width: 16 },
        { left: 0, width: 20, overflowX: 'hidden' }
      )
    )

    expect(maxWidth).toBe('50px')
  })
})

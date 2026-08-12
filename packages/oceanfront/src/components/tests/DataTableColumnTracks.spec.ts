import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OfDataTable from '../DataTable.vue'
import { VIRTUAL_SCROLL_SETTLE_MS } from '../../lib/virtual_rows'

const VIEWPORT = 800
const TOTAL_ROWS = 10000
const TABLE_HEIGHT = TOTAL_ROWS * 40
/** What a laid-out grid would resolve `auto` tracks to. jsdom has no layout. */
const LAID_OUT_TRACKS = '150px 260px'

let pageOffset = 0
let realGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect
let realGetComputedStyle: typeof window.getComputedStyle

const setPageOffset = (offset: number) => {
  pageOffset = offset
  window.dispatchEvent(new Event('scroll'))
}

const headers = [
  { value: 'name', text: 'Name' },
  { value: 'city', text: 'City' }
] as any[]

const mountTable = () => {
  const items = new Array(TOTAL_ROWS)
  for (let i = 0; i < 40; i++) {
    items[i] = { id: `r${i}`, name: `Row ${i}`, city: 'Somewhere' }
  }
  return mount(OfDataTable, {
    attachTo: document.body,
    props: { headers, items, virtualScroll: true, totalRows: TOTAL_ROWS }
  })
}

const tableStyle = (wrapper: ReturnType<typeof mountTable>) =>
  (wrapper.find('[role="table"]').element as HTMLElement).style
    .gridTemplateColumns

beforeEach(() => {
  pageOffset = 0
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame']
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: VIEWPORT
  })
  realGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      top: -pageOffset,
      bottom: TABLE_HEIGHT - pageOffset,
      height: TABLE_HEIGHT,
      left: 0,
      right: 1000,
      width: 1000,
      x: 0,
      y: -pageOffset,
      toJSON: () => ({})
    } as DOMRect
  }
  realGetComputedStyle = window.getComputedStyle
  window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
    const style = realGetComputedStyle.call(window, el, pseudo)
    return new Proxy(style, {
      get: (target, prop) =>
        prop === 'gridTemplateColumns'
          ? LAID_OUT_TRACKS
          : Reflect.get(target, prop)
    })
  }) as typeof window.getComputedStyle
})

afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = realGetBoundingClientRect
  window.getComputedStyle = realGetComputedStyle
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('OfDataTable column tracks under virtual scroll', () => {
  it('leaves the tracks to the grid while the window renders real rows', () => {
    const wrapper = mountTable()

    setPageOffset(200)

    // Content-sized tracks are what lets a column widen for the values
    // currently on screen; overriding them here would freeze that.
    expect(tableStyle(wrapper)).toBe('')
  })

  it('holds the measured tracks for a fling and releases them on settle', async () => {
    const wrapper = mountTable()

    // Sustained jumps larger than a viewport flip toward a skeleton-heavy
    // window, whose cells hold no text — `auto` tracks would collapse to the
    // header labels for the length of the gesture and snap back once real rows
    // return.
    setPageOffset(40000)
    setPageOffset(80000)
    await wrapper.vm.$nextTick()
    expect(tableStyle(wrapper)).toBe(LAID_OUT_TRACKS)

    vi.advanceTimersByTime(VIRTUAL_SCROLL_SETTLE_MS + 10)
    await wrapper.vm.$nextTick()

    expect(tableStyle(wrapper)).toBe('')
  })
})

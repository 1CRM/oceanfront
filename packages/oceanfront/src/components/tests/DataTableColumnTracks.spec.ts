import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OfDataTable from '../DataTable.vue'
import { VIRTUAL_SCROLL_SETTLE_MAX_MS } from '../../lib/virtual_rows'

const VIEWPORT = 800
const TOTAL_ROWS = 10000
const TABLE_HEIGHT = TOTAL_ROWS * 40

let pageOffset = 0
let realGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect

const setPageOffset = (offset: number) => {
  pageOffset = offset
  window.dispatchEvent(new Event('scroll'))
}

const headers = [
  { value: 'name', text: 'Name' },
  { value: 'city', text: 'City' }
] as any[]

const mounted: ReturnType<typeof mount>[] = []

const mountTable = () => {
  const items = new Array(TOTAL_ROWS)
  for (let i = 0; i < 40; i++) {
    items[i] = { id: `r${i}`, name: `Row ${i}`, city: 'Somewhere' }
  }
  const wrapper = mount(OfDataTable, {
    attachTo: document.body,
    props: { headers, items, virtualScroll: true, totalRows: TOTAL_ROWS }
  })
  mounted.push(wrapper)
  return wrapper
}

const columnTracks = (wrapper: ReturnType<typeof mountTable>) =>
  (wrapper.find('[role="table"]').element as HTMLElement).style.getPropertyValue(
    '--of-table-columns'
  )

afterEach(() => {
  while (mounted.length) mounted.pop()?.unmount()
  document.body.innerHTML = ''
})

describe('OfDataTable column tracks under virtual scroll', () => {
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
  })

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = realGetBoundingClientRect
    vi.useRealTimers()
  })

  it('keeps --of-table-columns stable while scrolling', async () => {
    const wrapper = mountTable()
    const tracks = columnTracks(wrapper)
    expect(tracks).not.toBe('')

    setPageOffset(200)
    expect(columnTracks(wrapper)).toBe(tracks)

    setPageOffset(40000)
    setPageOffset(80000)
    await wrapper.vm.$nextTick()
    expect(columnTracks(wrapper)).toBe(tracks)

    vi.advanceTimersByTime(VIRTUAL_SCROLL_SETTLE_MAX_MS + 10)
    await wrapper.vm.$nextTick()
    expect(columnTracks(wrapper)).toBe(tracks)
  })
})

describe('OfDataTable header row selector', () => {
  const selectHeaders = [{ value: 'name', text: 'Name' }] as any[]
  const rows = (count: number) =>
    Array.from({ length: count }, (_v, i) => ({
      id: `r${i}`,
      name: `Row ${i}`
    }))
  /** Stub the per-row selector; this spec only covers the header control. */
  const slots = { 'rows-selector': () => h('span') }

  const clickHeader = async (wrapper: ReturnType<typeof mount>) => {
    await wrapper.find('.header-rows-selector .of-button-main').trigger('click')
    await wrapper.vm.$nextTick()
  }

  it('selects the current page from the header checkbox without virtual scroll', async () => {
    const wrapper = mount(OfDataTable, {
      attachTo: document.body,
      props: {
        headers: selectHeaders,
        items: rows(30),
        itemsPerPage: 10,
        page: 1,
        rowsSelector: true
      },
      slots
    })
    mounted.push(wrapper)

    await clickHeader(wrapper)

    expect(wrapper.emitted('rows-select-page')).toBeTruthy()
    expect(wrapper.emitted('rows-select-all')).toBeFalsy()
  })

  it('selects all rows from the header checkbox under virtual scroll', async () => {
    const wrapper = mount(OfDataTable, {
      attachTo: document.body,
      props: {
        headers: selectHeaders,
        items: rows(40),
        virtualScroll: true,
        totalRows: 1000,
        rowsSelector: true
      },
      slots
    })
    mounted.push(wrapper)

    await clickHeader(wrapper)

    expect(wrapper.emitted('rows-select-all')).toBeTruthy()
    expect(wrapper.emitted('rows-select-page')).toBeFalsy()
  })

  it('clears selection from a second header click under virtual scroll', async () => {
    const wrapper = mount(OfDataTable, {
      attachTo: document.body,
      props: {
        headers: selectHeaders,
        items: rows(40),
        virtualScroll: true,
        totalRows: 1000,
        rowsSelector: true
      },
      slots
    })
    mounted.push(wrapper)

    await clickHeader(wrapper)
    await clickHeader(wrapper)

    expect(wrapper.emitted('rows-deselect-all')).toBeTruthy()
  })
})

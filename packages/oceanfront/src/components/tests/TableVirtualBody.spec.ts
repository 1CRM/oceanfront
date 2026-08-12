import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OfTableVirtualBody from '../TableVirtualBody.vue'

const ROW_HEIGHT = 46

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  observed: Element[] = []

  constructor(private cb: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }

  observe(el: Element) {
    this.observed.push(el)
  }

  unobserve(el: Element) {
    this.observed = this.observed.filter((entry) => entry !== el)
  }

  disconnect() {
    this.observed = []
  }

  /** Reports every observed element at `ROW_HEIGHT`, as a real resize would. */
  emit() {
    this.cb(
      this.observed.map((target) => ({
        target,
        borderBoxSize: [{ blockSize: ROW_HEIGHT, inlineSize: 0 }]
      })) as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver
    )
  }
}

/** Enough of a drag context for the row's drag computeds to evaluate. */
const dragInfo = {
  draggingItem: [],
  currentCoords: [],
  listedRows: [],
  allParent: false
}

const mountBody = (rows: any[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]) => {
  const reportRowHeight = vi.fn()
  const wrapper = mount(OfTableVirtualBody, {
    attachTo: document.body,
    props: {
      rows,
      columns: [{ value: 'name', text: 'Name' }] as any,
      rangeStart: 0,
      rangeEnd: 3,
      topSpacer: 0,
      bottomSpacer: 0,
      dragInfo,
      dragEvents: {},
      rowsRecord: {} as any,
      reportRowHeight,
      rowHeightAt: () => 32
    }
  })
  return { wrapper, reportRowHeight }
}

beforeEach(() => {
  FakeResizeObserver.instances = []
  ;(globalThis as any).ResizeObserver = FakeResizeObserver
})

afterEach(() => {
  delete (globalThis as any).ResizeObserver
})

describe('OfTableVirtualBody row measurement', () => {
  it('measures every rendered row', () => {
    const { reportRowHeight } = mountBody()
    const observer = FakeResizeObserver.instances[0]
    // Rows render several root nodes, so their element has to be found by
    // something other than `$el`. Miss it and no height is ever measured:
    // every row stays budgeted at its estimate while rendering at its real
    // height, and the difference lands on the page height.
    expect(observer.observed).toHaveLength(3)

    observer.emit()

    expect(reportRowHeight).toHaveBeenCalledTimes(3)
    expect(reportRowHeight).toHaveBeenCalledWith(0, ROW_HEIGHT)
    expect(reportRowHeight).toHaveBeenCalledWith(2, ROW_HEIGHT)
  })

  it('does not measure placeholders', () => {
    const { wrapper, reportRowHeight } = mountBody([
      undefined,
      undefined,
      undefined
    ])
    const observer = FakeResizeObserver.instances[0]
    expect(wrapper.findAll('.of-data-table-row-skeleton')).toHaveLength(3)
    expect(observer.observed).toHaveLength(0)

    observer.emit()

    // A placeholder is drawn at the height the store already assumes, so
    // measuring one would only feed that assumption back to itself.
    expect(reportRowHeight).not.toHaveBeenCalled()
  })

  it('keeps loaded rows as real rows unless forceSkeleton is set', async () => {
    const { wrapper } = mountBody()
    expect(wrapper.findAll('.of-data-table-row-skeleton')).toHaveLength(0)
    expect(wrapper.findAll('.of-data-table-row')).toHaveLength(3)

    await wrapper.setProps({ forceSkeleton: true })
    expect(wrapper.findAll('.of-data-table-row-skeleton')).toHaveLength(3)
  })
})

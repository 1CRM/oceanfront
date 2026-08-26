import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DataTable from '../DataTable.vue'

const headers = [
  { value: 'name', text: 'Name' },
  { value: 'city', text: 'City' }
]

const items = [
  { id: '1', name: 'Row 1', city: 'Vancouver' },
  { id: '2', name: 'Row 2', city: 'Victoria' }
]

const mountTable = (props: Record<string, any> = {}) =>
  mount(DataTable, {
    props: { headers, items, rowsSelector: true, ...props },
    // The cells of a data row need the field registry; the header does not.
    global: { stubs: { OfTableRow: true } }
  })

const headerSelector = (wrapper: ReturnType<typeof mountTable>) =>
  wrapper.find('.of-data-table-header').find('.of-data-table-rows-selector')

const headerChecked = (wrapper: ReturnType<typeof mountTable>) =>
  headerSelector(wrapper)
    .find('.row-selector')
    .classes()
    .includes('of--checked')

const clickHeaderSelector = async (wrapper: ReturnType<typeof mountTable>) => {
  await headerSelector(wrapper).find('.of-button-main').trigger('click')
  await nextTick()
}

const tracks = (wrapper: ReturnType<typeof mountTable>) =>
  (
    wrapper.find('[role="table"]').element as HTMLElement
  ).style.getPropertyValue('--of-table-columns')

describe('OfDataTable rows selector', () => {
  // An empty window would take the header cell with it while the grid keeps its
  // track, shifting every column label one place left until the rows arrive.
  // A list returned to reserves nothing but the rows its first chunk will add.
  test.each([
    [
      'the window has scrolled past them',
      { spaceBefore: 320, spaceAfter: 320 }
    ],
    ['its first chunk is still in flight', { pendingSpace: 96 }]
  ])('keeps the header selector and its track while %s', async (_, space) => {
    const wrapper = mountTable({ infiniteScrollActive: true, spaceAfter: 640 })
    const withRows = tracks(wrapper)

    await wrapper.setProps({ items: [], spaceAfter: 0, ...space })
    await nextTick()

    expect(headerSelector(wrapper).exists()).toBe(true)
    expect(tracks(wrapper)).toBe(withRows)
    expect(
      headerSelector(wrapper).find('.row-selector').classes()
    ).not.toContain('of--checked')
  })

  test('drops the header selector when a paged list is empty', () => {
    expect(headerSelector(mountTable({ items: [] })).exists()).toBe(false)
  })

  // Select-all locks the result set, not the current window. An empty window or
  // rows that never made it into rowsRecord used to uncheck the header, so the
  // next click selected all again instead of clearing.
  test.each([
    [
      'the window has scrolled past them',
      { items: [], spaceBefore: 320, spaceAfter: 320 }
    ],
    [
      'later rows were never written into the record',
      {
        items: [{ id: '99', name: 'Later', city: 'Kelowna' }],
        spaceBefore: 640
      }
    ]
  ])('keeps the header checked after select-all when %s', async (_, next) => {
    const wrapper = mountTable({ infiniteScrollActive: true })
    await clickHeaderSelector(wrapper)
    expect(headerChecked(wrapper)).toBe(true)
    expect(wrapper.emitted('rows-select-all')).toHaveLength(1)

    await wrapper.setProps(next)
    await nextTick()

    expect(headerChecked(wrapper)).toBe(true)

    await clickHeaderSelector(wrapper)
    expect(wrapper.emitted('rows-deselect-all')).toHaveLength(1)
    expect(headerChecked(wrapper)).toBe(false)
  })
})

// A caller that virtualizes keys its store by absolute record index, and hands
// it over as it is: an index it holds no row for used to be read as a row.
test('skips the rows a virtualizing caller left out', () => {
  const sparse: any[] = []
  sparse.length = 5
  sparse[3] = { id: '3', name: 'Row 4', city: 'Kelowna' }

  const wrapper = mountTable({ items: sparse, spaceBefore: 96 })

  expect(wrapper.findAllComponents({ name: 'OfTableRow' })).toHaveLength(1)
})

// The spacers are the virtualization: they stand for the rows the caller left
// out above and below the window, and for the ones a fetch is about to append,
// holding the scroll height each of those takes up.
test('reserves the space the caller asks for, and none before', async () => {
  const wrapper = mountTable()
  const spacers = () =>
    wrapper
      .findAll('.of-data-table-spacer, .of-data-table-pending')
      .map((box) => (box.element as HTMLElement).style.height)

  expect(spacers()).toEqual([])

  await wrapper.setProps({
    spaceBefore: 320,
    spaceAfter: 640,
    pendingSpace: 96
  })
  await nextTick()

  expect(spacers()).toEqual(['320px', '640px', '96px'])

  // Reaching the top of the list drops the leading spacer, not the others.
  await wrapper.setProps({ spaceBefore: 0 })
  await nextTick()

  expect(spacers()).toEqual(['640px', '96px'])
})

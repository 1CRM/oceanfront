import { mount } from '@vue/test-utils'
import { h } from 'vue'
import OfCalendar from '../Calendar/Calendar'
import { CalendarEvent } from '../../lib/calendar'
import { extendDefaultConfig } from '../../lib/config'
import { registerTextFormatter } from '../../lib/formats'
import { DateFormatter, DateTimeFormatter } from '../../formats/DateTime'

extendDefaultConfig(() => {
  registerTextFormatter('datetime', DateTimeFormatter)
  registerTextFormatter('date', DateFormatter)
})

const day = new Date(2024, 0, 17) // Wednesday, Jan 17 2024

const events: CalendarEvent[] = [
  {
    name: 'Timed event',
    start: '2024-01-17 09:00',
    duration: 60,
    category: 'A'
  },
  {
    name: 'All day event',
    start: '2024-01-17 00:00',
    allDay: true,
    category: 'A'
  }
]

function mountCalendar(props: Record<string, unknown> = {}, slots?: any) {
  return mount(OfCalendar, {
    props: { day, events, ...props },
    slots
  })
}

describe('OfCalendar', () => {
  it('renders the day view by default', () => {
    const wrapper = mountCalendar()
    expect(wrapper.find('.container.of--calendar').exists()).toBe(true)
    expect(wrapper.find('.of-calendar-day-row').exists()).toBe(true)
    expect(wrapper.findAll('.of-calendar-event').length).toBeGreaterThan(0)
  })

  it.each(['day', 'week', 'ndays', 'month', 'year'])(
    'renders the %s view without error',
    (type) => {
      const wrapper = mountCalendar({ type })
      expect(wrapper.find('.container.of--calendar').exists()).toBe(true)
    }
  )

  it('renders one column per day in the week view', () => {
    const wrapper = mountCalendar({ type: 'week' })
    expect(wrapper.findAll('.of-calendar-category-title').length).toBe(7)
  })

  it('starts the week on the configured weekStart day', () => {
    // day is Wednesday 2024-01-17; weekStart 2 = Tuesday
    const wrapper = mountCalendar({ type: 'week', weekStart: 2 })
    const titles = wrapper.findAll('.of-calendar-category-title')
    expect(titles.length).toBe(7)
    expect(titles[0].text()).toMatch(/Tue|17/i)
    // First column date should be Tuesday Jan 16
    expect(titles[0].text()).toContain('16')
    // Last column should be Monday Jan 22
    expect(titles[6].text()).toContain('22')
  })

  it('defaults week view to Monday–Sunday when weekStart is omitted', () => {
    const wrapper = mountCalendar({ type: 'week' })
    const titles = wrapper.findAll('.of-calendar-category-title')
    expect(titles[0].text()).toContain('15') // Mon Jan 15
    expect(titles[6].text()).toContain('21') // Sun Jan 21
  })

  it('renders the configured number of columns for ndays', () => {
    const wrapper = mountCalendar({ type: 'ndays', numDays: '4' })
    expect(wrapper.findAll('.of-calendar-category-title').length).toBe(4)
  })

  it('renders custom categories in category view', () => {
    const wrapper = mountCalendar({
      type: 'category',
      categories: ['Room A', 'Room B', 'Room C']
    })
    const titles = wrapper.findAll('.of-calendar-category-title')
    expect(titles.length).toBe(3)
    expect(titles.map((t) => t.text())).toEqual(['Room A', 'Room B', 'Room C'])
  })

  it('emits click:day when a category-view header is clicked', async () => {
    const onClickDay = vi.fn()
    const wrapper = mountCalendar({
      type: 'category',
      categories: ['Room A'],
      events: undefined,
      'onClick:day': onClickDay
    })
    await wrapper
      .find('.of-calendar-day-supertitle [tabindex]')
      .trigger('click')
    expect(onClickDay).toHaveBeenCalledTimes(1)
    expect(onClickDay.mock.calls[0][1]).toBe(day)
  })

  it('emits click:event when an event is clicked', async () => {
    const onClickEvent = vi.fn()
    const wrapper = mountCalendar({ 'onClick:event': onClickEvent })
    await wrapper.find('.of-calendar-event').trigger('click')
    expect(onClickEvent).toHaveBeenCalledTimes(1)
  })

  it('emits move:end when a movable timed event is dragged', async () => {
    const onMoveEnd = vi.fn()
    const wrapper = mountCalendar({
      type: 'day',
      movable: true,
      dayStart: 8,
      dayEnd: 18,
      hourHeight: 48,
      'onMove:end': onMoveEnd
    })
    const timed = wrapper
      .findAll('.of-calendar-day-row .of-calendar-event')
      .find((el) => el.text().includes('Timed event'))
    expect(timed).toBeTruthy()
    const dayCol = wrapper.find('.of-calendar-day-row .of-calendar-day')
    const dayRect = {
      top: 0,
      left: 0,
      width: 200,
      height: 480,
      bottom: 480,
      right: 200,
      x: 0,
      y: 0,
      toJSON: () => ({})
    } as DOMRect
    vi.spyOn(dayCol.element, 'getBoundingClientRect').mockReturnValue(dayRect)
    vi.spyOn(timed!.element, 'getBoundingClientRect').mockReturnValue({
      top: 48,
      left: 10,
      width: 100,
      height: 48,
      bottom: 96,
      right: 110,
      x: 10,
      y: 48,
      toJSON: () => ({})
    } as DOMRect)
    document.elementFromPoint = vi.fn().mockReturnValue(dayCol.element)

    await timed!.trigger('mousedown', {
      buttons: 1,
      clientX: 20,
      clientY: 60
    })
    window.dispatchEvent(
      new MouseEvent('mousemove', { buttons: 1, clientX: 20, clientY: 200 })
    )
    window.dispatchEvent(
      new MouseEvent('mouseup', { buttons: 0, clientX: 20, clientY: 200 })
    )
    expect(onMoveEnd).toHaveBeenCalledTimes(1)
    expect(onMoveEnd.mock.calls[0][4]).toEqual({ allDay: false })
  })

  it('does not start a move when eventMovable returns false', async () => {
    const onMoveStart = vi.fn()
    const wrapper = mountCalendar({
      type: 'day',
      movable: true,
      eventMovable: () => false,
      'onMove:start': onMoveStart
    })
    const timed = wrapper
      .findAll('.of-calendar-day-row .of-calendar-event')
      .find((el) => el.text().includes('Timed event'))
    expect(timed).toBeTruthy()
    await timed!.trigger('mousedown', {
      buttons: 1,
      clientX: 20,
      clientY: 60
    })
    window.dispatchEvent(
      new MouseEvent('mousemove', { buttons: 1, clientX: 20, clientY: 200 })
    )
    window.dispatchEvent(
      new MouseEvent('mouseup', { buttons: 0, clientX: 20, clientY: 200 })
    )
    expect(onMoveStart).not.toHaveBeenCalled()
  })

  it('renders 12 months in the year view', () => {
    const wrapper = mountCalendar({ type: 'year' })
    expect(wrapper.findAll('.of-calendar-month-titles').length).toBe(12)
  })

  it('renders header and footer slots', () => {
    const wrapper = mountCalendar(
      { events: undefined },
      {
        header: () => h('div', { class: 'my-header' }, 'Header'),
        footer: () => h('div', { class: 'my-footer' }, 'Footer')
      }
    )
    expect(wrapper.find('.my-header').exists()).toBe(true)
    expect(wrapper.find('.my-footer').exists()).toBe(true)
  })

  it('honors the day-title slot override', () => {
    const wrapper = mountCalendar(
      { events: undefined },
      {
        'day-title': () => h('div', { class: 'custom-day-title' }, 'X')
      }
    )
    expect(wrapper.find('.custom-day-title').exists()).toBe(true)
  })

  it('hides other months when hide-other-months is set', () => {
    const wrapper = mountCalendar({
      type: 'month',
      events: undefined,
      hideOtherMonths: true
    })
    // Days belonging to adjacent months should not render a day title
    expect(wrapper.findAll('.of-calendar-month-day .day-title').length).toBe(31)
  })
})

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

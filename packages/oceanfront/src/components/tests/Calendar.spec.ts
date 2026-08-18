import { mount, VueWrapper } from '@vue/test-utils'
import { h } from 'vue'
import OfCalendar from '../Calendar/Calendar'
import {
  CalendarEvent,
  OFFSET_TIMESTAMP,
  timestampIdToDate,
  toTimestamp
} from '../../lib/calendar'
import { extendDefaultConfig } from '../../lib/config'
import { registerTextFormatter } from '../../lib/formats'
import { DateFormatter, DateTimeFormatter } from '../../formats/DateTime'
import {
  capTimedDurationToDay,
  moveAllDaySpanDays,
  moveDurationMinutes
} from '../Calendar/useCalendarEventMove'

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

function mockRect(
  top: number,
  left: number,
  width: number,
  height: number
): DOMRect {
  return {
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
    x: left,
    y: top,
    toJSON: () => ({})
  } as DOMRect
}

async function dragEvent(
  wrapper: VueWrapper<any>,
  eventEl: ReturnType<VueWrapper<any>['find']>,
  targetEl: Element,
  from: { x: number; y: number },
  to: { x: number; y: number },
  eventRect = mockRect(48, 10, 100, 48)
) {
  const dayRect = mockRect(0, 0, 200, 480)
  vi.spyOn(targetEl as HTMLElement, 'getBoundingClientRect').mockReturnValue(
    dayRect
  )
  vi.spyOn(eventEl.element, 'getBoundingClientRect').mockReturnValue(eventRect)
  document.elementFromPoint = vi.fn().mockReturnValue(targetEl)

  await eventEl.trigger('mousedown', {
    buttons: 1,
    clientX: from.x,
    clientY: from.y
  })
  window.dispatchEvent(
    new MouseEvent('mousemove', {
      buttons: 1,
      clientX: to.x,
      clientY: to.y
    })
  )
  window.dispatchEvent(
    new MouseEvent('mouseup', {
      buttons: 0,
      clientX: to.x,
      clientY: to.y
    })
  )
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
    await dragEvent(
      wrapper,
      timed!,
      dayCol.element,
      { x: 20, y: 60 },
      { x: 20, y: 200 }
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

  it('emits move:end when an all-day event is dropped on the all-day row', async () => {
    const onMoveEnd = vi.fn()
    const wrapper = mountCalendar({
      type: 'week',
      movable: true,
      dayStart: 8,
      dayEnd: 18,
      'onMove:end': onMoveEnd
    })
    const allDay = wrapper
      .findAll('.of-calendar-allday-row .of-calendar-event')
      .find((el) => el.text().includes('All day event'))
    expect(allDay).toBeTruthy()
    const allDayCells = wrapper.findAll(
      '.of-calendar-allday-row .of-calendar-day'
    )
    // Drop onto Thursday (index 3 with Monday start: Mon=0 … Wed=2, Thu=3)
    const target = allDayCells[3]
    expect(target.exists()).toBe(true)
    document.elementFromPoint = vi.fn().mockReturnValue(target.element)
    vi.spyOn(allDay!.element, 'getBoundingClientRect').mockReturnValue(
      mockRect(0, 0, 100, 20)
    )
    vi.spyOn(target.element, 'getBoundingClientRect').mockReturnValue(
      mockRect(0, 300, 100, 40)
    )

    await allDay!.trigger('mousedown', {
      buttons: 1,
      clientX: 10,
      clientY: 10
    })
    window.dispatchEvent(
      new MouseEvent('mousemove', { buttons: 1, clientX: 320, clientY: 20 })
    )
    window.dispatchEvent(
      new MouseEvent('mouseup', { buttons: 0, clientX: 320, clientY: 20 })
    )

    expect(onMoveEnd).toHaveBeenCalledTimes(1)
    expect(onMoveEnd.mock.calls[0][4]).toEqual({ allDay: true })
    const startId = onMoveEnd.mock.calls[0][1] as number
    const endId = onMoveEnd.mock.calls[0][2] as number
    expect(endId - startId).toBe(OFFSET_TIMESTAMP)
    expect(timestampIdToDate(startId).getDate()).toBe(18) // Thu Jan 18
  })

  it('preserves multi-day all-day span in move:end ids', async () => {
    const onMoveEnd = vi.fn()
    const wrapper = mountCalendar({
      type: 'week',
      movable: true,
      events: [
        {
          name: 'Multi day',
          start: '2024-01-17 00:00',
          end: '2024-01-20 00:00',
          allDay: true
        }
      ],
      'onMove:end': onMoveEnd
    })
    const allDay = wrapper
      .findAll('.of-calendar-allday-row .of-calendar-event')
      .find((el) => el.text().includes('Multi day'))
    expect(allDay).toBeTruthy()
    const target = wrapper.findAll(
      '.of-calendar-allday-row .of-calendar-day'
    )[1]
    document.elementFromPoint = vi.fn().mockReturnValue(target.element)
    vi.spyOn(allDay!.element, 'getBoundingClientRect').mockReturnValue(
      mockRect(0, 0, 100, 20)
    )

    await allDay!.trigger('mousedown', {
      buttons: 1,
      clientX: 10,
      clientY: 10
    })
    window.dispatchEvent(
      new MouseEvent('mousemove', { buttons: 1, clientX: 120, clientY: 20 })
    )
    window.dispatchEvent(
      new MouseEvent('mouseup', { buttons: 0, clientX: 120, clientY: 20 })
    )

    expect(onMoveEnd).toHaveBeenCalledTimes(1)
    const startId = onMoveEnd.mock.calls[0][1] as number
    const endId = onMoveEnd.mock.calls[0][2] as number
    expect(endId - startId).toBe(3 * OFFSET_TIMESTAMP)
  })

  it('emits move:cancel when Escape is pressed during an active drag', async () => {
    const onMoveCancel = vi.fn()
    const onMoveEnd = vi.fn()
    const wrapper = mountCalendar({
      type: 'day',
      movable: true,
      dayStart: 8,
      dayEnd: 18,
      'onMove:cancel': onMoveCancel,
      'onMove:end': onMoveEnd
    })
    const timed = wrapper
      .findAll('.of-calendar-day-row .of-calendar-event')
      .find((el) => el.text().includes('Timed event'))
    expect(timed).toBeTruthy()
    const dayCol = wrapper.find('.of-calendar-day-row .of-calendar-day')
    vi.spyOn(dayCol.element, 'getBoundingClientRect').mockReturnValue(
      mockRect(0, 0, 200, 480)
    )
    vi.spyOn(timed!.element, 'getBoundingClientRect').mockReturnValue(
      mockRect(48, 10, 100, 48)
    )
    document.elementFromPoint = vi.fn().mockReturnValue(dayCol.element)

    await timed!.trigger('mousedown', {
      buttons: 1,
      clientX: 20,
      clientY: 60
    })
    window.dispatchEvent(
      new MouseEvent('mousemove', { buttons: 1, clientX: 20, clientY: 200 })
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(onMoveCancel).toHaveBeenCalledTimes(1)
    expect(onMoveEnd).not.toHaveBeenCalled()
  })

  it('emits move:end when a timed event is dragged to another day', async () => {
    const onMoveEnd = vi.fn()
    const wrapper = mountCalendar({
      type: 'week',
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
    const dayCols = wrapper.findAll('.of-calendar-day-row .of-calendar-day')
    // Wed is index 2 (Mon-start week); drop on Friday (index 4)
    const target = dayCols[4]
    expect(target.exists()).toBe(true)
    await dragEvent(
      wrapper,
      timed!,
      target.element,
      { x: 20, y: 60 },
      { x: 420, y: 200 }
    )
    expect(onMoveEnd).toHaveBeenCalledTimes(1)
    expect(onMoveEnd.mock.calls[0][4]).toEqual({ allDay: false })
    const startDate = timestampIdToDate(onMoveEnd.mock.calls[0][1] as number)
    expect(startDate.getDate()).toBe(19) // Fri Jan 19
  })

  it('caps long timed events to the visible day on move:end', async () => {
    const onMoveEnd = vi.fn()
    const wrapper = mountCalendar({
      type: 'day',
      movable: true,
      dayStart: 8,
      dayEnd: 18,
      hourHeight: 48,
      events: [
        {
          name: 'Long event',
          start: '2024-01-17 08:00',
          duration: 20 * 60 // longer than visible 10h day
        }
      ],
      'onMove:end': onMoveEnd
    })
    const timed = wrapper
      .findAll('.of-calendar-day-row .of-calendar-event')
      .find((el) => el.text().includes('Long event'))
    expect(timed).toBeTruthy()
    const dayCol = wrapper.find('.of-calendar-day-row .of-calendar-day')
    await dragEvent(
      wrapper,
      timed!,
      dayCol.element,
      { x: 20, y: 20 },
      { x: 20, y: 100 },
      mockRect(0, 10, 100, 480)
    )
    expect(onMoveEnd).toHaveBeenCalledTimes(1)
    const startId = onMoveEnd.mock.calls[0][1] as number
    const endId = onMoveEnd.mock.calls[0][2] as number
    const start = timestampIdToDate(startId)
    const end = timestampIdToDate(endId)
    const durationMin = (end.getTime() - start.getTime()) / 60000
    expect(durationMin).toBe(10 * 60)
    expect(start.getHours()).toBe(8)
    expect(end.getHours()).toBe(18)
  })

  it('clears click suppression after a drag so the next event click works', async () => {
    vi.useFakeTimers()
    const onMoveEnd = vi.fn()
    const onClickEvent = vi.fn()
    const wrapper = mountCalendar({
      type: 'day',
      movable: true,
      dayStart: 8,
      dayEnd: 18,
      hourHeight: 48,
      'onMove:end': onMoveEnd,
      'onClick:event': onClickEvent
    })
    const timed = wrapper
      .findAll('.of-calendar-day-row .of-calendar-event')
      .find((el) => el.text().includes('Timed event'))
    expect(timed).toBeTruthy()
    const dayCol = wrapper.find('.of-calendar-day-row .of-calendar-day')
    await dragEvent(
      wrapper,
      timed!,
      dayCol.element,
      { x: 20, y: 60 },
      { x: 20, y: 200 }
    )
    expect(onMoveEnd).toHaveBeenCalledTimes(1)

    // No click fired after mouseup outside the event; TTL must clear suppress.
    await vi.runAllTimersAsync()
    await timed!.trigger('click')
    expect(onClickEvent).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  describe('move duration helpers', () => {
    it('caps timed duration to the visible day length', () => {
      expect(capTimedDurationToDay(20 * 60, 8, 18, 30)).toBe(10 * 60)
      expect(capTimedDurationToDay(45, 8, 18, 30)).toBe(45)
    })

    it('uses ~30m for all-day → timed and preserves all-day day span', () => {
      const allDay = {
        allDay: true,
        startTS: toTimestamp(new Date(2024, 0, 17)),
        endTS: toTimestamp(new Date(2024, 0, 20))
      } as any
      expect(moveDurationMinutes(allDay, 30)).toBe(30)
      expect(moveAllDaySpanDays(allDay)).toBe(3)
    })
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

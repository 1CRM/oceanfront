import {
  categoryItem,
  toTimestamp,
  withZeroTime,
  Timestamp
} from '../../lib/calendar'
import { addDays } from '../../lib/datetime'
import { defineComponent, h, Slots } from 'vue'
import { useCalendarBase } from './base'
import dayColumns from './daycolumn'
import calendarProps from './props'

export interface DayGridCalendarOverrides {
  getVisibleRange?: () => Timestamp[]
  getCategoriesList?: () => categoryItem[]
  getIgnoreCategories?: () => boolean
  dayTitleSlot?: () => ((date: any) => any) | undefined
  superTitleSlot?: () => ((_: any) => any) | undefined
}

/**
 * Shared "day" calendar behavior: renders a single `daycolumn` grid built
 * from a list of categories/columns. Used directly for the `day` view, and
 * reused (with overrides) by the `week`, `ndays` and `category` views.
 *
 * Pass an existing `base` when the caller already created one (e.g. to use
 * `locale` / `renderDayNumber` while building overrides) so helpers are not
 * constructed twice.
 */
export function useDayGridCalendar(
  props: Record<string, any>,
  slots: Slots,
  overrides: DayGridCalendarOverrides = {},
  base = useCalendarBase(slots)
) {
  const { renderDayNumber } = base

  const getVisibleRange =
    overrides.getVisibleRange ??
    (() => {
      const firstDay = props.day
      const lastDay = addDays(firstDay, 1)
      return [
        withZeroTime(toTimestamp(firstDay)),
        withZeroTime(toTimestamp(lastDay))
      ]
    })

  const getCategoriesList =
    overrides.getCategoriesList ??
    (() => [{ category: 'Today', date: props.day }])

  const getIgnoreCategories = overrides.getIgnoreCategories ?? (() => true)

  const dayTitle =
    overrides.dayTitleSlot?.() ??
    ((date: any) => {
      const slot = slots['day-title']
      return slot ? slot(date) : renderDayNumber(date, true)
    })

  const superTitle = overrides.superTitleSlot?.()

  function render() {
    return h(
      dayColumns,
      {
        ...props,
        categoriesList: getCategoriesList(),
        ignoreCategories: getIgnoreCategories(),
        visibleRange: getVisibleRange()
      },
      {
        ...slots,
        'day-title': dayTitle,
        'super-title': superTitle
      }
    )
  }

  return { ...base, render }
}

export default defineComponent({
  props: {
    ...calendarProps.internal,
    ...calendarProps.common
  },
  setup(props, { slots }) {
    const { render } = useDayGridCalendar(props, slots)
    return render
  }
})

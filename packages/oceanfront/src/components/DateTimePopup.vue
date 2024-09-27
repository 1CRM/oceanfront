<template>
  <!-- eslint-disable vue/singleline-html-element-content-newline-->
  <div
    role="menu"
    class="of-menu of-datepicker-popup of--elevated-1"
    :class="{ 'with-time': withTime, 'with-date': withDate }"
    @vueMounted="mounted"
    @vueUnmounted="unmounted"
  >
    <div class="of-date-picker-title" v-if="withDate && !withoutTitle">
      {{ title }}
    </div>
    <div class="of-datepicker-selectors" @selectstart.prevent="">
      <div
        ref="dateSelector"
        class="of-datepicker-grid"
        v-if="withDate"
        tabindex="0"
        @keydown="onDateKeydown"
      >
        <div class="of-datepicker-nav-button prev" @click="prevMonth">
          <of-icon name="arrow left" />
        </div>
        <div
          v-if="!editingYear"
          class="of-date-picker-cur-year"
          tabindex="0"
          @click="() => editYear(true)"
          @keydown.enter.prevent.stop="() => editYear(true)"
          @keydown.space.prevent.stop="() => editYear(true)"
        >
          {{ monthYear }}
        </div>
        <input
          v-if="editingYear"
          class="of-date-picker-cur-year"
          type="text"
          size="4"
          maxlength="4"
          :onblur="() => editYear(false)"
          :onVueMounted="focusYearInput"
          :onkeydown="yearInputHandler"
          :value="selMonthStart.getFullYear()"
        />
        <div class="of-datepicker-nav-button next" @click="nextMonth">
          <of-icon name="arrow right" />
        </div>

        <div
          v-for="cell in cells"
          :key="cell.date.toString()"
          class="picker-date"
          :class="{
            'selected-date': checkSelected(cell),
            'focused-date': checkFocused(cell),
            today: cell.today,
            'other-month': cell.otherMonth
          }"
          @click="cell.otherMonth ? null : selectDate(cell.date)"
        >
          {{ cell.date.getDate() }}
        </div>
      </div>
      <div
        class="of-time-selector"
        v-if="withTime"
        tabindex="0"
        ref="timeSelector"
        @keydown="onTimeKeydown"
        @keyup="onTimeKeyup"
      >
        <div />
        <div />
        <div />
        <div />
        <div />

        <div />
        <of-icon
          @mousedown="timeClickHandler('h', 1)"
          @mouseup="timeClickHandler()"
          @mouseleave="timeClickHandler()"
          @blur="timeClickHandler()"
          name="select up"
          scale="lg"
          class="time-picker-arrow"
        />
        <div />
        <of-icon
          @mousedown="timeClickHandler('m', 1)"
          @mouseup="timeClickHandler()"
          @mouseleave="timeClickHandler()"
          @blur="timeClickHandler()"
          name="select up"
          scale="lg"
          class="time-picker-arrow"
        />
        <div />

        <div />
        <div class="time-value">{{ hours }}</div>
        <div class="time-value">:</div>
        <div class="time-value">{{ minutes }}</div>
        <div />

        <div />
        <of-icon
          @mousedown="timeClickHandler('h', -1)"
          @mouseup="timeClickHandler()"
          @mouseleave="timeClickHandler()"
          @blur="timeClickHandler()"
          name="select down"
          scale="lg"
          class="time-picker-arrow"
        />
        <div />
        <of-icon
          @mousedown="timeClickHandler('m', -1)"
          @mouseup="timeClickHandler()"
          @mouseleave="timeClickHandler()"
          @blur="timeClickHandler()"
          name="select down"
          scale="lg"
          class="time-picker-arrow"
        />
        <div />

        <div />
        <div />
        <div />
        <div />
        <div />
      </div>
    </div>
    <div
      class="of-date-picker-buttons"
      v-if="useButtons || (showTodayButton && withDate)"
    >
      <div class="of-calendar-today" v-if="showTodayButton && withDate">
        <OfButton label="Today" variant="text" :onclick="selectToday" />
      </div>
      <template v-if="useButtons">
        <OfButton icon="cancel" :onclick="onCancel" variant="text" />
        <OfButton icon="accept" :onclick="onAccept" variant="text" />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import {
  monthGrid,
  MonthGridCell,
  nextMonth as _nextMonth,
  prevMonth as _prevMonth,
  addDays,
  addMonths,
  sameDate,
  lastMonthDay,
  parseDay
} from '../lib/datetime'
import { useFormats } from '../lib/formats'
import {
  defineComponent,
  computed,
  ref,
  VNode,
  resolveComponent,
  watch
} from 'vue'
import { useLocale } from '../lib/locale'

export default defineComponent({
  name: 'OfDateTimePopup',
  inheritAttrs: false,
  props: {
    id: String,
    withTime: Boolean,
    withDate: Boolean,
    date: Date,
    monthStart: Date,
    isSelected: Function,
    accept: Function,
    withoutTitle: Boolean,
    weekStart: Number,
    showTodayButton: Boolean
  },
  setup(props) {
    let theNode: VNode | null
    const selDate = ref(props.date ?? new Date())
    const selDateLocale = ref(props.date ?? new Date())
    const focusedDate = ref(props.date ?? new Date())
    const selMonthStart = ref(props.monthStart || selDate.value)
    const editingYear = ref(false)
    const OfButton = resolveComponent('OfButton')
    const timeSelector = ref<any>(null)
    const dateSelector = ref<any>(null)

    const locale = useLocale()
    const formatMgr = useFormats()
    const localeOffset = ref(0)
    const timeZone = computed(() =>
      props.withTime ? locale.localeParams?.dateTimeFormat?.timeZone : undefined
    )
    const weekStartDayLocale = computed(() => {
      const day =
        props.weekStart === undefined
          ? locale.localeParams?.weekStart ?? 1
          : props.weekStart
      return parseDay(day)
    })
    const datetimeFormatter = computed(() =>
      formatMgr.getTextFormatter('datetime', {
        locale: 'en-US',
        timeFormat: '',
        dateFormat: '',
        nativeOptions: {
          timeZone: timeZone.value,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23'
        }
      })
    )
    const dateTimeFormatted = computed(() =>
      datetimeFormatter.value?.format(selDate.value)
    )
    const dateTimeParts = computed(
      () => datetimeFormatter.value?.format(selDate.value).parts
    )
    const getFormattedPart = (
      type: string,
      defaultValue: string | undefined = undefined
    ) =>
      dateTimeParts.value.find((p: any) => p.type === type)?.value ??
      defaultValue

    focusedDate.value = new Date(dateTimeFormatted.value?.value.getTime())

    watch(
      () => props.monthStart,
      (monthStart) => (selMonthStart.value = monthStart ?? new Date())
    )
    watch(
      () => selDate.value,
      () => {
        selDateLocale.value = dateTimeFormatted.value?.localeValue
        localeOffset.value = dateTimeFormatted.value?.tzOffset * 1000
      },
      {
        immediate: true
      }
    )
    const updateSelected = (selected: Date) => {
      selDate.value = new Date(selected.getTime() - localeOffset.value)
    }
    const timeOpts = props.withTime
      ? { hour: 'numeric', minute: 'numeric' }
      : {}
    const titleFormater = formatMgr.getTextFormatter(
      props.withTime ? 'datetime' : 'date',
      {
        timeFormat: '',
        dateFormat: '',
        nativeOptions: {
          timeZone: timeZone.value,
          month: 'short',
          year: 'numeric',
          day: 'numeric',
          weekday: 'short',
          ...timeOpts
        }
      }
    )
    const monthYearFormater = formatMgr.getTextFormatter('date', {
      locale: 'en-US',
      timeFormat: '',
      dateFormat: '',
      nativeOptions: {
        timeZone: timeZone.value,
        month: 'short',
        year: 'numeric'
      }
    })
    const selectDate = (selected: Date, focusTime = false) => {
      const date = new Date(selDateLocale.value.valueOf())
      date.setUTCFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      )
      if (props.withTime) {
        if (focusTime) timeSelector?.value?.focus()
      } else props.accept?.(date)
      selMonthStart.value = selected
      updateSelected(date)
    }

    const focusYearInput = (vn: VNode) => {
      const el = vn.el as HTMLInputElement
      el.focus()
      el.setSelectionRange(0, 999999)
    }

    const isSelected = (cell: MonthGridCell) => {
      const date = new Date(
        props.withTime
          ? selDateLocale.value.getTime() +
            selDateLocale.value.getTimezoneOffset() * 60 * 1000
          : selDate.value.getTime()
      )
      return sameDate(date, cell.date)
    }
    const isFocused = (cell: MonthGridCell) => {
      let date = new Date(
        props.withTime
          ? focusedDate.value.getTime() +
            localeOffset.value +
            focusedDate.value.getTimezoneOffset() * 60 * 1000
          : focusedDate.value.getTime()
      )
      return sameDate(date, cell.date)
    }

    const nextMonth = () => {
      selMonthStart.value = _nextMonth(selMonthStart.value)
    }
    const prevMonth = () => {
      selMonthStart.value = _prevMonth(selMonthStart.value)
    }
    const editYear = (on: boolean) => {
      editingYear.value = on
    }

    const yearInputHandler = (e: KeyboardEvent) => {
      if (e.key == 'Escape') {
        editingYear.value = false
        e.stopPropagation()
        if (theNode) theNode.el?.focus()
      }
      if (e.key == 'Enter') {
        e.stopPropagation()
        const el = e.target as HTMLInputElement
        const maybeYear = parseInt(el.value)
        if (isNaN(maybeYear) || maybeYear < 1) return
        const date = new Date(selMonthStart.value.valueOf())
        date.setFullYear(maybeYear)
        selMonthStart.value = date
        focusedDate.value = date
        editingYear.value = false
        dateSelector?.value?.focus()
      }
    }

    const onDateKeydown = (event: KeyboardEvent) => {
      let consumed = false
      if (event.code == 'Enter') {
        consumed = true
        const date = new Date(
          props.withTime
            ? focusedDate.value.getTime() +
              localeOffset.value +
              selDateLocale.value.getTimezoneOffset() * 60 * 1000
            : focusedDate.value.getTime()
        )
        selectDate(date, true)
      } else if (['ArrowUp', 'ArrowDown'].includes(event.code)) {
        consumed = true
        const arrowUp = event.code == 'ArrowUp'
        const date = focusedDate.value.getDate()
        if (event.shiftKey) {
          // + - 1 month
          if (arrowUp) {
            nextMonth()
          } else {
            prevMonth()
          }
          focusedDate.value = addMonths(focusedDate.value, arrowUp ? 1 : -1)
          const lastDate = lastMonthDay(focusedDate.value).getDate()
          if (date > lastDate) {
            focusedDate.value.setDate(lastDate)
          } else {
            focusedDate.value.setDate(date)
          }
        } else if (event.altKey || event.metaKey) {
          // + - 1 week
          const month = focusedDate.value.getMonth()
          focusedDate.value = addDays(focusedDate.value, arrowUp ? 7 : -7)
          if (focusedDate.value.getMonth() !== month) {
            if (arrowUp) {
              nextMonth()
            } else {
              prevMonth()
            }
          }
        } else {
          // + - 1 day
          if (date === 1 && !arrowUp) {
            prevMonth()
          }
          if (date === lastMonthDay(focusedDate.value).getDate() && arrowUp) {
            nextMonth()
          }
          focusedDate.value = addDays(focusedDate.value, arrowUp ? 1 : -1)
        }
      }
      if (consumed) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onTimeKeydown = (event: KeyboardEvent) => {
      let consumed = false
      if (event.code == 'Enter') {
        consumed = true
        props.accept?.(selDate.value)
      } else if (['ArrowUp', 'ArrowDown'].includes(event.code)) {
        consumed = true
        const arrowUp = event.code == 'ArrowUp'

        if (event.shiftKey) {
          // + - 1 min
          timeClickHandler('m', arrowUp ? 1 : -1)
        } else if (event.altKey || event.metaKey) {
          // + - 12 h
          const h = selDate.value.getHours()
          if (h <= 12 && arrowUp) {
            updateTime('h', 12)
          } else if (h > 12 && !arrowUp) {
            updateTime('h', -12)
          }
        } else {
          // + - 1 h
          timeClickHandler('h', arrowUp ? 1 : -1)
        }
      }
      if (consumed) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onTimeKeyup = (_event: KeyboardEvent) => {
      timeClickHandler()
    }

    const updateTime = (which: 'h' | 'm', delta: number) => {
      const date = new Date(selDateLocale.value.getTime())
      let value = which == 'h' ? date.getUTCHours() : date.getUTCMinutes()
      const limit = which == 'h' ? 23 : 59
      value += delta
      if (value < 0) value = limit
      if (value > limit) value = 0
      const _ =
        which == 'h' ? date.setUTCHours(value) : date.setUTCMinutes(value)
      updateSelected(date)
    }

    let timeout: number | undefined
    let interval: number | undefined

    const periodicTimeUpdate = (which: 'h' | 'm', delta: number) => () => {
      updateTime(which, delta)
    }
    const initialTimeUpdate = (which: 'h' | 'm', delta: number) => () => {
      updateTime(which, delta)
      interval = window.setInterval(periodicTimeUpdate(which, delta), 100)
    }

    const timeClickHandler = (which?: 'h' | 'm', delta?: number) => {
      if (timeout) window.clearTimeout(timeout)
      if (interval) window.clearInterval(interval)
      interval = timeout = undefined
      if (which == undefined || delta == undefined) return
      updateTime(which, delta)
      timeout = window.setTimeout(initialTimeUpdate(which, delta), 500)
    }

    return {
      OfButton,
      timeSelector,
      dateSelector,

      selMonthStart,
      useButtons: props.withTime,

      selectDate,
      selectToday: () => selectDate(new Date()),
      checkSelected: computed(() => props.isSelected || isSelected),
      checkFocused: computed(() => isFocused),
      nextMonth,
      prevMonth,
      editYear,
      yearInputHandler,
      timeClickHandler,
      focusYearInput,
      updateTime,
      onAccept: () => props.accept?.(selDate.value),
      onCancel: () => props.accept?.(),
      onDateKeydown,
      onTimeKeydown,
      onTimeKeyup,

      title: computed(() => titleFormater?.format(selDate.value).textValue),
      monthYear: computed(() => {
        const date = new Date(selMonthStart.value.getTime())
        return monthYearFormater?.format(date).textValue
      }),
      hours: computed(() => getFormattedPart('hour', '00')),
      minutes: computed(() => getFormattedPart('minute', '00')),
      selDate,
      focusedDate,
      editingYear,

      cells: computed(() => {
        const gridData = monthGrid(
          selMonthStart.value,
          weekStartDayLocale.value
        )
        return gridData.grid.reduce((items, value) => {
          items.push(...value)
          return items
        }, [])
      }),

      mounted: (vnode: VNode) => {
        theNode = vnode
      },
      unmounted: () => {
        theNode = null
      }
    }
  }
})
</script>

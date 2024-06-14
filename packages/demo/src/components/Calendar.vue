<template>
  <div class="container">
    <h1>Calendar</h1>

    <of-overlay
      :active="detailsVisible"
      :target="detailsTarget"
      :capture="false"
      :shade="false"
      :focus="false"
      @blur="hidePopup"
    >
      <div
        class="state-special"
        :style="{
          width: '200px',
          height: '60px',
          background: 'var(--color-bg-event)',
          color: 'var(--color-event)',
          border: 'solid 1px var(--color-border-event)',
          'border-radius': '10px'
        }"
      >
        {{ detailsEvent.name }}
      </div>
    </of-overlay>

    <div class="of-group">
      <div class="of-group-row of--pad">
        <of-select-field
          :items="types"
          :record="state"
          name="type"
        ></of-select-field>
        <of-select-field
          :items="['columns', 'stack']"
          :record="state"
          name="layout"
        ></of-select-field>
      </div>
      <div class="of-group-row of--pad">
        <of-toggle-field name="useSlots" label="Use slots" :record="state" />
        <of-toggle-field
          name="hideOtherMonths"
          label="Hide adjacent months"
          :record="state"
        />
        <of-toggle-field
          name="customColors"
          label="Custom colors"
          :record="state"
        />
        <of-toggle-field
          name="limitHours"
          label="Limit hours"
          :record="state"
        />
        <of-toggle-field
          v-if="state.value.type == 'day' || state.value.type == 'week'"
          name="groupAllDayEvents"
          label="Group all day events"
          :record="state"
        />
      </div>
      <div class="of-group-row of--pad">
        <of-button rounded icon="refresh" @click="regenerateEvents"
          >Regenerate events</of-button
        >
      </div>
    </div>
    <br />
    <of-calendar
      fixed-row-height
      selectable
      @click:event="eventClicked"
      @click:day="dayClicked"
      @click:more="dayClicked"
      @click:category="categoryClicked"
      @click:week="weekClicked"
      @blur:day="hidePopup"
      :type="values.type"
      :day="values.day"
      num-days="3"
      events-limit="3"
      :events="events"
      :layout="values.layout"
      :categories="categories"
      :event-color="values.customColors ? eventColor : null"
      :hide-other-months="values.hideOtherMonths"
      :day-start="values.limitHours ? 8 : 0"
      :day-end="values.limitHours ? 18 : 24"
      :group-all-day-events="values.groupAllDayEvents"
      group-postfix="(s)"
    >
      <template #header v-if="values.useSlots">
        <h3>Additional controls can go here</h3>
      </template>
      <template #footer v-if="values.useSlots">
        <h3>Additional information can go here</h3>
      </template>
      <template #all-day-label v-if="values.useSlots">
        <span class="all-day-label">all-day</span>
      </template>
      <template #day-title="date" v-if="values.useSlots">
        {{ date.getDate() }}
      </template>
      <template #more="count" v-if="values.useSlots">
        {{ count }} more events
      </template>
      <template #week-number="number" v-if="values.useSlots">
        W{{ number }}
      </template>
      <template #category-title="category" v-if="values.useSlots">
        <div style="width: 100%">
          <div
            :style="{
              display: 'flex',
              'align-items': 'center',
              'background-color':
                category === values.selectedCategory ? '#eee' : 'inherit',
              width: '100%',
              'justify-content': 'center'
            }"
          >
            <of-icon name="user" /><i>{{ category }} </i>
          </div>
        </div>
      </template>
      <template
        #event-content="{ formattedRange, event, brk }"
        v-if="values.useSlots"
      >
        <of-icon name="phone" size="inherit" />
        <b
          ><i>
            {{ event.name }}
          </i></b
        >
        <br v-if="brk" />
        {{ formattedRange }}
      </template>
      <template #allday-event-content="{ event }" v-if="values.useSlots">
        <of-icon name="phone" size="inherit" />
        <b>
          <i>{{ event.name }}</i>
        </b>
      </template>
    </of-calendar>
  </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue'
import {
  CalendarEvent,
  InternalEvent,
  makeRecord,
  addDays,
  addMinutes
} from 'oceanfront'

const types = [
  { value: 'day', text: 'Day' },
  { value: 'week', text: 'Week' },
  { value: 'category', text: 'Category' },
  { value: 'ndays', text: 'N Days' },
  { value: 'month', text: 'Month' },
  { value: 'year', text: 'Year' }
]

function eventColor(e: InternalEvent) {
  const str = e.name ?? ''
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0)

  return 'hsl(' + (hash % 360) + ', 30%, 40%)'
}

const state = makeRecord({
  useSlots: false,
  limitHours: false,
  type: 'year',
  layout: 'columns',
  groupAllDayEvents: false
})

const categories = ['Project task', 'Event', 'Absence', 'Holiday']

const names = ['Meeting', 'Discussion', 'Lunch']

const classes = [
  'state-danger',
  'state-ignore',
  'state-special',
  'state-primary'
]

function randomElement<T>(list: T[]): T {
  const idx = Math.floor(Math.random() * list.length)
  return list[idx]
}

let events: Ref<CalendarEvent[]> = ref([])

function expand(n: number, digits: number): string {
  let str = `${n}`
  for (; str.length < digits; str = `0${str}`) {}
  return str
}

function formatDate(d: Date) {
  return (
    expand(d.getUTCFullYear(), 4) +
    '-' +
    expand(d.getUTCMonth() + 1, 2) +
    '-' +
    expand(d.getUTCDate(), 2) +
    ' ' +
    expand(d.getUTCHours(), 2) +
    ':' +
    expand(d.getUTCMinutes(), 2) +
    ':' +
    expand(d.getUTCSeconds(), 2)
  )
}

function regenerateEvents() {
  let number = 1
  const now = new Date()
  const list: CalendarEvent[] = []
  for (let i = -31; i < 31; i++) {
    const nEvents = 2 + Math.random() * 3
    const theDate = addDays(now, i)
    theDate.setHours(0)
    theDate.setMinutes(0)
    for (let idx = 0; idx < nEvents; idx++) {
      const start = addMinutes(theDate, Math.floor(Math.random() * 28) * 15)
      const duration =
        30 +
        15 * Math.floor(Math.random() * 24 + (Math.random() > 0.95 ? 96 : 0))
      const event: CalendarEvent = {
        name: randomElement(names) + ' ' + number++,
        start: formatDate(start),
        duration,
        class: randomElement(classes),
        allDay: Math.random() > 0.7,
        category: randomElement(categories)
      }
      list.push(event)
    }
  }
  events.value = list
}

regenerateEvents()

export default defineComponent({
  setup() {
    const detailsTarget: Ref<any> = ref(null)
    const detailsVisible = ref(false)
    const detailsEvent: Ref<any> = ref({})
    const _xx = state.value
    return {
      events: ref(events),
      eventColor,
      state,
      values: state.value,
      types,
      regenerateEvents: () => {
        detailsVisible.value = false
        regenerateEvents()
      },
      categories,
      detailsVisible,
      detailsTarget,
      detailsEvent,
      eventClicked: (nativeEvent: any, event: InternalEvent) => {
        detailsTarget.value = nativeEvent.target
        detailsEvent.value = event
        detailsVisible.value = true
      },
      weekClicked: (nativeEvent: any, weekNumber: number, firstDay: Date) => {
        state.value = { ...state.value, type: 'week', day: firstDay }
      },
      dayClicked: (nativeEvent: any, day: Date) => {
        state.value = { ...state.value, type: 'day', day: day }
      },
      categoryClicked: (nativeEvent: any, category: string) => {
        state.value = { ...state.value, selectedCategory: category }
      },
      hidePopup: () => {
        detailsVisible.value = false
      }
    }
  }
})
</script>

<style>
.of-calendar-event {
  font-size: 70%;
}
.of-calendar-event .of-icon {
  margin-right: 1px;
}
.all-day-label {
  font-size: 70%;
}
</style>

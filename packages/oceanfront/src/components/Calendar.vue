<template>
  <div class="container">
    <p>
      <of-button @click="changeLayout"
        >Switch to {{ switchTo }} layout</of-button
      >
    </p>
    <div style="position: relative; width: 400px; height: 960px">
      <div
        v-for="(p, index) in placements"
        :key="index"
        :style="{
          'z-index': p.zIndex,
          'background-color': p.event.color,
          border: 'solid 1px #000',
          'border-radius': '4px',
          position: 'absolute',
          left: p.left * 100 + '%',
          width: p.width * 100 + '%',
          top: (p.top / 960) * 100 + '%',
          height: (p.height / 960) * 100 + '%',
        }"
      >
        {{ p.event.name }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue'
import {
  getGroups,
  getDayIdentifier,
  toTimestamp,
  getTimeIdentifier,
  getTimestampIdintifier,
  CalendarEventPlacement,
  InternalEvent,
  Timestamp,
} from '../lib/calendar'

import stackLayout from '../lib/calendar/layout/stack'
import columnsLayout from '../lib/calendar/layout/columns'

function eventColor(colIdx: number) {
  const color = 'hsl(' + ((colIdx * 31) % 360) + ', 100%, 50%)'
  return color
}

function mockData(): InternalEvent[] {
  const nowTS = toTimestamp(new Date())
  const times = [
    [0, 15, 5, 45],
    [1, 15, 5, 15],
    [1, 15, 3, 45],
    [4, 0, 4, 30],
    [2, 30, 6, 45],
    [1, 15, 3, 30],
    [7, 0, 7, 45],
    [4, 30, 7, 45],
    [9, 15, 10, 0],
  ]
  return times.map((t, idx) => {
    const [sh, sm, eh, em] = t
    const sts: Timestamp = {
      ...nowTS,
      hours: sh,
      minutes: sm,
    }
    const ets: Timestamp = {
      ...nowTS,
      hours: eh,
      minutes: em,
    }
    return {
      name: 'Event ' + idx,
      color: eventColor(idx),
      startDay: getDayIdentifier(sts),
      startTime: getTimeIdentifier(sts),
      start: getTimestampIdintifier(sts),
      endDay: getDayIdentifier(ets),
      endTime: getTimeIdentifier(ets),
      end: getTimestampIdintifier(ets),
      startTS: sts,
      endTS: ets,
      uniq: '',
      orig: null,
    }
  })
}

export default defineComponent({
  name: 'OfCalendar',
  setup() {
    const layout = ref(stackLayout)
    const switchTo = ref('columns')
    const events = mockData()
    const nowTS = toTimestamp(new Date())

    const changeLayout = () => {
      switchTo.value = layout.value === stackLayout ? 'stack' : 'columns'
      layout.value = layout.value === stackLayout ? columnsLayout : stackLayout
    }

    const placements = computed(() => {
      const groups = getGroups(
        events,
        getDayIdentifier(nowTS),
        false,
        undefined,
        layout.value,
        0,
        [8, 17]
      )
      const placements: CalendarEventPlacement[] = []
      for (const g of groups) {
        placements.push(...g.placements)
      }
      return placements
    })

    return { placements, changeLayout, switchTo }
  },
})
</script>

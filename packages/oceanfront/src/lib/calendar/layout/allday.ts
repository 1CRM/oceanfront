import {
  daysInEvent,
  CalendarAlldayEventPlacement,
  InternalEvent,
  Timestamp,
} from '..'

export type BusyInfo = {
  currentColumn: number
  busyColumns: number[]
}

export const layoutAllday = (
  events: InternalEvent[],
  interval: Timestamp[],
  busy: BusyInfo
): CalendarAlldayEventPlacement[] => {
  const currentColumn = busy.currentColumn
  busy.currentColumn++
  return events.map((e) => {
    const nDays = daysInEvent(e, interval)
    const numRows = busy.busyColumns.length
    let freeRow = busy.busyColumns.findIndex(
      (busyCol) => currentColumn >= busyCol
    )
    if (!~freeRow) {
      freeRow = numRows
      busy.busyColumns.push(currentColumn + nDays)
    } else {
      busy.busyColumns[freeRow] = currentColumn + nDays
    }
    return {
      event: e,
      daysSpan: nDays,
      top: freeRow,
    }
  })
}

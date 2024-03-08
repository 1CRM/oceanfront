import { hasOverlap, CalendarEventsGroup, Column } from '..'

export default function layout(
  group: CalendarEventsGroup,
  _overlapThreshold: number
): void {
  const columns: Column[] = []
  for (const p of group.placements) {
    let added = false
    for (const c of columns) {
      let overlapping = false
      for (const other of c.placements) {
        if (hasOverlap(p.start, p.end, other.start, other.end)) {
          overlapping = true
          break
        }
      }
      if (!overlapping) {
        c.placements.push(p)
        added = true
        break
      }
    }
    if (!added) {
      columns.push({
        placements: [p],
        offset: 0,
        end: 0
      })
    }
  }
  columns.forEach((c, cIdx) => {
    for (const p of c.placements) {
      p.columns = 1
      itColumns: for (const c2 of columns.slice(cIdx + 1)) {
        for (const p2 of c2.placements) {
          if (hasOverlap(p.start, p.end, p2.start, p2.end)) {
            break itColumns
          }
        }
        p.columns++
      }
    }
  })
  const colWidth = 1.0 / columns.length
  let left = 0
  for (const c of columns) {
    for (const p of c.placements) {
      p.left = left
      p.width = colWidth * p.columns
    }
    left += colWidth
  }
}

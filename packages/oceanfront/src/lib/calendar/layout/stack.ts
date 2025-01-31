import { hasOverlap, CalendarEventsGroup, Column } from '..'

export default function layout(
  group: CalendarEventsGroup,
  overlapThreshold: number
): void {
  const columns: Column[] = []
  let lastEnd: number | undefined
  for (const p of group.placements) {
    let added = false
    let cIdx = -1
    for (const c of columns) {
      cIdx++
      let overlapping = false
      for (const other of c.placements) {
        if (hasOverlap(p.start, p.end, other.start, other.end)) {
          if (other.end - p.start >= -overlapThreshold) {
            overlapping = true
            break
          }
        }
      }
      if (!overlapping) {
        if (p.start <= c.end) {
          if (lastEnd && p.start < lastEnd) {
            c.offset++
          }
          p.offset = c.offset
        } else {
          c.offset = 0
        }
        lastEnd = p.end
        p.zIndex = cIdx
        c.placements.push(p)
        c.end = Math.max(c.end, p.end)
        added = true
        break
      }
    }
    if (!added) {
      p.zIndex = columns.length
      lastEnd = p.end
      columns.push({
        placements: [p],
        offset: 0,
        end: lastEnd
      })
    }
  }

  columns.forEach((c, cIdx) => {
    for (const p of c.placements) {
      p.columns = 1
      itColumns: for (const c2 of columns.slice(cIdx + 1)) {
        for (const p2 of c2.placements) {
          if (hasOverlap(p.start, p.end, p2.start, p2.end)) {
            if (Math.abs(p.start - p2.start) < overlapThreshold) {
              break itColumns
            }
          }
        }
        p.columns++
      }
    }
  })

  columns.forEach((c, cIdx) => {
    if (cIdx == 0) return
    for (const p of c.placements) {
      let minAdjust = 1000000

      columns: for (let adjustDelta = 1; adjustDelta <= cIdx; adjustDelta++) {
        let columnMinAdjust = minAdjust
        for (const p2 of columns[cIdx - adjustDelta].placements) {
          if (hasOverlap(p.start, p.end, p2.start, p2.end)) {
            if (p.start - p2.start < overlapThreshold) {
              if (p2.columnAdjust < 1) {
                minAdjust = Math.min(
                  minAdjust,
                  p2.columnAdjust - p2.columnAdjust + adjustDelta - 2
                )
                break columns
              } else {
                columnMinAdjust = Math.min(
                  columnMinAdjust,
                  p2.columnAdjust + adjustDelta - 2
                )
              }
            } else {
              columnMinAdjust = Math.min(
                columnMinAdjust,
                p2.columnAdjust + adjustDelta - 1
              )
            }
          }
        }
        minAdjust = Math.min(minAdjust, columnMinAdjust)
      }
      if (minAdjust < 1000000) {
        p.offset += minAdjust + 1
        p.columnAdjust = minAdjust + 1
      }
    }
  })

  const colWidth = 1.0 / columns.length
  let left = 0
  let i = 0
  for (const c of columns) {
    for (const p of c.placements) {
      const offset = 0.05 * p.offset
      const nColumns = p.columns + p.columnAdjust
      p.left = left - p.columnAdjust * colWidth + offset
      p.width = colWidth * nColumns - offset
      p.columnNum = i
    }
    left += colWidth
    i++
  }
}

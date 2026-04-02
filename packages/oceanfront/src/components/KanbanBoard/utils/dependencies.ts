import type { KanbanCardId } from '../types'

// High-contrast palette to reduce “similar stripe” confusion on boards.
export const defaultDependenciesPalette = [
  '#4363d8', // blue
  '#e6194b', // red
  '#3cb44b', // green
  '#f58231', // orange
  '#911eb4', // purple
  '#ffe119', // yellow
  '#46f0f0', // cyan
  '#f032e6', // magenta
  '#008080', // teal
  '#bcf60c', // lime
  '#9a6324', // brown
  '#000075' // navy
]

export const toDependencyKey = (id: KanbanCardId) =>
  `${typeof id}:${String(id)}`

export const hashString = (value: string) => {
  // djb2
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return hash >>> 0
}

export const generateHslColor = (seed: number) => {
  // Golden-angle steps for good distribution.
  const hue = (seed * 137.508) % 360
  return `hsl(${hue.toFixed(1)} 75% 55%)`
}

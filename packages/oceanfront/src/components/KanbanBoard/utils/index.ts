export const getInitials = (name: string) => {
  return (
    name.includes(' ')
      ? name
          .split(' ')
          .map((word) => word[0])
          .join('')
      : name.slice(0, 2)
  ).toUpperCase()
}

export const isOverTheLimit = (
  currentCount: number,
  limit: number | undefined,
  sourceColumnId: string,
  targetColumnId: string
) => {
  if (typeof limit === 'undefined') return false
  return currentCount >= limit && sourceColumnId !== targetColumnId
}

export const getDragData = (event: DragEvent) => {
  try {
    return JSON.parse(event.dataTransfer?.getData('text/plain') || '{}')
  } catch {
    return null
  }
}

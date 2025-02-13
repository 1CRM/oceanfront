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

export const getDragData = (event: DragEvent | CustomEvent) => {
  try {
    // Handle CustomEvent
    if ('detail' in event && event.detail?.dragData) {
      return JSON.parse(event.detail.dragData)
    }
    // Handle DragEvent
    if ('dataTransfer' in event && event.dataTransfer) {
      return JSON.parse(event.dataTransfer.getData('text/plain') || '{}')
    }
    return null
  } catch {
    return null
  }
}

export const calculateDropPosition = (
  container: HTMLElement,
  mouseY: number,
  draggingCard?: HTMLElement
) => {
  const containerRect = container.getBoundingClientRect()
  const scrollTop = container.scrollTop || 0

  // Get all cards
  const cards = Array.from(
    container.querySelectorAll('.of-kanban-card')
  ) as HTMLElement[]

  // If mouse is near the top of the container
  if (mouseY < 24) {
    return 12
  }

  // If no cards or only the dragged card, position at the top
  if (
    cards.length === 0 ||
    (draggingCard && cards.length === 1 && cards[0] === draggingCard)
  ) {
    return 12
  }

  // Find the card we're hovering over
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    if (draggingCard && card === draggingCard) continue

    const cardRect = card.getBoundingClientRect()
    const cardTop = cardRect.top - containerRect.top + scrollTop
    const cardBottom = cardTop + cardRect.height
    const cardMiddle = cardTop + cardRect.height / 2

    if (mouseY < cardMiddle) {
      // Position above current card
      return cardTop
    }

    // If this is the last valid card and we're below its middle
    if (i === cards.length - 1) {
      return cardBottom + 12
    }
  }

  return 12 // Default position at top
}

const findNearestCard = (
  cards: HTMLElement[],
  draggingCard: HTMLElement,
  container: HTMLElement,
  dropPosition: number
) => {
  const containerRect = container.getBoundingClientRect()
  const scrollTop = container.scrollTop

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    if (card === draggingCard) continue

    const cardRect = card.getBoundingClientRect()
    const cardTop = cardRect.top - containerRect.top + scrollTop
    const cardBottom = cardTop + cardRect.height

    if (Math.abs(cardTop - dropPosition) < 10) {
      return { nearCard: cards[i - 1] ?? null, currIndex: i }
    } else if (Math.abs(cardBottom - (dropPosition - 12)) < 10) {
      return { nearCard: card, currIndex: i }
    }
  }

  return { nearCard: null, currIndex: 0 }
}

export const calculateNewOrder = (
  container: HTMLElement,
  mouseY: number,
  data: any,
  dropPosition: number,
  targetColumnId: string
) => {
  const cards = Array.from(
    container.querySelectorAll('.of-kanban-card')
  ) as HTMLElement[]
  const draggingCard = container.querySelector(
    '.of-kanban-card.of--is-dragging'
  ) as HTMLElement

  // Handle empty or dragging-only cases
  if (cards.length === 0 || (cards.length === 1 && cards[0] === draggingCard)) {
    return 0
  }

  // Handle top of container drop
  if (mouseY < 44) {
    return 0
  }

  const draggingCardOrder = parseFloat(
    draggingCard?.getAttribute('data-order') ?? '0'
  )
  const isDraggingCardInThisColumn = data.sourceColumnId === targetColumnId

  // Find nearest card and calculate order
  const { nearCard, currIndex } = findNearestCard(
    cards,
    draggingCard,
    container,
    dropPosition
  )

  if (nearCard) {
    const nearOrder = parseFloat(
      nearCard.getAttribute('data-order') ?? String(currIndex)
    )
    const increasingOrder = draggingCardOrder < nearOrder
    return increasingOrder && isDraggingCardInThisColumn
      ? nearOrder
      : nearOrder + 1
  }

  return 0
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => fn.apply(this, args), delay)
  }
}

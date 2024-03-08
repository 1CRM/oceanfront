export interface DragEventOptions {
  drag?: (event: Event) => void
  start?: (event: Event) => void
  end?: (event: Event) => void
}

export const triggerDragEvent = (
  element: HTMLElement,
  options: DragEventOptions
): void => {
  let isDragging = false

  const moveFn = function (event: Event) {
    options.drag?.(event)
  }

  const upFn = (event: Event) => {
    document.removeEventListener('mousemove', moveFn)
    document.removeEventListener('mouseup', upFn)
    document.onselectstart = null
    document.ondragstart = null

    isDragging = false

    options.end?.(event)
  }

  element.addEventListener('mousedown', (event) => {
    if (isDragging) return
    document.onselectstart = () => false
    document.ondragstart = () => false
    document.addEventListener('mousemove', moveFn)
    document.addEventListener('mouseup', upFn)
    isDragging = true
    options.start?.(event)
  })
}

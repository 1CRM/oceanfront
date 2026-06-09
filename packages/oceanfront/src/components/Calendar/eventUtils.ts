/**
 * On hover, calendar events expand with min-width: fit-content. By default they
 * expand to the right. If the expanded element would overflow the viewport's
 * right edge, we shift it left just enough to stay fully visible.
 *
 * The CSS `:hover` rule applies `transform: translateX(var(--of-event-hover-shift, 0px))`.
 * These helpers set/clear that custom property on the element directly.
 */

export function adjustCalendarEventHoverPosition(el: HTMLElement): void {
  // getBoundingClientRect() forces a synchronous style recalculation, so at
  // this point the browser has already applied the :hover styles (including
  // min-width: fit-content) and we get the fully expanded rect.
  const rect = el.getBoundingClientRect()
  const overflow = rect.right - window.innerWidth + 10
  if (overflow > 0) {
    el.style.setProperty('--of-event-hover-shift', `-${overflow}px`)
  }
}

export function resetCalendarEventHoverPosition(el: HTMLElement): void {
  el.style.removeProperty('--of-event-hover-shift')
}

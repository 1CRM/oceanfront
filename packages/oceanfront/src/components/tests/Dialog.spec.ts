import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { OfIcon } from '../Icon'
import { OfOverlay } from '../Overlay'
import OfDialog from '../Dialog.vue'

let wrapper: VueWrapper<any> | undefined

const mountDialog = (props: Record<string, unknown> = {}) => {
  wrapper = mount(OfDialog, {
    attachTo: document.body,
    props: { modelValue: true, ...props },
    slots: { default: '<button class="inner">inner</button>' },
    global: { components: { OfIcon, OfOverlay } }
  })
  return wrapper
}

/** The dialog and the overlay both defer their initial focus by a few frames. */
const settle = async () => {
  await nextTick()
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await nextTick()
}

const dialogElement = () =>
  document.querySelector('[role="dialog"]') as HTMLElement

const pressTab = () =>
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
  )

const focusOutside = () => {
  const outside = document.createElement('button')
  document.body.appendChild(outside)
  outside.focus()
  return outside
}

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('OfDialog', () => {
  // Capture is the switch for "the page behind stays usable": trap, aria-modal,
  // and overlay dismiss-on-blur all follow it. Shade is independent.
  it.each([true, false])(
    'traps and dismisses only while capturing (%s)',
    (capture) => {
      const overlay = mountDialog({ capture }).findComponent(OfOverlay)

      for (const prop of [
        'capture',
        'blurOnBackdropClick',
        'blurOnFocusOut'
      ] as const)
        expect(overlay.props(prop)).toBe(capture)
      expect(overlay.props('shade')).toBe(true)
      expect(dialogElement().getAttribute('aria-modal')).toBe(String(capture))
    }
  )

  it('can drop the shade while still capturing', () => {
    const overlay = mountDialog({ shade: false }).findComponent(OfOverlay)

    expect(overlay.props('shade')).toBe(false)
    expect(overlay.props('capture')).toBe(true)
  })

  it('keeps a capturing dialog from losing focus on tab', async () => {
    mountDialog()
    await settle()

    focusOutside()
    pressTab()

    expect(dialogElement().contains(document.activeElement)).toBe(true)
  })

  it('lets focus tab away when capture is off', async () => {
    mountDialog({ capture: false })
    await settle()

    const outside = focusOutside()
    pressTab()

    expect(document.activeElement).toBe(outside)
  })
})

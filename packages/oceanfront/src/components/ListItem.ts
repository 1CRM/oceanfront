import {
  computed,
  defineComponent,
  h,
  PropType,
  reactive,
  ref,
  watch,
} from 'vue'
import { useNavGroup } from '../lib/nav'
import { Link, LinkTo, OfLink } from './Link'
import { OfIcon } from './Icon'
import { OfField } from './Field'

export const OfListItem = defineComponent({
  name: 'OfListItem',
  props: {
    active: { type: [Boolean, String], default: null },
    disabled: { type: [Boolean, String], default: null },
    class: { type: String, default: null },
    expand: { type: [Boolean, String], default: null },
    href: { type: String, default: null },
    to: [String, Object] as PropType<LinkTo>,
    attrs: { type: Object },
    field: { type: Object, default: null },
  },
  emits: {
    mousedown: null,
    keydown: null,
    blur: null,
    focus: null,
  },
  setup(props, ctx) {
    const navGroup = useNavGroup()
    const elt = ref<HTMLElement>()
    const expand = computed(() => props.expand)
    const field = computed(() => props.field)
    const isCurrent = ref(!!props.active)
    const isFocused = ref(false)
    if (navGroup) {
      navGroup.register(
        reactive({
          isCurrent,
          isDisabled: computed(() => !!props.disabled),
          elt,
          isFocused,
          focus: () => {
            elt.value?.focus?.()
          },
        }),
      )
    }
    const handlers = {
      onFocus() {
        isFocused.value = true
        ctx.emit('focus')
      },
      onBlur() {
        isFocused.value = false
        ctx.emit('blur')
      },
    }
    watch(
      () => props.active,
      (active) => {
        isCurrent.value = !!active
      },
    )

    watch(
      () => props.attrs?.isFocused,
      (focused) => {
        if (focused === true) {
          isFocused.value = true
          elt.value?.focus()
        }
      },
    )

    const content = () => {
      const result = [
        h('div', { class: 'of-list-item-content' }, [
          ctx.slots.default?.(),
          field.value ? h(OfField, field.value) : null,
        ]),
      ]
      if (expand.value !== null) {
        result.push(
          h(OfIcon, {
            name: expand.value ? 'expand up' : 'expand down',
          }),
        )
      }
      return result
    }

    return () => {
      const disabled = props.disabled
      return h(
        OfLink as any,
        {
          href: disabled ? null : props.href,
          to: disabled ? null : props.to,
        },
        {
          custom: (link: Link) => {
            const active =
              props.active ??
              (link.href ? link.isExactActive : navGroup && isCurrent.value)
            const href = link.href
            const activate = (evt: Event) => {
              if (link.href) {
                link.navigate(evt)
              }
              return evt.defaultPrevented
            }
            return h(
              href ? 'a' : 'div',
              {
                class: {
                  'of-list-item': true,
                  'of--active': active,
                  'of--hover': props.attrs?.isFocused === true,
                  'of--disabled': props.disabled,
                  'of--expandable': expand.value !== null,
                  'of--expanded': expand.value,
                  'of--focused': isFocused.value,
                  'of--link': !!href,
                  [props.class]: true,
                },
                href: link.href,
                ref: elt,
                tabIndex: 0,
                onMousedown(evt: MouseEvent) {
                  if (evt.button != null && evt.button !== 0) return
                  ctx.emit('mousedown', evt)
                  activate(evt)
                  return false
                },
                onKeydown(evt: KeyboardEvent) {
                  if (evt.key === ' ' || evt.key === 'Enter') {
                    ctx.emit('keydown', evt)
                    evt.preventDefault()
                    if (activate(evt)) return
                  }
                  navGroup?.navigate(evt)
                },
                ...handlers,
                ...props.attrs,
              },
              h('div', { class: 'of-list-item-inner' }, [
                h('div', { class: 'of--layer of--layer-bg' }),
                h('div', { class: 'of--layer of--layer-brd' }),
                content(),
              ]),
            )
          },
        },
      )
    }
  },
})

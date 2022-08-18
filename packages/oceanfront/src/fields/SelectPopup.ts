import { computed, defineComponent, h, PropType, ref } from 'vue'
import { OfButton } from '../components/Button'
import OfOptionList from '../components/OptionList.vue'
import { ItemList } from '../lib/items'
import { useLanguage } from '../lib/language'

export const OfSelectPopup = defineComponent({
  name: 'OfSelectPopup',
  props: {
    name: String,
    items: {
      type: Object as PropType<ItemList>,
      required: true,
    },
    multi: Boolean,
    addRemove: Boolean,
    closePopup: Function,
    value: [String, Array],
    class: [String, Array, Object],
  },
  emits: ['updateValue'],
  setup(props, ctx) {
    const lang = useLanguage()

    const removing = ref(false)

    const isSelected = (item: any): boolean => {
      if (!props.multi) return props.value === item
      const values = Array.isArray(props.value) ? props.value : []
      return !!~values.indexOf(item)
    }

    const toggleMode = () => {
      removing.value = !removing.value
    }

    const toggleValue = (val: any): any => {
      if (!props.multi) return val
      if (!Array.isArray(props.value)) {
        return [val]
      }
      let found = false
      const filtered = props.value.filter((item) => {
        if (item === val) {
          found = true
          return false
        }
        return true
      })
      if (!found) {
        filtered.push(val)
      }
      return filtered
    }

    const addRemoveButtons = () => {
      if (!props.addRemove) return undefined
      return h(
        'div',
        {
          style:
            'padding: 4px; display: flex; flex-direction: column; align-items: center',
        },
        h('div', { class: 'of-buttonset' }, [
          h(
            OfButton,
            {
              variant: 'outlined',
              active: !removing.value,
              onClick: toggleMode,
            },
            () => lang.value.selectFieldAddItems
          ),
          h(
            OfButton,
            {
              variant: 'outlined',
              active: removing.value,
              onClick: toggleMode,
            },
            () => lang.value.selectFieldRemoveItems
          ),
        ])
      )
    }

    const formatItems = computed(() => {
      const resolved = props.items
      const rows = []
      for (const item of resolved.items) {
        if (typeof item === 'string') {
          rows.push({
            disabled: false,
            text: item,
            selected: isSelected(item),
            value: item,
          })
        } else if (typeof item === 'object') {
          rows.push({
            disabled: resolved.disabledKey && item[resolved.disabledKey],
            text: resolved.textKey && item[resolved.textKey],
            selectedText:
              resolved.selectedTextKey && item[resolved.selectedTextKey],
            value: resolved.valueKey && item[resolved.valueKey],
            selected: resolved.valueKey && isSelected(item[resolved.valueKey]),
            special: resolved.specialKey && item[resolved.specialKey],
            icon: (resolved.iconKey && item[resolved.iconKey]) ?? '',
          })
        }
      }
      return rows
    })

    const filteredItems = computed(() => {
      if (!props.multi || !props.addRemove) return formatItems.value
      const values = Array.isArray(props.value) ? props.value : []
      const removingItems = removing.value
      return formatItems.value.filter((item) => {
        return item.special || removingItems == !!~values.indexOf(item.value)
      })
    })

    const setValue = (
      val: any,
      _item?: any,
      ev?: MouseEvent | KeyboardEvent
    ) => {
      ev?.stopPropagation()
      ev?.preventDefault()
      const newValue = toggleValue(val)
      ctx.emit('updateValue', newValue)
      if (!props.multi || !ev?.shiftKey) {
        removing.value = false
        props.closePopup?.(true)
      }
    }

    return () => {
      return h(
        OfOptionList,
        {
          items: filteredItems.value,
          class: props.class,
          onClick: setValue,
          addSearch: true,
        },
        { header: () => addRemoveButtons() }
      )
    }
  },
})

<template>
  <div
    class="of-tabs"
    ref="tabs"
    :class="{
      'of--with-border': withBorder,
      [`of--density-${normalizedDensity}`]: true,
      'top-tabs': topTabs
    }"
    :style="offsetStyle"
  >
    <div :class="cls">
      <div
        :class="{
          'of-tabs-navigation-header': true,
          'of-tabs-navigation-header-show-next-navigation':
            ofTabsNavigationHeaderShowNextNavigation,
          'of-tabs-navigation-header-show-previous-navigation':
            ofTabsNavigationHeaderShowPreviousNavigation,
          'of-tabs-navigation-header-has-navigation': showNavigation
        }"
      >
        <div
          v-if="showNavigation"
          class="of-tabs-navigation of-tabs-navigation-prev"
          @click="navigateHeader('prev')"
        >
          <of-icon name="page previous" :title="'Previous tab'" scale="input" />
        </div>
        <div class="of-tabs-header" ref="ofTabsHeader" role="tablist">
          <template :key="tab.key" v-for="(tab, idx) in tabsList">
            <div class="overflow-separator" v-if="tab.overflowButton" />
            <div
              @pointerup="(e) => tab.disabled || handleSelectTab(e, tab.key)"
              @mouseover="
                tab.disabled || onMouseoverTab(tab.key, $event.target)
              "
              @mouseleave="tab.disabled || subMenuLeave(tab.key)"
              @focus="onFocusTab(tab.key)"
              @blur="onBlurTab(tab.key)"
              @keydown="navigate($event)"
              :ref="(el) => (tabsRefs[idx] = el)"
              tabindex="0"
              :class="[
                {
                  'is-active': selectedTabKey === tab.key && showActiveTab,
                  'is-disabled': tab.disabled,
                  'of--focused':
                    (showActiveTab && focusedTabKey === tab.key) ||
                    openedMenuTabKey === tab.key ||
                    (tab.key == -1 && outsideTabsOpened),
                  'of-tab-header-item': true,
                  'overflow-button': tab.overflowButton,
                  'of--rounded': rounded,
                  'of--with-border': withBorder
                },
                tab.params?.className
              ]"
              role="tab"
              :aria-label="tab.ariaLabel"
              :aria-haspopup="showSubMenu"
              :aria-selected="selectedTabKey === tab.key"
            >
              <div class="of--layer of--layer-bg" />
              <div class="of--layer of--layer-brd" />
              <div class="of--layer of--layer-outl" />
              <div class="of-tab-text">
                <of-icon v-if="tab.icon" :name="tab.icon" scale="1.1em" />
                <span>{{ tab.text }}</span>
              </div>
              <div class="of--layer of--layer-state" />
            </div>
          </template>
          <div class="of-tabs-line" ref="tabLine"></div>
        </div>
        <div
          v-if="showNavigation"
          class="of-tabs-navigation of-tabs-navigation-next"
          @click="navigateHeader('next')"
        >
          <of-icon name="page next" :title="'Next tab'" scale="input" />
        </div>
      </div>
      <of-overlay
        :active="subMenuActive"
        :focus="false"
        :capture="false"
        :shade="false"
        :target="subMenuOuter"
      >
        <slot name="sub-menu" v-if="showSubMenu">
          <of-option-list
            @mouseenter="subMenuClearTimeout()"
            @mouseleave="subMenuLeave()"
            @click="selectSubMenuTab"
            @blur="onBlurList"
            :class="[{ 'top-tabs-menu': topTabs }, overlayClassname]"
            class="of--elevated-1"
            :style="overlayStyle"
            :items="subMenuTabsList"
            :focus="optionListFocused"
          >
            <template #option-icon="item"
              ><slot name="submenu-option-icon" v-bind="item"
            /></template>
          </of-option-list>
        </slot>
      </of-overlay>
    </div>

    <of-overlay
      :active="outsideTabsOpened"
      :focus="false"
      :shade="false"
      :capture="false"
      :target="overflowButtonEl"
      @blur="closeOverflowPopup"
    >
      <of-option-list
        class="of--elevated-1"
        :items="invisibleTabsList"
        :focus="optionListFocused"
        @mouseenter="subMenuClearTimeout()"
        @mouseleave="subMenuLeave(-1)"
        @click="selectInvisibleTab"
        @blur="onBlurList"
      />
    </of-overlay>
  </div>
</template>

<script lang="ts">
import {
  ref,
  Ref,
  defineComponent,
  onMounted,
  onBeforeMount,
  PropType,
  computed,
  nextTick,
  watch,
  onBeforeUnmount
} from 'vue'
import { watchPosition } from '../lib/util'
import { ItemsProp, useItems } from '../lib/items'
import { Tab } from '../lib/tab'
import { useThemeOptions } from '../lib/theme'
import { OfOverlay } from './Overlay'
import OfOptionList from './OptionList.vue'

const elementWidth = (el?: HTMLElement): number => {
  let w = el?.offsetWidth ?? 0
  if (el instanceof HTMLElement) {
    const style = window.getComputedStyle(el, null)
    w += parseFloat(style.marginLeft)
    w += parseFloat(style.marginRight)
  }
  return w
}

const formatItems = (
  list: any,
  params: any,
  visible = true,
  addOverflowButton: Boolean = false
): Array<Tab> => {
  const rows = []

  for (const item of list) {
    let text = ''
    let subMenu = undefined
    text = item[params.textKey] ? item[params.textKey] : ''

    if (text === '') continue

    if (visible && item.visible === false) {
      continue
    } else if (!visible && item.visible === true) {
      continue
    }

    if (item.subMenuItems)
      subMenu = formatItems(item.subMenuItems, params, true, false)

    rows.push({
      disabled: item[params.disabledKey] ? item[params.disabledKey] : false,
      icon: item[params.iconKey] ? item[params.iconKey] : '',
      overflowButton: false,
      text: item[params.textKey],
      ariaLabel: item.ariaLabel || item[params.textKey],
      key: parseInt(item['key']),
      value: parseInt(item['key']),
      selected: false,
      parentKey: !isNaN(item['parentKey'])
        ? parseInt(item['parentKey'])
        : undefined,
      visible: item.visible,
      params: item.params ?? undefined,
      attrs: item.attrs ?? undefined,
      subMenuItems: subMenu,
      field: item.field
    } as Tab)
  }

  if (visible && addOverflowButton) {
    rows.push({
      disabled: false,
      icon: '',
      overflowButton: true,
      text: '...',
      key: -1,
      parentKey: undefined
    } as Tab)
  }
  return rows
}

export default defineComponent({
  name: 'OfTabs',
  components: { OfOverlay, OfOptionList },
  props: {
    items: { type: [String, Object, Array] as PropType<ItemsProp> },
    modelValue: Number,
    scrolling: { type: Boolean, default: false },
    overflowButton: { type: Boolean, default: false },
    showActiveTab: { type: Boolean, default: true },
    variant: String,
    density: [String, Number],
    rounded: Boolean,
    withBorder: Boolean,
    activeOffset: String,
    topTabs: { type: Boolean, default: false },
    params: { type: Object, required: false },
    submenu: Boolean
  },
  emits: {
    'update:modelValue': null,
    'select-tab': null
  },
  setup(props, context) {
    const themeOptions = useThemeOptions()
    let tabs: any = ref([])

    let ofTabsHeader: any = ref()
    let selectedTabKey: any = ref(props.modelValue)
    let tabsWidth: any = ref([])

    const offsetStyle = computed(() =>
      props.activeOffset
        ? {
            '--tab-active-border': props.activeOffset
          }
        : {}
    )
    const overlayStyle = computed(() => {
      if (props.topTabs) {
        return { minWidth: submenuMinWidth.value + 'px' }
      }
      return {}
    })
    const overlayClassname = computed(() => {
      return props.params?.overlayClassname
    })
    const normalizedDensity = computed(() => {
      let d = props.density
      if (d === 'default') {
        d = undefined
      } else if (typeof d === 'string') {
        d = parseInt(d, 10)
        if (isNaN(d)) d = undefined
      }
      if (typeof d !== 'number') {
        d = themeOptions.defaultDensity
      }
      if (typeof d !== 'number') {
        d = 2
      }
      return Math.max(0, Math.min(3, d || 0))
    })

    watch(
      () => props.modelValue,
      (val) => {
        selectedTabKey.value = val
        nextTick(() => {
          repositionLine()
          repositionTabs()
        })
      }
    )

    watch(
      () => [props.items, props.variant, props.withBorder],
      () => {
        fillItems()
        init()
      }
    )
    const targetPos = computed(() => watchPosition())
    watch(targetPos.value.positions, () => repositionLine())

    const variant = computed(() => props.variant || 'material')
    const cls = computed(() => 'of--variant-' + variant.value)
    let closeDelay = computed(() => {
      if (props.params?.submenuCloseDelay === undefined) return 500
      return props.params?.submenuCloseDelay
    })

    const overflowButtonEnabled = computed(() => props.overflowButton || false)
    let showOverflowButton = ref(false)

    const ofTabsNavigationHeaderShowNextNavigation = computed(() => {
      return (
        props.scrolling &&
        variant.value !== 'osx' &&
        !overflowButtonEnabled.value
      )
    })

    const ofTabsNavigationHeaderShowPreviousNavigation = computed(() => {
      return (
        props.scrolling &&
        variant.value !== 'osx' &&
        !overflowButtonEnabled.value
      )
    })

    const showNavigation = computed(() => {
      return (
        props.scrolling &&
        variant.value !== 'osx' &&
        !overflowButtonEnabled.value
      )
    })

    const itemMgr = useItems()
    const items: any = ref({})

    const firstActiveTabIdx = ref()
    const lastActiveTabIdx = ref()

    const fillItems = function () {
      const itemList = {
        disabledKey: 'disabled',
        iconKey: 'icon',
        textKey: 'text',
        items: []
      }
      Object.assign(itemList, itemMgr.getItemList(props.items))

      for (const index in itemList.items) {
        let item: any = itemList.items[index]

        if (typeof item === 'string' && item !== '') {
          item = { text: item, key: parseInt(index), visible: true }
        } else if (typeof item === 'object') {
          item.key = parseInt(index)
          item.visible = item.hasOwnProperty('visible') ? item.visible : true

          if (item.subMenuItems) {
            for (const subIndex in item.subMenuItems) {
              item.subMenuItems[subIndex].visible = true
              item.subMenuItems[subIndex].key = parseInt(subIndex)
              item.subMenuItems[subIndex].parentKey = item.key
            }
          }
        }
        if (item.disabled !== true) {
          firstActiveTabIdx.value = firstActiveTabIdx.value ?? item.key
          lastActiveTabIdx.value = item.key
        }

        itemList.items[index] = item as never
      }

      items.value = itemList
    }

    const tabsList = computed(() => {
      return formatItems(
        items.value.items,
        items.value,
        true,
        showOverflowButton.value
      )
    })

    const invisibleTabsList = computed(() => {
      return formatItems(items.value.items, items.value, false)
    })

    onBeforeMount(() => {
      fillItems()
    })

    onMounted(() => {
      window.addEventListener('resize', hideOutsideTabs)
      targetPos.value.observe(ofTabsHeader.value)
      init()
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', hideOutsideTabs)
    })

    const init = function () {
      nextTick(() => {
        setTabsWidth()
        hideOutsideTabs()
        repositionLine()
        repositionTabs()
      })
    }

    const navigateHeader = function (value: string, scrollNum = 150) {
      if (value == 'next') {
        ofTabsHeader.value.scrollTo({
          left: ofTabsHeader.value.scrollLeft + scrollNum,
          behavior: 'smooth'
        })
      } else if (value == 'prev') {
        ofTabsHeader.value.scrollTo({
          left: ofTabsHeader.value.scrollLeft - scrollNum,
          behavior: 'smooth'
        })
      }
    }

    const repositionLine = function () {
      if (variant.value !== 'osx' && tabs.value) {
        const currentTabHeaderItem = tabs.value.querySelector(
          '.of-tab-header-item.is-active'
        )

        let tabLine: HTMLDivElement = tabs.value.querySelector('.of-tabs-line')
        tabLine.style.width = currentTabHeaderItem?.clientWidth + 'px'
        tabLine.style.left = currentTabHeaderItem?.offsetLeft + 'px'
      }
    }

    //If selected tab isn't visible make scrolling
    const repositionTabs = function () {
      if (showNavigation.value) {
        const currentTabHeaderItem = tabs.value?.querySelector(
          '.of-tab-header-item.is-active'
        )

        const prevNavBounds = tabs.value
          ?.querySelector('.of-tabs-navigation.of-tabs-navigation-prev')
          ?.getBoundingClientRect()
        const nextNavBounds = tabs.value
          ?.querySelector('.of-tabs-navigation.of-tabs-navigation-next')
          ?.getBoundingClientRect()
        const currentItemBounds = currentTabHeaderItem?.getBoundingClientRect()
        if (!prevNavBounds || !nextNavBounds || !currentItemBounds) return
        let scroll = 0

        //check right bound
        if (currentItemBounds.right > nextNavBounds.left) {
          scroll = Math.round(currentItemBounds.right - nextNavBounds.left) + 5
          navigateHeader('next', scroll)
          //check left bound
        } else if (currentItemBounds.left < prevNavBounds.right) {
          scroll = Math.round(prevNavBounds.right - currentItemBounds.left) + 5
          navigateHeader('prev', scroll)
        }
      }
    }

    const setTabsWidth = function () {
      if (overflowButtonEnabled.value && !showNavigation.value) {
        tabsWidth.value = []

        for (let item of ofTabsHeader.value.childNodes) {
          const w = elementWidth(item)
          if (!w) continue

          tabsWidth.value.push(w)
        }
      }
    }

    const hideOutsideTabs = function () {
      if (overflowButtonEnabled.value && !showNavigation.value) {
        closeOverflowPopup()

        const selectedTab: Tab | undefined = getTab(selectedTabKey.value)
        let index = 0
        let selectedIndex = -1
        let tabsIndexes: Array<number> = []
        showOverflowButton.value = true

        //Make all tabs invisible exclude selected
        for (const item of items.value.items) {
          if (selectedTab?.key === item['key']) {
            updateTabVisibility(index, true)
            selectedIndex = index
            //don't make sense to update overflow button (key == -1)
          } else if (item['key'] !== -1) {
            updateTabVisibility(index, false)
          }

          if (index !== selectedIndex && item['key'] !== -1) {
            tabsIndexes.push(index)
          }

          index++
        }

        nextTick(() => {
          adjustTabsVisibility(tabsIndexes)
        })
      }
    }

    const adjustTabsVisibility = function (tabsIndexes: Array<number>) {
      const outerWidth = elementWidth(ofTabsHeader.value)
      let tabsWidth = 0
      let hasInvisibleTabs = false

      //Make tabs visible until widths sum < main container's width
      for (const index of tabsIndexes) {
        updateTabVisibility(index, true)
        tabsWidth = calcVisibleTabsWidth()
        if (tabsWidth > outerWidth) {
          hasInvisibleTabs = true
          updateTabVisibility(index, false)
          break
        }
      }
      for (const item of items.value.items) {
        if (item.disabled !== true && item.visible == true) {
          lastActiveTabIdx.value = item.key
        }
      }

      showOverflowButton.value = hasInvisibleTabs

      nextTick(() => {
        repositionLine()
      })
    }

    const overflowButtonEl = ref()
    const calcVisibleTabsWidth = function (): number {
      let width = 0
      overflowButtonEl.value = tabs.value?.querySelector(
        '.of-tab-header-item.overflow-button'
      )
      const overflowButton = tabs.value.querySelector(
        '.of-tab-header-item.overflow-button'
      )
      const overflowSeparator = tabs.value.querySelector('.overflow-separator')

      width += overflowButton?.offsetWidth ?? 0
      width += overflowSeparator?.offsetWidth ?? 0

      for (const item of tabsList.value) {
        if (item['visible']) {
          width += tabsWidth.value[item['key']]
        }
      }

      return width
    }

    const updateTabVisibility = function (index: number, visible: boolean) {
      const item = items.value.items[index]

      if (typeof item !== 'undefined') {
        item['visible'] = visible
        items.value.items[index] = item
      }
    }

    const getTab = function (key: Number): Tab | undefined {
      for (const tab of tabsList.value) {
        if (tab.key === key) return tab
      }

      for (const tab of invisibleTabsList.value) {
        if (tab.key === key) return tab
      }

      return undefined
    }

    watch(
      () => props.variant,
      () => {
        const reposition = () => {
          repositionTabs()
          repositionLine()
          tabs.value?.removeEventListener('transitionend', reposition)
        }
        tabs.value?.addEventListener('transitionend', reposition)
      }
    )
    const handleSelectTab = (event: PointerEvent, key: number) => {
      if (
        event.pointerType === 'touch' &&
        items.value.items[key]?.subMenuItems &&
        openedMenuTabKey.value !== key
      ) {
        onMouseoverTab(key, event.target)
      } else {
        selectTab(key)
      }
    }
    const selectTab = function (key: number, emitSelectEvent = true) {
      if (props.params?.disableTabSelect) {
        onMouseoverTab(key, tabsRefs[key], true)
      } else {
        const selectedTab: Tab | undefined = getTab(key)
        if (selectedTab && selectedTab.overflowButton) {
          switchOverflowPopupVisibility()
        } else if (selectedTab) {
          context.emit('update:modelValue', key)
          if (emitSelectEvent) context.emit('select-tab', selectedTab)
          if (!props.params?.showSubmenuOnClick) {
            nextTick(() => {
              closeSubMenu()
              closeOverflowPopup()
              repositionLine()
              repositionTabs()
            })
          }
        }
      }
    }

    const selectInvisibleTab = function (key: number) {
      const selectedTab: Tab | undefined = getTab(key)

      if (selectedTab) {
        context.emit('update:modelValue', key)
        context.emit('select-tab', selectedTab)

        nextTick(() => {
          hideOutsideTabs()
        })
      }

      closeOverflowPopup()
    }

    const outsideTabsOpened = ref(false)

    const switchOverflowPopupVisibility = () => {
      outsideTabsOpened.value = !outsideTabsOpened.value
    }

    const closeOverflowPopup = () => {
      outsideTabsOpened.value = false
    }

    //SubMenu
    const showSubMenu = computed(() => {
      return props.submenu
    })

    const subMenuActive = ref(false)
    const subMenuHidden = ref(false)
    const optionListFocused = ref(false)
    const subMenuOuter = ref()
    const subMenuTabsList: Ref<Tab[]> = ref([])
    const subMenuTimerId = ref()
    const submenuMinWidth = ref(0)

    const openSubMenu = (
      key: number,
      elt: HTMLElement | EventTarget | null,
      delay = 500
    ) => {
      if (!showSubMenu.value || key == -1) return false

      if (variant.value !== 'osx') {
        closeOverflowPopup()
        subMenuClearTimeout()
        const tab: Tab | undefined = getTab(key)

        if (tab && tab.subMenuItems) {
          subMenuTimerId.value = window.setTimeout(
            () => {
              subMenuTabsList.value = tab.subMenuItems ?? []
              subMenuOuter.value = elt
              subMenuActive.value = true
              openedMenuTabKey.value = key
            },
            subMenuActive.value ? 0 : delay
          )
          return true
        } else {
          closeSubMenu()
        }
      } else {
        closeSubMenu()
      }

      return false
    }

    const closeSubMenu = () => {
      openedMenuTabKey.value = null
      subMenuActive.value = false
      optionListFocused.value = false
      closeOverflowPopup()
    }

    const onMouseoverTab = (
      key: number,
      elt: HTMLElement | EventTarget | null,
      forceFocus: Boolean = false
    ) => {
      if (
        !props.params?.hideSubmenuOnHover ||
        (focusedTabKey.value && focusedTabKey.value === key) ||
        forceFocus
      ) {
        submenuMinWidth.value = tabsRefs[key]?.offsetWidth || 0
        if (optionListFocused.value) {
          subMenuHidden.value = true
          focusTab()
        }
        openSubMenu(key, elt, props.params?.submenuDelay)
      }
    }

    const subMenuLeave = (key: number | undefined = undefined) => {
      if (!showSubMenu.value && key !== -1) return false

      subMenuClearTimeout()
      subMenuTimerId.value = window.setTimeout(() => {
        closeSubMenu()
      }, closeDelay.value)
    }

    const subMenuClearTimeout = () => {
      clearTimeout(subMenuTimerId.value)
    }

    const selectSubMenuTab = function (_index: number, tab: Tab) {
      if (typeof tab.parentKey !== 'undefined') {
        selectTab(tab.parentKey, false)
        closeSubMenu()
        context.emit('select-tab', tab)
      }
    }

    const tabsRefs: { [_: string]: any } = {}
    const focusedTab = ref<HTMLElement | null>(null)
    const focusedTabKey = ref()
    const openedMenuTabKey = ref()

    watch(
      () => focusedTabKey.value,
      (val) => {
        if (typeof val == 'undefined') {
          subMenuHidden.value = false
        } else if (val == -1) {
          focusedTab.value = overflowButtonEl.value
        } else {
          focusedTab.value = tabsRefs[val]
        }
      }
    )

    const openFocusedSubMenu = () => {
      optionListFocused.value = false
      return openSubMenu(focusedTabKey.value, focusedTab.value, 0)
    }

    const onBlurList = () => {
      if (optionListFocused.value) {
        focusTab()
      }
    }

    const onFocusTab = (key: number) => {
      focusedTabKey.value = key
      focusTab()
      nextTick(() => {
        if (!subMenuHidden.value && !props.params?.disableTabSelect)
          openFocusedSubMenu()
      })
    }

    const onBlurTab = (key: number | undefined = undefined) => {
      focusedTabKey.value = undefined
      subMenuLeave(key)
    }

    const navigate = (evt: KeyboardEvent) => {
      let consumed = true
      let idx = items.value.items.findIndex(
        (item: { key: number }) => item.key === focusedTabKey.value
      )

      switch (evt.key) {
        case 'Tab':
          focusedTabKey.value = getNextTabKey(idx, evt.shiftKey)
          if (evt.shiftKey && idx == 0) consumed = false
          focusTab()
          nextTick(() => {
            if (!subMenuHidden.value) openFocusedSubMenu()
          })
          break
        case 'ArrowUp':
        case 'ArrowDown':
          if (
            openedMenuTabKey.value &&
            openedMenuTabKey.value !== focusedTabKey.value
          ) {
            closeSubMenu()
          }
          if (!subMenuActive.value && focusedTabKey.value !== -1) {
            openFocusedSubMenu()
            subMenuHidden.value = false
          } else {
            optionListFocused.value = true
            nextTick(() => {
              subMenuClearTimeout()
            })
          }
          break
        case 'Escape':
          subMenuHidden.value = true
          closeSubMenu()
          break
        case ' ':
        case 'Enter':
          subMenuHidden.value = true
          selectTab(focusedTabKey.value)
          break
      }

      if (
        evt.key == 'Tab' &&
        !evt.shiftKey &&
        ((showOverflowButton.value && idx == -1) ||
          (!showOverflowButton.value && idx == lastActiveTabIdx.value))
      ) {
        focusedTabKey.value = undefined
        consumed = false
        closeSubMenu()
      }

      if (consumed) {
        evt.preventDefault()
      }
    }

    const focusTab = () => {
      nextTick(() => {
        focusedTab.value?.focus()
      })
    }

    const getNextTabKey = (idx: number, prev: boolean) => {
      const maxIdx = items.value.items.length - 1
      if (idx == -1) {
        return prev ? lastActiveTabIdx.value : idx
      } else if (
        !prev &&
        showOverflowButton.value &&
        idx == lastActiveTabIdx.value
      ) {
        return -1
      }

      let result = false
      let focusedIdx = prev ? Math.max(idx - 1, 0) : Math.min(idx + 1, maxIdx)

      while (!result) {
        const item = items.value.items[focusedIdx]
        if (item.disabled == true || item.visible == false) {
          if ((prev && focusedIdx == 0) || (!prev && focusedIdx == maxIdx)) {
            focusedIdx = idx
            result = true
          } else {
            prev ? focusedIdx-- : focusedIdx++
          }
        } else {
          result = true
        }
      }

      return items.value.items[focusedIdx].key
    }

    return {
      tabsList,
      selectedTabKey,
      overflowButtonEl,
      normalizedDensity,

      showNavigation,
      navigateHeader,
      repositionLine,
      selectTab,

      tabs,
      cls,
      offsetStyle,
      submenuMinWidth,
      invisibleTabsList,
      outsideTabsOpened,
      closeOverflowPopup,
      selectInvisibleTab,
      overlayStyle,
      ofTabsHeader,
      ofTabsNavigationHeaderShowNextNavigation,
      ofTabsNavigationHeaderShowPreviousNavigation,
      overlayClassname,
      showSubMenu,
      subMenuTabsList,
      subMenuActive,
      subMenuOuter,
      openSubMenu,
      closeSubMenu,
      selectSubMenuTab,
      subMenuLeave,
      subMenuClearTimeout,
      onMouseoverTab,

      onBlurList,
      optionListFocused,

      navigate,
      onFocusTab,
      onBlurTab,
      tabsRefs,
      focusedTabKey,
      openedMenuTabKey,
      firstActiveTabIdx,
      lastActiveTabIdx,
      handleSelectTab
    }
  }
})
</script>

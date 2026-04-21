<template>
  <div
    class="of-kanban-board"
    @blur="handleBlur"
    tabindex="-1"
    ref="boardRef"
    @click="handleBoardClick"
  >
    <kanban-filters
      v-if="!disableInternalFilters"
      :assignees="assignees"
      :search-input-placeholder="searchInputPlaceholder"
      :tags="currentFilters.tags"
      @filter-change="handleFilterChange"
      @clear-filters="handleFilterChange($event, true)"
    >
      <template #custom-filters>
        <slot name="filters" />
      </template>
      <template #tag-filters>
        <div class="selected-tags">
          <button
            v-for="tag in getSelectedTags"
            :key="tag"
            class="tag-button"
            @click="removeTag(tag)"
          >
            {{ tag }}
            <span class="remove-icon">×</span>
          </button>
        </div>
      </template>
      <template #clear-filters>
        <slot name="clear-filters" />
      </template>
    </kanban-filters>

    <div class="of-kanban-columns">
      <kanban-column
        v-for="column in filteredColumns"
        :key="column.id"
        :data-column-id="column.id"
        :column="column"
        :menu-items="columnMenuItems"
        :card-menu-items="cardMenuItems"
        :dragged-card-id="draggedCardId"
        :selected-card-id="selectedCardId"
        :active-column-id="activeColumnId"
        :has-more="hasMoreCards[column.id]"
        :is-collapsed="collapsedColumns.includes(String(column.id))"
        :dependency-stripe-color-by-card-key="
          dependencyIndex.stripeColorByCardKey
        "
        :dependency-related-keys="dependencyIndex.relatedKeys"
        :dependency-dimmed-keys="dependencyIndex.dimmedKeys"
        :dependencies-enabled="dependenciesEnabled"
        :get-dependency-card-key="getDependencyCardKey"
        @menu-item-click="handleColumnMenuItemClick"
        @column-click="handleColumnClick"
        @card-blur="handleCardBlur"
        @card-moved="handleCardMove"
        @card-drag-start="handleCardDragStart"
        @card-click="handleCardClick"
        @card-hover-change="handleCardHoverChange"
        @add-card="$emit('add-card', column.id)"
        @project-click="$emit('project-click', $event)"
        @assignee-click="$emit('assignee-click', $event)"
        @card-title-click="$emit('card-title-click', $event)"
        @card-tag-click="handleCardTagClick"
        @card-menu-item-click="
          (item: string | number, card: IKanbanCard) =>
            $emit('card-menu-item-click', item, card)
        "
        :window-top-count="windowTopCounts[column.id] ?? 0"
        :window-bottom-count="windowBottomCounts[column.id] ?? 0"
        :scroll-threshold="scrollThreshold"
        :is-loading="loadingColumns[column.id] ?? false"
        :is-loaded="loadedColumns[column.id] ?? column.loaded ?? true"
        @set-active-column="setActiveColumn"
        @load-more="handleLoadMore"
        @load-previous="handleLoadPrevious"
        @collapse-toggle="handleColumnCollapse"
      >
        <template #card-title="slotProps">
          <slot name="card-title" :card="slotProps.card" />
        </template>
        <template #project="slotProps">
          <slot name="project" :card="slotProps.card" />
        </template>
        <template #avatar="slotProps">
          <slot name="avatar" :card="slotProps.card" />
        </template>
        <template #create-button>
          <slot name="create-button" />
        </template>
      </kanban-column>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  type PropType,
  ref,
  onMounted,
  nextTick,
  computed,
  watch,
  onUnmounted,
  reactive
} from 'vue'
import KanbanColumn from './components/KanbanColumn.vue'
import KanbanFilters from './components/KanbanFilters.vue'
import type {
  IKanbanColumn,
  CardMovedEvent,
  IKanbanCard,
  IKanbanCardAssignee,
  KanbanCardId,
  KanbanDependenciesConfig
} from './types'
import { Item } from '../../lib/items_list'
import { getCollapsedColumns, saveCollapsedState } from './utils'
import {
  defaultDependenciesPalette,
  generateHslColor,
  hashString,
  toDependencyKey
} from './utils/dependencies'

export default defineComponent({
  name: 'OfKanbanBoard',
  components: {
    KanbanColumn,
    KanbanFilters
  },
  props: {
    columns: {
      type: Array as PropType<IKanbanColumn[]>,
      required: true
    },
    columnMenuItems: {
      type: Array as PropType<Item[]>,
      default: () => []
    },
    cardMenuItems: {
      type: Array as PropType<Item[]>,
      default: () => []
    },
    searchInputPlaceholder: {
      type: String,
      default: 'Search by keyword...'
    },
    hasMoreCards: {
      type: Object as PropType<Record<string, boolean>>,
      default: () => ({})
    },
    dependencies: {
      type: Object as PropType<KanbanDependenciesConfig | undefined>,
      default: undefined
    },
    disableInternalFilters: {
      type: Boolean,
      default: false
    },
    id: {
      type: String,
      default: 'default'
    },
    windowTopCounts: {
      type: Object as PropType<Record<string, number>>,
      default: () => ({})
    },
    windowBottomCounts: {
      type: Object as PropType<Record<string, number>>,
      default: () => ({})
    },
    scrollThreshold: {
      type: Number,
      default: 100
    },
    loadingColumns: {
      type: Object as PropType<Record<string, boolean>>,
      default: () => ({})
    },
    loadedColumns: {
      type: Object as PropType<Record<string, boolean>>,
      default: () => ({})
    },
    // Incremented by the parent on every full board reload (loadInitialData).
    // Causes the IntersectionObserver to re-setup so that already-visible columns
    // re-fire column-enter-viewport even though their column IDs haven't changed.
    boardKey: {
      type: Number,
      default: 0
    }
  },
  emits: [
    'update:columns',
    'card-moved',
    'column-menu-item-click',
    'add-card',
    'card-click',
    'project-click',
    'assignee-click',
    'card-title-click',
    'card-tag-click',
    'card-menu-item-click',
    'filter-change',
    'load-more',
    'load-previous',
    'column-enter-viewport',
    'column-leave-viewport',
    'column-expanded'
  ] as const,
  setup(props, { emit }) {
    const boardRef = ref<HTMLElement>()
    const draggedCardId = ref<string | number | undefined>(undefined)
    const selectedCardId = ref<string | number | undefined>(undefined)
    const hoveredCardKey = ref<string | null>(null)
    const collapsedColumns = ref<string[]>([])
    const currentFilters = reactive({
      keyword: '',
      assignees: [] as (string | number)[],
      tags: new Set<string>()
    })
    const activeColumnId = ref<string | null>(null)
    const pendingExpandChecks = new Set<number>()
    const pendingSmoothScrollFallbacks = new Set<number>()
    const recentExpandScrollTargets = new WeakMap<
      HTMLElement,
      { left: number; at: number }
    >()

    const storageKey = computed<string>(
      () => `kanban-collapsed-columns-${props.id}`
    )

    const getSelectedTags = computed({
      get: () => Array.from(currentFilters.tags),
      set: (tags: string[]) => {
        currentFilters.tags = new Set(tags)
      }
    })

    watch(collapsedColumns, (newValue) => {
      saveCollapsedState(storageKey.value, newValue)
    })

    const assignees = computed(() => {
      const assigneeMap = new Map<string | number, IKanbanCardAssignee>()

      props.columns.forEach((column) => {
        column.cards?.forEach((card) => {
          if (card.assignee) {
            assigneeMap.set(card.assignee.id, card.assignee)
          }
        })
      })

      return Array.from(assigneeMap.values())
    })

    const tags = computed(() => {
      const tagSet = new Set<string>()

      props.columns.forEach((column) => {
        column.cards?.forEach((card) => {
          card.tags?.forEach((tag) => tagSet.add(tag))
        })
      })

      return Array.from(tagSet)
    })

    const filteredColumns = computed(() => {
      if (props.disableInternalFilters) return props.columns
      return props.columns.map((column) => {
        if (!column.cards) return column

        const filteredCards = column.cards.filter((card) => {
          // Filter by keyword
          const matchesKeyword = currentFilters.keyword
            ? card.title
                .toLowerCase()
                .includes(currentFilters.keyword.toLowerCase())
            : true

          // Filter by assignees
          const matchesAssignee = currentFilters.assignees.length
            ? card.assignee &&
              currentFilters.assignees.includes(card.assignee.id)
            : true

          // Filter by tags
          const matchesTags = currentFilters.tags.size
            ? card.tags?.some((tag) => currentFilters.tags.has(tag))
            : true

          return matchesKeyword && matchesAssignee && matchesTags
        })

        return {
          ...column,
          cards: filteredCards
        }
      })
    })

    const selectedTags = computed(() => Array.from(currentFilters.tags))

    const dependenciesEnabled = computed<boolean>(
      () => !!props.dependencies?.enabled
    )

    const hoverHighlightMode = computed<'neighbors' | 'group'>(() => {
      return props.dependencies?.hoverHighlightMode ?? 'neighbors'
    })

    const dependenciesPalette = computed<string[]>(() => {
      const palette = props.dependencies?.palette
      return palette && palette.length > 0
        ? palette
        : defaultDependenciesPalette
    })

    const getCardId = computed<(card: IKanbanCard) => KanbanCardId>(() => {
      return props.dependencies?.getCardId ?? ((card: IKanbanCard) => card.id)
    })

    const getEdges = computed<(card: IKanbanCard) => { toId: KanbanCardId }[]>(
      () => props.dependencies?.getEdges ?? (() => [])
    )

    const dependencyIndex = computed(() => {
      if (!dependenciesEnabled.value) {
        return {
          stripeColorByCardKey: {} as Record<string, string | undefined>,
          relatedKeys: new Set<string>(),
          dimmedKeys: new Set<string>()
        }
      }

      const cards: IKanbanCard[] = []
      props.columns.forEach((col) => col.cards?.forEach((c) => cards.push(c)))

      const keyByCard = new Map<IKanbanCard, string>()
      const cardByKey = new Map<string, IKanbanCard>()
      for (const card of cards) {
        const key = toDependencyKey(getCardId.value(card))
        keyByCard.set(card, key)
        cardByKey.set(key, card)
      }

      const dependsOnByKey = new Map<string, Set<string>>()
      const dependentsByKey = new Map<string, Set<string>>()
      const adjacency = new Map<string, Set<string>>()

      const addAdj = (a: string, b: string) => {
        if (!adjacency.has(a)) adjacency.set(a, new Set())
        adjacency.get(a)!.add(b)
      }

      for (const card of cards) {
        const fromKey = keyByCard.get(card)!
        const edges = getEdges.value(card) ?? []

        for (const edge of edges) {
          const toKeyRaw = toDependencyKey(edge.toId)
          if (!cardByKey.has(toKeyRaw)) continue

          if (!dependsOnByKey.has(fromKey))
            dependsOnByKey.set(fromKey, new Set())
          dependsOnByKey.get(fromKey)!.add(toKeyRaw)

          if (!dependentsByKey.has(toKeyRaw))
            dependentsByKey.set(toKeyRaw, new Set())
          dependentsByKey.get(toKeyRaw)!.add(fromKey)

          addAdj(fromKey, toKeyRaw)
          addAdj(toKeyRaw, fromKey)
        }
      }

      const groupKeyByKey = new Map<string, string>()
      const groupMembersByGroupKey = new Map<string, Set<string>>()
      const visited = new Set<string>()

      for (const key of cardByKey.keys()) {
        if (visited.has(key)) continue

        const stack = [key]
        const component: string[] = []
        visited.add(key)
        while (stack.length) {
          const curr = stack.pop()!
          component.push(curr)
          const neigh = adjacency.get(curr)
          if (!neigh) continue
          for (const n of neigh) {
            if (visited.has(n)) continue
            visited.add(n)
            stack.push(n)
          }
        }

        const componentHasEdges = component.some(
          (k) => (adjacency.get(k)?.size ?? 0) > 0
        )
        if (!componentHasEdges) {
          for (const k of component) groupKeyByKey.set(k, k)
          for (const k of component) groupMembersByGroupKey.set(k, new Set([k]))
          continue
        }

        const groupKey = component.reduce((min, curr) =>
          curr < min ? curr : min
        )
        for (const k of component) groupKeyByKey.set(k, groupKey)
        groupMembersByGroupKey.set(groupKey, new Set(component))
      }

      const stripeColorByGroupKey = new Map<string, string>()
      const palette = dependenciesPalette.value
      const usedPaletteIndexes = new Set<number>()
      const usedColors = new Set<string>()
      const uniqueGroupKeys = Array.from(new Set(groupKeyByKey.values())).sort()

      for (const groupKey of uniqueGroupKeys) {
        const startIndex = hashString(groupKey) % palette.length
        let index = startIndex
        let tries = 0
        while (usedPaletteIndexes.has(index) && tries < palette.length) {
          index = (index + 1) % palette.length
          tries++
        }

        const color =
          tries < palette.length
            ? palette[index]
            : generateHslColor(hashString(groupKey))

        stripeColorByGroupKey.set(groupKey, color)
        if (tries < palette.length) usedPaletteIndexes.add(index)
        usedColors.add(color)
      }

      const stripeColorByCardKey: Record<string, string | undefined> = {}
      for (const [cardKey, groupKey] of groupKeyByKey.entries()) {
        if ((adjacency.get(cardKey)?.size ?? 0) === 0) continue
        stripeColorByCardKey[cardKey] = stripeColorByGroupKey.get(groupKey)
      }

      const hovered = hoveredCardKey.value
      const relatedKeys = new Set<string>()
      const dimmedKeys = new Set<string>()

      if (hovered) {
        const hoveredGroupKey = groupKeyByKey.get(hovered)
        if (hoverHighlightMode.value === 'group' && hoveredGroupKey) {
          groupMembersByGroupKey
            .get(hoveredGroupKey)
            ?.forEach((k) => relatedKeys.add(k))
        } else {
          dependsOnByKey.get(hovered)?.forEach((k) => relatedKeys.add(k))
          dependentsByKey.get(hovered)?.forEach((k) => relatedKeys.add(k))
          relatedKeys.add(hovered)
        }

        for (const cardKey of cardByKey.keys()) {
          const hasStripe = !!stripeColorByCardKey[cardKey]
          if (!hasStripe) continue
          if (!relatedKeys.has(cardKey)) dimmedKeys.add(cardKey)
        }
      }

      return { stripeColorByCardKey, relatedKeys, dimmedKeys }
    })

    const getDependencyCardKey = (card: IKanbanCard) =>
      toDependencyKey(getCardId.value(card))

    const handleCardHoverChange = (card: IKanbanCard, isHovering: boolean) => {
      if (!dependenciesEnabled.value) return
      if (!isHovering) {
        hoveredCardKey.value = null
        return
      }
      hoveredCardKey.value = toDependencyKey(getCardId.value(card))
    }

    const handleCardDragStart = (card: IKanbanCard) => {
      draggedCardId.value = card.id
      selectedCardId.value = card.id
      hoveredCardKey.value = null
    }

    const handleCardBlur = (card: IKanbanCard) => {
      if (selectedCardId.value === card.id) {
        selectedCardId.value = undefined
      }
    }

    const handleCardClick = (card: IKanbanCard) => {
      selectedCardId.value = card.id
      emit('card-click', card)
    }

    const handleCardTagClick = (tag: string) => {
      if (!props.disableInternalFilters) {
        if (currentFilters.tags.has(tag)) currentFilters.tags.delete(tag)
        else currentFilters.tags.add(tag)
      }
      emit('card-tag-click', tag)
    }

    const handleColumnClick = (_column: IKanbanColumn) => {
      selectedCardId.value = undefined
    }

    const handleBlur = () => {
      selectedCardId.value = undefined
    }

    const handleCardMove = ({
      cardId,
      fromColumn,
      toColumn,
      newOrder
    }: CardMovedEvent) => {
      // Create a new columns array, but only clone the affected columns
      const updatedColumns = [...props.columns]
      const fromColumnIndex = updatedColumns.findIndex(
        (col) => col.id === fromColumn
      )
      const toColumnIndex = updatedColumns.findIndex(
        (col) => col.id === toColumn
      )

      // Get the moved card before modifying the from column
      const movedCard = updatedColumns[fromColumnIndex].cards?.find(
        (card) => card.id === cardId
      )

      if (!movedCard) return

      // Update the from column
      updatedColumns[fromColumnIndex] = {
        ...updatedColumns[fromColumnIndex],
        cards: updatedColumns[fromColumnIndex].cards
          ?.filter((card) => card.id !== cardId)
          .map((card, index) => ({
            ...card,
            order: index
          }))
      }

      // Update the to column
      const targetColumn = updatedColumns[toColumnIndex]
      if (!targetColumn.cards) {
        targetColumn.cards = []
      }
      const reorderedCards = [...targetColumn.cards]
      reorderedCards.splice(newOrder, 0, movedCard)

      updatedColumns[toColumnIndex] = {
        ...targetColumn,
        cards: reorderedCards.map((card, index) => ({
          ...card,
          order: index
        }))
      }

      draggedCardId.value = undefined
      hoveredCardKey.value = null
      emit('update:columns', updatedColumns)
      emit('card-moved', { cardId, fromColumn, toColumn, newOrder })
    }

    const handleBoardClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Check if click was on a card, column, or any interactive elements
      if (
        target.closest('.of-kanban-card') ||
        target.closest('.of-kanban-column') ||
        target.closest('button')
      ) {
        return
      }

      // If we get here, the click was on the board background
      selectedCardId.value = undefined
    }

    const handleWindowClick = (event: MouseEvent) => {
      // Check if click is outside the kanban board
      if (boardRef.value && !boardRef.value.contains(event.target as Node)) {
        selectedCardId.value = undefined
      }
    }

    const handleWindowDragEnd = () => {
      draggedCardId.value = undefined
      hoveredCardKey.value = null
    }

    const handleColumnMenuItemClick = (
      item: string | number,
      columnId: string
    ) => {
      emit('column-menu-item-click', item, columnId)
    }

    const handleFilterChange = (
      filters: {
        keyword: string
        assignees: (string | number)[]
        tags: string[]
      },
      clearFilters = false
    ) => {
      if (props.disableInternalFilters) return
      currentFilters.keyword = filters.keyword
      currentFilters.assignees = filters.assignees
      currentFilters.tags = new Set(filters.tags)
      if (clearFilters) currentFilters.tags.clear()

      emit('filter-change', currentFilters)
    }

    const setActiveColumn = (columnId: string | null) => {
      activeColumnId.value = columnId
    }

    const handleLoadMore = (columnId: string) => {
      return emit('load-more', columnId)
    }

    const handleLoadPrevious = (columnId: string) => {
      return emit('load-previous', columnId)
    }

    const getColumnElementById = (
      columnId: string
    ): HTMLElement | undefined => {
      const boardEl = boardRef.value
      if (!boardEl) return undefined

      const columnEls = Array.from(
        boardEl.querySelectorAll('.of-kanban-column')
      ) as HTMLElement[]
      const normalizedId = String(columnId)
      const byDataId = columnEls.find(
        (el) => (el as HTMLElement).dataset.columnId === normalizedId
      )
      if (byDataId) return byDataId

      const columnIndex = filteredColumns.value.findIndex(
        (column) => String(column.id) === normalizedId
      )
      if (columnIndex < 0 || columnIndex >= columnEls.length) return undefined

      return columnEls[columnIndex]
    }

    const ensureExpandedColumnVisible = (columnId: string) => {
      const boardEl = boardRef.value
      if (!boardEl) return

      const columnEl = getColumnElementById(columnId)
      if (!columnEl) return

      const hasHorizontalOverflow = (el: HTMLElement): boolean =>
        el.scrollWidth - el.clientWidth > 1

      const isHorizontalScrollContainer = (el: HTMLElement): boolean => {
        const overflowX = window.getComputedStyle(el).overflowX
        const allowsHorizontalScroll =
          overflowX === 'auto' ||
          overflowX === 'scroll' ||
          overflowX === 'overlay'
        // Prefer true horizontal scrollers; always allow boardEl as fallback root.
        return (
          hasHorizontalOverflow(el) &&
          (allowsHorizontalScroll || el === boardEl)
        )
      }

      // Keep geometry and scroll calculations in the same coordinate system.
      const getScrollContainer = (): HTMLElement => {
        if (isHorizontalScrollContainer(boardEl)) return boardEl
        let current: HTMLElement | null = columnEl.parentElement
        while (current) {
          if (isHorizontalScrollContainer(current)) return current
          if (current === boardEl) break
          current = current.parentElement
        }
        return boardEl
      }

      const scrollContainer = getScrollContainer()
      const containerRect = scrollContainer.getBoundingClientRect()
      const columnRect = columnEl.getBoundingClientRect()

      const leftEdgePadding = 8
      // Keep a little more space on the right so expanded columns are fully visible.
      const rightEdgePadding = 24
      const visibleLeft = containerRect.left + leftEdgePadding
      const visibleRight = containerRect.right - rightEdgePadding

      if (columnRect.left >= visibleLeft && columnRect.right <= visibleRight)
        return

      let delta = 0
      if (columnRect.left < visibleLeft) delta = columnRect.left - visibleLeft
      else if (columnRect.right > visibleRight)
        delta = columnRect.right - visibleRight

      const targetScrollLeft = scrollContainer.scrollLeft + delta
      const maxScrollLeft = Math.max(
        0,
        scrollContainer.scrollWidth - scrollContainer.clientWidth
      )
      const clampedTarget = Math.min(
        Math.max(targetScrollLeft, 0),
        maxScrollLeft
      )

      if (Math.abs(clampedTarget - scrollContainer.scrollLeft) < 1) return

      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now()
      const recentTarget = recentExpandScrollTargets.get(scrollContainer)
      // Expand checks run multiple times (raf, transitionend, timeout). Avoid
      // restarting essentially the same smooth scroll and creating a jerky feel.
      if (
        recentTarget &&
        Math.abs(recentTarget.left - clampedTarget) < 2 &&
        now - recentTarget.at < 450
      ) {
        return
      }

      recentExpandScrollTargets.set(scrollContainer, {
        left: clampedTarget,
        at: now
      })

      if (typeof scrollContainer.scrollTo === 'function') {
        const startLeft = scrollContainer.scrollLeft
        scrollContainer.scrollTo({ left: clampedTarget, behavior: 'smooth' })
        const fallbackId = window.setTimeout(() => {
          pendingSmoothScrollFallbacks.delete(fallbackId)
          const didNotMove =
            Math.abs(scrollContainer.scrollLeft - startLeft) < 1
          const stillFarFromTarget =
            Math.abs(scrollContainer.scrollLeft - clampedTarget) > 1
          if (didNotMove && stillFarFromTarget) {
            scrollContainer.scrollLeft = clampedTarget
          }
        }, 220)
        pendingSmoothScrollFallbacks.add(fallbackId)
      } else {
        scrollContainer.scrollLeft = clampedTarget
      }
    }

    const scheduleExpandedColumnVisibility = (columnId: string) => {
      const normalizedId = String(columnId)
      const runIfStillExpanded = () => {
        if (!collapsedColumns.value.includes(normalizedId))
          ensureExpandedColumnVisible(normalizedId)
      }

      nextTick(() => {
        const runAfterFrame = () => {
          if (typeof requestAnimationFrame === 'undefined') {
            runIfStillExpanded()
            return
          }
          requestAnimationFrame(() => runIfStillExpanded())
        }

        runAfterFrame()

        const columnEl = getColumnElementById(normalizedId)
        if (!columnEl) return

        const handleTransitionEnd = (event: TransitionEvent) => {
          if (event.target !== columnEl) return
          if (
            event.propertyName &&
            !['width', 'min-width', 'max-width', 'flex-basis', 'flex'].includes(
              event.propertyName
            )
          ) {
            return
          }
          runIfStillExpanded()
        }
        columnEl.addEventListener('transitionend', handleTransitionEnd, {
          once: true
        })

        // Fallback for browsers/layouts where transitionend is not emitted as expected.
        const timeoutId = window.setTimeout(() => {
          pendingExpandChecks.delete(timeoutId)
          columnEl.removeEventListener('transitionend', handleTransitionEnd)
          runIfStillExpanded()
        }, 380)
        pendingExpandChecks.add(timeoutId)
      })
    }

    const handleColumnCollapse = (columnId: string) => {
      const normalizedId = String(columnId)
      const wasCollapsed = collapsedColumns.value.includes(normalizedId)
      if (wasCollapsed) {
        collapsedColumns.value = collapsedColumns.value.filter(
          (id) => id !== normalizedId
        )
        scheduleExpandedColumnVisibility(normalizedId)
        emit('column-expanded', normalizedId)
      } else {
        collapsedColumns.value = [...collapsedColumns.value, normalizedId]
      }
    }

    const columnObserver = ref<IntersectionObserver | null>(null)
    const observedColumns = new Map<Element, string>() // element → columnId

    const setupColumnObserver = () => {
      // Root must be the element that scrolls horizontally (.of-kanban-board has overflow:auto),
      // not .of-kanban-columns — otherwise intersection may not update on scroll and columns
      // stay stuck on skeletons while data has already loaded.
      if (!boardRef.value) return
      // Vitest/JSDOM and some non-browser runtimes do not provide IntersectionObserver.
      if (typeof IntersectionObserver === 'undefined') return
      columnObserver.value?.disconnect()
      observedColumns.clear()

      columnObserver.value = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const columnId = observedColumns.get(entry.target)
            if (!columnId) return
            if (entry.isIntersecting) {
              // Skip collapsed columns (width ≤ 60px means collapsed ~48px + margin)
              if (entry.boundingClientRect.width <= 60) {
                return
              }
              emit('column-enter-viewport', columnId)
            } else {
              emit('column-leave-viewport', columnId)
            }
          })
        },
        {
          root: boardRef.value,
          rootMargin: '0px 350px 0px 350px', // prefetch one column ahead in each direction
          threshold: 0
        }
      )

      // Observe all current column elements
      const columnEls = boardRef.value.querySelectorAll('.of-kanban-column')
      columnEls.forEach((el) => {
        const columnId = (el as HTMLElement).dataset.columnId
        if (columnId) {
          observedColumns.set(el, String(columnId))
          columnObserver.value!.observe(el)
          return
        }

        const index = Array.from(columnEls).indexOf(el)
        const fallbackId = filteredColumns.value[index]?.id
        if (fallbackId != null) {
          observedColumns.set(el, String(fallbackId))
          columnObserver.value!.observe(el)
        }
      })
    }

    const removeTag = (tag: string) => {
      if (props.disableInternalFilters) return
      currentFilters.tags.delete(tag)
      emit('filter-change', currentFilters)
    }

    onMounted(() => {
      collapsedColumns.value = getCollapsedColumns(storageKey.value).map(String)
      window.addEventListener('click', handleWindowClick)
      window.addEventListener('dragend', handleWindowDragEnd)
      setupColumnObserver()
    })

    onUnmounted(() => {
      window.removeEventListener('click', handleWindowClick)
      window.removeEventListener('dragend', handleWindowDragEnd)
      columnObserver.value?.disconnect()
      pendingExpandChecks.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      pendingExpandChecks.clear()
      pendingSmoothScrollFallbacks.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      pendingSmoothScrollFallbacks.clear()
    })

    // Re-observe when:
    //   a) column structure changes (IDs added/removed) — filteredColumnIds
    //   b) a full board reload happens (loadInitialData resets hydration) — boardKey
    // Watching filteredColumns directly would re-fire on every card update and cause the IO to
    // disconnect/reconnect — emitting spurious column-enter-viewport events after every load.
    const filteredColumnIds = computed(() =>
      filteredColumns.value.map((c) => String(c.id)).join(',')
    )
    watch([filteredColumnIds, () => props.boardKey, collapsedColumns], () => {
      nextTick(() => setupColumnObserver())
    })

    return {
      boardRef,
      draggedCardId,
      selectedCardId,
      assignees,
      tags,
      filteredColumns,
      activeColumnId,
      collapsedColumns,
      currentFilters,
      selectedTags,
      getSelectedTags,
      dependencyIndex,
      dependenciesEnabled,
      getDependencyCardKey,
      handleCardHoverChange,
      handleCardMove,
      handleCardDragStart,
      handleCardBlur,
      handleCardClick,
      handleCardTagClick,
      handleColumnClick,
      handleBlur,
      handleBoardClick,
      handleColumnMenuItemClick,
      handleFilterChange,
      setActiveColumn,
      handleLoadMore,
      handleLoadPrevious,
      handleColumnCollapse,
      removeTag
    }
  }
})
</script>

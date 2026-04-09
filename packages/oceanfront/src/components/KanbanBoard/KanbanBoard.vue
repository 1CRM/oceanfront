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
        :column="column"
        :menu-items="columnMenuItems"
        :card-menu-items="cardMenuItems"
        :dragged-card-id="draggedCardId"
        :selected-card-id="selectedCardId"
        :active-column-id="activeColumnId"
        :has-more="hasMoreCards[column.id]"
        :is-collapsed="collapsedColumns.includes(column.id)"
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
        @set-active-column="setActiveColumn"
        @load-more="handleLoadMore"
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
    'load-more'
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

    const handleColumnCollapse = (columnId: string) => {
      const index = collapsedColumns.value.indexOf(columnId)
      if (index === -1) {
        collapsedColumns.value = [...collapsedColumns.value, columnId]
      } else {
        collapsedColumns.value = collapsedColumns.value.filter(
          (id) => id !== columnId
        )
      }
    }

    const removeTag = (tag: string) => {
      if (props.disableInternalFilters) return
      currentFilters.tags.delete(tag)
      emit('filter-change', currentFilters)
    }

    onMounted(() => {
      collapsedColumns.value = getCollapsedColumns(storageKey.value)
      window.addEventListener('click', handleWindowClick)
      window.addEventListener('dragend', handleWindowDragEnd)
    })

    onUnmounted(() => {
      window.removeEventListener('click', handleWindowClick)
      window.removeEventListener('dragend', handleWindowDragEnd)
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
      handleColumnCollapse,
      removeTag
    }
  }
})
</script>

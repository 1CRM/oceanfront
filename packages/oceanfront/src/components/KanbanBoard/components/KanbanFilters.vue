<template>
  <div class="of-kanban-filters">
    <div class="of-kanban-filters-content">
      <div class="of-kanban-filters-left">
        <div class="of-default-filters">
          <of-field
            class="of-filter-input"
            v-model="keyword"
            type="text"
            @input="handleKeywordChange"
            :placeholder="searchInputPlaceholder"
          />
          <div class="of-kanban-avatars">
            <template v-for="assignee in assignees" :key="assignee.id">
              <div
                :class="{
                  'of-kanban-avatar': true,
                  'of--selected': selectedAssignees.includes(assignee.id)
                }"
                @click="toggleAssignee(assignee.id)"
              >
                <img
                  v-if="assignee.avatar"
                  :src="assignee.avatar"
                  :alt="assignee.name"
                  class="avatar-image"
                />
                <div v-else class="avatar-text">
                  {{ getInitials(assignee.name) }}
                </div>
              </div>
            </template>
          </div>
          <of-button
            class="of-clear-filters"
            @click="handleClearFilters"
            variant="text"
          >
            <slot name="clear-filters">Clear filters</slot>
          </of-button>
        </div>
      </div>
      <div class="of-kanban-filters-right">
        <slot name="custom-filters" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue'
import { IKanbanCardAssignee } from '../types'

export default defineComponent({
  name: 'KanbanFilters',

  props: {
    assignees: {
      type: Array as PropType<IKanbanCardAssignee[]>,
      default: () => []
    },
    searchInputPlaceholder: {
      type: String,
      default: 'Search by keyword...'
    }
  },

  emits: ['filter-change', 'clear-filters'],

  setup(_props, { emit }) {
    const keyword = ref('')
    const selectedAssignees = ref<(string | number)[]>([])

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const toggleAssignee = (assigneeId: string | number) => {
      const index = selectedAssignees.value.indexOf(assigneeId)
      if (index === -1) {
        selectedAssignees.value.push(assigneeId)
      } else {
        selectedAssignees.value.splice(index, 1)
      }
      emitFilterChange()
    }

    const emitFilterChange = () => {
      emit('filter-change', {
        keyword: keyword.value,
        assignees: selectedAssignees.value
      })
    }

    const handleKeywordChange = (_input: never, value: string) => {
      keyword.value = value.trim()
      emitFilterChange()
    }

    const handleClearFilters = () => {
      keyword.value = ''
      selectedAssignees.value = []
      emit('clear-filters', { keyword: '', assignees: [] })
    }

    return {
      keyword,
      selectedAssignees,
      handleKeywordChange,
      handleClearFilters,
      toggleAssignee,
      getInitials
    }
  }
})
</script>

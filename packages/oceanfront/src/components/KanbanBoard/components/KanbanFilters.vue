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
                :title="assignee.name"
              >
                <img
                  v-if="assignee.avatar"
                  :src="assignee.avatar"
                  :alt="assignee.name"
                  class="avatar-image"
                />
                <div v-else class="avatar-text">
                  {{ getAssigneeInitials(assignee.name) }}
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
import { defineComponent, PropType, ref, onUnmounted, watch } from 'vue'
import { IKanbanCardAssignee } from '../types'
import { getInitials } from '../utils'

export default defineComponent({
  name: 'OfKanbanFilters',

  props: {
    assignees: {
      type: Array as PropType<IKanbanCardAssignee[]>,
      default: () => []
    },
    searchInputPlaceholder: {
      type: String,
      default: 'Search by keyword...'
    },
    tags: {
      type: Set as PropType<Set<string>>,
      default: () => new Set<string>()
    },
    debounceTime: {
      type: Number,
      default: 300
    }
  },

  emits: ['filter-change', 'clear-filters'],

  setup(props, { emit }) {
    const keyword = ref('')
    const selectedAssignees = ref<(string | number)[]>([])
    let debounceTimeout: ReturnType<typeof setTimeout>

    watch(props.tags, (newTags) => {
      console.log('Tags changed:', newTags)
    })

    const getAssigneeInitials = (name: string) => {
      //Anonimus
      if (!name) return 'AN'
      return getInitials(name)
    }

    const emitFilterChange = () => {
      emit('filter-change', {
        keyword: keyword.value,
        assignees: selectedAssignees.value
      })
    }

    const handleKeywordChange = (_input: never, value: string) => {
      keyword.value = value.trim()
      clearTimeout(debounceTimeout)

      debounceTimeout = setTimeout(() => {
        emitFilterChange()
      }, props.debounceTime)
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

    const handleClearFilters = () => {
      keyword.value = ''
      selectedAssignees.value = []
      clearTimeout(debounceTimeout)
      emit('clear-filters', { keyword: '', assignees: [] })
    }

    onUnmounted(() => {
      clearTimeout(debounceTimeout)
    })

    return {
      keyword,
      selectedAssignees,
      handleKeywordChange,
      handleClearFilters,
      toggleAssignee,
      getAssigneeInitials
    }
  }
})
</script>

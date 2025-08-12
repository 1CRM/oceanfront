import { computed, ComputedRef, Ref, ref } from 'vue'

const defaults = {
  selectFieldAddItems: 'Add Items',
  selectFieldRemoveItems: 'Remove Items',
  listNoItems: 'No Items',
  remove: 'Remove Item',
  startAt: 'Start At',
  perPage: 'Per Page',
  update: 'Update'
}

const userLanuage: Ref<{ [key: string]: string }> = ref({})

const language: ComputedRef<{ [key: string]: string }> = computed(() => {
  return { ...defaults, ...userLanuage.value }
})

export const useLanguage = (): ComputedRef<{ [key: string]: string }> => {
  return language
}

export const provideLanguage = (lang: { [key: string]: string }): void => {
  userLanuage.value = lang
}

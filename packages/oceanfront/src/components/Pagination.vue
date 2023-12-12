<template>
  <transition>
    <div :id="outerId" class="of-pagination">
      <div class="of-pagination-header">
        <span
          class="of-buttonset"
          :aria-label="ariaLabels?.pagination ?? 'Pagination'"
          :class="{
            'of-buttonset--rounded': rounded,
            'of--elevated': variant == 'elevated',
          }"
        >
          <of-button
            v-if="showGoToFirst"
            icon="page first"
            :aria-label="ariaLabels?.first ?? 'Go To First'"
            :variant="variantVal"
            :density="densityVal"
            @click="goToFirst()"
          ></of-button>
          <of-button
            v-for="item in pages"
            :key="item"
            :active="page === item"
            :ref="page === item ? 'activeButton' : null"
            :variant="variantVal"
            :density="densityVal"
            :aria-label="(ariaLabels?.page ?? 'Page') + ' ' + item"
            @click="onSelectPage(item)"
          >
            {{ item }}
          </of-button>
          <of-button
            v-if="showGoToLast"
            icon="page last"
            :aria-label="ariaLabels?.last ?? 'Go To Last'"
            :variant="variantVal"
            :density="densityVal"
            @click="goToLast()"
          >
          </of-button>
          <of-button
            v-if="showCustomOffsetPopup"
            :id="outerId + '-expand'"
            icon="select down"
            :variant="variantVal"
            :density="densityVal"
            :aria-label="ariaLabels?.expand ?? 'Expand'"
            @click="openOffsetPopup"
          >
            <template #default v-if="$slots['custom-offset-button']">
              <slot name="custom-offset-button"></slot>
            </template>
          </of-button>
        </span>
      </div>

      <of-overlay
        :active="offsetPopupOpened"
        :shade="false"
        :target="'#' + outerId + '-expand'"
        @blur="closeOffsetPopup()"
      >
        <slot name="custom-offset-popup" v-if="showCustomOffsetPopup">
          <div role="menu" class="of-menu of-pagination-offset of--elevated-1">
            <form
              class="of-group"
              method="POST"
              action="#"
              @submit.prevent="updateOffsetParams()"
            >
              <div class="of-group-row of--pad">
                <of-text-field
                  v-bind="startAtField"
                  v-model.number="startAtValue"
                  input-type="number"
                />
                <of-text-field
                  v-bind="perPageField"
                  v-model.number="perPageValue"
                  input-type="number"
                />
              </div>
              <div class="of-group-row of--pad">
                <of-button icon="accept" @click="updateOffsetParams()"
                  >Update</of-button
                >
              </div>
            </form>
          </div>
        </slot>
      </of-overlay>
    </div>
  </transition>
</template>

<script lang="ts">
import {
  defineComponent,
  computed,
  ref,
  Ref,
  watchEffect,
  watch,
  nextTick,
} from 'vue'
import { OfOverlay } from './Overlay'
import { Paginator } from '../lib/paginator'

let sysPaginationIndex = 0

export default defineComponent({
  name: 'OfPagination',
  components: { OfOverlay },
  props: {
    id: String,
    modelValue: { type: Number, required: true },
    totalPages: { type: Number, required: true },
    totalVisible: Number,
    variant: String,
    density: { type: [String, Number], default: null },
    customOffsetPopup: [Boolean, String],
    startRecord: Number,
    perPage: Number,
    rounded: Boolean,
    ariaLabels: Object,
    showOnlyPage: { type: Boolean, default: true },
  },
  emits: ['update:modelValue', 'select-page', 'update-offset'],
  setup(props, context) {
    let page: Ref<number> = computed(() => props.modelValue || 1)
    const totalVisible: Ref<number> = computed(() => props.totalVisible || 5)
    const activeButton = ref<any>(null)

    let autoId: string
    const outerId = computed(() => {
      let id = props.id
      if (!id) {
        if (!autoId) {
          autoId = 'of-pagination-' + ++sysPaginationIndex
        }
        id = autoId
      }
      return id
    })
    const variantVal = computed(() => props.variant || 'default')
    const densityVal = computed(() => props.density || 'default')

    const getStartPageNum = function (): number {
      if (props.totalPages <= totalVisible.value) {
        return 1
      } else {
        let itemsBefore = 2
        if (totalVisible.value <= itemsBefore) {
          itemsBefore = 1
        }
        let startPage = page.value - itemsBefore
        startPage = Math.max(1, startPage)

        const curLast = startPage + totalVisible.value - 1
        if (curLast > props.totalPages) {
          startPage -= curLast - props.totalPages
        }
        return startPage
      }
    }

    const getEndPageNum = function (): number {
      if (props.totalPages <= totalVisible.value) {
        return props.totalPages
      } else {
        const start = getStartPageNum()
        let end = start + totalVisible.value - 1
        if (end > props.totalPages) end = props.totalPages
        return end
      }
    }

    const pages = computed(() => {
      const start = getStartPageNum()
      const end = getEndPageNum()
      let result = []

      for (let i = start; i <= end; i++) {
        result.push(i)
      }

      return result.length > 1 ? result : props.showOnlyPage ? result : []
    })

    const showGoToFirst = computed(() => {
      if (props.totalPages <= totalVisible.value) {
        return false
      } else {
        const start = getStartPageNum()
        return start > 1
      }
    })

    const showGoToLast = computed(() => {
      if (props.totalPages <= totalVisible.value) {
        return false
      } else {
        const end = getEndPageNum()
        return end < props.totalPages
      }
    })

    const onSelectPage = function (page: number) {
      closeOffsetPopup()
      context.emit('update:modelValue', page)

      const paginator: Paginator = {
        page: page,
        startRecord: startAtValue.value,
        perPage: perPageValue.value,
      }
      context.emit('select-page', paginator)
    }

    const focusActiveButton = () => {
      nextTick(() => {
        const elt = activeButton.value?.$el?.querySelector(
          'button'
        ) as HTMLElement | null
        if (elt) elt.focus()
      })
    }

    const goToFirst = function () {
      onSelectPage(1)
      focusActiveButton()
    }

    const goToLast = function () {
      onSelectPage(props.totalPages)
      focusActiveButton()
    }

    //Custom Offset Popup
    const startAtValue: Ref<number> = ref(props.startRecord || 1)

    watch(
      () => props.startRecord,
      (val) => {
        startAtValue.value = val as number
      }
    )

    const perPageValue: Ref<number> = ref(props.perPage || 20)

    watch(
      () => props.perPage,
      (val) => {
        perPageValue.value = val as number
      }
    )

    watchEffect(() => {
      if (startAtValue.value <= 0) startAtValue.value = 1
      if (perPageValue.value <= 0) perPageValue.value = 1
    })

    const showCustomOffsetPopup = computed(
      () => props.customOffsetPopup || false
    )
    const offsetPopupOpened = ref(false)

    const openOffsetPopup = () => {
      offsetPopupOpened.value = true
    }

    const closeOffsetPopup = () => {
      offsetPopupOpened.value = false
    }

    const startAtField = {
      hidden: false,
      label: 'Start At',
      readOnly: false,
      class: 'of--small',
    }

    //TODO: replace number text input with select for per page selection
    const perPageField = {
      hidden: false,
      label: 'Per Page',
      readOnly: false,
      class: 'of--small',
    }

    const pageItems = computed(() => {
      const pages = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100]
      let items = []

      for (const page of pages) {
        items.push({
          text: page,
          value: page,
          disabled: false,
        })
      }

      return items
    })

    const updateOffsetParams = function () {
      closeOffsetPopup()
      const paginator: Paginator = {
        page: page.value,
        startRecord: startAtValue.value,
        perPage: perPageValue.value,
      }
      context.emit('update-offset', paginator)
    }

    return {
      variantVal,
      densityVal,
      page,
      pages,
      outerId,
      activeButton,

      showGoToFirst,
      showGoToLast,

      onSelectPage,
      goToFirst,
      goToLast,

      showCustomOffsetPopup,
      offsetPopupOpened,
      openOffsetPopup,
      closeOffsetPopup,
      startAtValue,
      startAtField,
      perPageField,
      perPageValue,
      pageItems,
      updateOffsetParams,
    }
  },
})
</script>

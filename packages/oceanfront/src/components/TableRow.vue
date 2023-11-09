<template>
  <div
    class="of-data-table-row"
    ref="itemRef"
    @mousemove="dragInfo?.draggable && mouseMove($event)"
    @touchmove="dragInfo?.draggable && mouseMove($event)"
    :class="{
      odd: index % 2 != 0,
      nested: item.nested,
      selected: selectedItem,
    }"
    :key="item.id ?? index"
  >
    <div
      v-if="dragInfo?.draggable"
      class="grab-button"
      @mousedown="item.draggable && dragStart($event)"
      @touchstart="item.draggable && dragStart($event)"
      :class="{ draggable: item.draggable }"
    >
      <of-icon v-if="item.draggable" name="menu"></of-icon>
    </div>
    <div v-if="rowsSelector">
      <slot name="rows-selector" :record="rowsRecord" :item="row">
        <of-field
          type="toggle"
          variant="basic"
          class="row-selector"
          :locked="selectLocked"
          :mode="selectLocked ? 'disabled' : 'editable'"
          :record="selectLocked ? undefined : rowsRecord"
          :model-value="selectLocked ? true : rowsRecord.value[item.id]"
          :name="item.id"
        />
      </slot>
      <slot name="first-cell" :record="rowsRecord" :item="row" />
    </div>
    <div
      v-for="(col, colidx) of rowItem.columns"
      :style="[col.value === dragInfo?.nestedIndicator ? nestedStyle : {}]"
      :class="col.class"
      :key="colidx"
      :data-index="coords"
      :data-depth="depth"
    >
      <svg
        v-if="col.value === dragInfo?.nestedIndicator && depth"
        width="20px"
        height="20px"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-labelledby="previousAltIconTitle"
        stroke="#000000"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        color="#000000"
      >
        <path d="M8 4L4 8L8 12" />
        <path
          d="M4 8H14.5C17.5376 8 20 10.4624 20 13.5V13.5C20 16.5376 17.5376 19 14.5 19H5"
        />
      </svg>
      <template v-if="item[col.value]?.editable && editable">
        <of-editable-field
          :mode="editType"
          v-model="item[col.value]"
          :show-old-values="showOldValues"
        ></of-editable-field>
      </template>
      <template v-else>
        <div class="field-value">
          <of-data-type :value="item[col.value]"></of-data-type>
        </div>
      </template>
    </div>
  </div>
  <template v-if="item.subitems?.length">
    <template
      :key="setChildCoords(subidx as number).join('-')"
      v-for="(subrow, subidx) of item.subitems"
    >
      <of-table-row
        :row="subrow"
        :rows-selector="rowsSelector"
        :select-locked="selectLocked"
        v-on="events"
        @update:row="rowUpdated"
        :drag-info="{
          ...dragInfo,
          isLastChild: subidx === item.subitems.length - 1,
          highlighted:
            highlighted ||
            coords.join('-') === dragInfo?.draggingItem.join('-'),
        }"
        :edit-type="editType"
        :editable="editable"
        :depth="depth + 1"
        :coords="setChildCoords(subidx as number)"
        :point-next="setNextPointer(subidx as number)"
        :show-old-values="showOldValues"
        :columns="rowItem.columns"
        :rows-record="rowsRecord"
        :idx="subidx"
      >
        <template #first-cell>
          <slot name="first-cell" :record="rowsRecord" :item="subrow" />
        </template>
      </of-table-row>
    </template>
  </template>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref, watch } from 'vue'
import { OfField } from './Field'
import { OfIcon } from './Icon'
import OfEditableField from './Editable.vue'

export default defineComponent({
  name: 'OfTableRow',
  components: { OfEditableField, OfIcon, OfField },
  props: {
    row: Object,
    idx: Number as any,
    dragInfo: Object as any,
    rowsSelector: Boolean,
    showOldValues: Boolean,
    editable: Boolean,
    isLastChild: Boolean,
    selectLocked: Boolean,
    editType: String as any,
    columns: Object as any,
    pointNext: {
      type: Array,
      required: true,
    },
    rowsRecord: Object as any,
    coords: {
      type: Array,
      required: true,
    },
    depth: {
      type: Number,
      default: 0,
    },
  },
  emits: ['dragstart', 'update:row', 'setCoords', 'setDepth'],
  setup(props, ctx) {
    const index = computed(() => props.idx)
    const currentCords = ref(props.coords)
    type RowItem = {
      item: any
      columns: any
    }

    const rowItem = reactive<RowItem>({
      item: props.row,
      columns: props.columns,
    })

    const item = computed({
      get() {
        return rowItem.item
      },
      set(val) {
        ctx.emit('update:row', val)
      },
    }) as any
    watch(
      () => [props.row, props.columns],
      ([item, columns]) => Object.assign(rowItem, { item, columns }),
      { deep: true }
    )
    const checkSubitemDepth = (elem: any) => {
      if (!elem.subitems) {
        return 1
      }
      let depth = 0
      elem.subitems.forEach((v: any) => {
        let subitemDepth = checkSubitemDepth(v)
        if (subitemDepth > depth) {
          depth = subitemDepth
        }
      })
      return 1 + depth
    }
    const selfNestedDepth = computed(() => {
      if (!item.value.subitems?.length) {
        return 1
      }
      let depth = 0
      item.value.subitems.forEach((v: any) => {
        let subitemDepth = checkSubitemDepth(v)
        if (subitemDepth > depth) {
          depth = subitemDepth
        }
      })
      return depth + 1
    })
    const globalIdx = computed(() => {
      if (!props.dragInfo?.listedRows) return null
      return props.dragInfo?.listedRows.findIndex(
        (v: any) => v.coordIndex === currentCords.value?.join('-')
      )
    })
    const prevItem = computed(() => {
      if (globalIdx.value) {
        return props.dragInfo?.listedRows[globalIdx.value - 1]
      }
      return null
    })
    const nextItem = computed(() => {
      if (globalIdx.value < props.dragInfo?.listedRows?.length - 1) {
        return props.dragInfo?.listedRows[globalIdx.value + 1]
      }
      return null
    })
    const allParent = computed(() => props.dragInfo.allParent)
    const isCurrentTarget = computed(() => {
      const coordsIdx = currentCords.value.join('-')
      const targetCoords = props.dragInfo?.currentCoords
      return (
        targetCoords.length > 1 &&
        targetCoords.slice(0, targetCoords.length - 1).join('-') === coordsIdx
      )
    })
    const highlighted = computed(() => {
      const coordsIdx = currentCords.value.join('-')
      const draggingCoords = props.dragInfo?.draggingItem
      return (
        props.dragInfo?.highlighted ||
        item.value?.highlighted ||
        coordsIdx === draggingCoords.join('-')
      )
    })
    const selected = computed(() => highlighted.value || isCurrentTarget.value)
    const selectedItem = ref(selected)
    const increaseCoord = (arr: any[], _idxx = 0) => {
      return arr.map((v: any, i: number, arr: any[]) => {
        if (i === arr.length - 1) {
          return parseInt(v) + 1
        }
        return parseInt(v)
      })
    }
    const findPrevWithDepth = (depth: number, including = false) => {
      if (globalIdx.value) {
        const endIdx = including ? globalIdx.value + 1 : globalIdx.value
        const arr = props.dragInfo?.listedRows.slice(0, endIdx).reverse()
        return arr.find((v: any) => v.depth === depth)
      }
      return null
    }

    const itemRef = ref()
    const childDepths: { [_: string]: any } = {}

    const events = {
      dragstart: (data: any) => {
        ctx.emit('dragstart', data)
      },
      setCoords: (data: any) => {
        ctx.emit('setCoords', data)
      },
    }
    watch(
      () => item.value,
      () => ctx.emit('update:row'),
      { immediate: false, deep: true }
    )
    const setChildCoords = (idx: number) => {
      const arr =
        props.coords?.map((v: any) => {
          return v
        }) || []
      arr.push(idx)
      return arr
    }
    const isOnSelfItem = computed(() => {
      return (
        currentCords.value?.join('-') ===
        props.dragInfo?.draggingItem?.join('-')
      )
    })
    const isOnSelfArea = computed(() => {
      const currentDraggingItem = props.dragInfo?.draggingItem
      const indexes = currentCords.value
      if (currentDraggingItem.length > indexes.length) return false
      const selfIndexesToCheck =
        indexes?.slice(0, currentDraggingItem.length) || []
      return selfIndexesToCheck?.every(function (element: any, index: number) {
        return element == currentDraggingItem[index]
      })
    })
    const checkDragAvailability = (indexes: any[]) => {
      const currentDraggingItem = props.dragInfo?.draggingItem
      if (currentDraggingItem.length > indexes?.length) return true
      const selfIndexesToCheck =
        indexes?.slice(0, currentDraggingItem.length) || []
      return selfIndexesToCheck?.some(function (element: any, index: number) {
        return element != currentDraggingItem[index]
      })
    }
    const setNextPointer = (idx: number) => {
      if (idx < item.value.subitems?.length - 1) {
        const arr =
          props.coords?.map((v: any) => {
            return v
          }) || []
        arr.push(idx + 1)
        return arr
      }
      return props.pointNext
    }
    const nestedStyle = computed(() => {
      const res = {} as any
      if (props.depth) {
        res.paddingLeft = 'calc(0.75rem + ' + 20 * props.depth + 'px)'
      }
      return res
    })

    const findPossibleTarget = (depth: number, includeSelf = false) => {
      let tar = findPrevWithDepth(depth, includeSelf)
      return depth === 0 ||
        ((allParent.value || findPrevWithDepth(depth - 1)?.parent) &&
          props.dragInfo.currentCanBeNested &&
          depth + props.dragInfo.currentInnerDepth <=
            props.dragInfo.nestedLimit)
        ? tar
        : false
    }
    const getTargetInfo = (
      isOnTop: boolean,
      nestedDepth: number,
      index: null | [],
      currentDepth: null | number
    ) => {
      let coords: any = []
      let fixArrowNext = !isOnTop
      let target: any = {}
      let nestedAttempt = false
      let depth = 0
      const prevItemCoords = index ?? prevItem.value?.coords?.slice()
      const prevItemDepth = currentDepth ?? prevItem.value?.depth
      const itemCoords = currentCords.value.slice()
      const itemDepth = currentDepth ?? props.depth
      let singleItem = isOnSelfItem.value && !item.value.subitems?.length
      if (props.dragInfo.currentCanBeNested && (!!prevItem.value || !isOnTop)) {
        if (isOnTop || singleItem) {
          nestedAttempt =
            !!prevItem.value &&
            ((isOnTop && checkDragAvailability(prevItemCoords)) ||
              singleItem) &&
            nestedDepth > prevItemDepth
          if (
            nestedAttempt &&
            (prevItem.value.parent || allParent.value) &&
            prevItemDepth + props.dragInfo.currentInnerDepth <
              props.dragInfo.nestedLimit
          ) {
            coords = prevItemCoords
            coords.push(0)
            depth = prevItemDepth + 1
          } else {
            if (
              (isOnSelfItem.value || !isOnSelfArea.value) &&
              ((props.dragInfo.isLastChild && isOnSelfItem.value) ||
                itemDepth === 0) &&
              (isOnTop || singleItem) &&
              prevItem.value
            ) {
              nestedDepth = Math.min(nestedDepth, prevItemDepth)
              for (let i = nestedDepth; i >= 0; i--) {
                target = findPossibleTarget(i)
                if (target && checkDragAvailability(target.coords)) {
                  coords = target.coords.slice()
                  coords = index ?? increaseCoord(coords, 1)
                  depth = target.depth
                  break
                }
              }
            } else {
              if (
                isOnSelfItem.value ||
                (checkDragAvailability(itemCoords) &&
                  itemDepth + props.dragInfo.currentInnerDepth <
                    props.dragInfo.nestedLimit)
              ) {
                coords = itemCoords
                depth = itemDepth
              }
            }
          }
        }
        if (!coords.length && !isOnTop) {
          fixArrowNext = true
          nestedAttempt = nestedDepth > itemDepth
          if (
            nestedAttempt &&
            (item.value.parent || allParent.value) &&
            !isOnSelfArea.value &&
            itemDepth + props.dragInfo.currentInnerDepth <
              props.dragInfo.nestedLimit
          ) {
            coords = itemCoords
            coords.push(0)
            depth = itemDepth + 1
          } else {
            let checkPossibleSibling = findPossibleTarget(itemDepth, true)
            if (checkPossibleSibling) {
              if (!isOnSelfArea.value) {
                coords = checkPossibleSibling.coords
                coords = increaseCoord(coords, 2)
                depth = itemDepth
              }
            }

            nestedDepth = Math.min(nestedDepth, itemDepth)
            if (props.dragInfo.isLastChild) {
              for (let i = nestedDepth; i >= 0; i--) {
                target = findPossibleTarget(i, true)
                if (target && checkDragAvailability(target.coords)) {
                  coords = target.coords.slice()
                  coords = index ?? increaseCoord(coords, 3)
                  depth = target.depth
                  break
                }
              }
            }
          }
        }
      } else {
        depth = 0
        if (isOnTop) {
          fixArrowNext = false
          if (prevItem.value) {
            if (itemDepth === 0) {
              coords = itemCoords
            }
          } else {
            coords = index ?? [0]
          }
        } else {
          fixArrowNext = true
          if (nextItem.value) {
            if (itemDepth === 0 && !item.value.subitems?.length) {
              coords = itemCoords
              coords = increaseCoord(coords, 4)
            } else if (nextItem.value.depth === 0) {
              coords = nextItem.value.coords
            }
          } else {
            let rows = props.dragInfo?.listedRows.slice()
            rows = rows.filter((v: any) => !v.depth)
            coords = !index ? [rows.length] : [(+index?.[0] || 0) + 1]
          }
        }
      }
      return { coords, depth, fixArrowNext }
    }
    const mouseMove = (event: MouseEvent | TouchEvent) => {
      if (event.cancelable) event.preventDefault()
      let index = null
      console.log(selectedItem.value)
      let currentDepth = null
      if (props.dragInfo?.dragInProgress) {
        let divElem: any = itemRef.value
        if (!divElem) return
        let element = divElem.querySelector('.of--align-start')
        if (event.type === 'touchmove') {
          element = document.elementFromPoint(
            props.dragInfo?.tableLeft + 55,
            (event as TouchEvent).changedTouches[0].clientY
          )
          if (!element?.classList?.contains('of--align-start')) {
            return
          }
          index = element.getAttribute('data-index')
          currentDepth = +element.getAttribute('data-depth') || 0
          index = index ? index?.split(',') : []
          currentCords.value = index
          selectedItem.value = true
        }
        const height = element?.getBoundingClientRect().height
        const top = element?.getBoundingClientRect().top
        let pagex =
          (event as MouseEvent).pageX ??
          (event as TouchEvent).changedTouches[0].pageX
        let ofy =
          (event as MouseEvent).offsetY ??
          Math.floor(
            ((event as TouchEvent).changedTouches[0].clientY - top) % height
          )

        ofy = ofy < 0 ? height + ofy : ofy
        let nestedDepth = Math.min(
          Math.floor((pagex - props.dragInfo?.tableLeft - 55) / 20),
          props.dragInfo?.nestedLimit - 1
        )
        nestedDepth = Math.max(0, nestedDepth)
        const isOnTop = ofy < height / 2
        let { coords, fixArrowNext, depth } = getTargetInfo(
          isOnTop,
          nestedDepth,
          index,
          currentDepth
        )
        if (coords.length) {
          ctx.emit('setCoords', {
            coords: coords,
            element: element,
            fixArrowNext: fixArrowNext,
            depth: depth,
          })
        }
        return
      }
    }
    const dragStart = (event: MouseEvent | TouchEvent) => {
      ctx.emit('dragstart', {
        coords: props.coords,
        start:
          (event as MouseEvent).pageX ??
          (event as TouchEvent).changedTouches[0].pageX,
        depth: props.depth,
        element: event.target,
        canBeNested: item.value.nested,
        innerDepth: selfNestedDepth.value,
      })
    }
    const rowUpdated = () => {
      return
    }
    return {
      item,
      itemRef,
      index,
      events,
      mouseMove,
      nestedStyle,
      isCurrentTarget,
      highlighted,
      dragStart,
      childDepths,
      rowUpdated,
      setChildCoords,
      setNextPointer,
      rowItem,
      currentCords,
      selectedItem,
    }
  },
})
</script>

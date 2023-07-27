<template>
  <div
    class="of-data-table-row"
    ref="itemRef"
    @mousemove="dragInfo?.draggable && mouseMove($event)"
    :class="{
      odd: index % 2 != 0,
      nested: item.nested,
      selected: highlighted || isCurrentTarget,
    }"
  >
    <div
      v-if="dragInfo?.draggable"
      class="grab-button"
      @mousedown="item.draggable && dragStart($event)"
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
      v-for="(col, colidx) of columns"
      :style="[col.value === dragInfo?.nestedIndicator ? nestedStyle : {}]"
      :class="col.class"
      :key="colidx"
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
        :columns="columns"
        :rows-record="rowsRecord"
        :idx="subidx"
      ></of-table-row>
    </template>
  </template>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
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
    const item = computed({
      get() {
        return props.row
      },
      set(val) {
        ctx.emit('update:row', val)
      },
    }) as any
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
        (v: any) => v.coordIndex === props.coords?.join('-')
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
      const coordsIdx = props.coords.join('-')
      const targetCoords = props.dragInfo?.currentCoords
      return (
        targetCoords.length > 1 &&
        targetCoords.slice(0, targetCoords.length - 1).join('-') === coordsIdx
      )
    })
    const highlighted = computed(() => {
      const coordsIdx = props.coords.join('-')
      const draggingCoords = props.dragInfo?.draggingItem
      return (
        props.dragInfo?.highlighted ||
        item.value?.highlighted ||
        coordsIdx === draggingCoords.join('-')
      )
    })
    const increaseCoord = (arr: any[], idxx = 0) => {
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
    const findNextLowerLevel = (depth: number) => {
      const arr = props.dragInfo?.listedRows.slice()
      return arr.find(
        (v: any, i: number) => v.depth <= depth && i > globalIdx.value
      )
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
      () => {
        if (item.value.subitems && false) {
          item.value.subitems = item.value.subitems.filter(
            (v: any) => !v.toRemove
          )
          item.value.subitems
            .sort((a: any, b: any) => a.order - b.order)
            .forEach((value: any, index: number) => {
              value.order = index
            })
        }
      },
      { deep: true }
    )
    watch(
      () => item.value,
      () => {
        ctx.emit('update:row')
      },
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
      return props.coords?.join('-') === props.dragInfo?.draggingItem?.join('-')
    })
    const isOnSelfArea = computed(() => {
      const currentDraggingItem = props.dragInfo?.draggingItem
      const indexes = props.coords
      if (currentDraggingItem.length > indexes.length) return false
      const selfIndexesToCheck =
        indexes?.slice(0, currentDraggingItem.length) || []
      return selfIndexesToCheck?.every(function (element: any, index: number) {
        return element === currentDraggingItem[index]
      })
    })
    const checkDragAvailability = (indexes: any[]) => {
      const currentDraggingItem = props.dragInfo?.draggingItem
      if (currentDraggingItem.length > indexes.length) return true
      const selfIndexesToCheck =
        indexes?.slice(0, currentDraggingItem.length) || []
      return selfIndexesToCheck?.some(function (element: any, index: number) {
        return element !== currentDraggingItem[index]
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
    const getTargetInfo = (isOnTop: boolean, nestedDepth: number) => {
      let coords: any = []
      let depth = 0
      let fixArrowNext = !isOnTop
      let target: any = {}
      let nestedAttempt = false
      let singleItem = isOnSelfItem.value && !item.value.subitems?.length
      if (props.dragInfo.currentCanBeNested && (!!prevItem.value || !isOnTop)) {
        if (isOnTop || singleItem) {
          nestedAttempt =
            !!prevItem.value &&
            ((isOnTop && checkDragAvailability(prevItem.value.coords)) ||
              singleItem) &&
            nestedDepth > prevItem.value.depth
          if (
            nestedAttempt &&
            (prevItem.value.parent || allParent.value) &&
            prevItem.value.depth + props.dragInfo.currentInnerDepth <
              props.dragInfo.nestedLimit
          ) {
            coords = prevItem.value.coords.slice()
            coords.push(0)
            depth = prevItem.value.depth + 1
          } else {
            if (
              (isOnSelfItem.value || !isOnSelfArea.value) &&
              ((props.dragInfo.isLastChild && isOnSelfItem.value) ||
                props.depth === 0) &&
              (isOnTop || singleItem) &&
              prevItem.value
            ) {
              nestedDepth = Math.min(nestedDepth, prevItem.value.depth)
              for (let i = nestedDepth; i >= 0; i--) {
                target = findPossibleTarget(i)
                if (target && checkDragAvailability(target.coords)) {
                  coords = target.coords.slice()
                  coords = increaseCoord(coords, 1)
                  depth = target.depth
                  break
                }
              }
            } else {
              if (
                isOnSelfItem.value ||
                (checkDragAvailability(props.coords) &&
                  props.depth + props.dragInfo.currentInnerDepth <
                    props.dragInfo.nestedLimit)
              ) {
                coords = props.coords.slice()
                depth = props.depth
              }
            }
          }
        }

        if (!coords.length && !isOnTop) {
          fixArrowNext = true
          nestedAttempt = nestedDepth > props.depth
          if (
            nestedAttempt &&
            (item.value.parent || allParent.value) &&
            !isOnSelfArea.value &&
            props.depth + props.dragInfo.currentInnerDepth <
              props.dragInfo.nestedLimit
          ) {
            coords = props.coords.slice()
            coords.push(0)
            depth = props.depth + 1
          } else {
            let checkPossibleSibling = findPossibleTarget(props.depth, true)
            if (checkPossibleSibling) {
              if (!isOnSelfArea.value) {
                coords = checkPossibleSibling.coords
                coords = increaseCoord(coords, 2)
                depth = props.depth
              }
            }
            nestedDepth = Math.min(nestedDepth, props.depth)
            if (props.dragInfo.isLastChild) {
              for (let i = nestedDepth; i >= 0; i--) {
                target = findPossibleTarget(i, true)
                if (target && checkDragAvailability(target.coords)) {
                  coords = target.coords.slice()
                  coords = increaseCoord(coords, 3)
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
            if (props.depth === 0) {
              coords = props.coords
            }
          } else {
            coords = [0]
          }
        } else {
          fixArrowNext = true
          if (nextItem.value) {
            if (props.depth === 0 && !item.value.subitems?.length) {
              coords = props.coords.slice()
              coords = increaseCoord(coords, 4)
            } else if (nextItem.value.depth === 0) {
              coords = nextItem.value.coords
            }
          } else {
            let rows = props.dragInfo?.listedRows.slice()
            rows = rows.filter((v: any) => !v.depth)
            coords = [rows.length]
          }
        }
      }
      return { coords, depth, fixArrowNext }
    }
    const mouseMove = (event: MouseEvent) => {
      if (props.dragInfo?.dragInProgress) {
        let divElem: any = itemRef.value
        if (!divElem) return
        const height = divElem
          .querySelector('.of--align-start')
          .getBoundingClientRect()?.height
        let ofy = event.offsetY
        let pagex = event.pageX

        let nestedDepth = Math.min(
          Math.floor((pagex - props.dragInfo?.tableLeft - 55) / 20),
          props.dragInfo?.nestedLimit - 1
        )
        nestedDepth = Math.max(0, nestedDepth)
        const isOnTop = ofy < height / 2
        let { coords, fixArrowNext, depth } = getTargetInfo(
          isOnTop,
          nestedDepth
        )
        if (coords.length) {
          ctx.emit('setCoords', {
            coords: coords,
            element: event.target,
            fixArrowNext: fixArrowNext,
            depth: depth,
          })
        }
        return
      }
    }
    const dragStart = (event: MouseEvent) => {
      ctx.emit('dragstart', {
        coords: props.coords,
        start: event.pageX,
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
    }
  },
})
</script>

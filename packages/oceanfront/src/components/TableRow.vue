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
      @mousedown="dragStart"
      :class="{ draggable: item.draggable }"
    >
      <of-icon v-if="item.draggable" name="menu"></of-icon>
      <!--      {{ coords.join() }}-->
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
      :key="index + '_' + subidx"
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
import highlight from '@oceanfront/demo/src/components/Highlight.vue'

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
    const increaseCoord = (arr: any[]) => {
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
        return arr.find((v: any) => v.depth === depth).coords
      }
      return props.coords
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
      const indexes = props.coords || []
      if (currentDraggingItem.length > indexes.length) return false
      const selfIndexesToCheck =
        indexes?.slice(0, currentDraggingItem.length) || []
      return selfIndexesToCheck?.every(function (element: any, index: number) {
        return element === currentDraggingItem[index]
      })
    })
    const checkDragAvailability = (indexes: number[]) => {
      const currentDraggingItem = props.dragInfo?.draggingItem
      if (currentDraggingItem.length > indexes.length) return false
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
        let coords: any = []
        let fixArrowNext = false
        let depth = props.depth
        const isOnTop = ofy < height / 2
        if (isOnTop) {
          if (!isOnSelfArea.value || isOnSelfItem.value) {
            if (
              checkDragAvailability(prevItem.value?.coords || []) ||
              isOnSelfItem.value
            ) {
              if (nestedDepth >= props.depth) {
                if (index.value || !isOnSelfItem.value) {
                  if (nestedDepth >= prevItem.value?.depth + 1) {
                    depth = prevItem.value?.depth + 1
                    coords = prevItem.value.coords.slice()
                    coords.push(0)
                  } else {
                    depth = nestedDepth
                    coords = findPrevWithDepth(nestedDepth)
                    coords = increaseCoord(coords)
                  }
                }
              } else {
                if (isOnSelfItem.value) {
                  if (props.dragInfo?.isLastChild) {
                    if (nestedDepth < 0) {
                      nestedDepth = 0
                    }
                    depth = nestedDepth
                    coords = findPrevWithDepth(nestedDepth)
                    coords = increaseCoord(coords)
                  }
                } else {
                  coords = props.coords
                  depth = props.depth
                }
              }
            } else {
              coords = props.coords
              depth = props.dragInfo?.draggingItem?.length - 1
            }
            ctx.emit('setCoords', {
              coords: coords,
              element: event.target,
              fixArrowNext,
              depth: depth,
            })
          }
        } else {
          fixArrowNext = true
          if (!isOnSelfArea.value || isOnSelfItem.value) {
            if (isOnSelfItem.value) {
              if (!item.value?.subitems?.length) {
                if (nestedDepth >= props.depth) {
                  if (index.value) {
                    if (nestedDepth >= prevItem.value?.depth + 1) {
                      depth = prevItem.value?.depth + 1
                      coords = prevItem.value.coords.slice()
                      coords.push(0)
                    } else {
                      depth = nestedDepth
                      coords = findPrevWithDepth(nestedDepth)
                      coords = increaseCoord(coords)
                    }
                  }
                } else {
                  if (nestedDepth < 0) {
                    nestedDepth = 0
                  }
                  depth = nestedDepth
                  coords = findPrevWithDepth(nestedDepth)
                  coords = increaseCoord(coords)
                }
                ctx.emit('setCoords', {
                  coords: coords,
                  element: event.target,
                  fixArrowNext,
                  depth: depth,
                })
              }
            } else {
              if (nestedDepth >= props.depth + 1) {
                depth = props.depth + 1
                coords = props.coords.slice()
                coords.push(0)
              } else {
                if (props.dragInfo?.isLastChild) {
                  if (nestedDepth < 0) {
                    nestedDepth = 0
                  }
                  depth = nestedDepth
                  coords = findPrevWithDepth(nestedDepth, true)
                  coords = increaseCoord(coords)
                } else {
                  coords = increaseCoord(props.coords)
                  depth = props.depth
                }
              }
              ctx.emit('setCoords', {
                coords: coords,
                element: event.target,
                fixArrowNext,
                depth: depth,
              })
            }
          }
          // if (nestedDepth > props.depth) {
          //   if (nestedDepth > props.depth + 1) {
          //   }
          // }
          // if (nestedDepth > props.depth + 1) {
          //   depth = props.depth + 1
          //   coords = props.coords?.slice()
          //   coords.push(0)
          // } else {
          //   coords = increaseCoord(props.coords?.slice())
          //   depth = props.depth
          // }
        }
      }
    }
    const dragStart = (event: MouseEvent) => {
      ctx.emit('dragstart', {
        coords: props.coords,
        start: event.pageX,
        depth: props.depth,
        element: event.target,
      })
    }
    const rowUpdated = (data: any) => {
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
  computed: {
    highlight() {
      return highlight
    },
  },
})
</script>

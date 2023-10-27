<template>
  <of-field
    type="select"
    :items="[
      { value: '', text: '(none)' },
      { value: 'plus', text: 'Plus' },
    ]"
    label="Icon Effect"
    v-model="iconEffect"
    inline
  />
  <br /><br />

  <div class="outer" v-bind="divAttrs" :class="{ dragging: dragActive }">
    <of-config :icons="icons">
      <div class="load-error">{{ loadError }}</div>

      <div>
        <of-icon
          name="preview-icon"
          scale="xs"
          title="16px scale"
          :effect="iconEffect"
        />
        <of-icon
          name="preview-icon"
          scale="sm"
          title="20px scale"
          :effect="iconEffect"
        />
        <of-icon
          name="preview-icon"
          scale="md"
          title="24px scale (standard)"
          :effect="iconEffect"
        />
        <of-icon
          name="preview-icon"
          scale="lg"
          title="28px scale"
          :effect="iconEffect"
        />
        <of-icon
          name="preview-icon"
          scale="xl"
          title="32px scale"
          :effect="iconEffect"
        />
      </div>

      <div>
        <of-icon
          name="preview-icon"
          class="style-no-alt"
          title="without alt layer"
          :effect="iconEffect"
        />

        <of-icon
          name="preview-icon"
          class="style-blue"
          title="fill single colour"
          :effect="iconEffect"
        />
        <of-icon
          name="preview-icon"
          class="style-contrast"
          title="fill two colours"
          :effect="iconEffect"
        />

        <div class="round">
          <of-icon name="preview-icon" :effect="iconEffect" />
        </div>
        <div class="roundr">
          <of-icon name="preview-icon" :effect="iconEffect" />
        </div>

        <svg
          style="width: 0; height: 0; position: absolute"
          aria-hidden="true"
          focusable="false"
        >
          <linearGradient id="of-icon-grad-1" x2="100%" y2="100%">
            <!-- FIXME use variables -->
            <stop offset="0%" class="g g1" stop-color="#cfc998" />
            <stop offset="60%" class="g g2" stop-color="#deb887" />
          </linearGradient>
          <linearGradient id="of-icon-grad-2" x2="1" y2="1">
            <!-- FIXME use variables -->
            <stop
              offset="0%"
              class="g g1"
              stop-color="#fff"
              stop-opacity="0.6"
            />
            <stop offset="60%" class="g g2" stop-color="#fff" />
          </linearGradient>
        </svg>
      </div>

      <div>
        <canvas
          width="100"
          height="100"
          title="24px scaled"
          @vnodeMounted="draw"
          @vnodeUpdated="draw"
        ></canvas>
      </div>
    </of-config>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, VNode } from 'vue'

const previewCanvas = document.createElement('canvas')

function drawPreview(paths: string[], target: HTMLCanvasElement): void {
  previewCanvas.width = 24
  previewCanvas.height = 24
  const ctx = previewCanvas.getContext('2d')
  if (paths) {
    const pri = paths[paths.length - 1]
    const path = new Path2D(pri)
    ctx!.fill(path, 'evenodd')
  }
  target.width = 96
  target.height = 96
  const tgCtx = target.getContext('2d')
  const scale = target.width / 24
  tgCtx!.imageSmoothingEnabled = false
  tgCtx!.scale(scale, scale)
  tgCtx!.drawImage(previewCanvas, 0, 0)
}

const parseSvg = (svgData: string): { paths: string[] } => {
  const svgDom = new DOMParser().parseFromString(svgData, 'image/svg+xml')
  if (!(svgDom.documentElement instanceof SVGSVGElement)) {
    throw new TypeError('Document not parsed as SVG')
  }
  const width = svgDom.documentElement.getAttribute('width')
  if (width !== '100%' && (!width || parseInt(width, 10) != 24)) {
    throw new TypeError('Expected width of 24px')
  }
  const height = svgDom.documentElement.getAttribute('height')
  if (width !== '100%' && (!height || parseInt(height, 10) != 24)) {
    throw new TypeError('Expected height of 24px')
  }
  const paths = []
  for (let idx = 0; idx < svgDom.documentElement.children.length; idx++) {
    const elt = svgDom.documentElement.children[idx]
    if (elt instanceof SVGPathElement) {
      if (elt.getAttribute('fill') === 'none') continue // remove spacer
      paths.push(elt.getAttribute('d') as string)
    }
  }
  return { paths }
}

export default defineComponent({
  name: 'OfIconPreview',
  setup(_props, _ctx) {
    const testIcon = ref({
      paths: [
        'M4.427,12.845c-0.835,-0.329 -1.427,-1.143 -1.427,-2.095l0,-4.5c0,-1.242 1.008,-2.25 2.25,-2.25l13.5,0c1.242,0 2.25,1.008 2.25,2.25l0,4.5c0,1.242 -1.008,2.25 -2.25,2.25l-8.137,0c-0.333,-1.435 -1.602,-2.504 -3.113,-2.504c-1.456,0 -2.687,0.992 -3.073,2.349Z',
        'M6.41,16c-0.834,-0.405 -1.41,-1.261 -1.41,-2.25c0,-1.38 1.12,-2.5 2.5,-2.5c1.38,0 2.5,1.12 2.5,2.5c0,0.989 -0.576,1.845 -1.41,2.25l0.91,0c0.828,0 1.5,0.672 1.5,1.5l0,3c0,0.828 -0.672,1.5 -1.5,1.5l-4,0c-0.828,0 -1.5,-0.672 -1.5,-1.5l0,-3c0,-0.828 0.672,-1.5 1.5,-1.5l0.91,0Zm9.433,-7.717l3.611,0l0,-0.024c-0.012,-2.066 -1.626,-3.738 -3.611,-3.738l0,3.762Zm0,0.795l2.815,0l0,0.019c-0.009,1.545 -1.267,2.797 -2.815,2.797l0,-2.816Zm-0.773,-3.668l0,6.5c-1.932,0 -3.5,-1.456 -3.5,-3.25c0,-1.793 1.568,-3.25 3.5,-3.25Zm-10.761,8.555c-1.309,-0.212 -2.309,-1.347 -2.309,-2.715l0,-5.5c0,-1.518 1.232,-2.75 2.75,-2.75l14.5,0c1.518,0 2.75,1.232 2.75,2.75l0,5.5c0,1.518 -1.232,2.75 -2.75,2.75l-8.561,0c0.006,-0.083 0.009,-0.166 0.009,-0.25c0,-0.258 -0.029,-0.509 -0.085,-0.75l8.137,0c1.242,0 2.25,-1.008 2.25,-2.25l0,-4.5c0,-1.242 -1.008,-2.25 -2.25,-2.25l-13.5,0c-1.242,0 -2.25,1.008 -2.25,2.25l0,4.5c0,0.952 0.592,1.766 1.427,2.095c-0.081,0.287 -0.125,0.591 -0.125,0.905c0,0.072 0.002,0.144 0.007,0.215Z',
      ],
    })
    const iconEffect = ref('')
    const icons = {
      resolve(name: string) {
        if (name === 'preview-icon') {
          return { svg: { paths: [...testIcon.value.paths] } }
        }
      },
    }
    const dragActive = ref(false)
    const loadError = ref('')

    const divAttrs = {
      onDragover: function (evt: DragEvent) {
        evt.stopPropagation()
        evt.preventDefault()
        evt.dataTransfer!.dropEffect = 'copy'
        dragActive.value = true
      },
      onDragleave: function (_evt: DragEvent) {
        dragActive.value = false
      },
      onDrop: function (evt: DragEvent) {
        dragActive.value = false

        evt.stopPropagation()
        evt.preventDefault()
        const files = evt.dataTransfer?.files
        loadError.value = ''

        if (files && files.length) {
          const reader = new FileReader()
          reader.onload = function (ev: ProgressEvent<FileReader>) {
            if (ev.loaded) {
              const svgData = ev.target?.result as string
              try {
                testIcon.value = parseSvg(svgData)
              } catch (e: any) {
                loadError.value = e.message
              }
            }
          }
          reader.readAsText(files[0])
        }
      },
    }

    const draw = (vnode: VNode) => {
      drawPreview(testIcon.value.paths, vnode.el as HTMLCanvasElement)
    }
    return {
      divAttrs,
      dragActive,
      draw,
      icons,
      iconEffect,
      loadError,
    }
  },
})
</script>

<style lang="scss">
canvas {
  border: 2px solid #ddd;
  margin-left: 10px;
  width: 96px;
  height: 96px;
}
.outer {
  align-items: center;
  background: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.5),
    rgba(255, 255, 255, 0.5) 10px,
    rgba(220, 220, 220, 0.5) 10px,
    rgba(220, 220, 220, 0.5) 20px
  );
  border: 1px solid #ddd;
  box-sizing: border-box;
  display: flex;
  flex-flow: row wrap;
  padding: 15px;
  position: relative;
  &.dragging {
    border-style: dashed;
    box-shadow: inset 0 0 5px 5px rgba(0, 0, 0, 0.1);
  }

  > .of-icon {
    border: 2px solid #ddd;
    margin-left: 10px;
  }
}
.load-error {
  position: absolute;
  left: 5px;
  top: 5px;
}
.of-icon.style-no-alt {
  --icon-size: 48pt;
  .alt {
    fill: transparent;
  }
}
.of-icon.style-blue {
  color: darkblue;
  --icon-size: 60pt;
}
.of-icon.style-contrast {
  color: rgb(39, 139, 170);
  --icon-size: 60pt;
  .alt {
    fill: red;
  }
}
.round {
  background: darkblue;
  border-radius: 50%;
  display: inline-flex;
  margin-left: 10px;
  padding: 20px;
  .of-icon {
    color: #def;
    --icon-size: 60pt;
  }
}
.roundr {
  background: #8893aa;
  border-radius: 20px;
  display: inline-flex;
  padding: 20px;
  margin-left: 10px;
  box-shadow: inset 0 -3px 0 3px rgba(0, 0, 0, 0.1);
  .of-icon {
    --icon-size: 60pt;
  }
  .pri {
    fill: url(#of-icon-grad-1);
  }
  .alt {
    fill: url(#of-icon-grad-2);
    opacity: 1;
  }
}
</style>

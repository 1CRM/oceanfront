<template>
  <of-config :form="{ locked: true }">
    <header class="app-header">
      <div class="app-header-gradient" />
      <div class="app-menu-source" @click.prevent="toggleSidebar">
        <of-icon name="menu" />
      </div>
      <div class="app-header-main">
        <div class="app-title">Oceanfront</div>
        <div class="app-tag">dev</div>
      </div>
      <div class="app-config-source" @click.prevent="showConfig">
        <of-icon name="theme settings" />
        <of-dialog v-model="configActive">
          <div class="container">
            <h4>Theme Config</h4>
            <of-slider-field
              id="baseFontSize"
              label="Base font size"
              min="10"
              max="30"
              step="2"
              v-model="baseFontSize"
            />
          </div>
        </of-dialog>
      </div>
      <div class="app-config-source" style="width: auto; flex-direction: row">
        <div
          style="
            margin: 2px;
            display: flex;
            padding: 0;
            align-items: center;
            justify-content: center;
            background: var(--of-color-background);
            border-radius: 20em;
          "
          v-for="t in tintParams"
          :key="t.name"
        >
          <div
            style="display: flex; color: var(--of-primary-tint)"
            :class="`of--tinted of--tint-${t.name}`"
            @click.prevent="() => (tint = t.name)"
          >
            <of-icon :name="t.icon" />
          </div>
        </div>
      </div>
      <div
        class="app-config-source"
        @click.prevent="
          () => {
            dark = !dark
          }
        "
      >
        <of-icon :name="'theme ' + (dark ? 'light' : 'dark')"></of-icon>
      </div>
    </header>
    <div class="app-body">
      <of-sidebar v-model="sidebarActive" :embed="!isMobile">
        <of-nav-group>
          <of-list-item to="/">Overview</of-list-item>
          <of-list-item to="/color-scheme">Colors &amp; Theming</of-list-item>
          <of-list-item to="/elevation">Elevation</of-list-item>
          <of-list-item to="/icons">Icons</of-list-item>
          <of-list-item to="/calendar">Calendar</of-list-item>
          <of-list-group value="1">
            <template #activator="{ state, toggle }">
              <of-list-item :expand="state" @click.prevent="toggle">
                Forms &amp; Inputs
              </of-list-item>
            </template>
            <of-list-item to="/buttons">Buttons</of-list-item>
            <of-list-item to="/field-states">Field States</of-list-item>
            <of-list-item to="/file-inputs">File Inputs</of-list-item>
            <of-list-item to="/select-inputs">Select Inputs</of-list-item>
            <of-list-item to="/slider-inputs">Slider Inputs</of-list-item>
            <of-list-item to="/text-inputs">Text Inputs</of-list-item>
            <of-list-item to="/toggle-inputs">Toggle Inputs</of-list-item>
            <of-list-item to="/radio-inputs">Radio Inputs</of-list-item>
            <of-list-item to="/datetime-inputs"
              >Date &amp; Time Inputs</of-list-item
            >
            <of-list-item to="/color-picker-inputs">Color Picker</of-list-item>
            <of-list-item to="/group-inputs">Grouped Inputs</of-list-item>
            <of-list-item to="/records">Records</of-list-item>
            <of-list-item to="/custom-records">Custom Records</of-list-item>
            <of-list-item to="/formatters">Value Formatters</of-list-item>
            <of-list-item to="/html-editor">HTML Editor</of-list-item>
          </of-list-group>
          <of-list-group value="1">
            <template #activator="{ state, toggle }">
              <of-list-item :expand="state" @click.prevent="toggle">
                Lists
              </of-list-item>
            </template>
            <of-list-item to="/data-tables">Data Tables</of-list-item>
            <of-list-item disabled>Menus and Toolbars</of-list-item>
            <of-list-item to="/pagination">Pagination</of-list-item>
          </of-list-group>
          <of-list-item to="/tabs">Tabs</of-list-item>
          <of-list-item to="/popups">Popups and Dialogs</of-list-item>
          <of-list-item to="/badges">Badges</of-list-item>
          <of-list-item to="/kanban">Kanban Board</of-list-item>
        </of-nav-group>
      </of-sidebar>
      <main class="app-main">
        <Suspense>
          <template #default>
            <router-view></router-view>
          </template>
          <template #fallback> Loading... </template>
        </Suspense>
      </main>
    </div>
  </of-config>
</template>

<script lang="ts">
import { useLayout } from 'oceanfront'
import {
  computed,
  defineComponent,
  nextTick,
  onErrorCaptured,
  ref,
  watch
} from 'vue'
import { useRouter } from 'vue-router'

function formatError(e: any) {
  return (e.stack || e).toString()
}

const tints = ['primary', 'secondary', 'tertiary']

export default defineComponent({
  name: 'App',
  setup() {
    const tint = ref('primary')
    const error = ref<any>(null)
    onErrorCaptured((e) => {
      error.value = formatError(e)
      return true
    })
    const layoutMgr = useLayout()
    const router = useRouter()
    const baseFontSize = ref('16')
    const configActive = ref(false)
    const dark = ref(false)
    const isMobile = computed(() => layoutMgr.isMobile)
    const sidebarMobileActive = ref(false)
    const sidebarDesktopActive = ref(true)
    const sidebarActive = computed({
      get() {
        return isMobile.value
          ? sidebarMobileActive.value
          : sidebarDesktopActive.value
      },
      set(val: boolean) {
        ;(isMobile.value ? sidebarMobileActive : sidebarDesktopActive).value =
          val
      }
    })
    watch(baseFontSize, (size) => {
      nextTick(() => {
        document.documentElement.style.fontSize = size + 'px'
      })
    })
    const showConfig = () => {
      configActive.value = true
    }
    const toggleSidebar = () => {
      if (isMobile.value) sidebarMobileActive.value = !sidebarMobileActive.value
      else sidebarDesktopActive.value = !sidebarDesktopActive.value
    }
    watch(router.currentRoute, () => {
      if (isMobile.value) {
        sidebarMobileActive.value = false
      }
    })

    watch(
      () => dark.value,
      (isDark) => {
        const htmlEl = document.body.parentElement
        if (htmlEl) htmlEl.className = isDark ? '-of-theme-dark' : ''
      },
      { immediate: true }
    )
    watch(
      () => tint.value,
      (tint) => {
        const htmlEl = document.body
        if (htmlEl) {
          tints.forEach((t) => {
            htmlEl.classList.remove(`of--tint-${t}`)
          })
          htmlEl.classList.add(`of--tint-${tint}`)
        }
      },
      { immediate: true }
    )
    const tintParams = computed(() =>
      tints.map((t) => ({
        name: t,
        icon: t == tint.value ? 'accept circle' : 'radio checked'
      }))
    )
    return {
      baseFontSize,
      configActive,
      error,
      isMobile,
      showConfig,
      sidebarActive,
      toggleSidebar,
      dark,
      tint,
      tintParams
    }
  }
})
</script>

<style lang="scss">
.error-message {
  white-space: pre-wrap;
}
.app-header {
  align-items: center;
  background: var(--of-primary-tint);
  color: var(--of-on-primary-tint);
  display: flex;
  flex: none;
  height: 3rem;
  position: relative;

  & .app-header-gradient {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 20%;
    --gradient-from: rgba(255, 255, 255, 0%);
    --gradient-to: rgba(255, 255, 255, 100%);

    .-of-theme-dark & {
      --gradient-from: rgba(0, 0, 0, 00%);
      --gradient-to: rgba(0, 0, 0, 100%);
    }
    background: linear-gradient(
      to bottom,
      var(--gradient-from),
      var(--gradient-to)
    );
  }
}
.app-header-main {
  align-items: center;
  display: flex;
  flex: auto;
}
.app-menu-source,
.app-config-source {
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-size: 1.75rem;
  width: 3rem;
  opacity: 90%;
  &:hover {
    opacity: 100%;
    text-shadow: 0 1.5px 2px rgba(36, 40, 60, 0.4);
  }
}
.app-body {
  display: flex;
  flex: auto;
  flex-flow: row nowrap;
  overflow: hidden;
}
.app-main {
  flex: auto;
  overflow: auto;
}
.app-title {
  font-size: 1.4rem;
  padding-left: 1em;
}
.app-tag {
  border: 1px solid var(--of-color-on-primary);
  border-radius: 2px;
  font-size: 0.9rem;
  margin-left: 1.5ch;
  padding: 0 0.5ch;
  text-transform: uppercase;
}
// temporary
.of-sidebar {
  padding-bottom: 0.25em;
  padding-top: 0.25em;
}
.of-sidebar .of--expandable {
  .of-list-item-content {
    font-size: 80%;
    text-transform: uppercase;
  }
}
.of-sidebar .of-list-group .of-list-item {
  border-left: 2px solid var(--of-color-outline);
}
.of--overlay > .of-sidebar {
  margin-top: 48px;
}
.of-bezier {
  font-size: 90%;
}
</style>

<template>
  <div class="container">
    <h1>Tabs</h1>
    <of-highlight lang="html" :value="sampleCode" />

    <div class="demo-fields of--elevated-1">
      <div class="row">
        <div class="column spaced">
          <of-field
            v-model="params.variant"
            label="Variant"
            type="select"
            :items="variants"
          />
        </div>
        <div class="column spaced">
          <of-field
            v-model="params.density"
            label="Density"
            type="select"
            :items="densities"
          />
        </div>
        <div class="column spaced" style="align-self: flex-end">
          <of-field
            v-model="params.rounded"
            label="Rounded"
            type="toggle"
            label-position="input"
          />
        </div>
        <div
          class="column spaced"
          style="align-self: flex-end"
          v-if="params.variant == 'attached'"
        >
          <of-field
            v-model="params.border"
            label="Border"
            type="toggle"
            label-position="input"
          />
        </div>
        <div
          class="column spaced"
          v-if="params.variant == 'attached' && params.border"
        >
          <of-field
            v-model="params.borderWidth"
            label="Content border width"
            type="select"
            :items="borderWidths"
          />
        </div>
      </div>
      <h1>App js tabs</h1>
      <of-tabs
        :items="itemsForAppJs"
        submenu
        top-tabs
        variant="material"
        v-model="selectedAppJs"
        @select-tab="selectTab"
      />
      <h2>Regular tabs</h2>
      <of-tabs
        :items="testItems"
        v-model="selected1"
        :variant="params.variant"
        :density="params.density"
        :rounded="params.rounded"
        :with-border="params.border"
        :active-offset="params.borderWidth"
        @select-tab="selectTab"
      />
      <div
        :class="{
          [`demo-tabs-content-${params.variant}`]: true,
          'with-border': params.border,
        }"
        :style="{
          '--border-width': params.borderWidth,
        }"
        class="demo-tabs-content"
      >
        Tab {{ selected1 + 1 }} content
      </div>
      <h2>Tabs with submenu</h2>
      <of-tabs
        :items="testItems5"
        submenu
        v-model="selected5"
        :variant="params.variant"
        :density="params.density"
        :rounded="params.rounded"
        :with-border="params.border"
        :active-offset="params.borderWidth"
        @select-tab="selectTab"
      />
      <div
        :class="{
          [`demo-tabs-content-${params.variant}`]: true,
          'with-border': params.border,
        }"
        :style="{
          '--border-width': params.borderWidth,
        }"
        class="demo-tabs-content"
      >
        Tab {{ selected5 + 1 }} content
      </div>
      <h2>Scrolling tabs</h2>
      <of-tabs
        :items="testItems2"
        v-model="selected2"
        :scrolling="true"
        :variant="params.variant"
        :density="params.density"
        :rounded="params.rounded"
        :with-border="params.border"
        :active-offset="params.borderWidth"
        style="max-width: 400px"
      />
      <div
        :class="{
          [`demo-tabs-content-${params.variant}`]: true,
          'with-border': params.border,
        }"
        :style="{
          '--border-width': params.borderWidth,
        }"
        class="demo-tabs-content"
      >
        Tab {{ selected2 + 1 }} content
      </div>
      <h2>Tabs with overflow button</h2>
      <of-tabs
        :items="testItems3"
        v-model="selected3"
        overflow-button
        :variant="params.variant"
        :density="params.density"
        :rounded="params.rounded"
        :with-border="params.border"
        :active-offset="params.borderWidth"
        style="max-width: 400px"
        @select-tab="selectTab"
      />
      <div
        :class="{
          [`demo-tabs-content-${params.variant}`]: true,
          'with-border': params.border,
        }"
        :style="{
          '--border-width': params.borderWidth,
        }"
        class="demo-tabs-content"
      >
        Tab {{ selected3 + 1 }} content
      </div>
    </div>
    <div class="demo-fields of--elevated-1">
      <h2>OSX tabs</h2>
      <of-tabs :items="testItems6" v-model="selected6" variant="osx" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue'
import { Tab } from 'oceanfront'

const variants = ['material', 'attached']
const borderWidths = ['1px', '2px', '3px']
const densities = ['default', '0', '1', '2', '3']

export default defineComponent({
  setup() {
    const sampleCode = `
<of-tabs :items="itemsList" v-model="selItem" variant="material" @select-tab="selectTab" />
<of-tabs :items="itemsList" v-model="selItem" variant="material" submenu />
<of-tabs :items="itemsList2" v-model="selItem" :scrolling="true" style="width: 400px;" />
<of-tabs :items="itemsList3" v-model="selItem" overflow-buttton style="width: 400px;" />
<of-tabs :items="itemsList" v-model="selItem" variant="osx" />
`

    const params = reactive({
      variant: 'material',
      rounded: false,
      border: false,
      borderWidth: '1px',
      density: 'default',
    })
    const itemsForAppJs = [
      {
        active: true,
        key: 0,
        icon: 'print',
        params: {
          dashboard: true,
          layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
          module: 'Home',
          url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
        },
        subMenuItems: [
          {
            key: 0,
            icon: 'print',
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Action Items',
            visible: true,
          },
          {
            key: 1,
            icon: 'print',
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calls',
            visible: true,
          },
          {
            key: 2,
            icon: 'print',
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calendar',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Meetings',
            visible: true,
          },
        ],
        text: "Today's Activities",
        visible: true,
      },
      {
        active: true,
        key: 1,
        icon: 'print',
        params: {
          dashboard: true,
          layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
          module: 'Home',
          url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
        },
        subMenuItems: [
          {
            key: 0,
            icon: 'print',
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 1,
            text: 'Action Items',
            visible: true,
          },
          {
            key: 1,
            icon: 'print',
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 1,
            text: 'Calls',
            visible: true,
          },
          {
            key: 2,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 1,
            text: 'Calendar',
            visible: true,
          },
          {
            key: 3,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Meetings',
            visible: true,
          },
        ],
        text: 'Sales & Marketing',
        visible: true,
      },
      {
        active: true,
        key: 0,
        params: {
          dashboard: true,
          layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
          module: 'Home',
          url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
        },
        subMenuItems: [
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Action Items',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calls',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calendar',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Meetings',
            visible: true,
          },
        ],
        text: 'Order Management',
        visible: true,
      },
      {
        active: true,
        key: 0,
        params: {
          dashboard: true,
          layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
          module: 'Home',
          url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
        },
        subMenuItems: [
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Action Items',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calls',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calendar',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Meetings',
            visible: true,
          },
        ],
        text: 'Project Management',
        visible: true,
      },
      {
        active: true,
        key: 0,
        params: {
          dashboard: true,
          layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
          module: 'Home',
          url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
        },
        subMenuItems: [
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Action Items',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calls',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calendar',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Meetings',
            visible: true,
          },
        ],
        text: 'Customer Service',
        visible: true,
      },
      {
        active: true,
        key: 0,
        params: {
          dashboard: true,
          layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
          module: 'Home',
          url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
        },
        subMenuItems: [
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Action Items',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calls',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Calendar',
            visible: true,
          },
          {
            key: 0,
            params: {
              dashboard: true,
              layout: '44983d8e-c943-3c97-3e6b-6410a1ced414',
              module: 'Home',
              url: 'index.php?module=Home&action=index&layout=44983d8e-c943-3c97-3e6b-6410a1ced414&parentTab=LBL_TABGROUP_TODAY_ACTIVITIES',
            },
            parentKey: 0,
            text: 'Meetings',
            visible: true,
          },
        ],
        text: 'Reports & Settings',
        visible: true,
      },
    ]

    const testItems = [
      'Tab 1',
      'Tab 2',
      'Tab 3',
      {
        text: 'Tab 4',
        params: { module: 'Test', layout: 'Standard' },
      },
    ]

    const testItems2 = [
      'Tab 1',
      'Tab 2',
      { text: 'Tab 3', icon: 'user' },
      'Tab 4',
      'Tab 5',
      { text: 'Tab 6', disabled: true },
      'Tab 7',
      'Tab 8',
    ]

    const testItems3 = [
      'Tab 1',
      'Tab 2',
      'Tab 3',
      { text: 'Tab 4', icon: 'user' },
      'Tab 5',
      { text: 'Tab 6' },
      'Tab 7',
      { text: 'Tab 8', disabled: true },
      'Tab 9',
      { text: 'Tab 10', icon: 'led blue' },
    ]

    const testItems4 = [
      'Tab 1',
      'Tab 2',
      'Tab 3',
      { text: 'Tab 4' },
      { text: 'Tab 5' },
    ]

    const testItems5 = [
      {
        text: 'Tab 1',
        subMenuItems: [
          { text: 'SubMenu Tab11', icon: 'led blue' },
          { text: 'SubMenu Tab12', icon: 'led red' },
        ],
      },
      {
        text: 'Tab 2',
        subMenuItems: [{ text: 'SubMenu Tab21' }, { text: 'SubMenu Tab22' }],
      },
      {
        text: 'Tab 3',
        subMenuItems: [
          { text: 'SubMenu Tab31' },
          { text: 'SubMenu Tab32' },
          { text: 'SubMenu Tab33' },
        ],
      },
    ]

    const testItems6 = [
      'Tab 1',
      'Tab 2',
      { text: 'Tab 3', icon: 'user' },
      'Tab 4',
      'Tab 5',
      { text: 'Tab 6', disabled: true },
      'Tab 7',
      'Tab 8',
    ]

    const selected1 = ref(0)
    const selected2 = ref(1)
    const selected3 = ref(0)
    const selected4 = ref(0)
    const selected5 = ref(0)
    const selected6 = ref(1)
    const selectedAppJs = ref(0)

    const selectTab = function (tab: Tab) {
      console.log(tab)
    }

    return {
      sampleCode,
      selectTab,

      params,
      variants,
      borderWidths,
      densities,

      testItems,
      selected1,

      testItems2,
      selected2,

      testItems3,
      selected3,

      testItems4,
      selected4,

      testItems5,
      selected5,

      testItems6,
      selected6,

      itemsForAppJs,
      selectedAppJs,
    }
  },
})
</script>

<style lang="scss" scoped>
.demo-tabs-content {
  padding: 10px;
  background: var(--of-color-surface);
  min-height: 4em;
  border-radius: 3px;
  --border-width: 0;
  &.demo-tabs-content-attached.with-border {
    border-top: solid var(--border-width) var(--of-primary-tint);
  }
}
</style>

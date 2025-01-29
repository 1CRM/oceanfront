import { createRouter, createWebHashHistory } from 'vue-router'

import DataTables from './components/DataTables.vue'
import Formatters from './components/Formatters.vue'
import Icons from './components/Icons.vue'
import Overview from './components/Overview.vue'
import Buttons from './components/Buttons.vue'
import FieldStates from './components/FieldStates.vue'
import FileInputs from './components/FileInputs.vue'
import Records from './components/Records.vue'
import CustomRecords from './components/CustomRecords.vue'
import SelectInputs from './components/SelectInputs.vue'
import SliderInputs from './components/SliderInputs.vue'
import TextInputs from './components/TextInputs.vue'
import ToggleInputs from './components/ToggleInputs.vue'
import RadioInputs from './components/RadioInputs.vue'
import ColorPickerInputs from './components/ColorPickerInputs.vue'
import DateTimePickerInputs from './components/DateTimePickerInputs.vue'
import GroupInputs from './components/GroupInputs.vue'
import Tabs from './components/Tabs.vue'
import Pagination from './components/Pagination.vue'
import Calendar from './components/Calendar.vue'
import Popups from './components/Popups.vue'
import Badges from './components/Badges.vue'
import KanbanBoard from './components/KanbanBoard.vue'
import ElevationDemo from './components/ElevationDemo.vue'
import HtmlEditor from './components/HtmlEditor.vue'
import ColorScheme from './components/ColorScheme.vue'
export const routerHistory = createWebHashHistory('/ofdocs')
export const router = createRouter({
  history: routerHistory,
  routes: [
    { path: '/', name: 'index', component: Overview },
    { path: '/icons', component: Icons },
    { path: '/field-states', component: FieldStates },
    { path: '/records', component: Records },
    { path: '/custom-records', component: CustomRecords },
    { path: '/formatters', component: Formatters },
    { path: '/buttons', component: Buttons },
    { path: '/file-inputs', component: FileInputs },
    { path: '/select-inputs', component: SelectInputs },
    { path: '/slider-inputs', component: SliderInputs },
    { path: '/text-inputs', component: TextInputs },
    { path: '/toggle-inputs', component: ToggleInputs },
    { path: '/radio-inputs', component: RadioInputs },
    { path: '/datetime-inputs', component: DateTimePickerInputs },
    { path: '/color-picker-inputs', component: ColorPickerInputs },
    { path: '/group-inputs', component: GroupInputs },
    { path: '/data-tables', component: DataTables },
    { path: '/tabs', component: Tabs },
    { path: '/pagination', component: Pagination },
    { path: '/calendar', component: Calendar },
    { path: '/popups', component: Popups },
    { path: '/badges', component: Badges },
    { path: '/kanban', component: KanbanBoard },
    { path: '/color-scheme', component: ColorScheme },
    { path: '/elevation', component: ElevationDemo },
    { path: '/html-editor', component: HtmlEditor }
  ]
})

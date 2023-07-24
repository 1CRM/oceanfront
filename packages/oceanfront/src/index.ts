import { App, Component, Directive, Plugin } from 'vue'
import OfBadge from './components/Badge.vue'
import { OfButton } from './components/Button'
import OfCalendar from './components/Calendar/Calendar'
import { OfColorField } from './fields/Color'
import { OfConfig } from './components/Config'
import OfDataTable from './components/DataTable.vue'
import OfDataType from './components/DataType/DataType'
import { OfDateField } from './fields/DateTime'
import { OfDatetimeField } from './fields/DateTime'
import OfDateTimePopup from './components/DateTimePopup.vue'
import OfDialog from './components/Dialog.vue'
import { OfField } from './components/Field'
import OfFocusGroup from './components/FocusGroup.vue'
import { OfFormat } from './components/Format'
import { OfIcon } from './components/Icon'
import { OfLink } from './components/Link'
import OfListGroup from './components/ListGroup.vue'
import { OfListItem } from './components/ListItem'
import { OfNavGroup } from './components/NavGroup'
import OfOptionList from './components/OptionList.vue'
import { OfOverlay } from './components/Overlay'
import OfPagination from './components/Pagination.vue'
import { OfSelectField } from './fields/Select'
import OfSidebar from './components/Sidebar.vue'
import { OfSliderField } from './fields/Slider'
import OfSpinner from './components/Spinner.vue'
import OfTabs from './components/Tabs.vue'
import { OfTextField } from './fields/Text'
import { OfTimeField } from './fields/DateTime'
import { OfToggleField } from './fields/Toggle'
import { OfRadioField } from './fields/Radio'
import { OfToggle } from './components/Toggle'
import { OfRadio } from './components/Radio'
import ColorHue from './components/ColorHue'
import ColorSaturation from './components/ColorSaturation'
import { ColorFormatter } from './formats/Color'
import {
  DateFormatter,
  DateTimeFormatter,
  TimeFormatter,
} from './formats/DateTime'
import { DurationFormatter } from './formats/Duration'
import { NumberFormatter } from './formats/Number'
import { UrlFormatter } from './formats/Url'
import { extendDefaultConfig } from './lib/config'
import { registerIconSet } from './lib/icons'
import {
  registerFieldType,
  registerTextFormatter,
  TextFormatterConstructor,
} from './lib/formats'
import './scss/index.scss'
import { materialIconSet } from '../icons/material'
import { OfFileField } from './fields/File'

export const components: Record<string, Component> = {
  OfConfig,
  OfDataTable,
  OfDatetimeField,
  OfDateField,
  OfTimeField,
  OfDateTimePopup,
  OfDialog,
  OfField,
  OfIcon,
  OfFocusGroup,
  OfFormat,
  OfLink,
  OfListItem,
  OfListGroup,
  OfNavGroup,
  OfOverlay,
  OfPagination,
  OfSelectField,
  OfSidebar,
  OfSliderField,
  OfTabs,
  OfCalendar,
  OfTextField,
  OfToggleField,
  OfRadioField,
  OfToggle,
  OfRadio,
  OfSpinner,
  OfButton,
  OfColorField,
  OfDataType,
  OfBadge,
  OfOptionList,
  OfFileField,
}

export const fieldTypes: Record<string, Component> = {
  file: OfFileField,
  select: OfSelectField,
  text: OfTextField,
  textarea: OfTextField,
  password: OfTextField,
  slider: OfSliderField,
  toggle: OfToggleField,
  radio: OfRadioField,
  datetime: OfDatetimeField,
  date: OfDateField,
  time: OfTimeField,
  color: OfColorField,
}

export const textFormatters: Record<string, TextFormatterConstructor> = {
  color: ColorFormatter,
  duration: DurationFormatter,
  number: NumberFormatter,
  url: UrlFormatter,
  datetime: DateTimeFormatter,
  date: DateFormatter,
  time: TimeFormatter,
}

export const directives: Record<string, Directive> = {}

export const Oceanfront: Plugin = {
  install(vue: App, args: any) {
    extendDefaultConfig(() => {
      for (const idx in fieldTypes) {
        registerFieldType(idx, fieldTypes[idx])
      }
      for (const idx in textFormatters) {
        registerTextFormatter(idx, textFormatters[idx])
      }
      registerIconSet(materialIconSet)
    })
    if (args && typeof args.config === 'function') {
      extendDefaultConfig(args.config)
    }
    // FIXME register components using a config manager
    for (const idx in components) {
      vue.component(idx, components[idx])
    }
    for (const idx in directives) {
      vue.directive(idx, directives[idx])
    }
  },
}

export { OfFieldBase } from './components/FieldBase'
export { OfSelectPopup } from './fields/SelectPopup'

export type { CalendarEvent, InternalEvent } from './lib/calendar/common'
export { extendConfig, useConfig } from './lib/config'
export type { Config, ConfigFunction } from './lib/config'
export { addDays, addMonths, addMinutes } from './lib/datetime'
export {
  defineFieldType,
  extendFieldFormat,
  newFieldId,
  BaseFieldProps,
  makeFieldContext,
  fieldRender,
  provideFieldContext,
  useFieldContext,
  provideFieldRender,
  useFieldRender,
} from './lib/fields'
export type {
  FieldContext,
  FieldDragIn,
  FieldPopup,
  FieldProps,
  FieldFormatProp,
  FieldMode,
  FieldLabelPositionProp,
  FieldRender,
} from './lib/fields'
export { ColorHue, ColorSaturation }
export { provideFocusGroup, useFocusGroup } from './lib/focus'
export type { FocusGroup } from './lib/focus'
export { provideLanguage, useLanguage } from './lib/language'
export {
  registerFieldType,
  registerTextFormatter,
  useFormats,
} from './lib/formats'
export type {
  FormatState,
  TextFormatResult,
  TextFormatter,
  TextFormatterProp,
  TextInputResult,
} from './lib/formats'
export {
  registerIconSet,
  registerSvgIconEffect,
  showMissingIcons,
  useIcons,
} from './lib/icons'
export type { IconSet, SvgIcon, SvgIconEffect } from './lib/icons'
export { registerItemList, useItems } from './lib/items'
export { setMobileBreakpoint, useLayout } from './lib/layout'
export { useLocale } from './lib/locale'
export { useThemeOptions, setThemeOptions } from './lib/theme'
export type { ThemeOptions } from './lib/theme'
export { provideNavGroup, useNavGroup } from './lib/nav'
export type { NavGroup, NavGroupTarget, NavGroupUnregister } from './lib/nav'
export {
  calcOffset,
  calcPageValue,
  calcStartRecord,
  calcTotalPages,
} from './lib/paginator'
export type { Paginator } from './lib/paginator'
export { makeRecord, setCurrentRecord, useRecords } from './lib/records'
export type {
  FieldMetadata,
  FieldRecordState,
  FormRecord,
  Lock,
  LockOptions,
  RecordMetadata,
} from './lib/records'
export type { Tab } from './lib/tab'

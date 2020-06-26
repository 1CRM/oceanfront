import { Component, Plugin, Directive } from 'vue';
import './scss/index.scss';
export declare const components: Record<string, Component>;
export declare const directives: Record<string, Directive>;
export declare const Oceanfront: Plugin;
export { extendConfig, useConfig } from './lib/config';
export { showMissingIcons, useIcons } from './lib/icons';
export { registerFieldType, registerTextFormatter, useFormats, } from './lib/formats';
export { registerItemList, useItems } from './lib/items';
export { setMobileBreakpoint, useLayout } from './lib/layout';
export { useLocale } from './lib/locale';
export { useRoutes } from './lib/routes';
export default Oceanfront;
//# sourceMappingURL=index.d.ts.map
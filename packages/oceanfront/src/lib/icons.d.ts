import { Config } from '../lib/config';
import { Component } from 'vue';
export interface Icon {
    class?: string;
    component?: Component | string;
    name?: string;
    props?: object;
    text?: string;
}
export interface IconMapping {
    [key: string]: Icon | string;
}
export interface IconResolver {
    resolve(name: string): Icon | string | null;
}
export interface IconFont {
    resolve(name: string): Icon | null;
}
declare class IconManager {
    defaultFont: string | undefined;
    fonts: {
        [name: string]: IconFont;
    };
    resolvers: IconResolver[];
    showMissing: boolean;
    constructor();
    resolve(name?: string): Icon | null;
}
export declare function registerIconFont(name: string, def: IconFont): void;
export declare function registerIcons(icons: IconMapping | IconResolver): void;
export declare function setDefaultIconFont(name: string): void;
export declare function showMissingIcons(flag?: boolean): void;
export declare function iconConfig(cb: () => void): void;
export declare function useIcons(config?: Config): IconManager;
export {};
//# sourceMappingURL=icons.d.ts.map
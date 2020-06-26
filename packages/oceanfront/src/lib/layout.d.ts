import { Config } from './config';
export declare type ThemeConfig = {
    primaryColor?: string;
    primaryHue?: number;
    secondaryHue?: number;
    backgroundHue?: number;
    dark?: boolean;
    saturation?: number;
};
declare type WindowRect = {
    scrollX: number;
    scrollY: number;
    width: number;
    height: number;
};
export interface LayoutState {
    readonly isMobile: boolean;
    readonly mobileBreakpoint: number;
    readonly windowRect: WindowRect;
}
export declare function setMobileBreakpoint(bp: number): void;
export declare function themeStyle(config?: ThemeConfig): {
    '--of-bg-sheet'?: undefined;
    '--of-bg-field'?: undefined;
    '--of-bg-field-focus'?: undefined;
    '--of-bg-field-filled'?: undefined;
    '--of-bg-field-filled-hover'?: undefined;
    '--of-bg-field-filled-focus'?: undefined;
    '--of-border-color-field'?: undefined;
    '--of-border-color-field-focus'?: undefined;
    '--of-border-color-field-hover'?: undefined;
    '--of-box-shadow-field-basic-focus'?: undefined;
    '--of-color-field'?: undefined;
    '--of-color-field-filled'?: undefined;
    '--of-color-field-filled-label'?: undefined;
    '--of-color-field-label'?: undefined;
    '--of-color-field-focus-label'?: undefined;
    '--of-color-field-filled-focus-label'?: undefined;
    '--of-color-sheet'?: undefined;
} | {
    '--of-bg-sheet': string;
    '--of-bg-field': string;
    '--of-bg-field-focus': string;
    '--of-bg-field-filled': string;
    '--of-bg-field-filled-hover': string;
    '--of-bg-field-filled-focus': string;
    '--of-border-color-field': string;
    '--of-border-color-field-focus': string;
    '--of-border-color-field-hover': string;
    '--of-box-shadow-field-basic-focus': string;
    '--of-color-field': string;
    '--of-color-field-filled': string;
    '--of-color-field-filled-label': string;
    '--of-color-field-label': string;
    '--of-color-field-focus-label': string;
    '--of-color-field-filled-focus-label': string;
    '--of-color-sheet': string;
};
export declare function useLayout(config?: Config): LayoutState;
export {};
//# sourceMappingURL=layout.d.ts.map
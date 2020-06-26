import { Config } from './config';
import { FieldType, FieldTypeConstructor } from './fields';
export interface TextFormatResult {
    blank?: boolean;
    error?: string;
    textValue?: string;
    textClass?: string;
    value?: any;
}
export interface TextInputResult extends TextFormatResult {
    selStart?: number;
    selEnd?: number;
    updated: boolean;
}
export interface TextFormatter {
    align?: 'start' | 'center' | 'end';
    format(modelValue: any): TextFormatResult;
    unformat(input: string): any;
    handleInput?: (evt: InputEvent) => TextInputResult;
    handleKeyDown?: (evt: KeyboardEvent) => void;
    handleFocus?: (evt: FocusEvent) => void;
    handleBlur?: (evt: FocusEvent) => TextInputResult;
    inputClass?: string | string[];
    inputMode?: string;
    inputType?: string;
    multiline?: boolean;
}
declare type TextFormatterCtor = {
    new (config?: Config, options?: any): TextFormatter;
};
declare type TextFormatterFn = {
    (config?: Config, options?: any): TextFormatter;
};
declare type TextFormatterDef = TextFormatter | TextFormatterCtor | TextFormatterFn;
export declare type TextFormatterProp = TextFormatterDef | string;
export interface FormatState {
    getFieldType(type?: string, defaultType?: boolean | string): FieldTypeConstructor | undefined;
    getTextFormatter(type?: string | TextFormatterDef, options?: any): TextFormatter | undefined;
}
export declare function registerFieldType(name: string, fmt: FieldType): void;
export declare function registerTextFormatter(name: string, fmt: TextFormatterDef): void;
export declare function setDefaultFieldType(name: string): void;
export declare function useFormats(config?: Config): FormatState;
export {};
//# sourceMappingURL=formats.d.ts.map
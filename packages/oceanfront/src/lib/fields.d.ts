import { VNode } from 'vue';
import { ItemList } from './items';
export declare type Renderable = VNode | VNode[] | string;
export declare const newFieldId: () => string;
export declare type FieldType = FieldTypeConstructor | FieldSetup;
export interface FieldTypeConstructor {
    name?: string;
    setup: FieldSetup;
}
export declare type FieldSetup = (props: FieldProps, ctx: FieldContext) => FieldRender;
export interface BaseForm {
    getInitialValue(name: string): any;
    getValue(name: string): any;
    locked?: boolean;
}
export interface FieldContext {
    container?: string;
    fieldType?: string;
    id?: string;
    initialValue?: any;
    items?: string | any[] | ItemList;
    label?: string;
    locked?: boolean;
    mode?: 'view' | 'edit' | 'readonly';
    muted?: boolean;
    name?: string;
    onUpdate?: (value: any) => void;
    required?: boolean;
    value?: any;
}
export interface FieldProps {
    align?: string;
    defaultValue?: any;
    items?: string | any[] | ItemList;
    maxlength?: number | string;
    placeholder?: string;
    size?: number | string;
    type?: string;
    [key: string]: any;
}
export interface FieldRender {
    active?: boolean;
    append?: () => Renderable | undefined;
    blank?: boolean;
    class?: string | string[];
    click?: (evt?: MouseEvent) => boolean | void;
    content?: () => Renderable | undefined;
    cursor?: string;
    focus?: () => void;
    focused?: boolean;
    hovered?: boolean;
    inputId?: string;
    inputValue?: any;
    invalid?: boolean;
    label?: string;
    loading?: boolean;
    pendingValue?: any;
    popup?: FieldPopup;
    prepend?: () => Renderable | undefined;
    updated?: boolean;
    value?: any;
}
export interface FieldPopup {
    content?: () => Renderable | undefined;
    visible?: boolean;
    onBlur?: () => void;
}
export declare function defineFieldType<T extends FieldType>(f: T): T;
export declare function extendFieldFormat(format: string | Record<string, any>, props: Record<string, any>): Record<string, any>;
//# sourceMappingURL=fields.d.ts.map
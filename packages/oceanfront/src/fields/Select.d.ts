import { VNode } from 'vue';
import { FieldContext, FieldProps } from '@/lib/fields';
export declare const renderSelectPopup: (items: any, setValue: any, active: boolean) => VNode;
export declare const SelectField: {
    name: string;
    setup(props: FieldProps, ctx: FieldContext): Readonly<{
        blank: boolean;
        class: string;
        content: () => VNode<import("vue").RendererNode, import("vue").RendererElement>[];
        click: (_evt?: MouseEvent | undefined) => boolean;
        cursor: string;
        focus: () => void;
        focused: boolean;
        inputId: string;
        inputValue: any;
        pendingValue: any;
        popup: {
            content: () => VNode<import("vue").RendererNode, import("vue").RendererElement>;
            visible: boolean;
            onBlur: () => void;
        };
        updated: boolean;
        value: any;
    }>;
};
//# sourceMappingURL=Select.d.ts.map
import { VNode } from 'vue';
import { FieldContext, FieldProps } from '@/lib/fields';
export declare const supportedTypes: Set<string>;
export declare const ToggleField: {
    name: string;
    setup(props: FieldProps, ctx: FieldContext): Readonly<{
        active: boolean;
        blank: boolean;
        class: string;
        content: () => VNode<import("vue").RendererNode, import("vue").RendererElement>[];
        click: (_evt?: MouseEvent | undefined) => boolean;
        cursor: string;
        focus: () => void;
        focused: boolean;
        inputId: string;
        label: any;
        updated: boolean;
        value: any;
    }>;
};
//# sourceMappingURL=Toggle.d.ts.map
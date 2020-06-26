import { VNode } from 'vue';
import { FieldContext, FieldProps } from '@/lib/fields';
export declare const TextField: {
    name: string;
    setup(props: FieldProps, ctx: FieldContext): Readonly<{
        blank: boolean;
        class: string;
        content: () => VNode<import("vue").RendererNode, import("vue").RendererElement>;
        click: () => true | undefined;
        cursor: string;
        focus: (select?: boolean | undefined) => true | undefined;
        focused: boolean;
        inputId: string;
        inputValue: string;
        invalid: boolean;
        pendingValue: any;
        updated: boolean;
        value: any;
    }>;
};
//# sourceMappingURL=Text.d.ts.map
export declare type NavTarget = {
    disabled?: boolean;
    focused?: boolean;
    elt?: any;
    id?: string;
    navActive?: boolean;
    navTo?: () => void;
};
export declare type INavGroup = {
    navRegister: (target: NavTarget) => () => void;
    nav(target: string | {
        event: KeyboardEvent;
    } | {
        id: string;
    }): boolean;
};
declare const _default: never;
export default _default;
//# sourceMappingURL=NavGroup.vue.d.ts.map
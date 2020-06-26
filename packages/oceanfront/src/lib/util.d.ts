import { Ref } from 'vue';
export declare const hasOwnProperty: (v: string | number | symbol) => boolean;
export declare const hasOwn: (val: object, key: string | symbol) => key is never;
export declare const isObject: (val: unknown) => val is Record<any, any>;
export declare const isArray: (arg: any) => arg is any[];
export declare const isFunction: (val: unknown) => val is (...args: any[]) => any;
export declare function isPromise<T = any>(val: unknown): val is PromiseLike<T>;
export declare const isDigit: (s: string) => boolean;
export declare const isPrimitive: (val: unknown) => val is Primitive;
export declare type Primitive = boolean | null | number | string | bigint | symbol;
declare type Head<T extends any[]> = T extends [infer X, ...any[]] ? X : never;
declare type Tail<T extends any[]> = ((...x: T) => void) extends (x: any, ...xs: infer XS) => void ? XS : never;
declare type OverrideProps<B, U> = Pick<B, Exclude<keyof B, keyof U>> & U;
export declare type Override<B, U extends any[]> = {
    0: B;
    1: OverrideProps<B, Override<Head<U>, Tail<U>>>;
}[U extends [any, ...any[]] ? 1 : 0];
export declare function extendReactive<T extends object, U extends object>(base: T, ...updates: U[]): Override<T, typeof updates>;
export declare function extractRefs<T extends object, K extends keyof T>(props: T, names: K[]): {
    [K in keyof T]?: Ref<T[K]>;
};
export declare function restrictProps<T extends object, K extends keyof T>(base: T, names: K[], ifDefined?: boolean): {
    [k2 in K]: T[K];
};
export declare function definedProps<T extends object, K extends keyof T>(base: T): {
    [k2 in K]: T[K];
};
export declare function removeEmpty(obj: Record<string, any>): Record<string, any>;
export {};
//# sourceMappingURL=util.d.ts.map
import { InjectionKey, ComputedRef, Ref } from 'vue';
export declare type Config = ConfigState;
export declare type ConfigFunction = (state: ConfigState) => void;
export declare class ConfigState {
    _cb: ConfigFunction;
    _prev: ConfigState | undefined;
    _cache: ComputedRef<Record<any, any>>;
    _cacheVal: Record<any, any>;
    _id: number;
    constructor(cb: ConfigFunction, prev?: ConfigState);
    apply(): void;
    getCache(): Record<any, any>;
}
export declare const injectKey: InjectionKey<Config>;
export declare function extendDefaultConfig(cb: () => void | Array<() => void>): void;
export declare function useConfig(): Config;
export declare function extendConfig(cb: () => void): void;
declare type ConfigHandlerCtor<T> = {
    new (config: Config): T;
};
export declare class ConfigManager<T> {
    protected _activeManager?: T;
    protected _ctor: ConfigHandlerCtor<T>;
    protected _injectKey: InjectionKey<ComputedRef<T>>;
    constructor(ident: string, ctor: ConfigHandlerCtor<T>);
    createManager(config: Config): T;
    getCached(config: ConfigState): T;
    get extendingManager(): T;
    inject(config?: Config): ComputedRef<T>;
    get injectKey(): InjectionKey<ComputedRef<T>>;
}
export declare function readonlyUnwrap<T>(val: Ref<T>): T;
export {};
//# sourceMappingURL=config.d.ts.map
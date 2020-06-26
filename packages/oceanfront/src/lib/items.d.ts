import { Config } from './config';
export interface ItemList {
    avatarKey?: string;
    disabledKey?: string;
    iconKey?: string;
    specialKey?: string;
    textKey?: string;
    valueKey?: string;
    count?: number;
    error?: string;
    filter?: (query: string) => any[] | ItemList;
    items: any[];
    loading?: boolean | string;
    lookup?: (key: any) => any;
}
export declare function makeItemList(items?: any[] | ItemList): ItemList;
export interface ItemsState {
    getItemList(items?: string | any[] | ItemList): ItemList | undefined;
}
export declare function registerItemList(name: string, items: any[] | ItemList): void;
export declare function useItems(config?: Config): ItemsState;
//# sourceMappingURL=items.d.ts.map
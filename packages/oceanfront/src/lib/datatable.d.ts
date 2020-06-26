export interface DataTableHeader {
    text: string;
    value: string;
    align?: 'start' | 'center' | 'end';
    format?: string;
    sortable?: boolean;
    filterable?: boolean;
    divider?: boolean;
    class?: string | string[];
    width?: string | number;
    filter?: (value: any, search: string, item: any) => boolean;
    sort?: (a: any, b: any) => number;
    editable?: boolean | string;
}
//# sourceMappingURL=datatable.d.ts.map
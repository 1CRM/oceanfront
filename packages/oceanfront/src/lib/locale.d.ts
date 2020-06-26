import { Config } from '../lib/config';
export interface LocaleNumberFormat {
    readonly groupSeparator: string;
    readonly decimalSeparator: string;
    readonly auto: boolean;
}
export interface LocaleState {
    readonly locale: string;
    readonly numberFormat?: LocaleNumberFormat;
}
export declare function setLocale(loc: string): void;
export declare function useLocale(config?: Config): LocaleState;
//# sourceMappingURL=locale.d.ts.map
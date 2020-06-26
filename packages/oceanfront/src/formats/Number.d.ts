import { Config } from '@/lib/config';
import { TextFormatter, TextFormatResult, TextInputResult } from '@/lib/formats';
export interface NumberFormatterOptions {
    decimalSeparator?: string;
    groupSeparator?: string;
    locale?: string;
    minimumIntegerDigits?: number;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    maximumSignificantDigits?: number;
    minimumSignificantDigits?: number;
    restrictPositive?: boolean;
    signDisplay?: string;
    style?: string;
    useGrouping?: boolean;
}
export declare class NumberFormatter implements TextFormatter {
    private _locale;
    private _options;
    constructor(config?: Config, options?: NumberFormatterOptions);
    get align(): 'start' | 'center' | 'end';
    get inputClass(): string;
    get inputMode(): string;
    get options(): NumberFormatterOptions;
    formatterOptions(editing?: boolean): Intl.NumberFormatOptions;
    parseInput(input: string, selStart?: number): {
        input: string;
        parsed: string;
        selStart: number;
        selAfterDigit: boolean | 0;
        value: number | null;
        minDecs: number | null;
        seps: {
            decimal: string;
            group: string;
        };
    };
    getSeparators(): {
        decimal: string;
        group: string;
    };
    loadValue(modelValue: any): number | null;
    format(modelValue: any): TextFormatResult;
    unformat(input: string): number | null;
    handleInput(evt: InputEvent): TextInputResult;
    handleKeyDown(evt: KeyboardEvent): void;
}
//# sourceMappingURL=Number.d.ts.map
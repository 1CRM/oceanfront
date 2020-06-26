import { TextFormatter, TextFormatResult } from '@/lib/formats';
export declare class DurationFormatter implements TextFormatter {
    get align(): 'start' | 'center' | 'end';
    get inputClass(): string;
    get inputMode(): string;
    parseInput(input: string): {
        input: string;
        value: number;
    };
    loadValue(modelValue: any): number | null;
    format(modelValue: any): TextFormatResult;
    minToDurationConvert(value: string): string;
    unformat(input: any): number | null;
    handleKeyDown(evt: KeyboardEvent): void;
}
//# sourceMappingURL=Duration.d.ts.map
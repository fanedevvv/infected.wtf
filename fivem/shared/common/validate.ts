const HEX_COLOR = /^#[\da-f]{6}$/i;
const DIGITS = /^\d+$/;

export const isHexColor = (value: unknown): value is string => typeof value === 'string' && HEX_COLOR.test(value);

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export const isString = (value: unknown, max = Infinity, min = 0): value is string =>
    typeof value === 'string' && value.length >= min && value.length <= max;

export const isPositiveInt = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

/** Parses a strictly-decimal integer string within [min, max]; returns undefined otherwise. */
export function parseIntStrict(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | undefined {
    if (typeof value !== 'string' || !DIGITS.test(value)) return undefined;
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= min && number <= max ? number : undefined;
}

export const isStringArray = (value: unknown, maxItems: number, maxLength: number): value is string[] =>
    Array.isArray(value) && value.length <= maxItems && value.every((item) => isString(item, maxLength));

export const hexToRgb = (hex: string): [number, number, number] => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
};

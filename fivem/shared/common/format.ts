let currency: Intl.NumberFormat | undefined; // created lazily: only NUI pages (Chromium) format money

/** Formats a decimal money string (may exceed 2^53) as `$1,234`. */
export function formatMoney(value: string | number | bigint | undefined): string {
    try {
        currency ??= new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
        return currency.format(BigInt(value ?? 0));
    } catch {
        return '$0';
    }
}

/** Replaces `{{key}}` placeholders. Unknown keys render as an empty string. */
export const renderTemplate = (template: string, context: Record<string, string>): string =>
    template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => context[key] ?? '');

import { hexToRgb, isHexColor } from '../common/validate.ts';

/** getElementById that throws on a missing element, so markup mistakes fail loudly. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing element #${id}`);
    return element as T;
}

/** Creates an element with optional class and text (always text, never HTML). */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

/** Sets `--<name>` and `--<name>-rgb` CSS variables from a hex color. */
export function setAccent(name: string, color: unknown): void {
    if (!isHexColor(color)) return;
    const style = document.documentElement.style;
    style.setProperty(`--${name}`, color);
    style.setProperty(`--${name}-rgb`, hexToRgb(color).join(', '));
}

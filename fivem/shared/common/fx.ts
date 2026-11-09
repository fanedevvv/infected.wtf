/**
 * FiveM's `exports` global, always reached through `globalThis`.
 * A bare `exports` identifier makes esbuild treat the file as CommonJS and rename it,
 * which silently breaks every export call (see scripts/build.mts guard).
 */
type ExportFn = (...args: any[]) => any;
interface CitizenExportsLike {
    (name: string, fn: ExportFn): void;
    [resource: string]: Record<string, ExportFn | undefined> | undefined;
}

const fx = () => (globalThis as unknown as { exports: CitizenExportsLike }).exports;

/** Exposes `fn` to other resources as `exports.<this resource>.<name>`. */
export const registerExport = (name: string, fn: ExportFn): void => fx()(name, fn);

/** Another resource's exports, e.g. `resourceExports('oxmysql').query`. */
export const resourceExports = (resource: string): Record<string, ExportFn> =>
    (fx()[resource] ?? {}) as Record<string, ExportFn>;

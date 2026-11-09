/**
 * Promise wrapper around oxmysql's exports. Passing `isPromise = true` makes oxmysql
 * report errors through the callback instead of swallowing them.
 */
import { resourceExports } from '@shared/common/fx.ts';
type Params = unknown[] | Record<string, unknown>;
type Method = 'query' | 'single' | 'scalar' | 'update' | 'insert' | 'transaction';

export interface InsertResult {
    insertId: number;
    affectedRows: number;
}

function call<T>(method: Method, sql: unknown, params: Params = []): Promise<T> {
    return new Promise((resolve, reject) => {
        resourceExports('oxmysql')[method]!(
            sql,
            params,
            (result: T, error?: string) => (error ? reject(new Error(error)) : resolve(result)),
            GetCurrentResourceName(),
            true,
        );
    });
}

export const db = {
    /** All matching rows. */
    query: <T>(sql: string, params?: Params) => call<T[]>('query', sql, params),
    /** First row or null. */
    single: async <T>(sql: string, params?: Params) => (await call<T | null | undefined>('single', sql, params)) ?? null,
    /** First column of the first row, or null. */
    scalar: async <T>(sql: string, params?: Params) => (await call<T | null | undefined>('scalar', sql, params)) ?? null,
    /** Number of affected rows. */
    update: (sql: string, params?: Params) => call<number>('update', sql, params),
    /** Inserted id. */
    insert: (sql: string, params?: Params) => call<number>('insert', sql, params),
    /** Runs statements atomically; resolves to true on commit. */
    transaction: (queries: { query: string; values?: Params }[]) => call<boolean>('transaction', queries),
    isReady: (): boolean => resourceExports('oxmysql').isReady!() === true,
};

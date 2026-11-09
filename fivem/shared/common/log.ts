const prefix = `[${__RESOURCE__}]`;

export const log = {
    info: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
    debug: (...args: unknown[]) => {
        if (__DEV__) console.log(prefix, '[debug]', ...args);
    },
};

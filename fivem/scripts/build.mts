/**
 * Bundles every resource in resources/[ket]/ with esbuild.
 *
 *   resources/[ket]/<name>/src/client/index.ts → dist/client.js   (FiveM client V8)
 *   resources/[ket]/<name>/src/server/index.ts → dist/server.js   (FXServer Node 22)
 *   resources/[ket]/<name>/src/web/index.ts    → dist/web/app.js  (NUI / CEF)
 *   resources/[ket]/<name>/public/*            → dist/web/*       (html, css, assets)
 *
 * Usage: npx tsx scripts/build.mts [--watch] [--prod] [resource ...]
 */
import { existsSync, readdirSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resourcesDir = path.join(root, 'resources', '[ket]');
const args = process.argv.slice(2);
const watch = args.includes('--watch');
const prod = args.includes('--prod') || !watch;
const only = args.filter((arg) => !arg.startsWith('--'));

type Side = 'client' | 'server' | 'web';

const sideOptions: Record<Side, esbuild.BuildOptions> = {
    client: { platform: 'neutral', format: 'iife', target: 'es2020', mainFields: ['module', 'main'] },
    server: { platform: 'node', format: 'cjs', target: 'node22' },
    web: { platform: 'browser', format: 'iife', target: 'chrome103' },
};

const outFile: Record<Side, string> = {
    client: 'dist/client.js',
    server: 'dist/server.js',
    web: 'dist/web/app.js',
};

const resources = readdirSync(resourcesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(resourcesDir, entry.name, 'fxmanifest.lua')))
    .map((entry) => entry.name)
    .filter((name) => only.length === 0 || only.includes(name));

if (resources.length === 0) {
    console.error(`No resources matched: ${only.join(', ')}`);
    process.exit(1);
}

/** Copies public/ into dist/web/ after every (re)build. */
const copyPublic = (resourceDir: string): esbuild.Plugin => ({
    name: 'copy-public',
    setup(build) {
        build.onEnd(async (result) => {
            if (result.errors.length > 0) return;
            await cp(path.join(resourceDir, 'public'), path.join(resourceDir, 'dist', 'web'), { recursive: true });
        });
    },
});

const logResult = (label: string): esbuild.Plugin => ({
    name: 'log',
    setup(build) {
        build.onEnd((result) => {
            const status = result.errors.length > 0 ? `failed (${result.errors.length} errors)` : 'ok';
            console.log(`[build] ${label} ${status}`);
        });
    },
});

const contexts: esbuild.BuildContext[] = [];

for (const name of resources) {
    const resourceDir = path.join(resourcesDir, name);
    if (!watch) await rm(path.join(resourceDir, 'dist'), { recursive: true, force: true });
    await mkdir(path.join(resourceDir, 'dist'), { recursive: true });

    for (const side of Object.keys(sideOptions) as Side[]) {
        const entry = path.join(resourceDir, 'src', side, 'index.ts');
        if (!existsSync(entry)) continue;

        const plugins = [logResult(`${name}/${side}`)];
        if (side === 'web' && existsSync(path.join(resourceDir, 'public'))) plugins.push(copyPublic(resourceDir));

        const context = await esbuild.context({
            ...sideOptions[side],
            entryPoints: [entry],
            outfile: path.join(resourceDir, outFile[side]),
            bundle: true,
            minify: prod,
            sourcemap: prod ? false : 'inline',
            legalComments: 'none',
            logLevel: 'warning',
            tsconfig: path.join(root, `tsconfig.${side}.json`),
            define: { __RESOURCE__: JSON.stringify(name), __DEV__: String(!prod) },
            plugins,
        });
        contexts.push(context);
    }
}

if (watch) {
    await Promise.all(contexts.map((context) => context.watch()));
    console.log(`[build] watching ${resources.length} resources…`);
} else {
    const results = await Promise.allSettled(contexts.map((context) => context.rebuild()));
    await Promise.all(contexts.map((context) => context.dispose()));
    if (results.some((result) => result.status === 'rejected')) process.exit(1);
}

# Ket FiveM server

A TypeScript FiveM (GTA V) server. Every gameplay resource is written in TypeScript and bundled with esbuild into small, dependency-free `dist/` files.

## Quick start

```bash
npm install
cp secrets.example.cfg secrets.cfg   # license key + MySQL connection string
npm run build                        # → resources/[ket]/*/dist
# start FXServer in this folder with: +exec server.cfg
```

| Script              | What it does                                                    |
| ------------------- | --------------------------------------------------------------- |
| `npm run build`     | Production build of every resource (minified).                  |
| `npm run dev`       | Watch mode with inline source maps; `restart <name>` in-game.   |
| `npm run typecheck` | Strict type-check of the client, server, NUI and script projects. |
| `npm run check`     | Typecheck + build (run before deploying).                       |

Build one resource with `npx tsx scripts/build.mts ket_admin`.

## Layout

```
fivem/
├── server.cfg              # committed; no secrets
├── secrets.cfg             # gitignored: sv_licenseKey, mysql_connection_string
├── scripts/build.mts       # esbuild driver
├── shared/                 # library bundled into each resource (import '@shared/…')
│   ├── common/             #   types, RPC/event contracts, validators, constants
│   ├── client/             #   typed events, RPC, NUI helpers, game helpers, Tick
│   ├── server/             #   typed events, RPC, oxmysql promise wrapper, chat, Core
│   └── web/                #   NUI fetch/message helpers, DOM helpers
└── resources/
    ├── [ket]/              # our TypeScript resources
    ├── [cars]/             # add-on vehicles (streamed; listed under CUSTOM in /carlist)
    ├── [standalone]/       # oxmysql (vendored, prebuilt)
    ├── [cfx]/              # stock cfx-server-data resources (not started)
    └── [local]/            # drop-in resources that aren't part of the build
```

Each `[ket]` resource follows the same shape. Only the folders it needs exist:

```
ket_x/
├── fxmanifest.lua          # points at dist/
├── src/client/index.ts     # → dist/client.js
├── src/server/index.ts     # → dist/server.js
├── src/web/index.ts        # → dist/web/app.js   (NUI)
├── src/common/             # types shared by this resource's client/server/web
└── public/                 # → dist/web/          (index.html, style.css)
```

## Resources

| Resource       | Side                | Responsibility                                                         |
| -------------- | ------------------- | ---------------------------------------------------------------------- |
| `ket_core`     | client, server, NUI | DB schema, sign-in/register, sessions, state bags, spawning, online count |
| `ket_chat`     | client, server, NUI | Proximity chat, `chat:*` API (`provide 'chat'`), suggestions, T keybind |
| `ket_hud`      | client, NUI         | Name, cash, bank, online count, FPS counter                             |
| `ket_nametags` | client              | Overhead gamer tags; own nametag (opt-in)                               |
| `ket_settings` | client, NUI         | `/settings`: accent color, FPS counter, own nametag                    |
| `ket_commands` | server              | `/id`, `/inventory`, `/myjob`, player suggestions                       |
| `ket_admin`    | client, server, NUI | 28 admin commands, `/admin` panel, `/carlist` vehicle browser            |
| `ket_bike`     | client              | Bike rental attendant (`/bike`, `/unrentbike`)                          |
| `ket_blips`    | client              | Static map blips                                                        |

## How the pieces talk

- **ket_core is the single source of truth for accounts.** Other resources read it through the typed `Core` wrappers (`@shared/server/core.ts`, `@shared/client/core.ts`). They never query the `users` profile columns directly.
- **Account changes are pushed, not polled.** ket_core sends the account to its owner on sign-in and after every change (settings, cash, admin level). On the client it emits the local `ket:account` event, and HUD, chat and nametags update from it via `watchAccount()`.
- **Replicated state bags** carry public data: `ket:username` and `ket:accountId` on each player, and `ket:online` in `GlobalState`.
- **RPC** (`callServer` / `onRpc`, `callClient`) replaces hand-rolled request-ID callbacks. Calls have timeouts and per-player cooldowns, and replies are pinned to the player they were sent to. Server handlers receive every argument as `unknown`, so the compiler forces validation.
- **Every event and RPC name is declared once** in `shared/common/contracts.ts`, so payload types are checked at both ends.

## Performance notes

- Per-frame work only runs while it is needed. `Tick` starts and stops `setTick` handlers: noclip, the bike prompt (only near the attendant) and the own nametag (only when enabled).
- One per-frame HUD tick both hides native components and measures FPS. `/id` reads a player's FPS on demand over RPC; nothing streams it to the server.
- Gamer-tag line-of-sight checks run every 150ms, not every frame.
- Database migrations read `information_schema` once, then run a single `ALTER TABLE`.
- scrypt hashing is limited to 4 concurrent jobs, so a login flood can't stall the server thread.

## Adding a resource

1. Create `resources/[ket]/ket_new/fxmanifest.lua` pointing at `dist/client.js` and/or `dist/server.js`.
2. Add `src/client/index.ts` and/or `src/server/index.ts` (plus `src/web` and `public/` for a NUI page).
3. Declare any new events or RPCs in `shared/common/contracts.ts`.
4. Add `ensure ket_new` to `server.cfg` and run `npm run check`.

## Adding a car

1. Put the FiveM version of the car in `resources/[cars]/<name>/`, with the model files in `stream/` and the `.meta` files in `data/`.
2. Give it an `fxmanifest.lua` like `resources/[cars]/bmw_g20_330i/fxmanifest.lua`. The two lines that matter:
   ```lua
   ket_vehicle '3erg20'                      -- modelName from vehicles.meta
   ket_vehicle_name 'BMW 330i M Sport (G20)' -- shown in /carlist
   ```
3. Restart the server, or run `ensure <name>`. The car appears in `/carlist` under **CUSTOM**, and `/car <model>` spawns it.

`stream/` folders are gitignored (large third-party binaries), so they live only on disk and on the game server.

## Admin levels

In-game permissions come from `users.admin` (0–7). FXServer ACE groups in `server.cfg` only gate console and txAdmin commands. To bootstrap the first owner, run `UPDATE users SET admin = 7 WHERE username = '…';`.

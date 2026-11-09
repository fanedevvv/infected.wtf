import type { Account, AuthRequest, Result } from '@shared/common/types.ts';
import { isString } from '@shared/common/validate.ts';
import { getLicense, isConnected } from '@shared/server/players.ts';
import { getDummyHash, hashPassword, verifyPassword } from './password.ts';
import { RateLimiter } from './rateLimit.ts';
import { isDatabaseReady } from './schema.ts';
import { sessions } from './sessions.ts';
import * as users from './users.ts';

const USERNAME = /^\w{3,24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 10;

const attempts = new RateLimiter(5, 60_000);
const inFlight = new Set<number>();

const fail = (error: string): Result<Account> => ({ ok: false, error });

/** Parses untrusted NUI input into a well-typed request, or returns an error message. */
function parseRequest(input: unknown): AuthRequest | string {
    if (typeof input !== 'object' || input === null) return 'Please check the form and try again.';
    const { mode, username, email, password } = input as Record<string, unknown>;
    if ((mode !== 'login' && mode !== 'register') || !isString(username, 254, 1) || !isString(email, 254) || !isString(password, 128, 1)) {
        return 'Please check the form and try again.';
    }
    return { mode, username: username.trim(), email: email.trim().toLowerCase(), password };
}

async function login({ username, password }: AuthRequest): Promise<Result<Account>> {
    const row = await users.findForLogin(username);
    const valid = await verifyPassword(password, row?.password_hash ?? (await getDummyHash()));
    if (!row || !valid) return fail('Invalid username or password.');

    const account = users.toAccount(row);
    const ban = await users.findActiveBan(account.id);
    if (ban) {
        const until = ban.expiresAt ? ` until ${ban.expiresAt.toISOString().slice(0, 16).replace('T', ' ')} UTC` : '';
        return fail(`This account is banned${until}. Reason: ${ban.reason}`);
    }
    if (sessions.isAccountOnline(account.id)) return fail('This account is already signed in.');
    return { ok: true, data: account };
}

async function register({ username, email, password }: AuthRequest): Promise<Result<Account>> {
    if (!USERNAME.test(username)) return fail('Username must be 3–24 characters using letters, numbers, or underscores.');
    if (!EMAIL.test(email)) return fail('Enter a valid email address.');
    if (password.length < MIN_PASSWORD) return fail(`Use a password with at least ${MIN_PASSWORD} characters.`);
    if (await users.usernameOrEmailTaken(username, email)) return fail('That username or email is already in use.');

    const id = await users.createUser(username, email, await hashPassword(password));
    const row = id ? await users.findById(id) : null;
    if (!row) throw new Error(`Created user ${id} could not be loaded`);
    return { ok: true, data: users.toAccount(row) };
}

export async function authenticate(source: number, input: unknown): Promise<Result<Account>> {
    if (sessions.has(source)) return fail('You are already signed in.');
    if (inFlight.has(source)) return fail('Please wait for your previous request.');

    const license = getLicense(source);
    if (!attempts.take(license)) return fail('Too many attempts. Please wait a minute and try again.');
    if (!isDatabaseReady()) return fail('The account database is unavailable. Please try again shortly.');

    const request = parseRequest(input);
    if (typeof request === 'string') return fail(request);

    inFlight.add(source);
    try {
        const result = await (request.mode === 'login' ? login(request) : register(request));
        if (!result.ok) return result;
        // The player may have left (or signed in elsewhere) while we awaited the database.
        if (!isConnected(source) || sessions.has(source) || sessions.isAccountOnline(result.data.id)) {
            return fail('Sign-in was interrupted. Please try again.');
        }
        sessions.open(source, license, result.data);
        return result;
    } finally {
        inFlight.delete(source);
    }
}

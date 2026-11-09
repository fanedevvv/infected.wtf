/**
 * scrypt password hashing. Format (unchanged from the legacy ket_auth, so existing
 * accounts keep working): `scrypt$<16-byte salt hex>$<64-byte key hex>`.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Semaphore } from '@shared/common/async.ts';

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;
const KEY_LENGTH = 64;
const FORMAT = /^scrypt\$([a-f\d]{32})\$([a-f\d]{128})$/i;

/** scrypt is CPU/memory heavy; cap concurrent derivations so login floods can't stall the server. */
const limiter = new Semaphore(4);
const derive = (password: string, salt: Buffer, length = KEY_LENGTH) => limiter.run(() => scrypt(password, salt, length));

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(password, salt);
    return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const match = FORMAT.exec(stored);
    if (!match) return false;
    const expected = Buffer.from(match[2]!, 'hex');
    const actual = await derive(password, Buffer.from(match[1]!, 'hex'), expected.length);
    return timingSafeEqual(actual, expected);
}

/** A valid hash of a random secret: verifying against it costs the same as a real account,
 * so response time doesn't reveal whether a username exists. */
let dummyHash: Promise<string> | undefined;
export const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(32).toString('hex')));

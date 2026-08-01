import crypto from "crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  const s = input.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (const c of s) {
    const val = BASE32_CHARS.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** RFC 6238 TOTP, Google Authenticator compatible — mirrors core/TOTP.php */
export class TOTP {
  private secret: string;
  private digits = 6;
  private period = 30;

  constructor(secret: string) {
    this.secret = secret;
  }

  static generateSecret(): string {
    const bytes = crypto.randomBytes(32);
    let secret = "";
    for (let i = 0; i < 32; i++) secret += BASE32_CHARS[bytes[i] & 31];
    return secret;
  }

  private hotp(counter: number): string {
    const key = base32Decode(this.secret);
    const msg = Buffer.alloc(8);
    msg.writeBigInt64BE(BigInt(counter));
    const hash = crypto.createHmac("sha1", key).update(msg).digest();
    const offset = hash[hash.length - 1] & 0x0f;
    const code =
      (((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)) %
      10 ** this.digits;
    return String(code).padStart(this.digits, "0");
  }

  getCode(timestamp: number = Date.now() / 1000): string {
    const counter = Math.floor(timestamp / this.period);
    return this.hotp(counter);
  }

  verify(code: string, discrepancy = 1): boolean {
    const timestamp = Date.now() / 1000;
    for (let i = -discrepancy; i <= discrepancy; i++) {
      const expected = this.getCode(timestamp + i * this.period);
      if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code.padStart(this.digits, "0")))) {
        return true;
      }
    }
    return false;
  }

  getQRUri(label: string, issuer: string): string {
    const l = encodeURIComponent(`${issuer}:${label}`);
    const iss = encodeURIComponent(issuer);
    return `otpauth://totp/${l}?secret=${this.secret}&issuer=${iss}&algorithm=SHA1&digits=${this.digits}&period=${this.period}`;
  }
}

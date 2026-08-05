import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
for (const line of fs.readFileSync('/var/www/getfame-next/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;
const BLIND_INDEX_KEY = process.env.EMAIL_BLIND_INDEX_KEY;
function encryptEmail(email) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(email.trim().toLowerCase(), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}
function emailBlindIndex(email) {
  return crypto.createHmac('sha256', BLIND_INDEX_KEY).update(email.trim().toLowerCase()).digest('hex');
}
const prisma = new PrismaClient();
const username = 'navcheck' + Date.now().toString().slice(-6);
const email = username + '@example.com';
const password = 'TestPass123!';
const passwordHash = await bcrypt.hash(password, 10);
const refCode = crypto.randomBytes(4).toString('hex').toUpperCase();
await prisma.user.create({
  data: { username, email: encryptEmail(email), emailBlindIndex: emailBlindIndex(email), password: passwordHash, referralCode: refCode, emailVerified: true,
    profiles: { create: { slug: username, isPrimary: true, displayName: 'Nav Check' } } },
});
console.log(JSON.stringify({ username, password }));
await prisma.$disconnect();

#!/usr/bin/env node
// Admin helper: marks the account registered with the given email as email-verified.
// Usage: node scripts/verify-email.js user@example.com
// Emails are stored encrypted, so the account is looked up by its HMAC blind index.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("../discord-bot/node_modules/dotenv");

const env = dotenv.parse(fs.readFileSync(path.join(__dirname, "..", ".env")));
Object.assign(process.env, env);

const { PrismaClient } = require("@prisma/client");

const email = String(process.argv[2] || "").trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: node scripts/verify-email.js user@example.com");
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const blindIndex = crypto.createHmac("sha256", env.EMAIL_BLIND_INDEX_KEY).update(email).digest("hex");
    const user = await prisma.user.findFirst({
      where: { emailBlindIndex: blindIndex },
      select: { id: true, username: true, emailVerified: true },
    });
    if (!user) {
      console.log(`No account found for ${email}`);
      process.exitCode = 2;
      return;
    }
    if (user.emailVerified) {
      console.log(`@${user.username} (id ${user.id}) is already verified`);
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    console.log(`@${user.username} (id ${user.id}) marked as verified`);
  } finally {
    await prisma.$disconnect();
  }
})();

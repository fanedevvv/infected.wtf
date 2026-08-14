import { promises as dns } from "dns";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, symlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

const HOSTNAME_RE = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))+$/;

export function isValidHostname(host: string): boolean {
  return typeof host === "string" && host.length <= 253 && HOSTNAME_RE.test(host);
}

async function getReferenceIp(): Promise<string> {
  const addrs = await dns.resolve4("infected.wtf");
  return addrs[0];
}

/** Checks the candidate hostname's A record(s) point at the same server as infected.wtf. */
export async function checkDnsPointsToServer(hostname: string): Promise<{ ok: boolean; message: string }> {
  try {
    const refIp = await getReferenceIp();
    const addrs = await dns.resolve4(hostname);
    if (addrs.includes(refIp)) return { ok: true, message: "DNS points correctly." };
    return { ok: false, message: `Found A record(s) [${addrs.join(", ")}] but expected ${refIp}. Point an A record for ${hostname} to ${refIp}.` };
  } catch (e) {
    return { ok: false, message: `DNS lookup failed (${(e as Error).message}). Add an A record for ${hostname} pointing to this server and try again.` };
  }
}

const NGINX_SITES_AVAILABLE = "/etc/nginx/sites-available";
const NGINX_SITES_ENABLED = "/etc/nginx/sites-enabled";

function httpOnlyConfig(hostname: string): string {
  return `server {
    server_name ${hostname};

    client_max_body_size 100m;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /uploads/ {
        alias /var/www/infected.wtf/public/uploads/;
        add_header Cache-Control "public, max-age=3600";
    }

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
    listen [::]:80;
}
`;
}

/** Writes an HTTP-only nginx server block, reloads nginx, then runs certbot to add SSL + redirect in place. */
export async function provisionDomain(hostname: string): Promise<{ success: boolean; message: string }> {
  if (!isValidHostname(hostname)) return { success: false, message: "Invalid hostname format." };

  const confPath = path.join(NGINX_SITES_AVAILABLE, `${hostname}.conf`);
  const enabledPath = path.join(NGINX_SITES_ENABLED, `${hostname}.conf`);

  try {
    await writeFile(confPath, httpOnlyConfig(hostname), "utf8");
    if (!existsSync(enabledPath)) await symlink(confPath, enabledPath);

    await execFileAsync("nginx", ["-t"]);
    await execFileAsync("systemctl", ["reload", "nginx"]);

    await execFileAsync(
      "certbot",
      ["--nginx", "-d", hostname, "--non-interactive", "--agree-tos", "--redirect", "-n"],
      { timeout: 90000 }
    );

    await execFileAsync("nginx", ["-t"]);
    await execFileAsync("systemctl", ["reload", "nginx"]);

    return { success: true, message: "Domain live with SSL." };
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    return { success: false, message: (err.stderr || err.message || "Provisioning failed").slice(0, 490) };
  }
}

/** Removes the nginx config + cert for a domain being deleted from the pool. Best-effort, never throws. */
export async function deprovisionDomain(hostname: string): Promise<void> {
  if (!isValidHostname(hostname)) return;
  const confPath = path.join(NGINX_SITES_AVAILABLE, `${hostname}.conf`);
  const enabledPath = path.join(NGINX_SITES_ENABLED, `${hostname}.conf`);
  try {
    await unlink(enabledPath);
  } catch {}
  try {
    await unlink(confPath);
  } catch {}
  try {
    await execFileAsync("nginx", ["-t"]);
    await execFileAsync("systemctl", ["reload", "nginx"]);
  } catch {}
  try {
    await execFileAsync("certbot", ["delete", "--cert-name", hostname, "--non-interactive"]);
  } catch {}
}

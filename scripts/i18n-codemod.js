#!/usr/bin/env node
// One-off codemod: wraps user-visible English strings in t("…") and injects the translator hook.
// - JSX text, placeholder/title/aria-label/alt attributes, and string literals passed to showToast()/confirm()/alert()/prompt()
// - client components get `const t = useT();`, async server components get `const t = await getT();`
// Usage: node scripts/i18n-codemod.js <file.tsx>...   (prints the keys it wrapped)

const fs = require("fs");
const ts = require("typescript");

const ATTRS = new Set(["placeholder", "title", "aria-label", "alt"]);
const CALLS = new Set(["showToast", "confirm", "alert", "prompt"]);
const ENTITIES = { "&apos;": "'", "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&nbsp;": " ", "&middot;": "·", "&rarr;": "→", "&larr;": "←", "&times;": "×", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…", "&copy;": "©" };

const isWorthy = (s) => /[A-Za-z]{2,}/.test(s) && !/^[a-z0-9_.\-/]+$/.test(s) && !/^https?:/.test(s) && !/^#[0-9a-f]{3,8}$/i.test(s);
const decode = (s) => s.replace(/&[a-z]+;/g, (e) => ENTITIES[e] ?? e);

function componentOf(node) {
  for (let n = node.parent; n; n = n.parent) {
    let name = null;
    if (ts.isFunctionDeclaration(n) && n.name) name = n.name.text;
    else if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) name = n.parent.name.text;
    if (name && /^[A-Z]/.test(name) && n.body && ts.isBlock(n.body)) return n;
  }
  return null;
}

function run(file) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const isClient = /^\s*["']use client["']/.test(src);
  const edits = [];
  const comps = new Map();
  const keys = new Set();

  function add(node, start, end, text, key) {
    const comp = componentOf(node);
    if (!comp) return;
    if (!isClient && !(comp.modifiers || []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) return;
    comps.set(comp.body.getStart(sf) + 1, comp);
    edits.push({ start, end, text });
    keys.add(key);
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const raw = node.getFullText(sf);
      const trimmed = raw.trim();
      if (trimmed && isWorthy(trimmed) && !trimmed.includes("{") ) {
        const key = decode(trimmed.replace(/\s+/g, " "));
        const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
        // Keep a single space where JSX would have rendered one next to siblings.
        const keepLead = lead && !lead.includes("\n") ? lead : lead.includes("\n") ? "" : "";
        const keepTrail = trail && !trail.includes("\n") ? trail : "";
        const out = `${lead.includes("\n") ? lead : ""}${keepLead ? `{${JSON.stringify(keepLead)}}` : ""}{t(${JSON.stringify(key)})}${keepTrail ? `{${JSON.stringify(keepTrail)}}` : ""}${trail.includes("\n") ? trail : ""}`;
        add(node, node.getFullStart(), node.getEnd(), out, key);
      }
    } else if (ts.isJsxAttribute(node) && ATTRS.has(node.name.getText(sf)) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const v = node.initializer.text;
      if (isWorthy(v)) add(node, node.initializer.getStart(sf), node.initializer.getEnd(), `{t(${JSON.stringify(v)})}`, v);
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && CALLS.has(node.expression.text) && node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) {
      const a = node.arguments[0];
      if (isWorthy(a.text)) add(node, a.getStart(sf), a.getEnd(), `t(${JSON.stringify(a.text)})`, a.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!edits.length) return [];

  // Hook injection: skip components that already define `t`.
  for (const [pos, comp] of comps) {
    const body = comp.body.getText(sf);
    if (/\bconst t = (await getT|useT)\(\)/.test(body)) continue;
    edits.push({ start: pos, end: pos, text: isClient ? "\n  const t = useT();" : "\n  const t = await getT();" });
  }

  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  const imp = isClient ? 'import { useT } from "@/lib/i18n/client";' : 'import { getT } from "@/lib/i18n/server";';
  if (!out.includes(imp)) {
    const lines = out.split("\n");
    let last = -1;
    lines.forEach((l, i) => { if (/^import\b/.test(l)) last = i; });
    // Walk past multi-line imports.
    while (last >= 0 && last + 1 < lines.length && !/;\s*$/.test(lines[last])) last++;
    lines.splice(last + 1, 0, imp);
    out = lines.join("\n");
  }
  fs.writeFileSync(file, out);
  return [...keys];
}

const all = new Set();
for (const f of process.argv.slice(2)) for (const k of run(f)) all.add(k);
console.log(JSON.stringify([...all].sort(), null, 1));

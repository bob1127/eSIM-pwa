#!/usr/bin/env node
/**
 * 將 lib/aiFaqSeedEntries.js 寫入 Supabase ai_faq_entries
 *
 * 用法（在 esim-store-front）：
 *   node scripts/seed-ai-faq.mjs
 *   node scripts/seed-ai-faq.mjs --dry-run
 *
 * 會先刪除 source_note = seed:jeko-site-v1 的舊種子，再整批插入（可重跑）。
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AI_FAQ_SEED_ENTRIES,
  AI_FAQ_SEED_SOURCE,
} from "../lib/aiFaqSeedEntries.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const p = resolve(root, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const rows = AI_FAQ_SEED_ENTRIES.map((e) => ({
  question: e.question,
  answer: e.answer,
  keywords: e.keywords || null,
  enabled: e.enabled !== false,
  sort_order: Number(e.sort_order) || 0,
  source_note: AI_FAQ_SEED_SOURCE,
  updated_at: new Date().toISOString(),
}));

console.log(
  `[seed-ai-faq] ${rows.length} entries · source=${AI_FAQ_SEED_SOURCE}` +
    (dryRun ? " · DRY RUN" : ""),
);

if (dryRun) {
  for (const r of rows) {
    console.log(`- [${r.sort_order}] ${r.question}`);
  }
  process.exit(0);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: delErr, count } = await supabase
  .from("ai_faq_entries")
  .delete({ count: "exact" })
  .in("source_note", [AI_FAQ_SEED_SOURCE, "seed:jeko-site-v1"]);

if (delErr) {
  console.error("[seed-ai-faq] delete failed:", delErr.message);
  console.error(
    "若表尚未建立，請先在 Supabase 執行 supabase/migrations/20260825_ai_faq_entries.sql",
  );
  process.exit(1);
}

console.log(`[seed-ai-faq] removed old seed rows: ${count ?? 0}`);

const { data, error: insErr } = await supabase
  .from("ai_faq_entries")
  .insert(rows)
  .select("id, question");

if (insErr) {
  console.error("[seed-ai-faq] insert failed:", insErr.message);
  process.exit(1);
}

console.log(`[seed-ai-faq] inserted ${data?.length || 0} rows`);
for (const r of data || []) {
  console.log(`  #${r.id} ${r.question}`);
}

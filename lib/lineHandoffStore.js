/**
 * LINE 專人客服轉介票券（短 ID → 提問全文）
 * 存在 process 記憶體；本機／單一實例夠用。正式多實例可再改 Redis／DB。
 */

import { randomBytes } from "crypto";

const TTL_MS = 30 * 60 * 1000;
const MAX_TEXT = 900;

function getStore() {
  const g = globalThis;
  if (!g.__jekoLineHandoffs) g.__jekoLineHandoffs = new Map();
  return g.__jekoLineHandoffs;
}

function prune(store) {
  const now = Date.now();
  for (const [id, row] of store.entries()) {
    if (!row || row.exp < now) store.delete(id);
  }
}

export function createLineHandoff(text) {
  const store = getStore();
  prune(store);
  const id = randomBytes(5).toString("hex");
  const body = String(text || "").trim().slice(0, MAX_TEXT);
  store.set(id, {
    text: body || "您好，我想請專人客服協助（官網 J寶）。",
    exp: Date.now() + TTL_MS,
  });
  return id;
}

export function getLineHandoff(id) {
  const store = getStore();
  prune(store);
  const row = store.get(String(id || ""));
  if (!row) return null;
  if (row.exp < Date.now()) {
    store.delete(String(id));
    return null;
  }
  return row.text;
}

export { MAX_TEXT };

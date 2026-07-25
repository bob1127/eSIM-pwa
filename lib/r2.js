import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 上傳（S3 相容）。
 * 優先讀 R2_*，若未設則沿用後端同一組 S3_*（jeko-esim bucket）。
 */

function env(...names) {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return "";
}

function required(...names) {
  const v = env(...names);
  if (!v) {
    throw new Error(
      `缺少 ${names.join(" 或 ")}：請在 .env.local / Vercel 設定 Cloudflare R2`,
    );
  }
  return v;
}

export function isR2Configured() {
  return Boolean(
    env("R2_BUCKET", "S3_BUCKET") &&
      env("R2_PUBLIC_URL", "S3_FILE_URL") &&
      env("R2_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID") &&
      env("R2_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY") &&
      (env("R2_ENDPOINT", "S3_ENDPOINT") || env("R2_ACCOUNT_ID")),
  );
}

export function getR2PublicBaseUrl() {
  return required("R2_PUBLIC_URL", "S3_FILE_URL").replace(/\/$/, "");
}

function getEndpoint() {
  const explicit = env("R2_ENDPOINT", "S3_ENDPOINT");
  if (explicit) return explicit.replace(/\/$/, "");
  const accountId = env("R2_ACCOUNT_ID");
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  throw new Error("缺少 R2_ENDPOINT / S3_ENDPOINT 或 R2_ACCOUNT_ID");
}

let cachedClient = null;

export function getR2Client() {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: env("R2_REGION", "S3_REGION") || "auto",
    endpoint: getEndpoint(),
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
  });
  return cachedClient;
}

/**
 * @param {{ key: string, body: Buffer|Uint8Array, contentType?: string, cacheControl?: string }} opts
 * @returns {Promise<{ url: string, key: string }>}
 */
export async function uploadToR2({
  key,
  body,
  contentType = "application/octet-stream",
  cacheControl = "public, max-age=31536000",
}) {
  if (!isR2Configured()) {
    throw new Error("R2 尚未設定完成（缺少 bucket / 公開網址 / API Token）");
  }

  const bucket = required("R2_BUCKET", "S3_BUCKET");
  const client = getR2Client();
  const safeKey = String(key).replace(/^\/+/, "");

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: safeKey,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );

  return {
    key: safeKey,
    url: `${getR2PublicBaseUrl()}/${safeKey
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
  };
}

export async function deleteFromR2(key) {
  if (!key || !isR2Configured()) return;
  const bucket = required("R2_BUCKET", "S3_BUCKET");
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: String(key).replace(/^\/+/, ""),
    }),
  );
}

/** 從公開 URL 反推 object key（同 bucket 公開網域） */
export function keyFromPublicUrl(url) {
  if (!url || typeof url !== "string") return null;
  const base = env("R2_PUBLIC_URL", "S3_FILE_URL").replace(/\/$/, "");
  if (!base || !url.startsWith(`${base}/`)) return null;
  try {
    return url
      .slice(base.length + 1)
      .split("/")
      .map((seg) => decodeURIComponent(seg))
      .join("/");
  } catch {
    return null;
  }
}

export function buildObjectKey(folder, fileName, fallbackExt = "bin") {
  const ext =
    (fileName?.split(".").pop() || fallbackExt)
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase() || fallbackExt;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const prefix = String(folder || "uploads")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.\./g, "");
  return `${prefix}/${id}.${ext}`;
}

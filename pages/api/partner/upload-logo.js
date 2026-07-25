import formidable from "formidable";
import fs from "fs";
import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { buildObjectKey, isR2Configured, uploadToR2 } from "../../../lib/r2";

export const config = { api: { bodyParser: false } };

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFiles: 1,
      maxFileSize: MAX_BYTES,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isR2Configured()) {
    return res.status(503).json({ error: "媒體儲存（R2）尚未設定" });
  }

  if (!getSupabaseAdmin()) {
    return res.status(500).json({ error: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) {
    return res.status(401).json({ error: "請先登入" });
  }

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.store) {
    return res.status(403).json({ error: access.message || "無權限" });
  }

  let fields;
  let files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (err) {
    return res.status(400).json({ error: `解析失敗: ${err.message}` });
  }

  const storeId = String(fields.storeId || "").trim();
  if (!storeId || storeId !== String(access.store.id)) {
    return res.status(403).json({ error: "無權上傳此店鋪 Logo" });
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) {
    return res.status(400).json({ error: "未選擇檔案" });
  }
  if (!ALLOWED.includes(file.mimetype)) {
    return res.status(400).json({ error: "請上傳 JPG / PNG / WEBP / GIF" });
  }

  try {
    const buffer = fs.readFileSync(file.filepath);
    const key = buildObjectKey(
      `store-logos/${storeId}`,
      file.originalFilename || "logo.jpg",
      "jpg",
    );
    const { url } = await uploadToR2({
      key,
      body: buffer,
      contentType: file.mimetype,
    });
    return res.status(200).json({ url });
  } catch (err) {
    console.error("[partner/upload-logo]", err);
    return res.status(500).json({ error: err.message || "上傳失敗" });
  }
}

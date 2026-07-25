import formidable from "formidable";
import fs from "fs";
import { requireCustomerEmail } from "../../../lib/refundAuth";
import { MAX_REFUND_IMAGES, MAX_IMAGE_BYTES } from "../../../lib/refundPolicy";
import { buildObjectKey, isR2Configured, uploadToR2 } from "../../../lib/r2";

export const config = { api: { bodyParser: false } };

const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp"];

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFiles: MAX_REFUND_IMAGES,
      maxFileSize: MAX_IMAGE_BYTES,
      multiples: true,
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
    return res.status(503).json({
      error: "媒體儲存（R2）尚未設定，請聯繫管理員",
    });
  }

  const userEmail = await requireCustomerEmail(req, res);
  if (!userEmail) {
    return res.status(401).json({ error: "請先登入" });
  }

  let files;
  try {
    ({ files } = await parseForm(req));
  } catch (err) {
    return res.status(400).json({ error: `解析檔案失敗: ${err.message}` });
  }

  const fileList = files.files
    ? Array.isArray(files.files)
      ? files.files
      : [files.files]
    : [];

  if (fileList.length === 0) {
    return res.status(400).json({ error: "請至少上傳 1 張截圖" });
  }
  if (fileList.length > MAX_REFUND_IMAGES) {
    return res.status(400).json({ error: `最多 ${MAX_REFUND_IMAGES} 張圖片` });
  }

  for (const file of fileList) {
    if (!ALLOWED_IMAGES.includes(file.mimetype)) {
      return res.status(400).json({
        error: `不支援的格式：${file.originalFilename}（僅 JPG、PNG、WebP）`,
      });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return res.status(400).json({
        error: `「${file.originalFilename}」超過 5 MB 上限`,
      });
    }
  }

  const uploaded = [];
  const safeEmail = userEmail.replace(/[^a-zA-Z0-9@._-]/g, "_");

  try {
    for (const file of fileList) {
      const fileBuffer = fs.readFileSync(file.filepath);
      const key = buildObjectKey(
        `refund-evidence/${safeEmail}`,
        file.originalFilename || "screenshot.jpg",
        "jpg",
      );
      const { url, key: storagePath } = await uploadToR2({
        key,
        body: fileBuffer,
        contentType: file.mimetype,
      });
      uploaded.push({
        path: storagePath,
        url,
        name: file.originalFilename || "screenshot",
      });
    }
  } catch (err) {
    console.error("[refund/upload]", err);
    return res.status(500).json({ error: err.message || "上傳失敗" });
  }

  return res.status(200).json({ files: uploaded });
}

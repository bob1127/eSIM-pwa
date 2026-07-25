import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { buildObjectKey, isR2Configured, uploadToR2 } from "../../../../lib/r2";

export const config = { api: { bodyParser: false } };

const MAX_FILES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEOS = ["video/mp4", "video/quicktime", "video/webm"];

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFiles: MAX_FILES,
      maxFileSize: MAX_VIDEO_BYTES,
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

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "請先登入才能上傳媒體" });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: "登入逾時，請重新登入" });
  }

  let fields;
  let files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (err) {
    return res.status(400).json({ error: `解析檔案失敗: ${err.message}` });
  }

  const productId = String(fields.productId || "").trim();
  if (!productId) {
    return res.status(400).json({ error: "缺少 productId" });
  }

  const fileList = files.files
    ? Array.isArray(files.files)
      ? files.files
      : [files.files]
    : [];

  if (fileList.length === 0) {
    return res.status(400).json({ error: "未選擇任何檔案" });
  }
  if (fileList.length > MAX_FILES) {
    return res.status(400).json({ error: `最多上傳 ${MAX_FILES} 個檔案` });
  }

  for (const file of fileList) {
    const isVideo = ALLOWED_VIDEOS.includes(file.mimetype);
    const isImage = ALLOWED_IMAGES.includes(file.mimetype);
    if (!isVideo && !isImage) {
      return res.status(400).json({
        error: `不支援的檔案格式：${file.originalFilename || "unknown"}`,
      });
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      return res.status(400).json({
        error: `圖片「${file.originalFilename}」超過 5 MB 上限`,
      });
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      return res.status(400).json({
        error: `影片「${file.originalFilename}」超過 50 MB 上限`,
      });
    }
  }

  const urls = [];
  const currentMonth = new Date().toISOString().slice(0, 7);

  try {
    for (const file of fileList) {
      const fileBuffer = fs.readFileSync(file.filepath);
      const key = buildObjectKey(
        `review-media/${productId}/${currentMonth}/${user.id}`,
        file.originalFilename ||
          (ALLOWED_VIDEOS.includes(file.mimetype) ? "clip.mp4" : "photo.jpg"),
        ALLOWED_VIDEOS.includes(file.mimetype) ? "mp4" : "jpg",
      );
      const { url } = await uploadToR2({
        key,
        body: fileBuffer,
        contentType: file.mimetype,
      });
      urls.push(url);
    }
  } catch (err) {
    console.error("[product/reviews/upload]", err);
    return res.status(500).json({
      error: err.message || "上傳失敗",
    });
  }

  return res.status(200).json({ urls });
}

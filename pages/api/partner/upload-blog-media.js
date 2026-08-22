import formidable from "formidable";
import fs from "fs";
import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { buildObjectKey, isR2Configured, uploadToR2 } from "../../../lib/r2";
import {
  BLOG_IMAGE_MAX_BYTES,
  BLOG_IMAGE_TYPES,
  BLOG_VIDEO_MAX_BYTES,
  BLOG_VIDEO_MAX_PER_POST,
  BLOG_VIDEO_TYPES,
  countBlogUploadedVideos,
  formatUploadBytes,
} from "../../../lib/partnerBlogMedia";

export const config = { api: { bodyParser: false } };

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFiles: 1,
      maxFileSize: BLOG_VIDEO_MAX_BYTES,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * POST /api/partner/upload-blog-media
 * form: storeId, kind=image|video, file
 */
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
  if (!user) return res.status(401).json({ error: "請先登入" });

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.store) {
    return res.status(403).json({ error: access.message || "無權限" });
  }

  let fields;
  let files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch (err) {
    const msg = String(err?.message || "");
    if (/maxFileSize|max file size|too large/i.test(msg)) {
      return res.status(400).json({
        error: `檔案過大：圖片 ${formatUploadBytes(BLOG_IMAGE_MAX_BYTES)}、影片 ${formatUploadBytes(BLOG_VIDEO_MAX_BYTES)}`,
      });
    }
    return res.status(400).json({ error: `解析失敗: ${err.message}` });
  }

  const storeId = String(fields.storeId || fields.store_id || "").trim();
  if (!storeId || storeId !== String(access.store.id)) {
    return res.status(403).json({ error: "無權上傳此店鋪媒體" });
  }

  const file = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!file) return res.status(400).json({ error: "未選擇檔案" });

  const kindHint = String(fields.kind || "").trim();
  const mime = file.mimetype || "";
  const kind =
    kindHint === "video" || BLOG_VIDEO_TYPES.includes(mime)
      ? "video"
      : "image";

  if (kind === "video") {
    const postId = String(fields.postId || fields.post_id || "").trim();
    const excludeBlockId = String(fields.excludeBlockId || "").trim();
    if (postId) {
      const admin = getSupabaseAdmin();
      const { data: row, error: postErr } = await admin
        .from("store_blog_posts")
        .select("content_blocks")
        .eq("id", postId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (postErr) {
        return res.status(500).json({ error: "無法驗證文章影片配額" });
      }
      if (!row) {
        return res.status(404).json({ error: "找不到文章" });
      }
      const used = countBlogUploadedVideos(row.content_blocks, { excludeBlockId });
      if (used >= BLOG_VIDEO_MAX_PER_POST) {
        return res.status(400).json({
          error: `每篇文章最多上傳 ${BLOG_VIDEO_MAX_PER_POST} 支本機影片（YouTube／Vimeo 嵌入不限）`,
        });
      }
    }
  }

  if (kind === "image" && !BLOG_IMAGE_TYPES.includes(mime)) {
    return res.status(400).json({ error: "圖片請用 JPG / PNG / WEBP / GIF" });
  }
  if (kind === "video" && !BLOG_VIDEO_TYPES.includes(mime)) {
    return res.status(400).json({ error: "影片請用 MP4 / WEBM（建議 H.264）" });
  }

  const max = kind === "video" ? BLOG_VIDEO_MAX_BYTES : BLOG_IMAGE_MAX_BYTES;
  if (file.size > max) {
    return res.status(400).json({
      error: `${kind === "video" ? "影片" : "圖片"}請小於 ${formatUploadBytes(max)}（目前 ${formatUploadBytes(file.size)}）`,
    });
  }

  try {
    const buffer = fs.readFileSync(file.filepath);
    const ext = kind === "video" ? "mp4" : "jpg";
    const key = buildObjectKey(
      `store-blog/${storeId}`,
      file.originalFilename || `media.${ext}`,
      ext,
    );
    const { url } = await uploadToR2({
      key,
      body: buffer,
      contentType: mime || (kind === "video" ? "video/mp4" : "image/jpeg"),
    });
    return res.status(200).json({ url, kind, bytes: file.size });
  } catch (err) {
    console.error("[upload-blog-media]", err);
    return res.status(500).json({ error: err.message || "上傳失敗" });
  }
}

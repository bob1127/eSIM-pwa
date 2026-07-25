import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";
import { buildObjectKey, isR2Configured, uploadToR2 } from "../../../../lib/r2";

export const config = { api: { bodyParser: false } };

const MAX_IMAGES = 4;
const MAX_VIDEOS = 1;
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
      maxFiles: MAX_IMAGES + MAX_VIDEOS,
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
    return res.status(401).json({ error: "登入逾時" });
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
    return res.status(400).json({ error: "未選擇任何檔案" });
  }

  const images = fileList.filter((f) => ALLOWED_IMAGES.includes(f.mimetype));
  const videos = fileList.filter((f) => ALLOWED_VIDEOS.includes(f.mimetype));
  const invalid = fileList.filter(
    (f) =>
      !ALLOWED_IMAGES.includes(f.mimetype) &&
      !ALLOWED_VIDEOS.includes(f.mimetype),
  );

  if (invalid.length > 0) {
    return res.status(400).json({
      error: `不支援的檔案格式：${invalid.map((f) => f.originalFilename).join(", ")}`,
    });
  }
  if (images.length > MAX_IMAGES) {
    return res.status(400).json({ error: `圖片最多 ${MAX_IMAGES} 張` });
  }
  if (videos.length > MAX_VIDEOS) {
    return res.status(400).json({ error: `影片最多 ${MAX_VIDEOS} 個` });
  }
  for (const img of images) {
    if (img.size > MAX_IMAGE_BYTES) {
      return res.status(400).json({
        error: `圖片「${img.originalFilename}」超過 5 MB 上限`,
      });
    }
  }
  for (const vid of videos) {
    if (vid.size > MAX_VIDEO_BYTES) {
      return res.status(400).json({
        error: `影片「${vid.originalFilename}」超過 50 MB 上限`,
      });
    }
  }

  const uploaded = [];

  try {
    for (const file of fileList) {
      const isVideo = ALLOWED_VIDEOS.includes(file.mimetype);
      const mediaType = isVideo ? "video" : "image";
      const fileBuffer = fs.readFileSync(file.filepath);
      const key = buildObjectKey(
        `blog-review-media/${user.id}`,
        file.originalFilename || (isVideo ? "clip.mp4" : "photo.jpg"),
        isVideo ? "mp4" : "jpg",
      );
      const { url, key: storagePath } = await uploadToR2({
        key,
        body: fileBuffer,
        contentType: file.mimetype,
      });

      const { data: mediaRow, error: dbError } = await supabaseAdmin
        .from("blog_review_media")
        .insert({
          review_id: null,
          user_id: user.id,
          media_type: mediaType,
          storage_path: storagePath,
          public_url: url,
          file_name: file.originalFilename || "file",
          file_size: file.size,
        })
        .select("id, media_type, public_url, file_name")
        .single();

      if (dbError) {
        return res.status(500).json({ error: dbError.message });
      }
      uploaded.push(mediaRow);
    }
  } catch (err) {
    console.error("[blog/reviews/upload]", err);
    return res.status(500).json({ error: err.message || "上傳失敗" });
  }

  return res.status(200).json(uploaded);
}

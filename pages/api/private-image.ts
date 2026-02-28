import fs from "fs";
import path from "path";
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 確保請求來自網站內部
  if (!req.headers.referer || !req.headers.referer.includes("yourdomain.com")) {
    return res.status(403).json({ message: "Access Denied" });
  }

  // 動態選擇圖片（防止靜態圖片 URL 曝露）
  const imageName = req.query.image;
  const imagePath = path.join(process.cwd(), "public/private-images", `${imageName}`);

  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ message: "Image Not Found" });
  }

  const imageBuffer = fs.readFileSync(imagePath);
  res.setHeader("Content-Type", "image/jpeg");
  res.send(imageBuffer);
}

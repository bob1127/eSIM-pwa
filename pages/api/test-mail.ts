import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "bob112722761236tom@gmail.com",
      pass: "rssquvzuytrwemaj", // 無空格版本
    },
  });

  try {
    await transporter.sendMail({
      from: `"Test Mail" <bob112722761236tom@gmail.com>`,
      to: "jeekdesign2024@gmail.com",
      subject: "🚀 測試 Gmail App 密碼",
      text: "這是一封測試信。",
    });

    return res.status(200).json({ success: true, message: "Email 發送成功" });
  } catch (error: any) {
    console.error("❌ 發送失敗:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

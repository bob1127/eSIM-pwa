import crypto from "crypto";

export function createMpgAesEncrypt(data: Record<string, any>, key: string, iv: string): string {
  const text = new URLSearchParams(data).toString();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function createMpgShaEncrypt(aesEncrypted: string, key: string, iv: string): string {
  const sha = crypto
    .createHash("sha256")
    .update(`HashKey=${key}&${aesEncrypted}&HashIV=${iv}`)
    .digest("hex")
    .toUpperCase();
  return sha;
}

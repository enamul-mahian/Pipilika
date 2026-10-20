// File storage adapter: local disk (default) or any S3-compatible bucket (AWS S3, Cloudflare R2, DO Spaces).
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const ALLOWED: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "application/pdf": "pdf",
};
export const MAX_UPLOAD = 8 * 1024 * 1024;

export function parseDataUrl(dataUrl: string) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) throw new Error("Invalid file data");
  const mime = m[1];
  if (!ALLOWED[mime] || mime === "image/svg+xml") throw new Error("Only PNG, JPG or WEBP images are allowed");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_UPLOAD) throw new Error("File too large (max 8 MB)");
  // magic-number check
  const sig = buf.subarray(0, 12).toString("hex");
  const okSig = (mime === "image/png" && sig.startsWith("89504e47")) || (mime === "image/jpeg" && sig.startsWith("ffd8")) || (mime === "image/webp" && buf.subarray(8, 12).toString() === "WEBP");
  if (!okSig) throw new Error("File content does not match its type");
  return { mime, buf };
}

const root = () => path.resolve(process.env.UPLOAD_DIR || "./storage");

async function s3() {
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  return { client, PutObjectCommand, GetObjectCommand };
}

export async function putFile(buf: Buffer, mime: string, folder: string) {
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${crypto.randomBytes(12).toString("hex")}.${ALLOWED[mime] ?? "bin"}`;
  if (process.env.STORAGE_DRIVER === "s3") {
    const { client, PutObjectCommand } = await s3();
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buf, ContentType: mime }));
  } else {
    const p = path.join(root(), key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, buf);
  }
  return key;
}

export async function getFile(key: string): Promise<Buffer | null> {
  if (key.includes("..")) return null;
  try {
    if (process.env.STORAGE_DRIVER === "s3") {
      const { client, GetObjectCommand } = await s3();
      const r = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
      return Buffer.from(await r.Body!.transformToByteArray());
    }
    return await fs.readFile(path.join(root(), key));
  } catch {
    return null;
  }
}

export const mimeOf = (key: string) =>
  Object.entries(ALLOWED).find(([, ext]) => key.endsWith("." + ext))?.[0] ?? "application/octet-stream";

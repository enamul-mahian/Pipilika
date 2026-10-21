// File storage adapter: database (default; survives redeploys), local disk, or any S3-compatible bucket (AWS S3, Cloudflare R2, DO Spaces).
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "@/lib/db";

const ALLOWED: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "application/pdf": "pdf",
};
export const MAX_UPLOAD = 8 * 1024 * 1024;

export function parseDataUrl(dataUrl: string) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) throw new Error("Invalid file data");
  return checkImage(Buffer.from(m[2], "base64"), m[1]);
}

/** Validates an uploaded image by type, size and magic number. */
export function checkImage(buf: Buffer, mime: string) {
  if (!ALLOWED[mime] || mime === "image/svg+xml") throw new Error("Only PNG, JPG or WEBP images are allowed");
  if (buf.length > MAX_UPLOAD) throw new Error("File too large (max 8 MB)");
  // magic-number check
  const sig = buf.subarray(0, 12).toString("hex");
  const okSig = (mime === "image/png" && sig.startsWith("89504e47")) || (mime === "image/jpeg" && sig.startsWith("ffd8")) || (mime === "image/webp" && buf.subarray(8, 12).toString() === "WEBP");
  if (!okSig) throw new Error("File content does not match its type");
  return { mime, buf };
}

const driver = () => process.env.STORAGE_DRIVER || "db";
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
  if (driver() === "db") {
    await db.storedFile.create({ data: { key, mime, data: new Uint8Array(buf) } });
  } else if (driver() === "s3") {
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
    if (driver() === "s3") {
      const { client, GetObjectCommand } = await s3();
      const r = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
      return Buffer.from(await r.Body!.transformToByteArray());
    }
    // db driver also falls back to disk for files saved before the switch
    const row = driver() === "db" ? await db.storedFile.findUnique({ where: { key }, select: { data: true } }) : null;
    return row ? Buffer.from(row.data) : await fs.readFile(path.join(root(), key));
  } catch {
    return null;
  }
}

/** True when an uploaded file URL (/api/v1/files/...) still has its file. Other URLs are assumed fine. */
export async function fileUrlExists(url: string) {
  const pre = "/api/v1/files/";
  if (!url.startsWith(pre) || driver() === "s3") return true;
  const key = url.slice(pre.length);
  if (driver() === "db" && (await db.storedFile.count({ where: { key } }))) return true;
  return fs.access(path.join(root(), key)).then(() => true, () => false);
}

export const mimeOf = (key: string) =>
  Object.entries(ALLOWED).find(([, ext]) => key.endsWith("." + ext))?.[0] ?? "application/octet-stream";

// Background removal adapter. With REMOVE_BG_API_KEY uses remove.bg; otherwise the client-side
// fallback (corner-colour flood fill in the browser) is used and this returns null.
export async function removeBackground(png: Buffer): Promise<Buffer | null> {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) return null;
  const form = new FormData();
  form.append("image_file", new Blob([new Uint8Array(png)]), "image.png");
  form.append("size", "auto");
  const res = await fetch("https://api.remove.bg/v1.0/removebg", { method: "POST", headers: { "X-Api-Key": key }, body: form });
  if (!res.ok) throw new Error("Background removal failed");
  return Buffer.from(await res.arrayBuffer());
}

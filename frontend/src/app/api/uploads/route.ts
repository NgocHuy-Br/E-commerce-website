import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const imageTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const maxFileSize = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const data = await request.formData();
  const file = data.get("file");

  if (!(file instanceof File) || !imageTypes[file.type]) {
    return Response.json({ message: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF." }, { status: 400 });
  }
  if (file.size === 0 || file.size > maxFileSize) {
    return Response.json({ message: "Ảnh phải có dung lượng từ 1 byte đến 5 MB." }, { status: 400 });
  }

  const filename = `${randomUUID()}${imageTypes[file.type]}`;
  const uploadDirectory = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()), { flag: "wx" });

  return Response.json({ url: `/uploads/${filename}` });
}

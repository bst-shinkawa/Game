import fs from "fs";
import path from "path";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_BASE_URL!;
  const rootDir = path.join(process.cwd(), "public/img");

  // 対象ディレクトリ
  const targetDirs = ["cards", "field", "front"];

  // 画像ファイルをすべて集める
  const images: string[] = [];

  for (const dir of targetDirs) {
    const fullPath = path.join(rootDir, dir);
    const files = fs.readdirSync(fullPath);

    for (const file of files) {
      // 画像ファイルだけを対象にする
      if (/\.(png|jpg|jpeg|webp)$/i.test(file)) {
        images.push(`/img/${dir}/${file}`);
      }
    }
  }

  // Next.js の最適化を叩いてキャッシュ生成
  for (const img of images) {
    const url = `${base}/_next/image?url=${img}&w=640&q=75`;
    await fetch(url);
  }

  return Response.json({ ok: true, count: images.length });
}
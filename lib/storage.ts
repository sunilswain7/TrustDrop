import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data', 'files');
const PREVIEW_DIR = process.env.PREVIEW_DIR || path.join(process.cwd(), 'data', 'previews');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// Encrypted product files
export async function saveEncryptedFile(listingId: string, blob: Buffer): Promise<string> {
  const dir = path.join(DATA_DIR, listingId);
  await ensureDir(dir);
  const filePath = path.join(dir, 'encrypted.bin');
  await fs.writeFile(filePath, blob);
  return filePath;
}

export async function readEncryptedFile(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

export async function deleteEncryptedFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File may not exist
  }
}

// Preview images
export async function savePreview(
  listingId: string,
  version: number,
  imageBuffer: Buffer
): Promise<string> {
  const dir = path.join(PREVIEW_DIR, listingId);
  await ensureDir(dir);
  const fileName = `v${version}.jpg`;
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, imageBuffer);
  // Return URL path for serving
  return `/api/previews/${listingId}/${fileName}`;
}

export async function readPreview(listingId: string, fileName: string): Promise<Buffer> {
  const filePath = path.join(PREVIEW_DIR, listingId, fileName);
  return fs.readFile(filePath);
}

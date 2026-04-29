import { getSupabaseAdmin, BUCKETS } from './supabase';

export async function saveEncryptedFile(listingId: string, blob: Buffer): Promise<string> {
  const path = `${listingId}/encrypted.bin`;
  const { error } = await getSupabaseAdmin().storage
    .from(BUCKETS.files)
    .upload(path, blob, { contentType: 'application/octet-stream', upsert: true });
  if (error) throw new Error(`Failed to upload encrypted file: ${error.message}`);
  return path;
}

export async function readEncryptedFile(filePath: string): Promise<Buffer> {
  const { data, error } = await getSupabaseAdmin().storage
    .from(BUCKETS.files)
    .download(filePath);
  if (error || !data) throw new Error(`Failed to download encrypted file: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteEncryptedFile(filePath: string): Promise<void> {
  await getSupabaseAdmin().storage.from(BUCKETS.files).remove([filePath]);
}

export async function savePreview(
  listingId: string,
  version: number,
  imageBuffer: Buffer
): Promise<string> {
  const path = `${listingId}/v${version}.jpg`;
  const { error } = await getSupabaseAdmin().storage
    .from(BUCKETS.previews)
    .upload(path, imageBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Failed to upload preview: ${error.message}`);
  const { data: urlData } = getSupabaseAdmin().storage
    .from(BUCKETS.previews)
    .getPublicUrl(path);
  return urlData.publicUrl;
}

export async function readPreview(_listingId: string, _fileName: string): Promise<Buffer> {
  const path = `${_listingId}/${_fileName}`;
  const { data, error } = await getSupabaseAdmin().storage
    .from(BUCKETS.previews)
    .download(path);
  if (error || !data) throw new Error(`Failed to download preview: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function createSignedUploadUrl(bucket: string, path: string) {
  const { data, error } = await getSupabaseAdmin().storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Failed to create signed URL: ${error?.message}`);
  return data;
}

export async function downloadRawUpload(path: string): Promise<Buffer> {
  const { data, error } = await getSupabaseAdmin().storage
    .from(BUCKETS.files)
    .download(path);
  if (error || !data) throw new Error(`Failed to download raw upload: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteRawUpload(path: string): Promise<void> {
  await getSupabaseAdmin().storage.from(BUCKETS.files).remove([path]);
}

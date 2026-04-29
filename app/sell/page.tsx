'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { value: 'roblox', label: 'Roblox' },
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'blender', label: 'Blender / 3D' },
  { value: 'unity', label: 'Unity' },
  { value: 'texture', label: 'Textures / Assets' },
  { value: 'other', label: 'Other' },
];

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

async function uploadToSupabase(file: File, fileType?: 'preview'): Promise<string> {
  const res = await fetch('/api/upload/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, fileType }),
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  const { signedUrl, token, path } = await res.json();

  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!uploadRes.ok) throw new Error('Failed to upload file');

  return path;
}

export default function SellPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('roblox');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');

  const isImage = file
    ? IMAGE_EXTENSIONS.includes(file.name.split('.').pop()?.toLowerCase() || '')
    : false;

  const needsPreview = file && !isImage;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (needsPreview && !previewFile) {
      setError('Non-image files require a preview screenshot');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large (max 50MB)');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      setUploadProgress('Uploading file...');
      const filePath = await uploadToSupabase(file);

      let previewPath: string | undefined;
      if (previewFile) {
        setUploadProgress('Uploading preview...');
        previewPath = await uploadToSupabase(previewFile, 'preview');
      }

      setUploadProgress('Encrypting & creating listing...');
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          price: price || undefined,
          filePath,
          previewPath,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create listing');
        return;
      }

      router.push(`/listing/${data.id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Sell a Digital Asset</h1>
      <p className="text-zinc-400 mb-8">
        Your file will be encrypted with AES-256 until a buyer pays. Only a watermarked preview is shown.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Product File
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/50 transition"
          >
            {file ? (
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-zinc-400">Click to upload</p>
                <p className="text-xs text-zinc-600 mt-1">
                  .blend, .rbxm, .png, .schematic, etc. (max 50MB)
                </p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* Preview Upload (for non-image files) */}
        {needsPreview && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Preview Screenshot (required for non-image files)
            </label>
            <div
              onClick={() => previewRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500/50 transition"
            >
              {previewFile ? (
                <p className="text-white">{previewFile.name}</p>
              ) : (
                <p className="text-zinc-400">Upload a screenshot of your asset</p>
              )}
            </div>
            <input
              ref={previewRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPreviewFile(e.target.files?.[0] || null)}
            />
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Medieval Warrior Model"
            required
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Description <span className="text-zinc-600">(optional — AI will generate one if blank)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your asset..."
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Price (USDC) <span className="text-zinc-600">(leave blank for AI suggestion)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !file || !title}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition"
        >
          {submitting ? uploadProgress || 'Processing...' : 'List for Sale'}
        </button>

        <p className="text-xs text-zinc-600 text-center">
          Your file will be encrypted with AES-256 before storage. Only a watermarked low-res preview will be visible to buyers.
        </p>
      </form>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sunburst from '@/components/Sunburst';

const CATEGORIES = [
  { value: 'roblox',   label: 'Roblox' },
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'blender',  label: 'Blender / 3D' },
  { value: 'unity',    label: 'Unity' },
  { value: 'texture',  label: 'Textures / Assets' },
  { value: 'other',    label: 'Other' },
];

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
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

  const fileExt = file?.name.split('.').pop()?.toLowerCase() || '';
  const isImage = file ? IMAGE_EXTENSIONS.includes(fileExt) : false;
  const isVideo = file ? VIDEO_EXTENSIONS.includes(fileExt) : false;

  const needsPreview = file && !isImage && !isVideo;

  async function handleSubmit(e: { preventDefault(): void }) {
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

      setUploadProgress(isVideo ? 'Encrypting & generating video preview...' : 'Encrypting & creating listing...');
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
      if (!res.ok) { setError(data.error || 'Failed to create listing'); return; }
      router.push(`/listing/${data.id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-12 bg-[var(--bg-cream)] relative overflow-hidden">
      <Sunburst color="var(--accent-yellow)" size={100} rotation={10}  className="absolute top-8  right-[6%]  opacity-25 hidden sm:block" />
      <Sunburst color="var(--accent-coral)"  size={60}  rotation={-15} className="absolute bottom-10 left-[5%] opacity-25 hidden md:block" />

      <div className="relative z-10 w-full max-w-xl">
        <div className="card-retro-static p-6 sm:p-8">

          {/* Header */}
          <div className="mb-8 pb-6 border-b-2 border-[var(--ink)]">
            <p className="label-uppercase mb-2">Create Listing</p>
            <h1
              className="text-2xl sm:text-3xl text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
            >
              SELL A DIGITAL ASSET
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mt-2 leading-relaxed font-medium">
              Your file is encrypted with AES-256 until a buyer pays. Only a watermarked preview is shown.
            </p>
          </div>

          {error && (
            <div
              className="border-2 border-[var(--ink)] bg-[var(--accent-coral)] text-white px-4 py-3 mb-6 text-sm font-semibold"
              style={{ boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* File Upload */}
            <div>
              <label className="label-uppercase">Product File</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[var(--ink)] p-8 text-center cursor-pointer transition-all hover:bg-[var(--bg-cream-alt)]"
                style={file ? { background: 'var(--bg-cream-alt)' } : {}}
              >
                {file ? (
                  <div>
                    <p className="text-[var(--ink)] font-bold text-sm uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                      {file.name}
                    </p>
                    <p className="text-[12px] text-[var(--ink-soft)] mt-1 font-medium">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <div
                      className="w-12 h-12 mx-auto mb-3 border-2 border-[var(--ink)] flex items-center justify-center"
                      style={{ background: 'var(--accent-yellow)', boxShadow: '2px 2px 0 0 var(--shadow-hard)' }}
                    >
                      <svg className="w-6 h-6 text-[var(--ink)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-[var(--ink)] font-bold text-sm uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                      Click to upload
                    </p>
                    <p className="text-[11px] text-[var(--ink-soft)] mt-1 font-medium">
                      .blend, .rbxm, .png, .schematic, etc. (max 50 MB)
                    </p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>

            {/* Preview upload (non-image files) */}
            {needsPreview && (
              <div>
                <label className="label-uppercase">
                  Preview Screenshot
                  <span className="text-[var(--ink-soft)] font-normal normal-case ml-1 text-[10px]">(required)</span>
                </label>
                <div
                  onClick={() => previewRef.current?.click()}
                  className="border-2 border-dashed border-[var(--ink)] p-6 text-center cursor-pointer hover:bg-[var(--bg-cream-alt)] transition-all"
                >
                  {previewFile ? (
                    <p className="text-[var(--ink)] font-bold text-sm uppercase" style={{ fontFamily: 'var(--font-display)' }}>
                      {previewFile.name}
                    </p>
                  ) : (
                    <p className="text-[var(--ink-soft)] font-semibold text-sm">Upload a screenshot of your asset</p>
                  )}
                </div>
                <input ref={previewRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPreviewFile(e.target.files?.[0] || null)} />
              </div>
            )}

            <div className="border-t-2 border-[var(--ink)]" />

            {/* Title */}
            <div>
              <label className="label-uppercase">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Medieval Warrior Model"
                required
                className="input-retro"
              />
            </div>

            {/* Category */}
            <div>
              <label className="label-uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-retro"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="label-uppercase">
                Description
                <span className="text-[var(--ink-soft)] font-normal normal-case ml-1 text-[10px]">(optional — AI generates one if blank)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your asset…"
                rows={4}
                className="input-retro resize-none"
              />
            </div>

            {/* Price */}
            <div>
              <label className="label-uppercase">
                Amount (USDC)
                <span className="text-[var(--ink-soft)] font-normal normal-case ml-1 text-[10px]">(leave blank for AI suggestion)</span>
              </label>
              <div className="flex items-center border-2 border-[var(--ink)] bg-white overflow-hidden transition-all focus-within:shadow-[4px_4px_0_0_var(--shadow-hard)]">
                <span
                  className="px-4 text-[var(--ink)] font-bold text-[14px] select-none border-r-2 border-[var(--ink)] py-3 bg-[var(--accent-yellow)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-4 py-3 text-[14px] text-[var(--ink)] bg-transparent outline-none placeholder:text-[#888]"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
                />
              </div>
            </div>

            <div className="border-t-2 border-[var(--ink)]" />

            <button
              type="submit"
              disabled={submitting || !file || !title}
              className="btn-primary w-full py-3 text-[14px]"
            >
              {submitting ? (uploadProgress || 'Processing…') : 'List for Sale →'}
            </button>

            <p className="text-[11px] text-[var(--ink-soft)] text-center font-medium">
              Your file is encrypted with AES-256 before storage. Only a watermarked low-res preview is visible to buyers.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

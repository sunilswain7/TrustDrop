import sharp from 'sharp';

const WATERMARK_TEXT = 'TrustDrop Preview';

function createWatermarkSvg(width: number, height: number): Buffer {
  // Create diagonal repeating watermark pattern
  const fontSize = Math.max(20, Math.floor(width / 15));
  const lineSpacing = fontSize * 3;
  const lines: string[] = [];

  for (let y = -height; y < height * 2; y += lineSpacing) {
    lines.push(
      `<text x="${width / 2}" y="${y}" font-size="${fontSize}" ` +
        `fill="rgba(255,255,255,0.4)" font-family="Arial, sans-serif" ` +
        `font-weight="bold" text-anchor="middle" ` +
        `transform="rotate(-35, ${width / 2}, ${y})">${WATERMARK_TEXT}</text>`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${lines.join('\n')}
  </svg>`;

  return Buffer.from(svg);
}

export async function generatePreview(
  imageBuffer: Buffer,
  options?: { maxWidth?: number; quality?: number }
): Promise<Buffer> {
  const maxWidth = options?.maxWidth ?? 800;
  const quality = options?.quality ?? 60;

  // Get original dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const origWidth = metadata.width || maxWidth;
  const origHeight = metadata.height || 600;

  // Compute final dimensions from resize math (sharp.metadata() reflects the
  // input, not the resized output, so we can't read it from the chain).
  const finalWidth = Math.min(origWidth, maxWidth);
  const finalHeight = Math.max(1, Math.round((origHeight / origWidth) * finalWidth));

  // Resize first, then composite the SVG sized to match the resized output.
  const resizedBuffer = await sharp(imageBuffer)
    .resize(finalWidth, undefined, { fit: 'inside', withoutEnlargement: true })
    .toBuffer();

  const watermarkSvg = createWatermarkSvg(finalWidth, finalHeight);

  const preview = await sharp(resizedBuffer)
    .composite([{ input: watermarkSvg, gravity: 'center' }])
    .jpeg({ quality })
    .toBuffer();

  return preview;
}

// For non-image files, seller provides their own screenshot
// We still watermark it the same way
export async function watermarkSellerScreenshot(screenshotBuffer: Buffer): Promise<Buffer> {
  return generatePreview(screenshotBuffer);
}

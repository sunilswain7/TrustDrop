import sharp from 'sharp';
import { analyzeImage, ImageAnalysis } from './vision-agent';

const BRAND = 'TrustDrop';

export async function generatePreview(
  imageBuffer: Buffer,
  context?: { title?: string; category?: string }
): Promise<{ previewBuffer: Buffer; analysis: ImageAnalysis }> {
  const metadata = await sharp(imageBuffer).metadata();
  const origW = metadata.width || 800;
  const origH = metadata.height || 600;
  const mime = `image/${metadata.format || 'jpeg'}`;

  // 1. Vision Agent analyzes the image
  let analysis: ImageAnalysis;
  try {
    analysis = await analyzeImage(imageBuffer, mime, {
      title: context?.title || 'Digital Asset',
      category: context?.category || 'other',
    });
    console.log(`[PREVIEW] Vision agent: "${analysis.tagline}" — mood: ${analysis.mood}`);
  } catch (err) {
    console.warn('[PREVIEW] Vision agent failed, using fallback:', err);
    analysis = {
      tagline: `Premium ${context?.category || ''} asset`,
      description: 'A high-quality digital asset on TrustDrop.',
      regions: [
        { x: 0.05, y: 0.05, w: 0.35, h: 0.35, label: 'Detail' },
        { x: 0.55, y: 0.1, w: 0.35, h: 0.35, label: 'Feature' },
        { x: 0.25, y: 0.55, w: 0.4, h: 0.35, label: 'Highlight' },
      ],
      mood: 'dramatic',
      dominantColors: ['#1a1a2e', '#16213e', '#0f3460'],
    };
  }

  // 2. Canvas dimensions
  const canvasW = Math.min(origW, 1200);
  const canvasH = Math.max(1, Math.round((origH / origW) * canvasW));

  // 3. Create blurred + darkened background
  const bgBuffer = await sharp(imageBuffer)
    .resize(canvasW, canvasH, { fit: 'cover' })
    .blur(30)
    .modulate({ brightness: 0.3 })
    .toBuffer();

  // 4. Extract spotlight regions as crisp crops
  const spotlights: { buffer: Buffer; x: number; y: number; w: number; h: number; label: string }[] = [];

  for (const region of analysis.regions.slice(0, 3)) {
    const cropX = Math.max(0, Math.floor(region.x * origW));
    const cropY = Math.max(0, Math.floor(region.y * origH));
    const cropW = Math.min(Math.floor(region.w * origW), origW - cropX);
    const cropH = Math.min(Math.floor(region.h * origH), origH - cropY);

    if (cropW < 10 || cropH < 10) continue;

    try {
      const targetW = Math.floor(region.w * canvasW);
      const targetH = Math.floor(region.h * canvasH);
      if (targetW < 10 || targetH < 10) continue;

      const cropped = await sharp(imageBuffer)
        .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
        .resize(targetW, targetH, { fit: 'cover' })
        .toBuffer();

      // Add rounded corners + border glow
      const rounded = await addSpotlightFrame(cropped, targetW, targetH, analysis.dominantColors[0] || '#10b981');

      spotlights.push({
        buffer: rounded,
        x: Math.floor(region.x * canvasW),
        y: Math.floor(region.y * canvasH),
        w: targetW,
        h: targetH,
        label: region.label,
      });
    } catch (err) {
      console.warn(`[PREVIEW] Failed to extract region "${region.label}":`, err);
    }
  }

  // 5. Build the tagline + brand overlay SVG
  const overlaySvg = buildOverlaySvg(canvasW, canvasH, analysis, spotlights);

  // 6. Composite everything
  const composites: sharp.OverlayOptions[] = [];

  for (const spot of spotlights) {
    composites.push({
      input: spot.buffer,
      left: Math.max(0, Math.min(spot.x, canvasW - spot.w)),
      top: Math.max(0, Math.min(spot.y, canvasH - spot.h)),
    });
  }

  composites.push({ input: Buffer.from(overlaySvg), gravity: 'center' });

  const preview = await sharp(bgBuffer)
    .composite(composites)
    .jpeg({ quality: 85 })
    .toBuffer();

  return { previewBuffer: preview, analysis };
}

async function addSpotlightFrame(
  imageBuffer: Buffer,
  w: number,
  h: number,
  accentColor: string
): Promise<Buffer> {
  const borderWidth = 3;
  const radius = 12;
  const outerW = w + borderWidth * 2;
  const outerH = h + borderWidth * 2;

  const frameSvg = `<svg width="${outerW}" height="${outerH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect x="0" y="0" width="${outerW}" height="${outerH}" rx="${radius}" ry="${radius}"
          fill="none" stroke="${accentColor}" stroke-width="${borderWidth}" filter="url(#glow)" opacity="0.8"/>
  </svg>`;

  const mask = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/>
  </svg>`;

  const maskedImage = await sharp(imageBuffer)
    .resize(w, h, { fit: 'cover' })
    .composite([{ input: Buffer.from(mask), blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp(Buffer.from(frameSvg))
    .composite([{ input: maskedImage, left: borderWidth, top: borderWidth }])
    .png()
    .toBuffer();
}

function buildOverlaySvg(
  w: number,
  h: number,
  analysis: ImageAnalysis,
  spotlights: { x: number; y: number; w: number; h: number; label: string }[]
): string {
  const tagline = escapeXml(analysis.tagline.slice(0, 70));
  const tagFontSize = Math.max(18, Math.floor(w / 30));
  const labelFontSize = Math.max(11, Math.floor(w / 60));
  const brandFontSize = Math.max(12, Math.floor(w / 50));

  // Spotlight labels
  const labelElements = spotlights.map((s) => {
    const lx = Math.max(0, Math.min(s.x, w - 100));
    const ly = Math.max(labelFontSize + 4, s.y - 8);
    return `<text x="${lx}" y="${ly}" font-size="${labelFontSize}" fill="rgba(255,255,255,0.85)"
      font-family="system-ui, -apple-system, sans-serif" font-weight="600"
      letter-spacing="1.5" text-transform="uppercase">${escapeXml(s.label.toUpperCase())}</text>`;
  }).join('\n');

  // Gradient at bottom for tagline
  const gradH = Math.floor(h * 0.25);

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="black" stop-opacity="0"/>
        <stop offset="1" stop-color="black" stop-opacity="0.85"/>
      </linearGradient>
    </defs>

    <!-- Bottom gradient -->
    <rect x="0" y="${h - gradH}" width="${w}" height="${gradH}" fill="url(#bottomFade)"/>

    <!-- Tagline -->
    <text x="${Math.floor(w / 2)}" y="${h - 36}" font-size="${tagFontSize}" fill="white"
      font-family="system-ui, -apple-system, sans-serif" font-weight="700"
      text-anchor="middle" letter-spacing="0.5">${tagline}</text>

    <!-- Brand -->
    <text x="${w - 16}" y="${h - 12}" font-size="${brandFontSize}" fill="rgba(16,185,129,0.7)"
      font-family="system-ui, -apple-system, sans-serif" font-weight="600"
      text-anchor="end" letter-spacing="2">${BRAND}</text>

    <!-- Spotlight labels -->
    ${labelElements}

    <!-- Top-left lock icon hint -->
    <text x="16" y="30" font-size="${brandFontSize}" fill="rgba(255,255,255,0.5)"
      font-family="system-ui, -apple-system, sans-serif" font-weight="500">
      Encrypted Preview
    </text>
  </svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// For non-image files, seller provides their own screenshot — same pipeline
export async function watermarkSellerScreenshot(
  screenshotBuffer: Buffer,
  context?: { title?: string; category?: string }
): Promise<{ previewBuffer: Buffer; analysis: ImageAnalysis }> {
  return generatePreview(screenshotBuffer, context);
}

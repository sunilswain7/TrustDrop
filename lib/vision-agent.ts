const LOCUS_API_BASE = process.env.LOCUS_API_BASE || 'https://beta-api.paywithlocus.com/api';

function getApiKey(): string {
  const key = process.env.LOCUS_API_KEY;
  if (!key) throw new Error('LOCUS_API_KEY is not set');
  return key;
}

export interface ImageAnalysis {
  tagline: string;
  description: string;
  regions: { x: number; y: number; w: number; h: number; label: string }[];
  mood: string;
  dominantColors: string[];
}

export async function analyzeImage(
  imageBuffer: Buffer,
  mimeType: string,
  context: { title: string; category: string }
): Promise<ImageAnalysis> {
  const base64 = imageBuffer.toString('base64');

  const res = await fetch(`${LOCUS_API_BASE}/wrapped/gemini/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object',
        properties: {
          tagline: { type: 'string', description: 'A catchy one-line tagline for this asset (max 60 chars)' },
          description: { type: 'string', description: 'A compelling 2-sentence description for buyers' },
          regions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number', description: 'Horizontal position as fraction 0-1' },
                y: { type: 'number', description: 'Vertical position as fraction 0-1' },
                w: { type: 'number', description: 'Width as fraction 0-1 (min 0.15, max 0.4)' },
                h: { type: 'number', description: 'Height as fraction 0-1 (min 0.15, max 0.4)' },
                label: { type: 'string', description: 'Short label for this region (2-3 words)' },
              },
              required: ['x', 'y', 'w', 'h', 'label'],
            },
            description: 'The 3 most visually interesting regions to showcase',
          },
          mood: { type: 'string', description: 'Visual mood: vibrant, dark, minimal, warm, cool, dramatic, playful' },
          dominantColors: {
            type: 'array',
            items: { type: 'string' },
            description: '2-3 dominant hex colors in the image',
          },
        },
        required: ['tagline', 'description', 'regions', 'mood', 'dominantColors'],
      },
      systemInstruction: `You are a visual merchandising AI for TrustDrop, a digital asset marketplace. Analyze uploaded images of digital assets (3D models, textures, game assets, art) and identify the most compelling visual elements to create a movie-trailer-style preview. Pick 3 regions that would make a buyer curious. The regions should NOT overlap. Write taglines that sell.`,
      messages: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64,
              },
            },
            {
              text: `This is a ${context.category} digital asset titled "${context.title}". Analyze it and return the JSON with tagline, description, 3 spotlight regions, mood, and dominant colors. The regions use fractional coordinates (0-1) relative to image dimensions.`,
            },
          ],
        },
      ],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[VISION] Gemini API error:', data);
    throw new Error(`Vision analysis failed: ${res.status}`);
  }

  const text = data?.data?.text || data?.text || '';
  try {
    const parsed = typeof text === 'string' ? JSON.parse(text) : text;
    if (!parsed.regions || parsed.regions.length === 0) {
      parsed.regions = defaultRegions();
    }
    return parsed as ImageAnalysis;
  } catch {
    console.warn('[VISION] Failed to parse Gemini response, using defaults');
    return fallbackAnalysis(context.title, context.category);
  }
}

function defaultRegions() {
  return [
    { x: 0.05, y: 0.05, w: 0.35, h: 0.35, label: 'Detail' },
    { x: 0.55, y: 0.1, w: 0.35, h: 0.35, label: 'Feature' },
    { x: 0.25, y: 0.55, w: 0.4, h: 0.35, label: 'Highlight' },
  ];
}

function fallbackAnalysis(title: string, category: string): ImageAnalysis {
  return {
    tagline: `Premium ${category} asset — ${title}`,
    description: `A high-quality ${category} digital asset ready for your project. Encrypted and verified on TrustDrop.`,
    regions: defaultRegions(),
    mood: 'dramatic',
    dominantColors: ['#1a1a2e', '#16213e', '#0f3460'],
  };
}

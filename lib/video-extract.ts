import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const exec = promisify(execFile);

const TMP_DIR = '/tmp/trustdrop-video';

async function ensureTmp() {
  await fs.mkdir(TMP_DIR, { recursive: true });
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  const { stdout } = await exec('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    videoPath,
  ]);
  const info = JSON.parse(stdout);
  return parseFloat(info.format?.duration || '0');
}

export async function extractFrames(
  videoBuffer: Buffer,
  count: number = 8
): Promise<{ frames: Buffer[]; duration: number }> {
  await ensureTmp();
  const id = crypto.randomUUID();
  const videoPath = path.join(TMP_DIR, `${id}.mp4`);
  const framePattern = path.join(TMP_DIR, `${id}-frame-%03d.jpg`);

  try {
    await fs.writeFile(videoPath, videoBuffer);

    const duration = await getVideoDuration(videoPath);
    const interval = duration / (count + 1);

    // Extract evenly spaced frames, scaled to max 800px wide
    await exec('ffmpeg', [
      '-i', videoPath,
      '-vf', `fps=1/${Math.max(1, Math.floor(interval))},scale=800:-2`,
      '-frames:v', String(count),
      '-q:v', '3',
      '-y',
      framePattern,
    ], { timeout: 30000 });

    const frames: Buffer[] = [];
    for (let i = 1; i <= count; i++) {
      const framePath = path.join(TMP_DIR, `${id}-frame-${String(i).padStart(3, '0')}.jpg`);
      try {
        const buf = await fs.readFile(framePath);
        frames.push(buf);
      } catch {
        break;
      }
    }

    return { frames, duration };
  } finally {
    // Cleanup temp files
    const files = await fs.readdir(TMP_DIR).catch(() => []);
    for (const f of files) {
      if (f.startsWith(id)) {
        await fs.unlink(path.join(TMP_DIR, f)).catch(() => {});
      }
    }
  }
}

export async function createPreviewGif(
  frames: Buffer[],
  width: number = 600
): Promise<Buffer> {
  await ensureTmp();
  const id = crypto.randomUUID();
  const inputPaths: string[] = [];

  try {
    // Write selected frames to disk
    for (let i = 0; i < frames.length; i++) {
      const p = path.join(TMP_DIR, `${id}-gif-${String(i).padStart(3, '0')}.jpg`);
      await fs.writeFile(p, frames[i]);
      inputPaths.push(p);
    }

    const outputPath = path.join(TMP_DIR, `${id}-preview.gif`);

    // Create GIF with crossfade-like effect (slow framerate for trailer feel)
    await exec('ffmpeg', [
      '-framerate', '1.5',
      '-i', path.join(TMP_DIR, `${id}-gif-%03d.jpg`),
      '-vf', `scale=${width}:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`,
      '-loop', '0',
      '-y',
      outputPath,
    ], { timeout: 30000 });

    return await fs.readFile(outputPath);
  } finally {
    const files = await fs.readdir(TMP_DIR).catch(() => []);
    for (const f of files) {
      if (f.startsWith(id)) {
        await fs.unlink(path.join(TMP_DIR, f)).catch(() => {});
      }
    }
  }
}

import * as ort from 'onnxruntime-web';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use jsDelivr CDN for faster downloads
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/danielgatis/rembg@v0.0.0/u2net.onnx';
const DEFAULT_MODEL_PATH = join(__dirname, 'model', 'u2net.onnx');
const MODEL_VERSION = '1.0.0'; // For future version control

// Allow custom model directory through env var
const getModelPath = () => {
  const customDir = process.env.BG_REMOVER_MODEL_DIR;
  return customDir ? join(customDir, 'u2net.onnx') : DEFAULT_MODEL_PATH;
};

async function downloadWithProgress(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download model: ${res.statusText}`);
  
  const total = parseInt(res.headers.get('content-length') || '0');
  let downloaded = 0;
  
  const chunks = [];
  const reader = res.body.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    downloaded += value.length;
    
    if (total) {
      const percent = ((downloaded / total) * 100).toFixed(1);
      process.stdout.write(`Downloading model: ${percent}% (${(downloaded/1024/1024).toFixed(1)}MB)\r`);
    }
  }
  
  process.stdout.write('\n');
  const buffer = Buffer.concat(chunks);
  await fs.writeFile(path, buffer);
}

async function ensureModel() {
  try {
    const modelPath = getModelPath();
    // Check if model exists and has correct version
    const versionPath = `${modelPath}.version`;
    let needsDownload = true;
    
    try {
      const version = await fs.readFile(versionPath, 'utf8');
      if (version === MODEL_VERSION) {
        needsDownload = false;
      }
    } catch {} // Version file doesn't exist
    
    if (!needsDownload) {
      return modelPath;
    }

    console.log('Downloading U-2-Net model...');
    await fs.mkdir(dirname(modelPath), { recursive: true });
    await downloadWithProgress(MODEL_URL, modelPath);
    await fs.writeFile(versionPath, MODEL_VERSION);
    console.log('Model downloaded successfully.');
    return modelPath;
  } catch (err) {
    console.error('Error downloading model:', err.message);
    throw err;
  }
}

function preprocessImageBuffer(imageBuffer) {
  // Returns a Float32Array in NCHW [1,3,320,320] order, normalized 0-1
  return sharp(imageBuffer)
    .resize(320, 320)
    .removeAlpha()
    .raw()
    .toBuffer()
    .then((buf) => {
      const arr = new Float32Array(1 * 3 * 320 * 320);
      for (let y = 0; y < 320; y++) {
        for (let x = 0; x < 320; x++) {
          for (let c = 0; c < 3; c++) {
            arr[c * 320 * 320 + y * 320 + x] = buf[(y * 320 + x) * 3 + c] / 255;
          }
        }
      }
      return arr;
    });
}

async function runU2Net(inputImageBuffer, modelPath) {
  const session = await ort.InferenceSession.create(modelPath, { executionProviders: ['wasm'] });
  const inputTensor = await preprocessImageBuffer(inputImageBuffer);
  const tensor = new ort.Tensor('float32', inputTensor, [1, 3, 320, 320]);
  const feeds = { [session.inputNames[0]]: tensor };
  const results = await session.run(feeds);
  // U-2-Net output is [1,1,320,320]
  const output = results[session.outputNames[0]].data;
  return output;
}

function postprocessMatteToPng(inputImageBuffer, matte, origW, origH) {
  // matte: Float32Array [1,1,320,320] flat, values 0-1 where 1 is foreground
  // Returns a PNG buffer with alpha
  return sharp(inputImageBuffer)
    .resize(origW, origH)
    .removeAlpha()
    .raw()
    .toBuffer()
    .then((rgb) => {
      // Resize matte to origW x origH and invert values (1 - matte)
      // so foreground (1) becomes opaque (255) and background (0) becomes transparent (0)
      return sharp(Buffer.from(matte.map(v => Math.round((1 - v) * 255))), {
        raw: { width: 320, height: 320, channels: 1 }
      })
        .resize(origW, origH)
        .raw()
        .toBuffer()
        .then((alpha) => {
          // Compose RGBA
          const out = Buffer.alloc(origW * origH * 4);
          for (let i = 0; i < origW * origH; i++) {
            out[i * 4 + 0] = rgb[i * 3 + 0];
            out[i * 4 + 1] = rgb[i * 3 + 1];
            out[i * 4 + 2] = rgb[i * 3 + 2];
            out[i * 4 + 3] = 255 - alpha[i]; // Invert alpha again since we want foreground to be opaque
          }
          return sharp(out, { raw: { width: origW, height: origH, channels: 4 } }).png().toBuffer();
        });
    });
}

/**
 * Remove background from an image file and save as PNG with transparency
 * @param {string} inputPath
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
export async function removeBackground(inputPath, outputPath) {
  const modelPath = await ensureModel();
  const inputBuffer = await fs.readFile(inputPath);
  const { width, height } = await sharp(inputBuffer).metadata();
  const matte = await runU2Net(inputBuffer, modelPath);
  const pngBuffer = await postprocessMatteToPng(inputBuffer, matte, width, height);
  await fs.writeFile(outputPath, pngBuffer);
}

export default { removeBackground }; 
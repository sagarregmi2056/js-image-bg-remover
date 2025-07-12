import * as ort from 'onnxruntime-web';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');
import { existsSync, mkdirSync, renameSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use a more reliable model source
const MODEL_URL = 'https://github.com/user-attachments/files/21196511/u2net.zip';
const MODEL_PATH = join(__dirname, 'model', 'u2net.onnx');
const MODEL_VERSION = '1.0.0';

// Allow custom model directory through env var
const getModelPath = () => {
  const customDir = process.env.BG_REMOVER_MODEL_DIR;
  return customDir ? join(customDir, 'u2net.onnx') : MODEL_PATH;
};

async function downloadWithProgress(url, targetPath) {
    try {
        console.log('Downloading U-2-Net model...');
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download model: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10);
        let downloaded = 0;

        const buffer = await response.arrayBuffer();
        const zipBuffer = Buffer.from(buffer);
        
        // Create model directory if it doesn't exist
        const modelDir = dirname(targetPath);
        if (!existsSync(modelDir)) {
            mkdirSync(modelDir, { recursive: true });
        }

        // Extract model file from ZIP
        const zip = new AdmZip(zipBuffer);
        const zipEntry = zip.getEntries()[0]; // Get first file in ZIP
        if (!zipEntry) {
            throw new Error('ZIP file is empty');
        }

        // Write the model file
        zip.extractEntryTo(zipEntry, modelDir, false, true);
        
        // Rename extracted file to expected name if needed
        const extractedPath = join(modelDir, zipEntry.entryName);
        if (extractedPath !== targetPath) {
            renameSync(extractedPath, targetPath);
        }

        console.log('Model downloaded and extracted successfully!');
    } catch (error) {
        console.error('Error downloading model:', error);
        throw error;
    }
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
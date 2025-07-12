import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = join(dirname(__dirname), 'model');
const MODEL_PATH = join(MODEL_DIR, 'u2net.onnx');
const MODEL_VERSION = '1.0.0';
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/danielgatis/rembg@v0.0.0/u2net.onnx';

async function downloadWithProgress(url, path) {
  try {
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
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, buffer);
    await fs.writeFile(`${path}.version`, MODEL_VERSION);
    console.log('Model downloaded successfully to:', path);
  } catch (err) {
    // Don't fail npm install if download fails - we'll retry at runtime
    console.warn('Warning: Failed to download model during install:', err.message);
    console.warn('The model will be downloaded on first use instead.');
  }
}

// Allow setting custom model directory through env var
const customModelDir = process.env.BG_REMOVER_MODEL_DIR;
const targetModelPath = customModelDir ? join(customModelDir, 'u2net.onnx') : MODEL_PATH;

downloadWithProgress(MODEL_URL, targetModelPath); 
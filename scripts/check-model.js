import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_DIR = join(dirname(__dirname), 'model');
const MODEL_PATH = join(MODEL_DIR, 'u2net.onnx');

async function checkModel() {
  try {
    const customModelDir = process.env.BG_REMOVER_MODEL_DIR;
    const targetModelPath = customModelDir ? join(customModelDir, 'u2net.onnx') : MODEL_PATH;
    
    const stats = await fs.stat(targetModelPath);
    if (stats.size > 100000000) { // Model should be >100MB
      console.log('✅ Model verified successfully at:', targetModelPath);
    } else {
      console.warn('⚠️ Warning: Model file exists but seems incomplete');
      console.warn('The model will be re-downloaded on first use if needed');
    }
  } catch (err) {
    console.warn('⚠️ Note: Model not found at install time');
    console.warn('The model will be downloaded automatically on first use');
  }
}

checkModel(); 
import { removeBackground } from '../index.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function runTest() {
  try {
    // Create test directory if it doesn't exist
    const testDir = join(__dirname, 'fixtures');
    await fs.mkdir(testDir, { recursive: true });

    // Download a test image if not exists
    const testImage = join(testDir, 'test.jpg');
    if (!await fs.access(testImage).catch(() => false)) {
      console.log('Downloading test image...');
      const response = await fetch('https://raw.githubusercontent.com/danielgatis/rembg/master/examples/car-1.jpg');
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(testImage, buffer);
    }

    // Run background removal
    console.log('Testing background removal...');
    const outputImage = join(testDir, 'output.png');
    await removeBackground(testImage, outputImage);

    // Verify output exists and has size
    const stats = await fs.stat(outputImage);
    if (stats.size > 0) {
      console.log('✅ Test passed! Output image generated successfully');
      console.log(`Output saved to: ${outputImage}`);
    } else {
      throw new Error('Output image is empty');
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTest(); 
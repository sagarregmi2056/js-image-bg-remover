import { removeBackground } from '../index.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';

const ITERATIONS = 5;
const TEST_IMAGES = [
  { name: 'small', size: '500x500' },
  { name: 'medium', size: '1024x1024' },
  { name: 'large', size: '2048x2048' }
];

async function generateTestImage(size) {
  const [width, height] = size.split('x').map(Number);
  const command = `convert -size ${size} xc:white -draw "circle ${width/2},${height/2} ${width/2},0" -draw "rectangle 0,${height/2} ${width},${height}" test.png`;
  // Note: requires ImageMagick. In production, we'll download test images instead
  return command;
}

async function runBenchmark() {
  console.log('Running background removal benchmarks...\n');
  console.log('Configuration:');
  console.log(`- Iterations per image: ${ITERATIONS}`);
  console.log(`- Test images: ${TEST_IMAGES.map(i => i.size).join(', ')}`);
  console.log('\nResults:\n');

  const results = [];
  
  for (const { name, size } of TEST_IMAGES) {
    const times = [];
    const inputPath = join('benchmarks', 'images', `${name}.jpg`);
    const outputPath = join('benchmarks', 'output', `${name}_output.png`);

    console.log(`Testing ${name} image (${size})...`);

    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      await removeBackground(inputPath, outputPath);
      const end = performance.now();
      const duration = (end - start) / 1000; // Convert to seconds
      times.push(duration);
      console.log(`  Iteration ${i + 1}: ${duration.toFixed(2)}s`);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    results.push({
      size,
      avg: avg.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2)
    });
  }

  console.log('\nSummary:');
  console.log('Size      | Avg (s) | Min (s) | Max (s)');
  console.log('---------|---------|---------|---------');
  for (const r of results) {
    console.log(`${r.size.padEnd(9)}| ${r.avg.padStart(7)} | ${r.min.padStart(7)} | ${r.max.padStart(7)}`);
  }
}

// Create output directory
await fs.mkdir(join('benchmarks', 'output'), { recursive: true });

runBenchmark().catch(console.error); 
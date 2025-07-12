#!/usr/bin/env node
import { Command } from 'commander';
import { removeBackground } from './index.js';

const program = new Command();

program
  .name('cleancut')
  .description('High-performance background remover using U-2-Net and onnxruntime-web (WASM)')
  .argument('<input>', 'Input image path')
  .option('-o, --output <output>', 'Output image path (default: input_nobg.png)')
  .action(async (input, options) => {
    const output = options.output || input.replace(/(\.[^.]+)?$/, '_nobg.png');
    try {
      console.log(`Processing ${input}...`);
      await removeBackground(input, output);
      console.log(`Background removed! Saved to: ${output}`);
    } catch (err) {
      console.error('Error:', err.message || err);
      process.exit(1);
    }
  });

program.parse(); 
# js-image-bg-remover

High-performance, portable background remover using U-2-Net and onnxruntime-web (WASM). Works in Node.js, serverless, Docker, and browser environments. No native dependencies—just `npm install` and go!

## Features
- 🚀 Fast: WASM inference, much faster than pure JS
- 🖼️ Accurate: Uses U-2-Net for high-quality matting
- 📦 Portable: No native deps, works everywhere Node.js runs
- 🛠️ CLI & API: Use as a CLI or programmatically
- 📊 Benchmarks: Compare with other JS-based removers
- 🧑‍💻 Open source: Easy to contribute and extend

## Requirements
- Node.js >= 18.0.0 (for ESM and modern features)
- 2GB+ RAM recommended
- ~200MB disk space for model
- Supported platforms: Linux, macOS, Windows

## Installation

```bash
npm install js-image-bg-remover
```

### Ubuntu/Debian Server Setup
If you're running on Ubuntu/Debian server, you'll need these system dependencies:

```bash
# Install required system packages
sudo apt-get update
sudo apt-get install -y build-essential libvips libvips-dev

# Optional: For HEIC/AVIF support
sudo apt-get install -y libheif-dev

# Optional: Set custom model directory for production
export BG_REMOVER_MODEL_DIR=/path/to/models
```

## Usage

### JavaScript (ESM)
```javascript
import { removeBackground } from 'js-image-bg-remover';

// Basic usage
await removeBackground('input.jpg', 'output.png');

// With custom model directory
await removeBackground('input.jpg', 'output.png', {
  modelDir: '/path/to/models'
});

// Process multiple images
const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
await Promise.all(
  images.map(img => removeBackground(img, `output_${img}.png`))
);
```

### JavaScript (CommonJS)
```javascript
const { removeBackground } = require('js-image-bg-remover');

async function processImage() {
  await removeBackground('input.jpg', 'output.png');
}
```

### TypeScript
```typescript
import { removeBackground, RemoveBackgroundOptions } from 'js-image-bg-remover';

// Basic usage with type checking
await removeBackground('input.jpg', 'output.png');

// With typed options
const options: RemoveBackgroundOptions = {
  modelDir: '/custom/models',
  showProgress: true
};

await removeBackground('input.jpg', 'output.png', options);

// In an async function with error handling
async function processImage(input: string, output: string) {
  try {
    await removeBackground(input, output);
    console.log('Background removed successfully');
  } catch (err) {
    console.error('Failed to remove background:', err);
  }
}
```

### CLI Usage
```bash
# Basic usage
cleancut input.jpg -o output.png

# Custom model directory
cleancut input.jpg -o output.png --model-dir /path/to/models

# Process multiple images
cleancut *.jpg --output-dir ./processed
```

## How it Works
This package uses the U-2-Net model for high-quality background removal:

- **Model**: [U-2-Net](https://github.com/xuebinqin/U-2-Net) - A state-of-the-art deep learning model for salient object detection
- **Processing**: 
  - Downloads U-2-Net ONNX model (~176MB) on first use
  - Preprocesses images to 320x320 tensors
  - Runs WASM inference with onnxruntime-web
  - Postprocesses matte and composites transparent PNG
- **Performance**: WASM-based inference is significantly faster than pure JS implementations

## Benchmarks
Benchmarks are included in the `benchmarks/` folder. Run:
```bash
npm run bench
```

Sample benchmark results:
```
Size      | Avg (s) | Min (s) | Max (s)
---------|---------|---------|----------
500x500  |    0.8  |    0.7  |    0.9
1024x1024|    1.2  |    1.0  |    1.4
2048x2048|    2.5  |    2.2  |    2.8
```

Factors affecting performance:
- Image size
- CPU speed
- Available RAM
- Disk speed (for model loading)

## Production Tips
1. **System Requirements**:
   - Node.js >= 14.0.0
   - 2GB+ RAM recommended
   - ~200MB disk space for model

2. **Docker Setup**:
```dockerfile
FROM node:18
RUN apt-get update && apt-get install -y \
    build-essential libvips libvips-dev \
    && rm -rf /var/lib/apt/lists/*
ENV BG_REMOVER_MODEL_DIR=/app/models
VOLUME /app/models
```

3. **Model Storage**:
```bash
# Store model in shared location
export BG_REMOVER_MODEL_DIR=/shared/models
```

## Contributing
We welcome contributions! Here's how you can help:

1. **Code Contributions**:
   - Fork the repository
   - Create a feature branch
   - Submit a Pull Request

2. **Bug Reports**:
   - Use the GitHub issue tracker
   - Include sample images when relevant
   - Describe expected vs actual behavior

3. **Feature Requests**:
   - Open an issue with the "enhancement" label
   - Describe your use case

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License
This project is MIT licensed. See the [LICENSE](LICENSE) file for details.

### Model Attribution
This software uses the U-2-Net model created by Xuebin Qin et al. If you use this software in academic work, please cite:

```bibtex
@InProceedings{Qin_2020_PR,
    title = {U2-Net: Going Deeper with Nested U-Structure for Salient Object Detection},
    author = {Qin, Xuebin and Zhang, Zichen and Huang, Chenyang and Dehghan, Masood and Zaiane, Osmar and Jagersand, Martin},
    journal = {Pattern Recognition},
    volume = {106},
    pages = {107404},
    year = {2020}
}
```

The U-2-Net model is licensed under the Apache-2.0 license. The model weights are automatically downloaded from the official repository.

## Author

**Sagar Regmi**
- GitHub: [@sagarregmi2056](https://github.com/sagarregmi2056)
- Email: sagarregmi2056@gmail.com

## Support

If you find this project helpful, please consider:
- Giving it a star ⭐ on GitHub
- Contributing to its development
- Reporting issues or suggesting features
- Sharing it with others who might find it useful

## Links
- [GitHub Repository](https://github.com/sagarregmi2056/js-image-bg-remover)
- [Issue Tracker](https://github.com/sagarregmi2056/js-image-bg-remover/issues)
- [npm Package](https://www.npmjs.com/package/js-image-bg-remover) 
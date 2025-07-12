/**
 * Options for background removal
 */
export interface RemoveBackgroundOptions {
  /**
   * Custom model directory path. If not provided, uses default location.
   */
  modelDir?: string;
  
  /**
   * Whether to show progress during model download
   * @default true
   */
  showProgress?: boolean;
}

/**
 * Removes the background from an image file and saves as PNG with transparency
 * @param inputPath - Path to the input image file
 * @param outputPath - Path where the output PNG will be saved
 * @param options - Optional configuration
 * @returns Promise that resolves when processing is complete
 * @throws Error if processing fails
 * 
 * @example
 * ```typescript
 * // Basic usage
 * await removeBackground('input.jpg', 'output.png');
 * 
 * // With options
 * await removeBackground('input.jpg', 'output.png', {
 *   modelDir: '/custom/model/path',
 *   showProgress: true
 * });
 * ```
 */
export function removeBackground(
  inputPath: string,
  outputPath: string,
  options?: RemoveBackgroundOptions
): Promise<void>;

export default {
  removeBackground
}; 
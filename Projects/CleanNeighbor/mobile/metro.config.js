const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for video files and improve asset handling
config.resolver.assetExts.push(
  // Video extensions
  'mp4',
  'avi',
  'mov',
  'mkv',
  'webm',
  'm4v'
);

// Increase memory allocation for video processing
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    // Reduce memory pressure during minification
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

// Add video-specific resolver settings
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

module.exports = config;

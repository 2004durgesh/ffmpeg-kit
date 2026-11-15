const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
  conditions: ['react-native-ffmpeg-kit-source'],
});

// The repo root is watched, but ffmpeg/ holds the FFmpeg binary build
// (gigabytes of sources and outputs after a build); keep Metro out of it.
const ffmpegBuild = new RegExp(
  `^${path.join(root, 'ffmpeg').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/.*$`
);
const blockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(blockList) ? blockList : blockList ? [blockList] : []),
  ffmpegBuild,
];

module.exports = config;

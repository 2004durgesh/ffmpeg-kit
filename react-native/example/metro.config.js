const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const pkg = require('../package.json');
const root = path.resolve(__dirname, '..');

/**
 * Metro is told to watch the library root so the example builds directly against
 * the library `src/` (live reload during development). React / React Native are
 * pinned to the example's own node_modules to avoid duplicate-copy errors.
 */
const config = {
  watchFolders: [root],
  resolver: {
    extraNodeModules: {
      [pkg.name]: root,
      // Files under the library root resolve react / react-native from the
      // example's own copy (avoids duplicate-module errors and unresolved
      // 'react-native' imports inside the library src).
      'react': path.join(__dirname, 'node_modules', 'react'),
      'react-native': path.join(__dirname, 'node_modules', 'react-native'),
    },
    blockList: [
      new RegExp(`^${escape(path.join(root, 'node_modules', 'react'))}\\/.*$`),
      new RegExp(
        `^${escape(path.join(root, 'node_modules', 'react-native'))}\\/.*$`,
      ),
    ],
  },
};

function escape(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

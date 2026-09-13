const path = require('path');
const pkg = require('../package.json');

/**
 * The module-resolver alias points the published package name at the library
 * source so edits under `../src` are picked up without a rebuild.
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
        alias: {
          [pkg.name]: path.join(__dirname, '..', pkg.source || 'src/index'),
        },
      },
    ],
  ],
};

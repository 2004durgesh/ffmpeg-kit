/*
 * Routes Nitro's createHybridObject to the in-memory fakes. Required lazily so
 * that after jest.resetModules() the library and the test share one fresh
 * FakeNative instance (see helpers.ts).
 */
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: (name: string) => {
      const { native } = require('./fakes/FakeNative');
      switch (name) {
        case 'FFmpegKitCore':
          return native.core;
        case 'FFmpegKitStorage':
          return native.storage;
        default:
          throw new Error(`No fake for HybridObject "${name}"`);
      }
    },
  },
}));


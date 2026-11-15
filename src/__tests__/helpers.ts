import type * as Api from '../index';
import type * as Fakes from './fakes/FakeNative';

/**
 * Loads the library against a fresh fake native world. Every call gets new
 * module instances, so callbacks, caches and config never leak between tests.
 */
export function loadApi(os: 'ios' | 'android' = 'ios'): {
  api: typeof Api;
  native: typeof Fakes.native;
  fakes: typeof Fakes;
} {
  jest.resetModules();
  require('react-native').Platform.OS = os;
  const fakes: typeof Fakes = require('./fakes/FakeNative');
  const api: typeof Api = require('../index');
  return { api, native: fakes.native, fakes };
}

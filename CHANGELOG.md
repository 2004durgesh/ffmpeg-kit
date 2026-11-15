# Changelog

# [7.0.0-beta.7](https://github.com/2004durgesh/react-native-ffmpeg-kit/compare/v7.0.0-beta.6...v7.0.0-beta.7) (2026-11-15)

* feat(react-native)!: rewrite on Nitro Modules with a shared C++ core ([43099bb](https://github.com/2004durgesh/react-native-ffmpeg-kit/commit/43099bbfbff1987ec4acd2e3fedfaef8dbf4b5b3))

### BREAKING CHANGES

* apps must also install react-native-nitro-modules. FFmpeg
  log lines printed because of the LogRedirectionStrategy go to logcat or the
  iOS unified log instead of the Metro console.
  MediaInformation.getDuration() is typed as string, which is what it always
  returned.

# [7.0.0-beta.6](https://github.com/2004durgesh/ffmpeg-kit/compare/v7.0.0-beta.5...v7.0.0-beta.6) (2026-11-14)

### Bug Fixes

* report the version of the ffmpeg binaries in use instead of a hard-coded 6.0.2 ([1b430d5](https://github.com/2004durgesh/ffmpeg-kit/commit/1b430d52d3259d047e49075f54823ff8106b53f5))

# [7.0.0-beta.5](https://github.com/2004durgesh/ffmpeg-kit/compare/v7.0.0-beta.4...v7.0.0-beta.5) (2026-11-14)

### Bug Fixes

* **android:** cache the downloaded aar per release tag ([2fe81d0](https://github.com/2004durgesh/ffmpeg-kit/commit/2fe81d0e179f811c28f4ac9cb4b1ee61590c3b15))
* **android:** link every native library with 16 kb page alignment ([26bdc80](https://github.com/2004durgesh/ffmpeg-kit/commit/26bdc8095804d5c8c4a6ede878ce60830ba74ca7))

# [7.0.0-beta.4](https://github.com/2004durgesh/ffmpeg-kit/compare/v7.0.0-beta.3...v7.0.0-beta.4) (2026-10-05)

### Bug Fixes

* update comments for clarity in ios ffmpeg binaries workflow and podspec ([94d2445](https://github.com/2004durgesh/ffmpeg-kit/commit/94d2445f010eb9fb7bd4f3dc5c3a419969917eaa))

# [7.0.0-beta.3](https://github.com/2004durgesh/ffmpeg-kit/compare/v7.0.0-beta.2...v7.0.0-beta.3) (2026-09-23)

### Bug Fixes

* restore symlinks for versioned framework slices in extracted xcframeworks ([245ae53](https://github.com/2004durgesh/ffmpeg-kit/commit/245ae53ac0894128fa864c6f6e90b8c376ef8276))

# [7.0.0-beta.2](https://github.com/2004durgesh/ffmpeg-kit/compare/v7.0.0-beta.1...v7.0.0-beta.2) (2026-09-23)

### Bug Fixes

* **react-native:** make the New-Arch package build and run on iOS + Android ([0494e53](https://github.com/2004durgesh/ffmpeg-kit/commit/0494e532f5fefdf99cc42d2a2c611c5dfe14b080))

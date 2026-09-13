# react-native-ffmpeg-kit

A **maintained, New-Architecture-only** fork of
[`ffmpeg-kit-react-native`](https://github.com/arthenica/ffmpeg-kit) (ARTHENICA),
which was retired upstream. This fork keeps the React Native binding alive:

- **TurboModule** (React Native New Architecture) — no legacy bridge.
- FFmpeg **v6.0**, both `FFmpeg` and `FFprobe`.
- Android + iOS, with the same JavaScript API as upstream.
- Native FFmpeg binaries are **rebuilt and hosted by this fork** (upstream
  binary hosting is gone).

> Only the React Native package is maintained here. The rest of the monorepo is
> retained solely as the "binary factory" that produces the native artifacts.

## Requirements

- React Native **>= 0.80** with the **New Architecture enabled** (default on
  0.76+). Old-architecture apps are not supported.
- React **>= 19**.

## Installation

```sh
yarn add react-native-ffmpeg-kit
# or: npm install react-native-ffmpeg-kit
```

### Android

The native FFmpeg `.aar` is resolved automatically from this fork's GitHub
Releases (no extra setup). Two things are configurable from your app's
`android/build.gradle` root `ext` block:

```gradle
ext {
    // Which prebuilt package variant to use. Default: "https".
    ffmpegKitPackage = "full-gpl"     // e.g. for x264 / x265 / xvid / vid.stab
    // Which binary release tag to pull. Default: "ffmpeg-android-6.0.2".
    ffmpegKitReleaseTag = "ffmpeg-android-6.0.2"
}
```

Available Android variants: `https` (LGPL, TLS) and `full-gpl` (all libraries,
**effective license GPL v3**). More can be produced from the
`android ffmpeg binaries` workflow.

### iOS

```sh
cd ios && RCT_NEW_ARCH_ENABLED=1 pod install
```

> ⚠️ iOS binary hosting is still being migrated to this fork (the podspec
> currently references the retired `ffmpeg-kit-ios-*` pods). Android is ready;
> iOS binaries are tracked as the next milestone.

## Packages / variants

`FFmpeg` needs specific external libraries enabled to encode certain formats
(e.g. `x264` for H.264, `libvpx` for VP8/VP9). Pick the variant that includes
what you need via `ext.ffmpegKitPackage` (Android) / the podspec subspec (iOS).
Variant contents match upstream's
[Packages](https://github.com/arthenica/ffmpeg-kit/wiki/Packages) definitions.

## Usage

The JavaScript API is unchanged from upstream `ffmpeg-kit-react-native`.

```js
import {FFmpegKit, FFprobeKit, FFmpegKitConfig, ReturnCode} from 'react-native-ffmpeg-kit';

// Execute an FFmpeg command
FFmpegKit.execute('-i file1.mp4 -c:v mpeg4 file2.mp4').then(async session => {
  const returnCode = await session.getReturnCode();
  if (ReturnCode.isSuccess(returnCode)) {
    // SUCCESS
  } else if (ReturnCode.isCancel(returnCode)) {
    // CANCEL
  } else {
    // ERROR
  }
});

// Probe media information
FFprobeKit.getMediaInformation('file.mp4').then(async session => {
  const information = await session.getMediaInformation();
});

// Global callbacks (delivered as New-Architecture codegen-typed events)
FFmpegKitConfig.enableLogCallback(log => console.log(log.getMessage()));
FFmpegKitConfig.enableStatisticsCallback(stats => console.log(stats.getSize()));
```

For the full API (sessions, SAF URIs on Android, fonts, session history, cancel,
etc.) see the upstream
[usage guide](https://github.com/arthenica/ffmpeg-kit/tree/main/react-native) —
all of it applies unchanged.

## What changed vs. upstream

- Converted to a **TurboModule** (codegen spec, typed events); dropped the
  `NativeEventEmitter`/legacy bridge path.
- Baseline bumped to **RN 0.86 / React 19**.
- Native binaries are **rebuilt and published by this fork** rather than pulled
  from the retired ARTHENICA hosting.
- Published under the name **`react-native-ffmpeg-kit`**.

## License

`LGPL-3.0` by default; the `full-gpl` / GPL variants make the effective license
`GPL-3.0`. See the upstream
[License](https://github.com/arthenica/ffmpeg-kit/wiki/License) page. Original
work © ARTHENICA Information Technologies; this fork continues it under the same
terms.

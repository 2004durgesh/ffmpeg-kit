# react-native-ffmpeg-kit

A **maintained, New-Architecture-only** fork of
[`ffmpeg-kit-react-native`](https://github.com/arthenica/ffmpeg-kit) (ARTHENICA),
which was retired upstream. This fork keeps the React Native binding alive:

- Built on [Nitro Modules](https://nitro.margelo.com) (New Architecture only).
- FFmpeg **v6.0**, both `FFmpeg` and `FFprobe`.
- Android + iOS, with the same JavaScript API as upstream.
- Native FFmpeg binaries are **rebuilt and hosted by this fork** (upstream
  binary hosting is gone).

> This repo is the npm package. The [`ffmpeg/`](./ffmpeg) folder builds the
> FFmpeg binaries the package downloads; you never need it to use the library.

## Requirements

- React Native **>= 0.80** with the **New Architecture enabled** (default on
  0.76+). Old-architecture apps are not supported.
- React **>= 19**.
- [`react-native-nitro-modules`](https://www.npmjs.com/package/react-native-nitro-modules) **0.37.x**, installed in your app.

## Installation

```sh
yarn add react-native-ffmpeg-kit react-native-nitro-modules
# or: npm install react-native-ffmpeg-kit react-native-nitro-modules
cd ios && pod install
```

No extra native setup is required. The Android build automatically downloads
the correct FFmpeg `.aar` from this fork's GitHub Releases at build time —
no repository declarations or Maven/ivy config needed in your project.

### Android (optional customization)

Two values can be overridden from your app's root `android/build.gradle` `ext`
block. Both are optional — defaults work out of the box.

```gradle
ext {
    // Prebuilt variant. Default: "https" (LGPL, includes TLS/HLS support).
    // Use "full-gpl" for x264 / x265 / xvid / vid.stab (GPL v3).
    ffmpegKitPackage = "https"

    // GitHub Release tag to pull the AAR from. Default: "ffmpeg-android-6.0.3".
    ffmpegKitReleaseTag = "ffmpeg-android-6.0.3"

    // Fork to pull binaries from. Default: "2004durgesh/react-native-ffmpeg-kit".
    // Override only if you host your own binary releases.
    ffmpegKitRepo = "2004durgesh/react-native-ffmpeg-kit"
}
```

Available Android variants: `https` (LGPL, TLS/HLS) and `full-gpl` (all
libraries, **effective license GPL v3**). More variants can be produced from
the `android ffmpeg binaries` workflow.

### iOS (optional customization)

`pod install` downloads the FFmpeg xcframeworks from this fork's GitHub
Releases. Three environment variables override the defaults; set them when
you run `pod install`:

```sh
# Prebuilt variant. Default: "https". Use "full-gpl" for x264 / x265 / xvid / vid.stab (GPL v3).
# Release tag to pull from. Default: "ffmpeg-ios-6.0.2".
# Fork to pull binaries from. Default: "2004durgesh/react-native-ffmpeg-kit".
FFMPEG_KIT_IOS_PACKAGE=full-gpl FFMPEG_KIT_IOS_RELEASE_TAG=ffmpeg-ios-6.0.2 pod install
```

After changing the variant or tag, run `pod install` again; the frameworks are
downloaded again only when the URL changes.

## Packages / variants

`FFmpeg` needs specific external libraries enabled to encode certain formats
(e.g. `x264` for H.264, `libvpx` for VP8/VP9). Pick the variant that includes
what you need via `ext.ffmpegKitPackage` (Android) / `FFMPEG_KIT_IOS_PACKAGE` (iOS).
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

## How Android binary resolution works

The library's `android/build.gradle` downloads the FFmpeg `.aar` directly from
this fork's GitHub Releases during the Gradle configuration phase using
`ant.get`, unpacks it, and adds its classes and native libraries to the
library. This means:

- **No ivy/Maven repo declarations** needed in the consuming app.
- The AAR is cached in the module's Gradle build directory — subsequent builds
  are instant.
- The download URL follows the pattern:
  `https://github.com/<ffmpegKitRepo>/releases/download/<ffmpegKitReleaseTag>/ffmpeg-kit-<ffmpegKitPackage>.aar`

## What changed vs. upstream

- Rebuilt on **Nitro Modules**; dropped the `NativeEventEmitter`/legacy bridge path.
- Baseline bumped to **RN 0.80 / React 19**.
- Native binaries are **rebuilt and published by this fork** rather than pulled
  from the retired ARTHENICA hosting.
- Android AAR is fetched at build time (no custom repo config required by consumers).
- Published under the name **`react-native-ffmpeg-kit`**.

## Behaviour changes in 7.0

The JavaScript API is unchanged, but you may notice these differences from 6.x
and the 7.0 betas:

- **FFmpeg logs no longer appear in the Metro console.** When the
  `LogRedirectionStrategy` says a line should be printed, it goes to the
  platform log instead: logcat tag `ffmpeg-kit` on Android, subsystem
  `com.arthenica.ffmpegkit` in the iOS unified log (Xcode console, Console.app).
  To handle logs in JavaScript, register a log callback.
- **`MediaInformationJsonParser` works.** `from()` resolves `undefined` for
  invalid JSON and `fromWithError()` rejects; both threw before.
- **`MediaInformation.getDuration()` is typed `string`.** It always returned
  ffprobe's text, for example `"10.000000"`. Use `parseFloat` for a number.
- **`getAllLogs(waitTimeout)` and similar methods return immediately.** Logs are
  stored before callbacks run, so there is nothing left to wait for.

## License

`react-native-ffmpeg-kit` is licensed under the LGPL v3.0 (see [LICENSE](./LICENSE)).
Original work © ARTHENICA Information Technologies; this fork continues it under the
same terms.

The FFmpeg binaries it downloads bundle FFmpegKit and FFmpeg, and are also LGPL
v3.0. The `full-gpl` variant is built with `--enable-gpl`, which makes FFmpeg, and
so the whole bundle, subject to the GPL v3.0. The build scripts always configure
FFmpeg with `--enable-version3` and never enable non-free libraries. Each bundled
library's license ships inside the binaries; upstream's
[Licenses](https://github.com/arthenica/ffmpeg-kit/wiki/Licenses) page lists them.

## Patents

FFmpeg, kvazaar, x264 and x265 are believed to include algorithms that are subject
to software patents. If you live in a country where software algorithms are
patentable, you may need to pay royalties to the patent holders. This is not legal
advice; see the [FFmpeg Patent Mini-FAQ](https://ffmpeg.org/legal.html).

openh264 states that it uses patented algorithms. If you build with openh264 and
distribute the result, you are subject to MPEG LA licensing fees; see the
[OpenH264 FAQ](https://www.openh264.org/faq.html).

## Trademarks

FFmpeg is a trademark of [Fabrice Bellard](http://www.bellard.org/).
react-native-ffmpeg-kit is an independent project and not affiliated with the
FFmpeg trademark holder.

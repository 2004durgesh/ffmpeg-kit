# CLAUDE.md

Fork of the retired [arthenica/ffmpeg-kit](https://github.com/arthenica/ffmpeg-kit). **Only `react-native/` is maintained.** It's published to npm as `react-native-ffmpeg-kit`, built on [Nitro Modules](https://nitro.margelo.com) with a shared C++ core (RN ≥ 0.80, React 19). Apps must also install `react-native-nitro-modules`. The rest of the repo (`android.sh`, `ios.sh`, `scripts/`, `src/`, `tools/`) exists only to build the FFmpeg binaries the package downloads. Leave the other platforms (`flutter/`, `linux/`, macOS, tvOS) alone.

## Layout

| Path | What it is |
|---|---|
| `react-native/src/specs/` | Nitro specs, the source of truth for the native surface: one `*.nitro.ts` per hybrid object (`FFmpegKitCore`, `FFmpegKitSession` in C++; `FFmpegKitPlatform` in Swift/Kotlin; `FFmpegKitStorage`, Android only), named types in their own `.ts` files. `yarn nitrogen` regenerates `nitrogen/generated/` (committed) |
| `react-native/src/index.ts` | Barrel only (re-exports). The public API (source-compatible with the pre-Nitro API) lives in focused modules beside it (`sessions.ts`, `execution.ts`, `FFmpegKitConfig.ts`, `media/`, `internal/`…); bob generates the types |
| `react-native/cpp/` | Shared C++ core. `HybridFFmpegKitCore`/`HybridFFmpegKitSession` are the hybrid objects; `FFmpegKitRuntime` holds process-wide state; `FFmpegCallbacks` receives libav/fftools callbacks; `SessionLifecycle.hpp` models session states; `FFmpegKitPlatform.hpp` is the per-platform hot-path seam; `PlatformServices` creates the Swift/Kotlin `FFmpegKitPlatform` object through Nitro's registry for cold paths |
| `react-native/android/src/main/cpp/FFmpegKitPlatformAndroid.cpp` | Android hot path: `dlsym` into the already-loaded `libffmpegkit`, run FFmpeg, logcat |
| `react-native/android/src/main/java/com/margelo/nitro/ffmpegkit/` | Kotlin: `HybridFFmpegKitPlatform` (cold paths), `HybridFFmpegKitStorage` (SAF), one helper/extension per file, the package |
| `react-native/ios/` | `HybridFFmpegKitPlatform.swift` (cold paths) and `FFmpegKitPlatformIOS.mm` (hot path: run FFmpeg, os_log; ObjC++ only because ffmpeg-kit's execute functions take an `NSArray`) |
| `react-native/react-native-ffmpeg-kit.podspec` | Must keep the package's name, or autolinking won't find it. `module_name` is `NitroFFmpegKit` (matches `nitro.json`) |
| `react-native/src/__tests__/` | Jest tests against a fake native layer typed by the spec |
| `react-native/example/` | Yarn workspace app (native projects committed); runs the on-device suite in `src/integration/` on launch |
| `.github/workflows/{android,ios}-ffmpeg-binaries.yml` | The only CI; tag-triggered (see Releasing) |
| `tools/docker/` | Builds the Android AARs locally, the same way the workflow does |

## Changing the native surface

Edit the spec, run `yarn nitrogen`, then implement in `cpp/` (and the platform files if it needs platform APIs). A mismatch with the generated C++ interface fails to compile. Update the fake in `src/__tests__/fakes/FakeNative.ts` too: `yarn typecheck` fails if it drifts from the spec.

- Hot paths stay in C++: running FFmpeg, every log line and statistics tick, cancel. Never route them through Kotlin, Swift or Objective-C. Cold platform calls go through the generated `HybridFFmpegKitPlatformSpec`, never hand-written fbjni or Objective-C calls from C++.
- The core runs FFmpeg through ffmpeg-kit's own execute functions (`Java_…_nativeFFmpegExecute` on Android, `executeFFmpeg` on iOS), which set the thread-local session id fftools reads for cancellation. Don't write `globalSessionId` from our library; on Android it's emulated TLS in another `.so`.
- ffmpeg-kit resets libav's log level to its own `configuredLogLevel` before every run, so set both (see `FFmpegKitRuntime::setLogLevel`).
- `android/build.gradle` must not apply `com.facebook.react`: there's no RN codegen here, and in this repo the plugin's codegen scans `example/node_modules` and compiles React Native's own specs into the library (duplicate classes in release dex merging).
- On Android our library never links FFmpeg. ffmpeg-kit's Java `FFmpegKitConfig` loads the right build (NEON on armv7) and runs `libffmpegkit`'s `JNI_OnLoad` (MediaCodec, `saf:`); the core then resolves symbols with `dlsym`. Don't name the C++ library `ffmpegkit`; that's the AAR's.
- Nitro JS callbacks may be called from any thread; Nitro schedules them on the JS thread. Only pass a callback to native when JS actually listens.
- The `.mm` imports every ffmpegkit header it uses. The vendored framework resolves headers textually, so `#import <ffmpegkit/FFmpegKit.h>` alone doesn't bring in `FFmpegKitConfig`.

## How the package gets its binaries

Both platforms download prebuilt FFmpeg from this repo's GitHub Releases at build time. Each mechanism is the way it is for a reason; don't "simplify" it.

- **Android** (`android/build.gradle`): downloads `ffmpeg-kit-<package>.aar` at configure time into `build/ffmpeg-kit/<tag>/`, unpacks it, and consumes the parts: `classes.jar` via `implementation files(...)`, `jni/` and `res/` as source dirs, `proguard.txt` as consumer rules (it keeps the natives `JNI_OnLoad` registers). Don't depend on the `.aar` itself: AGP refuses to bundle a library with a local `.aar`, which breaks `./gradlew assembleRelease` in apps. A custom Maven or ivy repo wouldn't work either, because consuming apps don't inherit a library's repositories. A `files()` dependency brings no transitive deps, so ffmpeg-kit's own (`com.arthenica:smart-exception-java:0.2.1`) is declared by hand.
- **iOS** (podspec): downloads and unzips `ffmpeg-kit-ios-<package>.xcframework.zip` into `ios/FFmpegKitFrameworks` while the podspec is evaluated (CocoaPods never runs `prepare_command` for `:path` pods), restores the framework symlinks the zip drops, and vendors the result. Keep `source_files` non-recursive (`ios/*`, `cpp/*`): `ios/**` picks up FFmpeg's headers from `ios/FFmpegKitFrameworks` (libavutil's `time.h` then shadows `<time.h>`), and a root `**` glob recurses into `example/`. Keep `-Wno-c++11-narrowing`, which the ffmpegkit headers need under C++.

Variants are `https` (default, LGPL, TLS via openssl) and `full-gpl`, chosen with `ext.ffmpegKitPackage` (Android) and `FFMPEG_KIT_IOS_PACKAGE` (iOS).

## Releasing: two separate tracks

**npm package.** Run `yarn release` in `react-native/` (release-it). It bumps the version, writes `CHANGELOG.md` from conventional commits, commits, tags `v<version>`, pushes, publishes and creates the GitHub release. Use `yarn release --preRelease=beta` for betas. Prereleases go to the `next` dist-tag; `latest` stays on 6.1.2 until 7.0.0. Needs `npm login` and `GITHUB_TOKEN`.

**FFmpeg binaries.** Push an `ffmpeg-android-<ver>` or `ffmpeg-ios-<ver>` tag. The matching workflow builds both variants, which takes hours, and attaches them to that release. Do this only when the native build changes, never as part of `yarn release`. The platforms are versioned separately (currently `ffmpeg-android-6.0.3` and `ffmpeg-ios-6.0.2`). After publishing new binaries, update the default tag in `android/build.gradle` (`ffmpegKitReleaseTag`), the podspec (`FFMPEG_KIT_IOS_RELEASE_TAG`) and the README.

GitHub runs a tag-triggered workflow from the tagged commit. To rebuild with a workflow fix, move the tag: `git tag -f <tag> && git push -f origin <tag>`. A manual `workflow_dispatch` run only produces artifacts, not release assets.

## Binary build constraints

These keep FFmpeg 6.0's build scripts working on current runners:

- gnutls is disabled everywhere (`--disable-lib-gnutls`) and TLS comes from openssl. gnutls's autopoint/gettext bootstrap fails on macOS.
- Android: NDK r25b; 32-bit `x86` disabled, because openssl doesn't support it; every `.so` linked with `-Wl,-z,max-page-size=16384` for devices with 16 KB pages (the first tag built that way is `ffmpeg-android-6.0.3`). Every package in the workflow's apt list (gperf, groff, libtasn1-bin and so on) is needed.
- iOS: CMake pinned to 3.31, because x265 and others fail on CMake 4; Xcode pinned via `~/.xcode.for.ffmpeg.kit.sh`.
- The Docker builder builds the committed `HEAD`, so commit before running it.

## Running the example and tests

The package is a Yarn 4 workspace (`react-native/`, with `example/` as a workspace). Use `yarn`, not npm.

```sh
cd react-native
yarn                    # installs both workspaces
yarn test               # Jest: characterization + contract tests
yarn typecheck
yarn example start
cd example/ios && pod install && cd ../.. && yarn example ios
yarn example android
```

- The example runs the on-device suite at launch and logs one `FFMPEGKIT_TESTS {...}` line (logcat tag `ReactNativeJS`). RN no longer streams `console.log` to Metro's terminal.
- Apps built with the iOS 27 SDK must use the UIScene lifecycle; the example starts React Native from `SceneDelegate`.
- If `pod install` fails after a podspec change, run `rm -rf ios/Pods ios/build` and try again.

## Conventions

- Conventional commits; the changelog is generated from them.
- No AI attribution in commits, PRs, tags or release notes.
- `main` is the maintained line. The `archive/*` tags keep the pre-fork history.
- Don't restore the deleted upstream workflows (`*-build-scripts`, `periodic-builds-*`). They run full FFmpeg builds on pushes and on a cron.

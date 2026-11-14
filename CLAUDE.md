# CLAUDE.md

Fork of the retired [arthenica/ffmpeg-kit](https://github.com/arthenica/ffmpeg-kit). **Only `react-native/` is maintained.** It's published to npm as `react-native-ffmpeg-kit` and is New Architecture only (TurboModule, RN ≥ 0.80, React 19). The rest of the repo (`android.sh`, `ios.sh`, `scripts/`, `src/`, `tools/`) exists only to build the FFmpeg binaries the package downloads. Leave the other platforms (`flutter/`, `linux/`, macOS, tvOS) alone.

## Layout

| Path | What it is |
|---|---|
| `react-native/src/NativeFFmpegKitReactNativeModule.ts` | Codegen spec, the source of truth for the native surface (methods + 3 typed events) |
| `react-native/src/index.js` | JS API wrapping the TurboModule |
| `react-native/src/index.d.ts` | Hand-written public types (`declare module 'react-native-ffmpeg-kit'`) |
| `react-native/android/` | Java module extending the generated `NativeFFmpegKitReactNativeModuleSpec`, registered by a `BaseReactPackage` |
| `react-native/ios/FFmpegKitReactNativeModule.mm` | ObjC++ TurboModule |
| `react-native/react-native-ffmpeg-kit.podspec` | Must keep the package's name, or autolinking won't find it |
| `react-native/example/` | Test app (native projects committed), depends on the library via `link:..` |
| `.github/workflows/{android,ios}-ffmpeg-binaries.yml` | The only CI; tag-triggered (see Releasing) |
| `tools/docker/` | Builds the Android AARs locally, the same way the workflow does |

## Changing the native surface

A bridge method lives in five places: the spec, the Java module, the `.mm`, `index.js` and `index.d.ts`. Change them together. Mismatches only show up in a native build.

- Codegen turns TS `number` into `double` on both platforms. Cast explicitly where a `long`, `int` or enum is expected; in the `.mm` (C++), `double` to enum doesn't compile without a cast.
- In the `.mm`, `RCT_EXPORT_METHOD` selector labels must match the spec's JS parameter names and end in `resolve:` / `reject:`.
- Events are codegen-typed: `EventEmitter<T>` in the spec, imported from `react-native/Libraries/Types/CodegenTypes`. Emit with the generated `emitOn…` methods. There is no `NativeEventEmitter`.
- The `.mm` imports every ffmpegkit header it uses. The vendored framework resolves headers textually, so `#import <ffmpegkit/FFmpegKit.h>` alone doesn't bring in `FFmpegKitConfig`.

## How the package gets its binaries

Both platforms download prebuilt FFmpeg from this repo's GitHub Releases at build time. Each mechanism is the way it is for a reason; don't "simplify" it.

- **Android** (`android/build.gradle`): downloads `ffmpeg-kit-<package>.aar` at configure time into `build/ffmpeg-kit/<tag>/` and adds it with `implementation files(...)`. A custom Maven or ivy repo wouldn't work, because consuming apps don't inherit a library's repositories. A `files()` dependency brings no transitive deps, so ffmpeg-kit's own (`com.arthenica:smart-exception-java:0.2.1`) is declared by hand.
- **iOS** (podspec): downloads and unzips `ffmpeg-kit-ios-<package>.xcframework.zip` into `ios/FFmpegKitFrameworks` while the podspec is evaluated (CocoaPods never runs `prepare_command` for `:path` pods), restores the framework symlinks the zip drops, and vendors the result. Keep `source_files` anchored at `ios/`; a `**` glob recurses into `example/`. Keep `-Wno-c++11-narrowing`, which the ffmpegkit headers need under C++.

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

## Running the example

```sh
cd react-native/example
yarn
yarn pod-install && yarn ios
yarn android
```

- If Metro can't resolve `react-native` from `../src`, restart it with `yarn start --reset-cache`.
- If `pod install` fails after a podspec change, run `rm -rf ios/Pods ios/build` and try again.

## Conventions

- Conventional commits; the changelog is generated from them.
- No AI attribution in commits, PRs, tags or release notes.
- `main` is the maintained line. The `archive/*` tags keep the pre-fork history.
- Don't restore the deleted upstream workflows (`*-build-scripts`, `periodic-builds-*`). They run full FFmpeg builds on pushes and on a cron.

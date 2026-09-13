# Example app — codegen / New-Architecture validation harness

This example exists to **prove the New-Architecture TurboModule conversion**: it
forces React Native codegen to generate the native spec
(`NativeFFmpegKitReactNativeModuleSpec`) and compiles the converted Android/iOS
modules against it. The JS demo in [`App.tsx`](./App.tsx) exercises TurboModule
promise methods and a codegen-typed event (the log callback).

The JS/config layer is committed here. The **native app projects
(`android/`, `ios/`) are intentionally not committed** — they must be generated
on a machine that has the RN CLI + Android SDK/NDK and Xcode, because they can't
be produced in a headless environment.

## 1. Generate the native app shells (one time)

From a scratch directory, init a bare RN 0.86 app and copy its native folders in:

```sh
npx @react-native-community/cli@0.86.0 init FFmpegKitExample --version 0.86.0 --skip-install
# copy the generated native projects into this example
cp -R FFmpegKitExample/android ./android
cp -R FFmpegKitExample/ios ./ios
```

Then make sure the app name matches [`app.json`](./app.json) (`FFmpegKitExample`)
and that the **New Architecture is enabled**:

- Android: `android/gradle.properties` → `newArchEnabled=true`
- iOS: New Arch is the default on 0.86; `pod install` runs codegen.

> Alternatively, regenerate a fully-wired library skeleton with
> `npx create-react-native-library@latest` at RN 0.86 and drop this repo's
> `src/`, `android/src/`, `ios/`, `*.podspec`, and `package.json`
> `codegenConfig` into it. That yields a known-good example without the manual
> copy above.

## 2. Install & run

```sh
yarn                       # from react-native/ (root) so the workspace links react-native-ffmpeg-kit
cd example
yarn                       # installs the example's own deps

# iOS — pod install triggers codegen (generates RNFFmpegKitSpec)
yarn pod-install
yarn ios

# Android — the Gradle sync triggers codegen
yarn android
```

## 3. What success looks like

- **Codegen runs**: you'll see `RNFFmpegKitSpec` generated under
  `ios/build/generated/ios/` (iOS) and
  `android/app/build/generated/source/codegen/` (Android).
- The app launches and shows a non-empty **FFmpeg version** and **Platform**.
- Tapping **Run `ffmpeg -version`** returns `SUCCESS`.
- The **Log events** counter increases (confirms codegen-typed events work).

## 4. Known blockers still open (expected)

A *full native link* additionally needs the FFmpeg binaries, which are wired in
later phases:

- **Android** (`../android/build.gradle`): `implementation(name: "ffmpeg-kit-https", ext: "aar")`
  needs a real AAR source (Phase 3). Until then the Android link step fails
  *after* codegen succeeds.
- **iOS** (`../ffmpeg-kit-react-native.podspec`): still points at the retired
  `ffmpeg-kit-ios-*` pods (Phase 4).

So validate in this order: **(a) codegen generates the spec → (b) JS + the
generated interfaces compile → (c) native links once binaries are wired.**

## 5. Reporting back

If codegen or compilation fails, capture the exact error (the generated spec
method signature vs. the module's implementation is the usual culprit) and share
it — the fix is almost always a one-line signature adjustment in the native
module to match what codegen generated.

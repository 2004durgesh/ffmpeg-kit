# Example app

The example runs an on-device test suite on launch. The suite drives real FFmpeg through the public `react-native-ffmpeg-kit` API: encoding, probing, cancelling one or all sessions, concurrent sessions, log-level filtering, media information and pipes. Inputs come from FFmpeg's `lavfi` test source and output goes to the null muxer, so you don't need any media files.

The tests are in [`src/integration/tests.ts`](./src/integration/tests.ts), and [`App.tsx`](./App.tsx) runs them.

## Run it

Run these from the repo root. The repo is a Yarn 4 workspace, and `example/` is one of its workspaces, so the app builds against the library's source.

```sh
yarn                                      # install both workspaces
yarn example start                        # Metro
cd example/ios && pod install && cd ../..
yarn example ios
yarn example android
```

`pod install` downloads the FFmpeg xcframeworks the first time. The first Gradle build downloads the FFmpeg AAR.

## What success looks like

- The screen shows **11/11 passed**, with one row per test. Each row has a `testID` of `result-<index>`, and the summary has `summary`.
- The app logs one summary line that scripts and CI can read. On Android it appears in logcat under the tag `ReactNativeJS`. On iOS, debug builds forward it to the Xcode console, while release builds show only the on-screen summary. The line looks like this:

  ```
  FFMPEGKIT_TESTS {"passed":11,"total":11,"failures":[]}
  ```

- **Run again** reruns the suite.

React Native no longer streams `console.log` to Metro's terminal, so read the summary from the device log or the screen, not from Metro.

## Troubleshooting

- **The iOS app crashes at launch with `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`.** Apps built with the iOS 27 SDK must use the UIScene lifecycle. This example starts React Native from `SceneDelegate` in `ios/FFmpegKitExample/AppDelegate.swift`, which is registered in `Info.plist`. Keep it that way.
- **Xcode fails in the Hermes script phase with `node: No such file or directory`.** `ios/.xcode.env.local` pins an old Node path. Point `NODE_BINARY` at a stable path, such as `/opt/homebrew/bin/node`.
- **`pod install` fails after a podspec change.** Run `rm -rf ios/Pods ios/build`, then run `pod install` again.

# Building the Android AARs in Docker

`android.Dockerfile` builds the same AARs as `.github/workflows/android-ffmpeg-binaries.yml`, for when Actions can't run (or to check a change before tagging): Ubuntu 22.04, the workflow's build packages, JDK 17 and NDK r25b.

From the repo root:

```bash
docker build --platform linux/amd64 -t ffmpeg-kit-android -f tools/docker/android.Dockerfile tools/docker
mkdir -p dist
docker run --rm --platform linux/amd64 -v "$PWD":/host:ro -v "$PWD/dist":/out ffmpeg-kit-android https
```

- The package is `https` or `full-gpl`, with the workflow's flags. Extra `android.sh` flags go after it, for example `https --disable-x86-64` to skip the emulator ABI.
- It builds the **committed** HEAD (it clones the mounted repo), so commit first.
- The AAR lands in `dist/ffmpeg-kit-<package>.aar`, and the run fails if any `.so` in it isn't 16 KB page-aligned.
- NDK r25b is x86_64-only, so on Apple Silicon the container runs under emulation. The `https` package took about half an hour on an M-series Mac with Docker's 18 CPUs, most of it the image's setup on the first build.

To publish, attach the AAR to the `ffmpeg-android-<version>` GitHub release, then point `ffmpegKitReleaseTag` in `react-native/android/build.gradle` at that tag.

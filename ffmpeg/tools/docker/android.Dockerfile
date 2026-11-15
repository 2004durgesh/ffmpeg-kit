# Builds the FFmpegKit Android AARs that .github/workflows/android-ffmpeg-binaries.yml builds, on a machine without CI:
# the same Ubuntu 22.04, build packages, JDK 17 and NDK r25b. See ffmpeg/tools/docker/README.md.
#
# NDK r25b only ships for x86_64 Linux, so on Apple Silicon this runs as linux/amd64 under emulation.
FROM --platform=linux/amd64 ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# The workflow's build prerequisites, plus git/curl/unzip for fetching sources and the SDK
RUN apt-get update -qq && apt-get install -y -qq \
      git curl unzip zip openjdk-17-jdk-headless python3 make cmake \
      gperf groff autogen autopoint autoconf automake libtool libtool-bin pkg-config nasm yasm bison \
      meson ninja-build ragel texinfo doxygen gtk-doc-tools libtasn1-bin \
    && rm -rf /var/lib/apt/lists/*

ENV ANDROID_SDK_ROOT=/opt/android-sdk \
    ANDROID_HOME=/opt/android-sdk \
    ANDROID_NDK_ROOT=/opt/android-ndk-r25b

# Gradle packages the AAR against SDK 33 and strips the libraries with the module's ndkVersion (22.1.7171670)
RUN mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools" \
    && curl -sL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/tools.zip \
    && unzip -q /tmp/tools.zip -d "$ANDROID_SDK_ROOT/cmdline-tools" \
    && mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest" \
    && rm /tmp/tools.zip \
    && (yes || true) | "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null \
    && "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" \
         "platforms;android-33" "build-tools;33.0.2" "ndk;22.1.7171670" "platform-tools" >/dev/null

# The NDK the native libraries are built with, as in the workflow
RUN curl -s https://dl.google.com/android/repository/android-ndk-r25b-linux.zip -o /tmp/ndk.zip \
    && unzip -q /tmp/ndk.zip -d /opt \
    && rm /tmp/ndk.zip

COPY android-entrypoint.sh /usr/local/bin/build-android-aar
ENTRYPOINT ["build-android-aar"]

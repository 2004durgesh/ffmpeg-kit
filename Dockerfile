FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /workspace

# Install essential build tools and dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    unzip \
    zip \
    build-essential \
    autoconf \
    automake \
    libtool \
    pkg-config \
    cmake \
    ninja-build \
    yasm \
    nasm \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    meson \
    gperf \
    ragel \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

# Install Android SDK and NDK based on aniyomi-mpv-lib versions
# Version info from depinfo.sh
ENV V_SDK=11076708_latest
ENV V_NDK=r27c
ENV V_NDK_N=27.2.12479018
ENV V_SDK_PLATFORM=34
ENV V_SDK_BUILD_TOOLS=34.0.0

# Set Android environment variables

ENV ANDROID_SDK_ROOT=/workspace/sdk/android-sdk-linux
ENV ANDROID_NDK_ROOT=/workspace/sdk/android-ndk-${V_NDK}
ENV ANDROID_HOME=$ANDROID_SDK_ROOT
ENV PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_NDK_ROOT

# Create sdk directory
RUN mkdir -p /workspace/sdk && cd /workspace/sdk && \
    # Download and install Android SDK Command-line Tools
    wget "https://dl.google.com/android/repository/commandlinetools-linux-${V_SDK}.zip" && \
    mkdir -p android-sdk-linux/cmdline-tools && \
    unzip -q -d android-sdk-linux/cmdline-tools commandlinetools-linux-${V_SDK}.zip && \
    mv android-sdk-linux/cmdline-tools/cmdline-tools android-sdk-linux/cmdline-tools/latest && \
    rm commandlinetools-linux-${V_SDK}.zip && \
    # Accept licenses and install SDK components
    yes | android-sdk-linux/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_SDK_ROOT --licenses && \
    android-sdk-linux/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_SDK_ROOT \
    "platforms;android-${V_SDK_PLATFORM}" \
    "build-tools;${V_SDK_BUILD_TOOLS}" \
    "extras;android;m2repository" \
    "ndk;${V_NDK_N}" && \
    # Create NDK symlink
    ln -s android-sdk-linux/ndk/${V_NDK_N} android-ndk-${V_NDK} && \
    # Download gas-preprocessor
    mkdir -p bin && \
    wget "https://github.com/FFmpeg/gas-preprocessor/raw/master/gas-preprocessor.pl" \
    -O bin/gas-preprocessor.pl && \
    chmod +x bin/gas-preprocessor.pl

# Add SDK bin to PATH
ENV PATH=$PATH:/workspace/sdk/bin

# Clone the official arthenica/ffmpeg-kit repository
RUN git clone https://github.com/arthenica/ffmpeg-kit.git /workspace/ffmpeg-kit

# Set working directory to ffmpeg-kit
WORKDIR /workspace/ffmpeg-kit

# Make the script executable
RUN chmod +x android.sh

# Default command - run the build script
# You can override with specific options like: docker run ffmpeg-kit-builder ./android.sh --enable-gpl
CMD ["bash", "-c", "./android.sh --enable-android-media-codec --enable-android-zlib --disable-arm-v7a-neon --disable-x86-64"]

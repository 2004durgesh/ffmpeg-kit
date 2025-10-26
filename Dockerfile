FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install required dependencies
RUN apt-get update && apt-get install -y \
    autoconf \
    automake \
    libtool \
    pkg-config \
    curl \
    bzip2 \
    libexpat1-dev \
    g++ \
    gcc \
    git \
    gperf \
    libc6-dev \
    libgcc-11-dev \
    libstdc++-11-dev \
    make \
    nasm \
    perl \
    python3 \
    python3-distutils \
    sed \
    unzip \
    wget \
    zip \
    cmake \
    ninja-build \
    openjdk-11-jdk \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Set environment variables
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_NDK_ROOT=/opt/android-sdk/ndk/27.1.12297006
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

# Default command
CMD ["/bin/bash"]

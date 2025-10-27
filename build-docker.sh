#!/bin/bash

set -e

echo "===================================="
echo "FFmpeg-Kit Docker Build Script"
echo "===================================="
echo ""

echo "[1/2] Building Docker image..."
docker build -t ffmpeg-kit-builder .

echo ""
echo "[2/2] Running ffmpeg-kit build in Docker..."
echo "This will take 30-90 minutes on first build..."
echo ""

mkdir -p output

docker run --rm -v "$(pwd)/output:/workspace/ffmpeg-kit/prebuilt" ffmpeg-kit-builder

echo ""
echo "===================================="
echo "Build complete!"
echo "Output is in: $(pwd)/output"
echo "===================================="

@echo off
echo ====================================
echo FFmpeg-Kit Docker Build Script
echo ====================================
echo.

echo [1/2] Building Docker image...
docker build -t ffmpeg-kit-builder .
if %errorlevel% neq 0 (
    echo ERROR: Docker build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Running ffmpeg-kit build in Docker...
echo This will take 30-90 minutes on first build...
echo.

if not exist "output" mkdir output

docker run --rm -v "%cd%/output:/workspace/ffmpeg-kit/prebuilt" ffmpeg-kit-builder

if %errorlevel% neq 0 (
    echo ERROR: Build failed! Check the output above.
    pause
    exit /b %errorlevel%
)

echo.
echo ====================================
echo Build complete!
echo Output is in: %cd%\output
echo ====================================
pause
